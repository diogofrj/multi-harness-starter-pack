---
name: retrofit-starter-pack
description: Adequa e moderniza um repositório existente aos padrões do Multi-Harness Enterprise Starter Pack e SafeCode Guardian. Analisa a stack do projeto, injeta contratos canônicos (AGENTS.md, CLAUDE.md, GEMINI.md, RUNBOOK.md), guardrails determinísticos (block-secrets, settings), padrão Backlog.md, telemetria SSE, alvos do Makefile, roda auditoria de segurança e orienta as correções de código para atingir Grau A.
argument-hint: "[caminho-do-repositorio]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Retrofitting an Existing Project to the Multi-Harness Enterprise Standard

Use esta skill sempre que o usuário pedir para "adequar", "migrar", "adaptar", "modernizar" ou "aplicar o starter-pack" em outro repositório existente que não esteja aderente aos padrões da Fulltech.

## Procedimento de Execução

### Passo 1: Obter o Caminho do Repositório Alvo
- Se o usuário forneceu um caminho nos argumentos (`$ARGUMENTS`), resolva o caminho absoluto.
- Caso contrário, pergunte o caminho do repositório ou verifique o diretório atual de trabalho.

### Passo 2: Executar o Motor de Retrofit
Execute o script no terminal do starter pack:
```bash
node scripts/retrofit-project.mjs --target "<caminho-do-repositorio>"
```
O script realizará de forma não-destrutiva:
1. Inspeção automática da stack (Node/TypeScript, Python, Go, Rust), metadados e remote Git.
2. Sincronização dos contratos canônicos (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `RUNBOOK.md`) adaptados ao projeto.
3. Preservação do histórico existente de `NOTES.md`, injetando o bloco de governança de ondas.
4. Instalação de guardrails determinísticos (`.claude/hooks/block-secrets.sh` e `.claude/settings.json`).
5. Provisionamento do padrão Backlog.md (`backlog/config.yml` e `backlog/tasks/`).
6. Cópia dos motores locais de telemetria em tempo real e visualização de board.
7. Merge inteligente no `Makefile` existente adicionando alvos (`audit`, `audit-report`, `verify`, `board`, `backlog-browser`, etc.).
8. Execução da auditoria inicial do SafeCode Guardian e geração automática da tarefa de saneamento de segurança caso haja Red Flags.

### Passo 3: Avaliar o Diagnóstico de Segurança
Execute:
```bash
make audit-report TARGET="<caminho-do-repositorio>"
```
Identifique:
- **Red Flags Bloqueantes:**
  - **RF1 (Segredos):** Chaves, senhas de banco ou tokens expostos em código/testes.
  - **RF2 (Validação Client):** Falta de validação estrita no backend.
  - **RF3 (Erros/Stack Traces):** Exposição de stack traces brutas em respostas de erro.
  - **RF4 (Rate Limiting):** Ausência de controle de vazão em endpoints e interfaces RPC.
- **Score Global e Grau (A a F):** Meta mandatória é Grau A (Score ≥ 90).

### Passo 4: Conduzir a Remediação no Código
Com base no relatório gerado:
1. Abra os arquivos apontados no relatório.
2. Aplique as correções sugeridas (ex: extrair senhas de testes para variáveis de ambiente, adicionar try/catch com mensagens genéricas no backend, configurar middleware de rate limiting).
3. Execute os testes da aplicação (`make test` ou o runner nativo) para assegurar que nada quebrou.

### Passo 5: Re-auditar e Comprovar a Conformidade
1. Re-execute a auditoria:
   ```bash
   make audit TARGET="<caminho-do-repositorio>"
   make audit-report TARGET="<caminho-do-repositorio>"
   ```
2. Confirme que todas as Red Flags estão marcadas como **PASSOU (OK)** e o Score Global atingiu **Grau A**.
3. Convide o usuário a verificar o painel visual com os snippets de código e evidências em:
   👉 **`http://localhost:8765/#safecode`**
