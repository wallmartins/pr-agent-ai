import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OllamaService {
  private readonly ollamaUrl = 'http://localhost:11434/api/generate';

  constructor(private readonly httpService: HttpService) {}

  async analyzeTask(
    jiraDescription: string[],
    commitsData: { commits: any[]; files: any[] },
  ): Promise<string> {
    const formattedJiraDescription = jiraDescription.join('\n');

    const formattedCommits = commitsData.commits
      .map((commit) => `- ${commit.hash}: ${commit.message}`)
      .join('\n');

    const formattedFiles = commitsData.files
      .map((file) => `- ${file.path}: ${file.changes}`)
      .join('\n');

    const prompt = `
        Analise a descrição da tarefa do Jira e as mudanças feitas nos commits. Descreva o que foi feito na tarefa.

        Descrição do Jira:
        ${formattedJiraDescription}

        Commits:
        ${formattedCommits}

        Arquivos modificados:
        ${formattedFiles}

        Por favor, gere uma descrição para o PR **em português**.
        `;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.ollamaUrl,
          {
            model: 'deepseek-r1:8b',
            prompt: prompt,
            stream: true,
          },
          {
            responseType: 'stream',
          },
        ),
      );

      let fullResponse = '';
      for await (const chunk of this.readStream(response.data)) {
        const parsedChunk = JSON.parse(chunk);
        fullResponse += parsedChunk.response;
        if (parsedChunk.done) {
          break;
        }
      }

      const prDescription = this.removeThinkTags(fullResponse);

      return prDescription;
    } catch (error) {
      console.error('Erro ao se comunicar com o Ollama:', error);
      throw new Error('Falha ao gerar a descrição do PR.');
    }
  }

  private async *readStream(stream: any): AsyncGenerator<string> {
    let buffer = '';
    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          yield line;
        }
      }
    }
    if (buffer.trim()) {
      yield buffer;
    }
  }

  private removeThinkTags(text: string): string {
    const thinkTagRegex = /<think>[\s\S]*?<\/think>/g;
    return text.replace(thinkTagRegex, '').trim();
  }
}
