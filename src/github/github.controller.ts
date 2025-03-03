import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { GithubService } from './github.service';

@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

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

  @Post('pull-request')
  async createPullRequest(
    @Body('user') user: string,
    @Body('repo') repo: string,
    @Body('title') title: string,
    @Body('head') head: string,
    @Body('base') base: string,
    @Body('body') body?: string,
  ) {
    return this.githubService.createPullRequest(
      user,
      repo,
      title,
      head,
      base,
      body,
    );
  }
}
