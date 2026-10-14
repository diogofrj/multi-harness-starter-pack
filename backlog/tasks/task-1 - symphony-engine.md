---
id: task-1
title: Motor opcional de orquestração inspirado no Symphony
status: To Do
assignee: []
created_date: '2026-10-14 11:15'
labels: [orchestration, symphony, codex, board]
dependencies: []
ordinal: 1000
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Absorver o modelo do Symphony como motor opcional do starter pack, preservando os contratos multi-harness e o funcionamento atual sem orquestrador.

### Referências
- Repositório original: [openai/symphony](https://github.com/openai/symphony)
- Especificação: [Symphony Service Specification](https://github.com/openai/symphony/blob/main/SPEC.md)

### Fluxo inicial
`ready → claim/worktree → execução Codex → hand-off/evidências → review`

### Escopo da primeira versão
- Tracker baseado em `backlog/tasks/*.md`.
- Reserva executável com dono e geração.
- Worktree isolado por card.
- Runner exclusivo para Codex app-server.
- Snapshot autoritativo do orquestrador consumido pelo board.
- Pulse de processos mantido apenas como diagnóstico.
- Parada obrigatória em `review`.
<!-- SECTION:DESCRIPTION:END -->

## Verify
- [ ] O modo atual continua funcionando sem configuração adicional.
- [ ] Um card elegível não pode ser executado simultaneamente duas vezes.
- [ ] Cada execução ocorre somente no worktree correspondente ao card.
- [ ] Reinícios reconciliam cards e workspaces sem duplicar trabalho.
- [ ] Falhas transitórias usam retry limitado e observável.
- [ ] Mudanças de elegibilidade cancelam ou liberam a execução.
- [ ] O board mostra o estado autoritativo do orquestrador; pulse não determina correção.
- [ ] Uma execução bem-sucedida produz hand-off com evidências e move o card somente até `review`.
- [ ] Verificação independente e integração sequencial permanecem humanas.
- [ ] Testes cobrem claim concorrente, retomada, retry, cancelamento, isolamento e compatibilidade com o modo manual.
