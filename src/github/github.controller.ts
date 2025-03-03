import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { GithubService } from './github.service';
import { PRService } from './pr.service';

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
    @Body('username') username: string,
    @Body('userEmail') userEmail: string,
    @Body('branch') branch: string,
    @Body('repo') repo: string,
    @Body('issues') issues: string[],
  ) {
    return this.prService.createPR(
      owner,
      username,
      userEmail,
      branch,
      repo,
      issues,
    );
  }
}
