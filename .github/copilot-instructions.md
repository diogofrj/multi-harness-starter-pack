# copilot-instructions.md — GitHub Copilot Entrypoint

Leia primeiro [AGENTS.md](../AGENTS.md) e [NOTES.md](../NOTES.md). Regras determinísticas ficam em `.claude/settings.json` (hooks de segurança); conhecimento especializado, em `.agents/skills/`.

## Projeto

- **Produto:** <nome>
- **Papel preferencial:** pair programming no VS Code (chat/agent mode), edições localizadas, revisão de diffs e PRs.
- **Memória persistente:** opcional; veja [docs/fulltech-memory-integration.md](../docs/fulltech-memory-integration.md)

## Comandos

```bash
make install
make dev
make lint
make typecheck
make test
```

Ajuste estes alvos à stack do projeto gerado. Não trate fallback silencioso ou comando ausente como check verde.

## Operação

- Reancore a sessão no estado registrado em `NOTES.md`.
- Para tarefa substancial, confirme objetivo, escopo e Definition of Done antes de editar.
- Para execução paralela, trabalhe apenas no worktree e nos arquivos atribuídos (`make worktree-new NAME=<wave>`).
- Use as skills em `.agents/skills/` quando o escopo corresponder (ex.: `commit`, `code-review-b2`, `security-check`, `readme-format`).
- Ao terminar, atualize o hand-off em `NOTES.md` com evidências reais dos checks executados.
- Nunca envie evidências de erro, código privado ou contexto de outro workspace sem consentimento explícito.
