---
id: task-4
title: Instalação e Execução de Teste do Harness2 (Google Research)
status: Done
assignee: [Odin]
created_date: '2026-10-19 00:36'
labels: [ai, agents, harness2, google-research, odin]
dependencies: []
ordinal: 4000
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Instalação e verificação do Harness² (Google Research: google-research/harness2).
Framework de Recursive Agent Harnessing (RSI) para agentes em ambientes de mundo aberto.
- Clone em `/home/ubuntu/projetos/harness2`
- Ambiente isolado via `uv venv --python 3.12 .venv`
- Instalação do pacote em modo editável com suporte a renderização: `uv pip install -e '.[render]'`
- Demonstração validada: `harness2-demo --output runs/demo --k 2` (2/2 ok, 0 falhas)
<!-- SECTION:DESCRIPTION:END -->

## Verify
- [x] Repositório clonado e uv venv configurado
- [x] Dependências de renderização instaladas
- [x] harness2-demo executado com 2/2 testes passando com sucesso
