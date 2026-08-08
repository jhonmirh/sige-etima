import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
export const Roles=(...roles:Role[])=>SetMetadata('roles',roles);
@Injectable() export class JwtAuthGuard extends AuthGuard('jwt') {}
@Injectable() export class RolesGuard implements CanActivate{
  constructor(private reflector:Reflector){}
  canActivate(ctx:ExecutionContext){
    const roles=this.reflector.getAllAndOverride<Role[]>('roles',[ctx.getHandler(),ctx.getClass()]);
    if(!roles?.length) return true;
    const user=ctx.switchToHttp().getRequest().user;
    if(!user || !roles.includes(user.role)) throw new ForbiddenException('Permiso insuficiente');
    return true;
  }
}
export const CurrentUser=createParamDecorator((_:unknown,ctx:ExecutionContext)=>ctx.switchToHttp().getRequest().user);
