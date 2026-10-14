# AGENTS.md — Contrato Canônico Multi-Harness Enterprise

Este é o documento de autoridade comum para todos os harnesses usados no projeto (Claude Code, Google Antigravity/Gemini, OpenAI Codex, GitHub Copilot). Arquivos específicos de ferramenta (`CLAUDE.md`, `GEMINI.md`, `copilot-instructions.md`) devem apenas complementar ou apontar para estas regras.

---

## 1. Os 5 Pilares de Engenharia

### Pilar 1: Cérebro de Processo (Spec-Driven & Vertical Slice)
- **Spec-Driven Development (SDD):** Nenhuma funcionalidade não-trivial é implementada sem especificação prévia (`SPEC.md` ou `docs/specs/<feature>.md`). Use a skill `/spec` para entrevista e refinamento de requisitos.
- **Arquitetura em Vertical Slices + DDD:** Cada funcionalidade é entregue como uma fatia vertical completa em `src/features/<feature>/` (camadas `domain`, `application`, `infrastructure`, `presentation`). Use a skill `/vertical-slice`.
- **API-First:** Contratos de API (`docs/api/openapi.yaml` e `asyncapi.yaml`) devem ser definidos antes do código de implementação.
- **Decisões Arquiteturais em ADRs:** Decisões significativas devem ser registradas em `docs/adr/` no formato Nygard (Status, Contexto, Decisão, Consequências).
- **Documentação Diátaxis:** A documentação segue estritamente a taxonomia Diátaxis em `docs/` (`tutorials/`, `how-to/`, `explanation/`, `reference/`).
- **Segurança desde o Início (Security by Design):** Modelagem de ameaças e cumprimento estrito das 13 diretrizes corporativas da Evertec de desenvolvimento seguro com IA.

### Pilar 2: Memória Viva & Continuidade Lossless
- `NOTES.md` é a memória de trabalho contínua do repositório. Deve ser lido no início de cada turno e atualizado ao concluir tarefas ou waves.
- **Protocolo de Continuidade Lossless:** Toda compactação de contexto (`/compact`) conta com snapshot automático do estado do Git e do `NOTES.md` antes da redução, e reinjeção automática de contexto após o resumo.
- **Alinhamento do Roadmap:** A tabela de status em `NOTES.md` deve refletir o plano oficial de ondas em `docs/plan/implementation-waves.md`.

### Pilar 3: Automações & Guardrails Determinísticos
- **Bloqueio de Segredos no Nível de Tool:** Arquivos de credenciais (`.env*`, `*.pem`, `*.key`, `id_rsa`, `service-account*.json`, tokens de cloud) são bloqueados de leitura, edição e commit.
- **Proteção contra Comandos Destrutivos:** Operações de risco (`rm -rf`, `dd`, `mkfs`, `sudo`, `git reset --hard` irrestrito, force-push) são bloqueadas pelos hooks determinísticos.
- **Formatação Automática:** Edições disparam formatters automáticos do ecossistema do projeto (Prettier, Black, Ruff, Rustfmt).
- **Telemetria Efêmera:** Cada ação de tool emite sinal de atividade (`agent-pulse`) para visualização em tempo real no Kanban local (`make board`).

### Pilar 4: Equipe de Especialistas & Multi-Harness
- O projeto disponibiliza agentes e skills especializadas espelhadas em `.claude/skills/` e `.agents/skills/`:
  - `/spec`: Entrevista estruturada e geração de especificação.
  - `/waves`: Decomposição de spec em plano de ondas de implementação com metas verificáveis.
  - `/vertical-slice`: Gerador de fatias verticais DDD agnóstico de stack.
  - `/verify`: Validador com evidência real (testes + linters + smoke).
  - `/ux-designer`: Acervo de 22 guias de boas práticas de UI/UX, acessibilidade e design systems.
  - `/init-project`: Scaffolding inteligente para novos repositórios.
  - `/babysit-pr`: Monitoramento autônomo de CI e comentários em Pull Requests.
  - `/fix-issue`: Investigação sistemática com reprodução obrigatória antes de correções.
  - `/security-check`: Auditoria de segurança corporativa via SafeCode Guardian.
- **Trabalho Paralelo Seguro:** Cada harness simultâneo opera em seu próprio Git Worktree (`make worktree-new NAME=<wave>`). Nunca opere dois agentes no mesmo diretório de trabalho.

### Pilar 5: Loops Supervisionados & Evidência Real
- **Evidência, Não Opinião:** Nunca declare sucesso ou conclusão sem executar ferramentas reais que comprovem o resultado (testes passando, exit code 0, resposta HTTP esperada).
- **Metas Verificáveis com Teto de Tentativas:** Toda execução em loop ou meta (`/goal`) exige uma condição de parada computacional e um teto seguro de iterações (`stop after N tries`).
- **Auditoria Contínua com SafeCode Guardian:** O comando `make audit` executa a checagem das 13 regras Evertec, OWASP Top 10, OWASP LLM & MCP e conformidade SDD, gerando notas de A a F e controle de Red Flags.

