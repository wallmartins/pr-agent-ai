import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GithubService {
  private readonly githubApiUrl = 'https://api.github.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.configService.get<string>('GITHUB_API_TOKEN')}`,
      Accept: 'application/vnd.github.v3+json',
    };
  }

  async getBranches(user: string, repo: string, username: string) {
    const url = `${this.githubApiUrl}/repos/${user}/${repo}/branches`;
    const response = await firstValueFrom(
      this.httpService.get(url, { headers: this.getHeaders() }),
    );

    const branches = response.data;

    const branchDetails = await Promise.all(
      branches.map(async (branch) => {
        const commitsUrl = `${this.githubApiUrl}/repos/${user}/${repo}/commits?sha=${branch.name}&author=${username}`;
        const commitsResponse = await firstValueFrom(
          this.httpService.get(commitsUrl, { headers: this.getHeaders() }),
        );

        return {
          name: branch.name,
          lastPush: commitsResponse.data[0]?.commit.author?.date || null,
        };
      }),
    );

    branchDetails.sort((a, b) => {
      if (!a.lastPush) return 1;
      if (!b.lastPush) return -1;
      return new Date(b.lastPush).getTime() - new Date(a.lastPush).getTime();
    });

    return branchDetails.map((branch) => branch.name);
  }

  async getCommitDetails(owner: string, repo: string, commitSha: string) {
    const url = `${this.githubApiUrl}/repos/${owner}/${repo}/commits/${commitSha}`;
    const response = await firstValueFrom(
      this.httpService.get(url, { headers: this.getHeaders() }),
    );

    const commitDetails = response.data;

    return {
      sha: commitDetails.sha,
      message: commitDetails.commit.message,
      date: commitDetails.commit.author?.date,
      files: commitDetails.files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      })),
    };
  }

  async getCommits(
    owner: string,
    repo: string,
    branch: string,
    username: string,
  ) {
    const base = 'main';

    const commitsUrl = `${this.githubApiUrl}/repos/${owner}/${repo}/commits?sha=${branch}&author=${username}`;
    const commitsResponse = await firstValueFrom(
      this.httpService.get(commitsUrl, { headers: this.getHeaders() }),
    );

    const commits = commitsResponse.data;

    const compareUrl = `${this.githubApiUrl}/repos/${owner}/${repo}/compare/${base}...${branch}`;
    const compareResponse = await firstValueFrom(
      this.httpService.get(compareUrl, { headers: this.getHeaders() }),
    );

    const comparison = compareResponse.data;

    const diffCommits = commits.filter((commit) =>
      comparison.commits.some((c) => c.sha === commit.sha),
    );

    return {
      commits: diffCommits.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        date: commit.commit.author?.date,
      })),
      files: comparison.files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      })),
    };
  }
}
