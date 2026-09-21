# Hand-off: Board v3 no starter pack

```text
task_id / reservation_generation: board-v3 / 1
owner / timestamp: Codex, papel C / 2026-09-21 UTC
branch / base_sha / head_sha: feat/board-v3 / 042ab6e / 74d1a52
status: ready_for_review
```

## objective

Portar o Board v3 aprovado para o starter pack com comportamento equivalente, configuração portátil em `.devtool/board.json`, documentação em pt-BR e verificação numa cópia limpa.

## changed_files

```text
.devtool/board.json
server.mjs
scripts/board-cards.mjs
scripts/board-config.mjs
scripts/board-smoke.mjs
scripts/build-board.mjs
scripts/agent-pulse.mjs
scripts/worktree-pulse.mjs
scripts/worktree-pulse-daemon.sh
Makefile
compose.yaml
README.md
NOTES.md
docs/handoffs/board-v3.md
```

`scripts/agent-pulse-hook.sh` foi auditado e permanece compatível: ele usa `board-config.mjs infer-card`, sem regex local. `AGENTS.md` e `CLAUDE.md` não citam detalhes do board que precisem de atualização.

## parity_table

| Área | Paridade entregue | Generalização no template |
|---|---|---|
| Servidor | SSE de agentes e presença, espelhamento opcional, API de cards sem cache e bind configurável | IDs, porta, bind, TTL e intervalos vêm do `board.json` |
| Renderização | Setas dos filtros, grupos recolhíveis, dock minimizável, tela cheia, peek em qualquer ponto do card e `Enter` | Colunas e label da presença vêm do `board.json` |
| Cards | Frontmatter, resumo, verificação, ordenação e API mantidos | Colunas não ficam duplicadas no código |
| Telemetria | Pulso de agente, expiração, watcher por worktree e hook preservados | Inferência usa padrão, formato e exceções configurados |
| Execução | `make board`, status, stop, smoke e compose continuam disponíveis | Porta padrão e intervalo do watcher são lidos da configuração |

## verified_behavior and tests_run_and_results

| # | Comando | Resultado |
|---|---|---|
| 1 | `BOARD_PORT=3105 make board-smoke` | exit 0, 10/10 casos Playwright |
| 2 | `node scripts/build-board.mjs .devtool/features /tmp/multi-harness-board-v3-index.html` | exit 0, 1 card compilado |
| 3 | Cópia limpa, `BOARD_PORT=3106 make board` e `curl http://127.0.0.1:3106/api/cards` | exit 0, 1 card de exemplo; HTML servido |
| 4 | `BOARD_PORT=3106 make board-stop` e verificação de socket | exit 0, processo e watcher encerrados |
| 5 | `node --check` nos módulos do board e `bash -n scripts/worktree-pulse-daemon.sh` | exit 0 |
| 6 | `git diff --check` | exit 0 |

Linha exata para repetir o smoke:

```bash
BOARD_PORT=3105 make board-smoke
```

As portas de produção existentes não foram iniciadas, alteradas ou encerradas. O único processo temporário adicional foi o board da cópia limpa na porta 3106, já parado.

## open_findings

1. As menções existentes a Fulltech Memory em documentação de integração são anteriores a esta entrega e não fazem parte do board. Não há referências específicas de projeto, rede ou card da origem no código do board.
2. `dist/` é um artefato local já não rastreado e pode ser somente leitura neste checkout; os testes usaram `BOARD_DIST` ou diretórios temporários graváveis.

## next_action

Coordenador: revisar o diff e executar a linha de smoke acima. Depois, integrar `feat/board-v3` em `main` sem force-push.
