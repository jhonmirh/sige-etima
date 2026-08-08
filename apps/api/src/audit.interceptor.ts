import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from './prisma.service';
@Injectable()
export class AuditInterceptor implements NestInterceptor{
  constructor(private db:PrismaService){}
  intercept(ctx:ExecutionContext,next:CallHandler):Observable<any>{
    const req=ctx.switchToHttp().getRequest();
    const method=req.method;
    if(!['POST','PUT','PATCH','DELETE'].includes(method)) return next.handle();
    return next.handle().pipe(tap(()=>{ void this.db.auditLog.create({data:{userId:req.user?.sub,action:method,entity:req.route?.path||req.url,metadata:{params:req.params,query:req.query},ip:req.ip}}).catch(()=>null); }));
  }
}
