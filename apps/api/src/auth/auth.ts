import { Body, Controller, Get, Injectable, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import type { CookieOptions, Request, Response } from 'express';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard, CurrentUser } from '../common/security';

class LoginDto { @IsEmail() email!:string; @IsString() @MinLength(8) password!:string; }

function jwtSecret(name:'JWT_ACCESS_SECRET'|'JWT_REFRESH_SECRET',developmentFallback:string){
  const value=process.env[name]?.trim();
  if(process.env.NODE_ENV==='production'&&(!value||value.length<32)){
    throw new Error(`${name} debe configurarse con al menos 32 caracteres en producción`);
  }
  return value||developmentFallback;
}

function refreshCookieOptions():CookieOptions{
  return {
    httpOnly:true,
    sameSite:'strict',
    secure:process.env.NODE_ENV==='production'||process.env.COOKIE_SECURE==='true',
    path:'/api/auth',
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
  constructor(){super({jwtFromRequest:ExtractJwt.fromAuthHeaderAsBearerToken(),ignoreExpiration:false,secretOrKey:jwtSecret('JWT_ACCESS_SECRET','dev-access-secret-change-me')});}
  validate(payload:any){return payload;}
}

@Injectable()
export class AuthService{
  constructor(private db:PrismaService,private jwt:JwtService){}
  async login(email:string,password:string){
    const user=await this.db.user.findUnique({where:{email}});
    if(!user?.active || !(await bcrypt.compare(password,user.passwordHash))) throw new UnauthorizedException('Credenciales inválidas');
    const payload={sub:user.id,email:user.email,role:user.role};
    const accessToken=await this.jwt.signAsync(payload,{secret:jwtSecret('JWT_ACCESS_SECRET','dev-access-secret-change-me'),expiresIn:(process.env.JWT_ACCESS_TTL||'15m') as any});
    const refreshToken=await this.jwt.signAsync(payload,{secret:jwtSecret('JWT_REFRESH_SECRET','dev-refresh-secret-change-me'),expiresIn:(process.env.JWT_REFRESH_TTL||'7d') as any});
    await this.db.user.update({where:{id:user.id},data:{refreshTokenHash:await bcrypt.hash(refreshToken,10),lastLoginAt:new Date()}});
    return {accessToken,refreshToken,user:{id:user.id,email:user.email,role:user.role}};
  }
  async refresh(token:string){
    try{
      const payload=await this.jwt.verifyAsync(token,{secret:jwtSecret('JWT_REFRESH_SECRET','dev-refresh-secret-change-me')});
      const user=await this.db.user.findUnique({where:{id:payload.sub}});
      if(!user?.refreshTokenHash || !(await bcrypt.compare(token,user.refreshTokenHash))) throw new Error();
      const accessToken=await this.jwt.signAsync({sub:user.id,email:user.email,role:user.role},{secret:jwtSecret('JWT_ACCESS_SECRET','dev-access-secret-change-me'),expiresIn:(process.env.JWT_ACCESS_TTL||'15m') as any});
      return {accessToken};
    }catch{throw new UnauthorizedException('Sesión expirada');}
  }
}

@Controller('auth')
export class AuthController{
  constructor(private service:AuthService){}
  @Post('login') async login(@Body() dto:LoginDto,@Res({passthrough:true}) res:Response){
    const r=await this.service.login(dto.email,dto.password);
    res.cookie('sige_refresh',r.refreshToken,{...refreshCookieOptions(),maxAge:7*24*3600*1000});
    return {accessToken:r.accessToken,user:r.user};
  }
  @Post('refresh') async refresh(@Req() req:Request){return this.service.refresh(req.cookies?.sige_refresh);}
  @UseGuards(JwtAuthGuard) @Get('me') me(@CurrentUser() user:any){return user;}
  @Post('logout') logout(@Res({passthrough:true}) res:Response){res.clearCookie('sige_refresh',refreshCookieOptions());return {ok:true};}
}
