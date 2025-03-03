import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IssuesModule } from './issues/issues.module';
import { ConfigModule } from '@nestjs/config';
import { GithubModule } from './github/github.module';
import { HttpService } from '@nestjs/axios';
import { OllamaModule } from './ollama/ollama.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    IssuesModule,
    GithubModule,
    OllamaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
