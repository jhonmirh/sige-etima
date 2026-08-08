import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(){
  const app=await NestFactory.create(AppModule,{cors:false});
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({origin:(process.env.CORS_ORIGIN||'http://localhost:3000').split(','),credentials:true});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  const config=new DocumentBuilder().setTitle('SIGE-ETIMA API').setDescription('Gestión escolar integral').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('api/docs',app,SwaggerModule.createDocument(app,config));
  await app.listen(Number(process.env.API_PORT||4000),'0.0.0.0');
}
bootstrap();
