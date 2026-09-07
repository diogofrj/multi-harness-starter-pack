# CLAUDE.md — Claude Code Harness Entrypoint

> Esse arquivo é lido pelo Claude no início de toda conversa.
> **Mantenha curto e humano.** O contrato canônico universal de regras e conduta está em [AGENTS.md](AGENTS.md).
> Para regras determinísticas, use `.claude/settings.json`. Para conhecimento sob demanda, use `.claude/skills/`.

---

## Stack do Projeto

- **Backend:** 
- **Frontend:** 
- **Banco / Infra:** 
- **Memória / Segundo Cérebro:** [MCP Muninn](.mcp.json)

---

## Comandos Essenciais

```bash
# Setup
make install            # Instala dependências do projeto
make dev                # Inicia o servidor de desenvolvimento

# Qualidade e Verificação
make lint               # Executa linter estático
make typecheck          # Verificação estrita de tipos
make test               # Executa suite de testes unitários/integração

# Deploy
make deploy-staging     # Deploy em ambiente de homologação
make deploy-prod        # Deploy em produção (após testes verdes)
```

---

## Convenções Rápidas

- **Contrato Universal:** Siga as diretrizes de conduta, cirurgia e Muninn em [AGENTS.md](AGENTS.md).
- **Acompanhamento:** Verifique o objetivo da Wave atual no [NOTES.md](NOTES.md).
- **Branches:** `feat/<wave>-<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- **PRs:** Descreva o "porquê" da mudança, com critério de validação claro.
- **Testes:** TDD onde a complexidade exigir; testes devem ler como especificação viva.

---

## Especialistas Sob Demanda (Skills)

- Revisão de código de alto padrão: invoque a skill `code-review-b2`.
- Auditoria de segurança e vulnerabilidades: invoque a skill `security-check`.
- Engenharia de UI e frontend: invoque a skill `frontend-design`.
- Padronização e automação de commit: invoque a skill `commit`.

---

## O que NÃO fazer

- Não commitar nem exibir no chat arquivos `.env*` ou segredos.
- Não usar `any` em TypeScript sem justificativa explícita.
- Não fazer `git push --force` em `main`.
- Não adicionar bibliotecas externas sem auditoria prévia.
- Não refatorar código não quebrado fora do escopo da tarefa atual.
