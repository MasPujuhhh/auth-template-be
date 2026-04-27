import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import oauthConfig from './config/oauth.config';
import rabbitConfig from './config/rabbit.config';
import mailConfig from './config/mail.config';
import { PrismaModule } from './prisma/prisma.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, oauthConfig, rabbitConfig, mailConfig],
    }),
    PrismaModule,
  ],
})
export class AppModule {}
