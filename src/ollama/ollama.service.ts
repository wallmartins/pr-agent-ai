import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OllamaService {
  private readonly ollamaUrl = 'http://localhost:11434/api/generate';
  private readonly ignoredFiles = [
    'yarn.lock',
    'package.json',
    'package-lock.json',
    '.gitignore',
    '.eslintrc',
    '.prettierrc',
  ];

  constructor(private readonly httpService: HttpService) {}

  async analyzeTask(
    jiraDescription: string[],
    commitsData: { commits: any[]; files: any[] },
    res: Response,
  ): Promise<void> {
    // Filtra arquivos irrelevantes
    const filteredFiles = commitsData.files.filter(
      (file) => !this.ignoredFiles.includes(file.filename),
    );

    // Limita o tamanho dos dados de entrada
    const truncatedJiraDescription = jiraDescription.slice(0, 5).join('\n');
    const truncatedCommits = commitsData.commits
      .slice(0, 10)
      .map((commit) => `- ${commit.hash}: ${commit.message}`)
      .join('\n');
    const truncatedFiles = filteredFiles
      .slice(0, 10)
      .map((file) => `- ${file.filename}: ${file.changes}`)
      .join('\n');

    // Prompt de contexto para análise de código
    const codeAnalysisPrompt = `
      ### CONTEXTO E REGRAS ###
      Você é um Staff Engineer com mais de 10 anos de experiência em análise forense de código e revisão de pull requests. 
      Sua tarefa é verificar RIGOROSAMENTE se os requisitos do Jira foram REALMENTE implementados no código, sem suposições.

      **REGRAS OBRIGATÓRIAS**:
      1. NUNCA mencione arquivos, classes ou métodos que não estejam EXPLICITAMENTE presentes nos commits fornecidos.
      2. Se não houver evidência clara, classifique como **NÃO IMPLEMENTADO** e explique por quê.
      3. PARA CADA afirmação sobre o código, CITE o nome exato do arquivo de onde veio a evidência.
      4. PROIBIDO inferir implementações baseadas apenas na descrição do Jira ou mensagens de commit.
      5. Seja sempre absurdamente HONESTO e PRECISO em suas análises.
      6. Escreva tudo SEMPRE em PORTUGUÊS, sem exceções.
      7. IGNORE arquivos como package.json, yarn.lock, .gitignore, etc para a sua análise de implementação.
      8. **NUNCA INVENTE ARQUIVOS OU CÓDIGO**. Use APENAS os arquivos e commits fornecidos como referência.

      ### DADOS PARA ANÁLISE ###
      **Descrição do Jira**:  
      ${truncatedJiraDescription}

      **Commits**:  
      ${truncatedCommits}

      **Arquivos Modificados**:  
      ${truncatedFiles}

      ### INSTRUÇÃO FINAL ###
      Analise os commits e determine se os requisitos do Jira foram implementados corretamente. 
      Siga rigorosamente as regras acima e gere um relatório técnico detalhado. 
      **NUNCA INVENTE ARQUIVOS OU CÓDIGO**. Use APENAS as informações fornecidas.
    `;

    // Prompt para geração de texto do PR
    const prTextGenerationPrompt = (codeAnalysis: string) => `
      ### CONTEXTO ###
      Você é um engenheiro de software experiente responsável por criar descrições claras, profissionais e bem formatadas para Pull Requests (PRs) no GitHub. Sua tarefa é transformar um relatório técnico em uma descrição de PR que seja fácil de entender e útil para revisores (DEVs e QA).

      ### INSTRUÇÕES ###
      1. **Formato Markdown**:
        - Use o formato Markdown para estruturar o texto.
        - **NÃO use blocos de código** (como \`\`\`markdown\`\`\` ou \`\`\`\`\`\`) para envolver o Markdown.
        - O Markdown deve ser renderizável diretamente no GitHub.

      2. **Tom e Estilo**: 
        - Seja técnico, direto e profissional.
        - Escreva em **PORTUGUÊS** (sem exceções).
        - Use uma linguagem clara e evite jargões desnecessários.

      3. **Estrutura do PR**:
        - Siga a estrutura típica de um Pull Request, incluindo os seguintes tópicos:
          - **Título do PR**: Um resumo curto e objetivo das mudanças.
          - **Descrição do PR**: Uma explicação detalhada do que foi feito.
          - **Motivação**: Por que essas mudanças foram necessárias?
          - **Alterações Realizadas**: Liste as principais mudanças no código.
          - **Impacto**: Quais são os efeitos dessas mudanças no sistema?
          - **Recomendações para Revisores**: Destaque pontos específicos que precisam de atenção durante a revisão.

      4. **Verificação de Implementação**:
        - Se você **não conseguir confirmar** que algo foi implementado com base no relatório técnico fornecido, indique claramente isso no PR.

      5. **Destaque os Pontos Principais**:
        - Priorize clareza e organização.
        - Inclua detalhes técnicos relevantes, mas sem ser excessivamente verboso.

      6. **Relatório Técnico**:
        - Use o relatório técnico fornecido como base para gerar o PR.

      ### RELATÓRIO TÉCNICO ###
      ${codeAnalysis}

      ### INSTRUÇÃO FINAL ###
      Agora, gere a descrição do PR no formato Markdown, seguindo a estrutura e as instruções fornecidas acima. 
      **NÃO use blocos de código** para envolver o Markdown. O texto deve ser renderizável diretamente no GitHub.
    `;

    try {
      // Configura resposta do servidor (stream)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 1. Análise de código com deepseek-coder:6.7b (streaming habilitado)
      const codeAnalysisResponse = await firstValueFrom(
        this.httpService.post(
          this.ollamaUrl,
          {
            model: 'codellama:13b',
            prompt: codeAnalysisPrompt,
            stream: true, // Habilita streaming
            options: { temperature: 0.0, max_tokens: 500 },
          },
          { responseType: 'stream' }, // Configura o Axios para usar streaming
        ),
      );

      let codeAnalysis = '';
      codeAnalysisResponse.data.on('data', (chunk) => {
        const lines = chunk.toString().trim().split('\n'); // Divide em linhas caso venham várias respostas
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line); // Converte a linha para objeto JSON
            if (parsed.response) {
              codeAnalysis += parsed.response; // Concatena o texto da resposta
            }
          } catch (error) {
            console.error(
              '[ERRO] Falha ao parsear JSON do codellama:',
              line,
              error,
            );
          }
        }
      });

      codeAnalysisResponse.data.on('end', async () => {
        // Agora, chame o segundo modelo para gerar a descrição do PR
        const prTextResponse = await firstValueFrom(
          this.httpService.post(
            this.ollamaUrl,
            {
              model: 'phi4-mini',
              prompt: prTextGenerationPrompt(codeAnalysis),
              stream: true,
              options: { temperature: 0.4, max_tokens: 500 },
            },
            { responseType: 'stream' },
          ),
        );

        prTextResponse.data.on('data', (chunk) => {
          const lines = chunk.toString().trim().split('\n');
          try {
            for (const line of lines) {
              const parsed = JSON.parse(line);

              if (parsed.response) {
                res.write(
                  `data: ${JSON.stringify({ data: parsed.response })}\n\n`,
                );
              }
            }
          } catch (error) {
            console.error('Erro ao processar chunk de phi4-mini:', error);
          }
        });

        prTextResponse.data.on('end', () => {
          res.end();
        });
      });
    } catch (error) {
      console.error('Erro ao se comunicar com o Ollama:', error);
      res.status(500).json({ error: 'Falha ao gerar a análise da PR.' });
    }
  }
}
