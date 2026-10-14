# CLAUDE.md — Claude Code Entrypoint

Leia primeiro [AGENTS.md](AGENTS.md) e [NOTES.md](NOTES.md). As regras arquiteturais canônicas ficam em [rules/](rules/); a documentação formal em [docs/](docs/); configurações determinísticas e hooks em `.claude/settings.json`; e a equipe de skills em `.claude/skills/`.

## Projeto

- **Produto:** <nome>
- **Backend:** <stack>
- **Frontend:** <stack>
- **Banco / Infra:** <stack>
- **Memória persistente:** opcional via MCP; veja [docs/fulltech-memory-integration.md](docs/fulltech-memory-integration.md)

## Comandos Principais

```bash
make install          # Instala dependências da stack e CLI backlog.md
make dev              # Inicia o servidor local de desenvolvimento
make lint             # Roda linters (falha se não configurado)
make typecheck        # Checagem de tipagem estrita
make test             # Executa suíte de testes unitários e integração
make audit            # Executa SafeCode Guardian (Evertec 13, OWASP, SDD Scorecard)
make verify           # Verificação end-to-end com evidências (test + lint + audit)
make board            # Inicia o Kanban Fulltech em tempo real SSE (http://localhost:3100)
make backlog-browser  # Inicia o Backlog.md Browser oficial (http://localhost:6420)
make board-all        # Inicia ambos os boards simultaneamente (3100 + 6420)
make new-project      # Cria um novo repositório a partir deste starter pack
```

Não trate fallback silencioso ou comando ausente como check verde. Evidência, não opinião.

## Skills Disponíveis

- `/spec [feature]`: Conduz entrevista aprofundada de requisitos e gera `docs/specs/<feature>.md`.
- `/waves [spec]`: Decompõe a spec em ondas de entrega (`docs/plan/implementation-waves.md`) e sincroniza o `NOTES.md`.
- `/vertical-slice <feature>`: Gera fatias verticais completas em DDD (`src/features/<feature>/`).
- `/verify`: Valida a entrega executando gates estáticos e comportamentais antes de reportar conclusão.
- `/init-project`: Assistente interativo de scaffolding para novos projetos.
- `/ux-designer`: Acervo de 22 manuais de padrões de UI/UX, acessibilidade e design systems.
- `/babysit-pr <pr-number>`: Monitora CI e comentários de revisão no GitHub.
- `/fix-issue <issue>`: Reprodução e depuração sistemática de bugs.
- `/commit`: Criação de commits no padrão Conventional Commits com escopo.
- `/security-check`: Auditoria de segurança corporativa via SafeCode Guardian.

## Operação e Continuidade

1. **Reancoragem:** Leia `NOTES.md` no início da sessão para entender o roadmap e o próximo passo.
2. **Compactação Lossless:** Os hooks `PreCompact` e `SessionStart(compact)` realizam snapshots automáticos do Git e do `NOTES.md`, preservando todo o contexto operacional.
3. **Trabalho Paralelo:** Opere sempre em worktrees isolados (`make worktree-new NAME=<wave>`).
4. **Segredos e Comandos de Risco:** Credenciais e comandos destrutivos são bloqueados no nível de ferramenta.
