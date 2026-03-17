import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Set global prefix to handle requests from Nginx /api proxy
  app.setGlobalPrefix('api');

  app.enableCors();

  await app.listen(3001);
  console.log('🚀 Currify Backend running on http://localhost:3001');
}
bootstrap();