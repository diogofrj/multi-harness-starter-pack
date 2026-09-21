# CLAUDE.md — Claude Code Entrypoint

Leia primeiro [AGENTS.md](AGENTS.md) e [NOTES.md](NOTES.md). Regras determinísticas ficam em `.claude/settings.json`; conhecimento especializado, em `.claude/skills/`.

## Projeto

- **Produto:** <nome>
- **Backend:** <stack>
- **Frontend:** <stack>
- **Banco / Infra:** <stack>
- **Memória persistente:** opcional; veja [docs/fulltech-memory-integration.md](docs/fulltech-memory-integration.md)

## Comandos

```bash
make install
make dev
make lint
make typecheck
make test
make board
```

Ajuste estes alvos à stack. Não trate fallback silencioso ou comando ausente como check verde.

## Operação

- Reancore a sessão no estado registrado em `NOTES.md`.
- Para execução paralela, trabalhe apenas no worktree e nos arquivos atribuídos.
- Use skills especializadas quando o escopo corresponder.
- Ao terminar, atualize o hand-off com evidências dos checks.
- Nunca envie evidências de erro ou contexto privado sem consentimento explícito.
