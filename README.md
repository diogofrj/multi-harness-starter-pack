# Multi-Harness Starter Pack

Bootstrap para projetos desenvolvidos por múltiplos harnesses de IA, com contrato compartilhado, trabalho paralelo seguro, hand-offs verificáveis e um board local opcional.

> 📖 **Consulte o [RUNBOOK.md](RUNBOOK.md)** para o índice completo de componentes, guia do `Makefile`, portas de serviços e cheat sheet operacional.


## O que vem pronto

- `AGENTS.md` como contrato canônico entre Codex, Claude Code, Antigravity/Gemini e GitHub Copilot.
- Entrypoints curtos em `CLAUDE.md`, `GEMINI.md` e `.github/copilot-instructions.md`.
- Skill `readme-format` para padronizar a documentação do projeto (quick start, diagrama de arquitetura, como funciona) antes de qualquer conteúdo de marketing.
- Planejamento e hand-off por waves em `NOTES.md`.
- Isolamento de sessões simultâneas com Git worktrees.
- Hooks de segurança e skills reutilizáveis.
- Board local com telemetria efêmera de agentes.
- Integração opcional com memória persistente via MCP.

O starter funciona sem qualquer provedor de memória. Para clientes do **Fulltech Memory**, há um guia de integração bônus em [docs/fulltech-memory-integration.md](docs/fulltech-memory-integration.md).

## Quick start

1. Use este repositório como template no GitHub.
2. Substitua os campos `<...>` em `CLAUDE.md` e `NOTES.md`.
3. Inicie a Wave 0 antes de implementar.
4. Para trabalho simultâneo, crie um worktree por harness:

```bash
make worktree-new NAME=wave-1-core
make worktree-new NAME=wave-2-ui
make worktree-list
```

5. Rode os checks reais antes do hand-off:

```bash
make lint
make typecheck
make test
```

O `Makefile` detecta stacks comuns. Ajuste os alvos para o projeto gerado; comandos vazios ou indisponíveis não devem ser reportados como validação bem-sucedida.

## Memória persistente opcional

Copie `.mcp.json.example` para uma configuração local suportada pelo seu harness e preencha as variáveis de ambiente fora do Git. O exemplo usa **Fulltech Memory MCP**, mas o contrato permanece independente de fornecedor.

Regras essenciais:

- não versione tokens;
- não torne a memória remota pré-requisito para build ou testes;
- registre decisões duráveis, não transcrições completas;
- nunca envie contexto, evidências de erro ou código privado sem consentimento explícito;
- preserve um hand-off local em `NOTES.md` mesmo quando a memória remota estiver ativa.

## Board local

```bash
make board
BOARD_PORT=3100 make board
make backlog-browser # Sobe o Backlog.md Browser na porta 6420
make board-all       # Sobe Fulltech Kanban (3100) + Backlog Browser (6420)
make board-status
make board-stop
```

O board lê tarefas Markdown de `backlog/tasks/` e expõe `/api/cards`. A interface atualiza por SSE e usa polling como fallback, sem exigir F5. Ela inclui uma coluna exclusiva para agentes ativos, uma faixa minimizável para harnesses abertos, grupos de filtros minimizáveis, modo tela cheia, prévia no hover e painel pelo teclado com `Enter`.

`backlog/config.yml` é a fonte única da configuração portátil. Nele ficam:

- `columns` para definir os nomes e ordem das colunas (ex: Backlog, To Do, In Progress, Review, Done);
- `port` e `bind` para a escuta do servidor;
- `refreshIntervalSeconds`, `agentTimeoutSeconds` e `pulseTtlSeconds` para atualização e expiração;
- `presence` para habilitar, nomear e controlar a faixa de harnesses abertos.

O padrão adota a convenção do **Backlog.md** (`task-X - titulo.md`). Uma branch como `feat/task-1-engine` é associada automaticamente à tarefa `task-1`. Para criar uma tarefa via CLI ou Markdown:

```bash
backlog task create "Implementar autenticação" -s "To Do" -p high -a "Codex"
```

Ou diretamente no arquivo `backlog/tasks/task-12 - auth.md`:

```markdown
---
id: task-12
title: Implementar autenticação
status: To Do
priority: high
assignee:
  - Codex
labels:
  - wave-1
  - backend
order: a12
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Descrição detalhada da entrega e critérios de aceite.
<!-- SECTION:DESCRIPTION:END -->

## Verify
<!-- SECTION:VERIFY:BEGIN -->
- [ ] Testes unitários passando
- [ ] make audit com score >= 90
<!-- SECTION:VERIFY:END -->
```

O alvo `make board` grava o HTML efêmero em `/tmp`; `BOARD_DIST` escolhe outro caminho gravável. `BOARD_PORT` e `BOARD_BIND` sobrescrevem porta e bind sem alterar o arquivo. Para Docker Compose, use `make board-docker`; o alvo injeta a porta configurada no compose.

O watcher publica presença de processos por worktree e associa cada branch à tarefa conforme o `backlog/config.yml`. Agentes ativos são mostrados somente enquanto há sinal real de trabalho. A faixa de presença continua mostrando harnesses abertos mesmo quando estão parados. Para espelhar telemetria de outro board, defina `BOARD_TELEMETRY_SOURCE` com a URL do stream SSE.

```bash
node scripts/agent-pulse.mjs --harness codex --card task-1 --action "Executando Wave 0"
```

Valide a experiência completa numa porta isolada:

```bash
BOARD_PORT=3105 make board-smoke
```

O smoke Playwright cobre carga e API, refresh por SSE, fallback por polling, dock, filtros, tela cheia, prévia no hover, abertura por `Enter`, busca e telemetria de agente.

### Pesquisa web

O subagente `.claude/agents/web-researcher.md` está incorporado para pesquisas com fontes. Use-o apenas quando a tarefa pedir informação externa; código e contexto privado não devem sair do repositório sem consentimento.

## Estrutura

```text
.
├── AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── NOTES.md
├── RUNBOOK.md
├── .github/copilot-instructions.md
├── docs/fulltech-memory-integration.md
├── .mcp.json.example
├── .claude/
├── .agents/
├── backlog/
│   ├── config.yml
│   ├── harness-models.json
│   └── tasks/
├── scripts/
└── Makefile
```

## Upstream e manutenção

Este template nasceu de [brunobracaioli/claude-code-starter-pack](https://github.com/brunobracaioli/claude-code-starter-pack) e é mantido em [diogofrj/multi-harness-starter-pack](https://github.com/diogofrj/multi-harness-starter-pack).

O web-researcher foi incorporado em `cc4ff5c`. O template preserva a atribuição de origem e é mantido em [diogofrj/multi-harness-starter-pack](https://github.com/diogofrj/multi-harness-starter-pack).

## Licença

MIT.
