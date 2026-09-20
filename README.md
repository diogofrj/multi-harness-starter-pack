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
# ou
docker compose up
```

O board lê cards Markdown de `.devtool/features/` e recebe pulsos efêmeros:

```bash
node scripts/agent-pulse.mjs --harness codex --card bootstrap-01 --action "Executando Wave 0"
```

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

Remotes recomendados:

```bash
git remote set-url origin https://github.com/diogofrj/multi-harness-starter-pack.git
git remote add upstream https://github.com/brunobracaioli/claude-code-starter-pack.git
```

Ao sincronizar o upstream, preserve deliberadamente `AGENTS.md`, as pontes multi-harness e as regras de consentimento.

## Licença

MIT.
