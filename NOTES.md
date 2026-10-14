# NOTES.md — Estado e hand-off

Todos os harnesses devem ler este arquivo no início e atualizá-lo ao concluir uma wave.

## Projeto

- **Repositório:** <owner/repo>
- **Objetivo:** <resultado esperado>
- **Status:** Wave 0 — especificação
- **Coordenador:** <harness/pessoa>

## Decisões ativas

- [x] `AGENTS.md` é o contrato canônico.
- [x] Um worktree por executor simultâneo.
- [ ] Stack e arquitetura validadas.
- [ ] Memória persistente: desativada / Fulltech Memory / outro.

## Waves

### Board v3 genérico no starter pack

- **Objetivo:** portar com paridade o Board v3 validado, centralizar sua configuração e comprovar o template em cópia limpa.
- **Responsável:** Codex, papel C.
- **Branch:** `feat/board-v3`.
- **Arquivos reservados:** board, telemetria, Makefile, compose e documentação associada.
- **DoD:**
  - [x] `backlog/config.yml` e padrão Backlog.md (`backlog/tasks/`) como fonte única da configuração e tarefas.
  - [x] Fusão concluída: Fulltech SSE Kanban (3100) integrado com Backlog.md Browser (6420).
  - [x] Hand-off preparado e auditoria SafeCode Guardian Grau A.

### Wave 0 — Especificação e arquitetura

- **Objetivo:** <objetivo>
- **Responsável:** <responsável>
- **Worktree/branch:** <caminho> / <branch>
- **Arquivos reservados:** <paths>
- **DoD:**
  - [ ] Requisitos e riscos documentados.
  - [ ] Contratos e limites definidos.
  - [ ] Plano de testes definido.

### Wave 1 — Core

- **Objetivo:** <objetivo>
- **Responsável:** <responsável>
- **Worktree/branch:** <caminho> / <branch>
- **Arquivos reservados:** <paths>
- **DoD:**
  - [ ] Implementação concluída.
  - [ ] Testes relevantes passando.
  - [ ] Evidências registradas.

### Wave 2 — Integração e experiência

- **Objetivo:** <objetivo>
- **Responsável:** <responsável>
- **Worktree/branch:** <caminho> / <branch>
- **Arquivos reservados:** <paths>
- **DoD:**
  - [ ] Fluxo principal e erros validados.
  - [ ] Acessibilidade/responsividade verificadas quando aplicável.
  - [ ] Revisão pronta para integração.

## Hand-offs

| Data UTC | Harness | Wave | Commit/branch | Checks executados | Resultado | Próximo passo |
|---|---|---|---|---|---|---|
| <data> | <harness> | <wave> | <ref> | <comandos> | <resultado> | <ação> |
| 2026-09-21 | Codex | Board v3 | `feat/board-v3` | `BOARD_PORT=3105 make board-smoke`; cópia limpa na 3106 | 10/10; `/api/cards` serviu card; processos encerrados | Revisão e merge pelo coordenador |
| 2026-09-21 | Codex | Board v3 | `feat/board-v3` | `BOARD_PORT=3105 make board-smoke`; cópia limpa na 3106 | 10/10; `/api/cards` serviu card; processos encerrados | Revisão e merge pelo coordenador |

## Bloqueios e incidentes

| Data UTC | Origem | Classe | Impacto | Tentativas seguras | Consentimento/evidência | Estado |
|---|---|---|---|---|---|---|
