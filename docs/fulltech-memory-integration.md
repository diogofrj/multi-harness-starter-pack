# Integração opcional com Fulltech Memory

Fulltech Memory fornece continuidade entre harnesses. O starter pack continua funcional sem essa integração.

## Fulltech Memory x Notes (Memos)

São dois MCPs com escopo diferente; não são intercambiáveis nem substitutos um do outro.

- **Fulltech Memory (`fulltech-memory`)** é memória de IA: decisões, preferências explícitas, padrões comprovados, lições e estado de hand-off entre sessões e harnesses. Conteúdo pensado para outra IA reconsumir depois, não para um humano ler como manual.
- **Notes (Memos)** é documentação para execução humana: runbooks, scripts simples, comandos úteis e outros recortes de contexto que valem a pena preservar, mas que não precisam (e não devem) virar memória de IA — texto para uma pessoa ler, copiar e rodar, sem exigir que uma IA o reinterprete.

Regra prática: se o conteúdo é "o que decidimos e por quê" ou "o que outra sessão de IA precisa saber para continuar", vai para Fulltech Memory. Se é "como fazer isso de novo" num formato que um humano segue direto, vai para Notes (ou para um runbook versionado no repo, quando o conteúdo for específico do projeto). Um mesmo evento pode gerar registro nos dois, com propósitos diferentes; um não substitui o outro.

## Configuração

1. Copie `.mcp.json.example` para o arquivo local aceito pelo harness.
2. Defina `FULLTECH_MEMORY_MCP_URL` e `FULLTECH_MEMORY_API_KEY` fora do Git.
3. Confirme as tools expostas pelo servidor; não presuma nomes.
4. Mantenha `NOTES.md` como fallback auditável.

Instalações legadas podem usar endpoint ou tools com o codinome `Muninn`/`muninn_*`. Essa compatibilidade não altera o nome público **Fulltech Memory**.

## O que registrar

Registre decisões, preferências explícitas, padrões comprovados, lições e status de hand-off. Use escopo do projeto e tipo da memória. Quando um fato mudar, crie uma nova versão com relação de supersessão em vez de reescrever a história.

Não registre segredos, tokens, dados pessoais desnecessários, dumps de banco, transcrições integrais ou código proprietário sem necessidade e autorização.

## Falhas e feedback

Uma falha de tool não deve virar issue automaticamente. O fluxo recomendado é:

1. classificar e sanitizar localmente;
2. tentar apenas correções seguras de formato/configuração;
3. explicar ao usuário o impacto;
4. mostrar a evidência mínima proposta;
5. pedir consentimento explícito e granular;
6. somente então abrir uma issue privada, vinculando versão, tool, operação, erro sanitizado e passos de reprodução;
7. devolver o identificador ao usuário e permitir revogação/eliminação da evidência quando aplicável.

O relato deve funcionar sem conteúdo da conversa sempre que metadados técnicos forem suficientes.

## Benchmark

Avalie memória com um corpus versionado e repetível:

- recuperação correta e precisão;
- isolamento entre usuário/projeto;
- atualização e supersessão;
- exclusão verificável;
- hand-off entre harnesses;
- latência e custo;
- comportamento offline/degradado;
- resistência a prompt injection e exfiltração;
- compatibilidade com tools legadas.

Resultados publicados devem apontar para dataset, configuração, versão, seed e evidências reproduzíveis.
