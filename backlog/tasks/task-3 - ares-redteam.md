---
id: task-3
title: Instalação e Configuração do ARES (Automated Red Team Engagement System)
status: Done
assignee: [Odin]
created_date: '2026-10-19 00:35'
labels: [security, redteam, osint, ares, odin]
dependencies: []
ordinal: 3000
---

## Description
<!-- SECTION:DESCRIPTION:BEGIN -->
Instalação, compilação de assets e configuração do ARES (Mafifrizi/ARES v6.0.0 Enterprise).
- Clone em `/home/ubuntu/projetos/ARES`
- Virtualenv Python 3.12 com dependências completas (`.[dev,pdf,full]`)
- Frontend Vite + React 19 compilado com sucesso (`npm ci` & `npm run build`)
- Configuração de `.env` com chaves seguras e hash AES-256-GCM
- Migrações de banco SQLite executadas via Alembic (`alembic upgrade head`)
- Validação executada via `ares doctor --pdf-smoke` com 34/37 checagens aprovadas
<!-- SECTION:DESCRIPTION:END -->

## Verify
- [x] Repositório clonado e venv isolado
- [x] Dependências completas instaladas
- [x] Chaves de criptografia e admin configuradas
- [x] Banco de dados migrado via Alembic
- [x] Frontend compilado
- [x] ares doctor validado
