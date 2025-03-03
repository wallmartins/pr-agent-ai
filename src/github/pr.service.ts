import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IssuesService } from 'src/issues/issues.service';
import { GithubService } from './github.service';
import { OllamaService } from 'src/ollama/ollama.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PRService {
  private readonly baseBranch = 'main';

  constructor(
    private readonly jiraService: IssuesService,
    private readonly gitService: GithubService,
    private readonly ollamaService: OllamaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createPR(
    owner: string,
    username: string,
    userEmail: string,
    branch: string,
    repo: string,
    issues: string[],
  ): Promise<void> {
    const jiraIssue = await this.jiraService.getIssues(issues, userEmail);
    const jiraDescription = jiraIssue.issues.map(
      (issue) => issue.fields.description,
    );

    const commitsData = await this.gitService.getCommits(
      owner,
      repo,
      branch,
      username,
    );

    const prDescription = await this.ollamaService.analyzeTask(
      jiraDescription,
      commitsData,
    );

    await this.createGitHubPR(owner, repo, branch, prDescription);
  }

  private async createGitHubPR(
    owner: string,
    repo: string,
    branch: string,
    description: string,
  ): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://api.github.com/repos/${owner}/${repo}/pulls`,
          {
            title: `PR for ${branch}`,
            head: branch,
            base: this.baseBranch,
            body: description,
          },
          {
            headers: {
              Authorization: `Bearer ${this.configService.get<string>('GITHUB_API_TOKEN')}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        ),
      );

      console.log('PR criado com sucesso:', response.data);
    } catch (error) {
      console.error('Erro ao criar o PR no GitHub:', error);
      throw new Error('Falha ao criar o PR no GitHub.');
    }
  }
}