---

## 2. Início de Tarefa

1. Leia este arquivo, o entrypoint do seu harness (`CLAUDE.md`, `GEMINI.md` ou `copilot-instructions.md`) e `NOTES.md`.
2. Confirme objetivo, escopo, restrições e Definition of Done.
3. Verifique o estado real do repositório (`git status`, `git branch`, commits recentes) antes de editar.
4. Para tarefa substancial, planeje a spec e a wave correspondente em `NOTES.md`.
5. Se memória persistente estiver configurada (`fulltech-memory`), recupere apenas o contexto relevante. Indisponibilidade de memória externa nunca bloqueia o trabalho local.

---

## 3. Trabalho Paralelo, Backlog.md e Git Worktrees

**Regra de Ouro:** `1 Tarefa = 1 Branch (feat/task-X-...) = 1 Worktree = 1 PR = 1 Contexto`.

- **Tarefas em Backlog.md:** O repositório utiliza o padrão aberto **Backlog.md** em `backlog/tasks/task-X - titulo.md` com YAML frontmatter.
- **Gerenciamento via CLI ou IDE:**
  - Criar tarefa: `backlog task create "Título da entrega" -s "To Do" -p high -a "Codex"`
  - Editar/mover: `backlog task edit task-X -s "In Progress"`
  - Visualizar: `make board` (Fulltech Kanban + telemetria porta 3100) ou `make backlog-browser` (porta 6420).
- **Isolamento Físico de Agentes:**
  - Nunca opere dois harnesses no mesmo diretório de trabalho. Cada executor recebe:
    - Um Git worktree e branch próprios (`make worktree-new NAME=task-X-descricao`);
    - Arquivos e fatias de responsabilidade explícitos;
    - Critérios de conclusão e comandos de verificação (`make verify`);
    - Proibição de editar arquivos reservados a outro executor.

O coordenador integra as branches na branch principal somente após revisão e aprovação em todos os checks.

---

## 4. Continuidade e Hand-off

`NOTES.md` é a fonte local de continuidade. Ao fechar uma wave:
- Atualize status, decisões e próximos passos;
- Liste arquivos alterados e verificações realmente executadas com evidências;
- Registre bloqueios e riscos sem omitir falhas;
- Quando aplicável, grave no Fulltech Memory MCP apenas decisões duráveis ou lições aprendidas, nunca transcrições brutas ou dados sensíveis.

---

## 5. Fulltech Memory MCP (Opcional)

A integração com Fulltech Memory é um acelerador opcional. Consulte `docs/fulltech-memory-integration.md`.
- Descubra ferramentas disponíveis dinamicamente em vez de assumir prefixos estáticos;
- Não versione tokens nem exponha dados confidenciais;
- Mantenha sempre o registro local em `NOTES.md` como fallback independente de rede.

---

## 6. Git, Segurança e Qualidade

- **Branches:** `feat/<wave>-<descricao>`, `fix/<descricao>`, `chore/<descricao>`.
- **Commits:** Padrão Conventional Commits (`feat(auth): add login endpoint`, etc.).
- **Proibição de Force-Push:** Nunca force push em `main` ou branches compartilhadas.
- **Dependências:** Novas bibliotecas exigem justificativa, verificação de reputação e ausência de vulnerabilidades conhecidas.
- **Tipagem Estrita:** TypeScript não usa `any` sem justificativa técnica formal.
- **Revisão de Segurança:** Validação obrigatória no backend, queries parametrizadas (Prepared Statements), proteção contra IDOR/BOLA e rate limiting em endpoints críticos.

---

<!-- guardiao-baseline:start -->
## Baseline de conformidade do Guardião Fulltech

A baseline canônica fica em `~/projetos/00-Guidelines/baseline/CATALOGO.md` (versão fixada em `baseline/VERSION`); procedimentos em `baseline/ADOTAR.md` e `baseline/VERIFICACAO.md`. Não replique nem edite a baseline dentro deste projeto.

- **Auditoria Local Instantânea:** Execute `make audit` para avaliar a aderência imediata deste repositório ao SafeCode Guardian (13 regras Evertec, OWASP Top 10, OWASP LLM & MCP, Scorecard de Arquitetura SDD).
- **Gatilho manual:** Quando o usuário disser **“sincronizar aderência com o Guardião”** (ou **“atualizar conformidade do Guardião”**), carregue a skill global `guardian-sync`, faça o de-para completo dos controles da versão fixada contra este projeto e atualize o painel central.
- Mantenha `docs/compliance/guardiao-baseline.md` como de-para legível deste projeto: versão da baseline, revisão avaliada, data, revisor e tabela dos controles com status, justificativa e caminhos de evidência.
- Atualize `~/projetos/00-Guidelines/monitor/assessments/<nome-exato-da-pasta-do-projeto>.json` que alimenta o portal do Guardião em `http://localhost:8765/#safecode`.
<!-- guardiao-baseline:end -->
