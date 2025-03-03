import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PRService } from './pr.service';
import { IssuesModule } from 'src/issues/issues.module';
import { OllamaModule } from 'src/ollama/ollama.module';

@Module({
  imports: [HttpModule, ConfigModule, IssuesModule, OllamaModule],
  controllers: [GithubController],
  providers: [GithubService, PRService],
})
export class GithubModule {}
