import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GetIssues, GetUserIssuesDto } from './dto/get-issue.dto';
import { extractTextFromADF } from 'src/utils/formatDescriptionIssue';

@Injectable()
export class IssuesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  apiToken = this.configService.get<string>('JIRA_API_TOKEN');
  domain = this.configService.get<string>('JIRA_DOMAIN');

  url = `https://${this.domain}/rest/api/3/`;

  private async getJiraUserId(userEmail: string): Promise<string> {
    const authHeader = {
      Authorization:
        'Basic ' +
        Buffer.from(`${userEmail}:${this.apiToken}`).toString('base64'),
      Accept: 'application/json',
    };

    const response = await firstValueFrom(
      this.httpService.get(`${this.url}/myself`, { headers: authHeader }),
    );

    if (!response.data) {
      throw new Error('Failed to fetch Jira user ID');
    }

    return response.data.accountId;
  }

  async getUserIssues(userEmail: string) {
    const userId = await this.getJiraUserId(userEmail);

    const authHeader = {
      Authorization:
        'Basic ' +
        Buffer.from(`${userEmail}:${this.apiToken}`).toString('base64'),
      Accept: 'application/json',
    };

    const response = await firstValueFrom(
      this.httpService.get(`${this.url}/search`, {
        headers: authHeader,
        params: {
          jql: `assignee=${userId}`,
          fields: 'key,summary',
        },
      }),
    );

    if (!response.data) {
      throw new Error('Failed to fetch user issues');
    }

    const { data } = response;

    return data.issues.map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
    }));
  }

  async getIssues(
    taskIds: string[],
    userEmail: string,
  ): Promise<GetUserIssuesDto> {
    const userId = await this.getJiraUserId(userEmail);

    const authHeader = {
      Authorization:
        'Basic ' +
        Buffer.from(`${userEmail}:${this.apiToken}`).toString('base64'),
      Accept: 'application/json',
    };

    const issues: GetIssues[] = [];

    for (const taskId of taskIds) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${this.url}/issue/${taskId}`, {
            headers: authHeader,
            params: {
              jql: `assignee=${userId}`,
              fields: 'summary,status,created,updated,description',
            },
          }),
        );

        if (!response.data) {
          throw new Error(`Failed to fetch issue ${taskId}`);
        }

        const issue = response.data;

        issues.push({
          id: issue.id,
          key: issue.key,
          fields: {
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            created: issue.fields.created,
            updated: issue.fields.updated,
            description: extractTextFromADF(issue.fields.description),
          },
        });
      } catch (error) {
        console.error(`Erro ao buscar o card ${taskId}:`, error);
        throw new Error(`Falha ao buscar o card ${taskId}`);
      }
    }

    return {
      total: issues.length,
      issues,
    };
  }
}
