import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GetUserIssuesDto } from './dto/get-issue.dto';
import { extractTextFromADF } from 'src/utils/formatDescriptionIssue';

@Injectable()
export class IssuesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private async getJiraUserId(userEmail: string): Promise<string> {
    const apiToken = this.configService.get<string>('JIRA_API_TOKEN');
    const domain = this.configService.get<string>('JIRA_DOMAIN');

    const url = `https://${domain}/rest/api/3/myself`;

    const authHeader = {
      Authorization:
        'Basic ' + Buffer.from(`${userEmail}:${apiToken}`).toString('base64'),
      Accept: 'application/json',
    };

    const response = await firstValueFrom(
      this.httpService.get(url, { headers: authHeader }),
    );

    if (!response.data) {
      throw new Error('Failed to fetch Jira user ID');
    }

    return response.data.accountId;
  }

  async getUserIssues(userEmail: string) {
    const apiToken = this.configService.get<string>('JIRA_API_TOKEN');
    const domain = this.configService.get<string>('JIRA_DOMAIN');
    const userId = await this.getJiraUserId(userEmail);

    const url = `https://${domain}/rest/api/3/search`;

    const authHeader = {
      Authorization:
        'Basic ' + Buffer.from(`${userEmail}:${apiToken}`).toString('base64'),
      Accept: 'application/json',
    };

    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: authHeader,
        params: {
          jql: `assignee=${userId}`,
          fields: 'summary,status,created,updated,description',
        },
      }),
    );

    if (!response.data) {
      throw new Error('Failed to fetch user issues');
    }

    const { data } = response;

    const mappedData: GetUserIssuesDto = {
      total: data.total,
      issues: data.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        fields: {
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          created: issue.fields.created,
          updated: issue.fields.updated,
          description: extractTextFromADF(issue.fields.description),
        },
      })),
    };

    return mappedData;
  }
}
