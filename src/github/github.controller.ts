import { Controller, Get, Query, Post, Body, Res } from '@nestjs/common';
import { GithubService } from './github.service';
import { PRService } from './pr.service';
import { Response } from 'express';

@Controller('github')
export class GithubController {
  constructor(
    private readonly githubService: GithubService,
    private readonly prService: PRService,
  ) {}

  @Get('branches')
  async getBranches(
    @Query('user') user: string,
    @Query('repo') repo: string,
    @Query('username') username: string,
  ) {
    return this.githubService.getBranches(user, repo, username);
  }

  @Get('commits')
  async getCommits(
    @Query('user') user: string,
    @Query('repo') repo: string,
    @Query('branch') branch: string,
    @Query('username') username: string,
  ) {
    return this.githubService.getCommits(user, repo, branch, username);
  }

  @Post('pr')
  async createPullRequest(
    @Body('owner') owner: string,
    @Body('repo') repo: string,
    @Body('branch') branch: string,
    @Body('description') description: string,
  ) {
    return this.prService.createGitHubPR(owner, repo, branch, description);
  }

  @Post('pr/stream')
  async streamPrDescription(
    @Body('owner') owner: string,
    @Body('username') username: string,
    @Body('userEmail') userEmail: string,
    @Body('branch') branch: string,
    @Body('repo') repo: string,
    @Body('issues') issues: string[],
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      await this.prService.createPR(
        owner,
        username,
        userEmail,
        branch,
        repo,
        issues,
        res,
      );
    } catch (error) {
      console.error('Erro ao gerar a descrição do PR:', error);
      res.status(500).end();
    }
  }
}
