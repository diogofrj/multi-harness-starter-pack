# GEMINI.md — Antigravity Harness Entrypoint

> Arquivo de inicialização do **Google Antigravity (AGY)** para este repositório.
> O contrato canônico universal de engenharia, conduta e arquitetura está em [AGENTS.md](AGENTS.md).

---

## 1. Contexto do Harness

- **Harness:** Antigravity IDE / Antigravity 2.0
- **Papel primário:** Orquestração de tarefas fullstack, engenharia de frontend/UI, automação de testes com navegador integrado, inspeção visual de diffs e planejamento assistido.
- **Memória de longo prazo:** [MCP Muninn](.mcp.json) (buscar antes de agir; registrar aprendizado durável ao finalizar).

---

## 2. Instruções de Operação no Antigravity

1. **Início de Tarefa:**
   - Leia as convenções locais em [CLAUDE.md](CLAUDE.md) para comandos da stack (`make dev`, `make test`, etc.).
   - Consulte o estado atual da sprint/entrega no [NOTES.md](NOTES.md).
   - Se a tarefa for complexa ou envolver decisões estruturais, ative o **Planning Mode** e gere um plano antes de alterar arquivos.
2. **Skills e Customizações:**
   - As skills do projeto estão centralizadas em `.claude/skills/` e espelhadas em `.agents/skills/`.
   - Invoque skills especializadas via `/` ou progressive disclosure (ex.: `code-review-b2`, `security-check`, `frontend-design`).
3. **Execução e Verificação:**
   - Execute comandos determinísticos preferencialmente via `Makefile` (`make lint`, `make typecheck`, `make test`).
   - Use o browser subagent nativo para validar páginas web, responsividade e fluxos de usuário quando aplicável.
4. **Fechamento de Ciclo:**
   - Atualize os checkboxes de tarefas no [NOTES.md](NOTES.md).
   - Registre novos aprendizados no Muninn conforme estipulado em [AGENTS.md](AGENTS.md).
