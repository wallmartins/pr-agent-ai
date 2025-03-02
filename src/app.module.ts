import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IssuesModule } from './issues/issues.module';
import { ConfigModule } from '@nestjs/config';
import { CommitsModule } from './commits/commits.module';

@Module({
  imports: [
    IssuesModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CommitsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
