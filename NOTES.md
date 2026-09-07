# NOTES.md — Rastreamento de Desenvolvimento em Waves

> **Documento de continuidade:** Atualizado a cada entrega de Wave e antes de `/compact`.  
> Todo harness (Antigravity, Claude Code ou Codex) deve ler este arquivo ao iniciar uma nova sessão para ancorar o contexto.

---

## 1. Visão do Projeto e Objetivo Atual

- **Repositório:** `<nome-do-repositorio>`
- **Objetivo Central:** 
- **Status Geral:** `Wave 0 — Especificação e Alinhamento`

---

## 2. Premissas e Decisões Ativas

- [x] Contrato canônico estabelecido em [AGENTS.md](AGENTS.md).
- [x] Memória persistente centralizada no Muninn.
- [ ] *Adicione decisões arquiteturais ou técnicas aqui...*

---

## 3. Backlog de Waves

### Wave 0: Especificação, Arquitetura e Contrato
- **Objetivo:** Definir requisitos, modelagem de dados, stack e validar premissas com o usuário.
- **DoD (Definition of Done):**
  - [ ] Requisitos e fluxos mapeados.
  - [ ] Estrutura de pastas e contratos de API definidos.
  - [ ] Validação com o usuário realizada.
- **Tarefas:**
  - [ ] Mapear entidades do sistema
  - [ ] Validar integrações externas e variáveis de ambiente necessárias

---

### Wave 1: Fundação e Core Backend
- **Objetivo:** Subir infraestrutura mínima, banco de dados e regras de negócio essenciais.
- **DoD:**
  - [ ] Migrações rodando e testadas.
  - [ ] Endpoints ou casos de uso principais cobertos por testes unitários (`make test`).
- **Tarefas:**
  - [ ] Implementar migrations e schemas
  - [ ] Implementar repositórios / serviços do core
  - [ ] Criar testes unitários

---

### Wave 2: Frontend, Interface e Integração
- **Objetivo:** Interface com design apurado, consumo das APIs e estados interativos.
- **DoD:**
  - [ ] UI responsiva, sem placeholders quebrados.
  - [ ] Fluxo principal testado via browser automation.
- **Tarefas:**
  - [ ] Criar componentes base
  - [ ] Conectar queries/mutations
  - [ ] Validar UX no Antigravity

---

## 4. Log de Hand-off entre Harnesses

| Data / Hora | Harness | Wave / Tarefa | O que foi feito | Próximo Passo |
| :--- | :--- | :--- | :--- | :--- |
| *Ex: 2026-09-07* | 🧠 Claude Code | W0: Arquitetura | Criada a modelagem relacional em `schema.sql` | 🪐 AGY: Criar componentes de tela |
| *Ex: 2026-09-07* | 🪐 Antigravity | W2: Telas | Implementado formulário com validação Zod | ⚡ Codex: Escrever testes unitários |
