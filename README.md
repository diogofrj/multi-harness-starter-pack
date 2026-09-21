# Multi-Harness Starter Pack

Bootstrap para projetos desenvolvidos por múltiplos harnesses de IA, com contrato compartilhado, trabalho paralelo seguro, hand-offs verificáveis e um board local opcional.

## O que vem pronto

- `AGENTS.md` como contrato canônico entre Codex, Claude Code e Antigravity/Gemini.
- Entrypoints curtos em `CLAUDE.md` e `GEMINI.md`.
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
BOARD_PORT=3000 make board
make board-smoke
```

O board lê cards Markdown de `.devtool/features/`, expõe `/api/cards`, recebe pulsos efêmeros e usa `BOARD_PORT` (3000 por padrão). Atualizações chegam por SSE e têm polling de 10 segundos como fallback. O dock “Harnesses abertos” mostra presença separada dos agentes ativos. A configuração portátil, inclusive a regra que converte branches em IDs de card, está em `.devtool/board.json`. O alvo `make board` grava o HTML efêmero em `/tmp`; `BOARD_DIST` permite escolher outro caminho gravável.

```bash
node scripts/agent-pulse.mjs --harness codex --card bootstrap-01 --action "Executando Wave 0"
```

### Pesquisa web

O subagente `.claude/agents/web-researcher.md` está incorporado para pesquisas com fontes. Use-o apenas quando a tarefa pedir informação externa; código e contexto privado não devem sair do repositório sem consentimento.

## Estrutura

```text
.
├── AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── NOTES.md
├── docs/fulltech-memory-integration.md
├── .mcp.json.example
├── .claude/
├── .agents/
├── .devtool/features/
├── scripts/
└── Makefile
```

## Upstream e manutenção

Este template nasceu de [brunobracaioli/claude-code-starter-pack](https://github.com/brunobracaioli/claude-code-starter-pack) e é mantido em [diogofrj/multi-harness-starter-pack](https://github.com/diogofrj/multi-harness-starter-pack).

O web-researcher foi incorporado em `cc4ff5c`. O template preserva a atribuição de origem e é mantido em [diogofrj/multi-harness-starter-pack](https://github.com/diogofrj/multi-harness-starter-pack).

## Licença

MIT.
