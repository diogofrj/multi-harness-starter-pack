# RUNBOOK.md — Guia Operacional do Starter Pack

Guia prático e índice de referência de tudo o que este repositório oferece, como os componentes se organizam e o que cada comando do `Makefile` executa.

---

## Índice

1. [Visão Geral em 1 Minuto](#1-visão-geral-em-1-minuto)
2. [Mapa da Estrutura (O que é cada coisa)](#2-mapa-da-estrutura-o-que-é-cada-coisa)
3. [Catálogo de Comandos do Makefile](#3-catálogo-de-comandos-do-makefile)
4. [Catálogo de Skills & Agentes](#4-catálogo-de-skills--agentes)
5. [Fluxos Rápidos de Uso (Cheat Sheet)](#5-fluxos-rápidos-de-uso-cheat-sheet)

---

## 1. Visão Geral em 1 Minuto

O **Multi-Harness Enterprise Starter Pack** transforma o uso de assistentes de IA (Claude Code, Antigravity/Gemini, Codex, Copilot) em um processo disciplinado de engenharia de software:

- **Contrato Universal:** Todos os harnesses seguem o mesmo contrato canônico ([`AGENTS.md`](AGENTS.md)).
- **Engenharia Rigorosa:** Nenhuma feature sem spec (`/spec`), código em fatias verticais DDD (`/vertical-slice`), contratos API-First e ADRs formato Nygard.
- **Continuidade Lossless:** O contexto nunca se perde no `/compact` graças aos hooks de snapshot e restauração automática.
- **Telemetria Local:** Um Kanban Board em tempo real via SSE mostra os agentes em execução e o roadmap de waves.
- **Conformidade Corporativa:** Auditoria nativa com o **SafeCode Guardian** (13 diretrizes Evertec, OWASP e SDD) via `make audit`.
- **Scaffolding Inteligente:** Crie novos projetos customizados em segundos via `make new-project` sem copiar e colar pastas.

---

## 2. Mapa da Estrutura (O que é cada coisa)

| Caminho | O que é | Para que serve |
| :--- | :--- | :--- |
| **[`AGENTS.md`](AGENTS.md)** | **Contrato Canônico** | Autoridade suprema e regras de engenharia compartilhadas por todos os harnesses. |
| **[`CLAUDE.md`](CLAUDE.md)** | Entrypoint Claude Code | Ponto de entrada do Claude Code com comandos e atalhos de skills. |
| **[`GEMINI.md`](GEMINI.md)** | Entrypoint Antigravity | Ponto de entrada do Google Antigravity/Gemini (`agy`) com slash commands recomendados. |
| **[`.github/copilot-instructions.md`](.github/copilot-instructions.md)** | Entrypoint Copilot | Diretrizes para desenvolvimento com GitHub Copilot no VS Code/JetBrains. |
| **[`NOTES.md`](NOTES.md)** | **Memória Viva** | Documento de continuidade entre sessões: status atual, roadmap de ondas e hand-off. |
| **[`rules/`](rules/)** | Regras de Engenharia | Padrões de testes (TDD), estilo de código, git workflow, segurança e criação de agentes (symlinkadas em `.claude/rules/`). |
| **[`docs/`](docs/)** | **Documentação Diátaxis** | Estrutura organizada em `tutorials/`, `how-to/` (loops), `explanation/`, `reference/`, `adr/` (ADRs Nygard), `api/` (OpenAPI/AsyncAPI) e `specs/`. |
| **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** | Arquitetura & Ameaças | Modelo de fronteiras de confiança, segurança de rede e conformidade Evertec. |
| **[`.claude/hooks/`](.claude/hooks/)** | Guardrails Automáticos | Hooks determinísticos: bloqueio de segredos, proteção bash, compactação lossless e telemetria de agentes. |
| **[`.claude/skills/`](.claude/skills/)** | Skills Especializadas | Ferramentas invocáveis como comandos (`/spec`, `/waves`, `/vertical-slice`, `/verify`, `/init-project`, etc.). |
| **[`.agents/skills/`](.agents/skills/)** | Symlinks Multi-Harness | Espelhamento automático de todas as skills para Codex e Antigravity. |
| **[`.claude/agents/`](.claude/agents/)** | Agentes Especialistas | Personas de subagentes: `code-reviewer`, `threat-modeler`, `test-runner`, `web-researcher`. |
| **[`backlog/`](backlog/)** | **Backlog.md & Config** | Diretório canônico de tarefas Markdown (`backlog/tasks/`), configuração do board (`config.yml`) e mapeamento de modelos (`harness-models.json`). |
| **[`scripts/init-project.mjs`](scripts/init-project.mjs)** | Scaffolder de Projetos | Script que instancia novos repositórios limpos a partir deste template. |
| **[`server.mjs`](server.mjs)** | Servidor Kanban SSE | Backend Node leve (zero deps pesadas) que serve o Kanban local em tempo real na porta 3100. |

---

## 3. Catálogo de Comandos do Makefile

Execute `make help` no terminal para listar todos os comandos disponíveis:

### A. Scaffolding & Gestão de Projetos
| Comando | O que faz | O que sobe / afeta |
| :--- | :--- | :--- |
| `make new-project` | Instancia um novo repositório limpo, substitui `<placeholders>`, inicializa git e roda auditoria inicial. | Cria pasta em `../<nome>` e valida nota A. |
| `make retrofit` | Adequa um repositório existente (`TARGET=/caminho/repo`) aos contratos, guardrails, Backlog.md e Makefile do starter pack sem destruir histórico. | Atualiza contratos e injeta governança. |
| `make spec` | Exibe instruções para conduzir a entrevista de Spec-Driven Development via `/spec` ou `/plan`. | Apenas informativo no terminal. |
| `make waves` | Exibe instruções para derivar o plano de ondas em `docs/plan/implementation-waves.md`. | Apenas informativo no terminal. |

### B. Desenvolvimento & Qualidade
| Comando | O que faz | O que sobe / afeta |
| :--- | :--- | :--- |
| `make install` | Detecta a stack do projeto (`pnpm`, `npm`, `poetry`, `uv`, `pip`) e instala as dependências. | Instala pacotes locais. |
| `make dev` | Executa o servidor de desenvolvimento local configurado no projeto. | Sobe o app na porta da sua aplicação. |
| `make lint` | Executa os linters configurados (`eslint`, `ruff`, etc.). Falha se ausente. | Checagem estática de sintaxe. |
| `make typecheck` | Executa a checagem de tipos estrita (`tsc`, `mypy`). Falha se ausente. | Validação de tipos. |
| `make test` | Roda a suíte de testes unitários e de integração (`vitest`, `jest`, `pytest`). | Executa testes automatizados. |
| `make test-watch` | Executa os testes em modo watch contínuo durante o desenvolvimento. | Observador de arquivos de teste. |

### C. Segurança & Auditoria Corporativa
| Comando | O que faz | O que sobe / afeta |
| :--- | :--- | :--- |
| `make audit` | Executa o motor **SafeCode Guardian** no repositório atual ou externo (`TARGET=/caminho/repo`): valida 13 regras Evertec, OWASP Top 10, LLM/MCP e SDD. | Gera scorecard JSON com nota (A a F) e Red Flags. |
| `make audit-report` | Exibe o relatório detalhado de auditoria no terminal (Red Flags, violações com arquivo:linha, snippets de código, remediações e links oficiais). | Diagnóstico imediato no terminal. |
| `make verify` | Verificação completa end-to-end antes de fechar uma entrega: executa os gates de qualidade e a auditoria do SafeCode Guardian com evidências. | Evidência de conclusão para o hand-off. |

### D. Kanban, Backlog & Telemetria em Tempo Real
| Comando | O que faz | O que sobe / afeta |
| :--- | :--- | :--- |
| `make board` | Sobe o servidor web local em background e inicia o daemon de presença de worktrees. | **Sobe `http://localhost:3100`** (Fulltech Kanban SSE). |
| `make backlog-browser` | Sobe o visualizador interativo oficial do Backlog.md na porta configurada. | **Sobe `http://localhost:6420`** (Backlog.md UI). |
| `make board-all` | Sobe concorrentemente o Fulltech Kanban (telemetria) e o Backlog.md Browser. | Portas 3100 e 6420 integradas. |
| `make board-docker` | Sobe o Kanban Board encapsulado via Docker Compose. | Sobe container na porta 3100. |
| `make board-status` | Informa se o servidor do board, o backlog browser e o watcher de processos estão ativos. | Checagem de status via curl. |
| `make board-stop` | Encerra o servidor local do board, o backlog browser e mata o daemon de telemetria. | Libera as portas 3100/6420 e para processos. |
| `make pulse-watch` | Publica em tempo real a presença dos harnesses em cada worktree. | Watcher em foreground. |

### E. Trabalho Paralelo com Git Worktrees
| Comando | O que faz | O que sobe / afeta |
| :--- | :--- | :--- |
| `make worktree-new NAME=wave-1` | Cria um diretório de trabalho isolado em `../worktrees/<nome>` com uma branch `feat/<nome>`. | Permite múltiplos agentes sem conflito de arquivos. |
| `make worktree-list` | Lista todos os worktrees ativos no repositório. | Consulta via git worktree list. |
| `make worktree-clean` | Remove referências de worktrees antigos ou excluídos do disco. | Executa `git worktree prune`. |

---

## 4. Catálogo de Skills & Agentes

Todas as skills ficam disponíveis para **Claude Code** (`/comando`), **Antigravity** e **Codex**:

- **`/spec [feature]`**: Entrevista guiada de requisitos funcionais, não-funcionais, edge cases e modelo de dados. Gera `docs/specs/<feature>.md`.
- **`/waves [spec]`**: Decompõe a especificação em fatias sequenciais/paralelas com metas computacionais (`/goal`) e sincroniza a tabela de status em `NOTES.md`.
- **`/vertical-slice <feature>`**: Cria o scaffold de uma fatia vertical completa em DDD (`domain`, `application`, `infrastructure`, `presentation`) para qualquer linguagem (Python, TypeScript, Go, Rust).
- **`/verify`**: Valida a entrega executando gates estáticos e comportamentais antes de reportar conclusão.
- **`/init-project`**: Assistente de scaffolding para inicializar novos projetos a partir deste repositório.
- **`/retrofit-starter-pack [caminho]`**: Adequa e moderniza repositórios legados existentes aos padrões do starter pack e SafeCode Guardian.
- **`/ux-designer`**: Acervo com **22 manuais de boas práticas de UX/UI** (design systems, acessibilidade, formulários, tabelas, canvas, AI UX, mobile).
- **`/babysit-pr <pr>`**: Monitora CI e comentários de revisão no GitHub, aplicando correções automaticamente.
- **`/fix-issue <issue>`**: Fluxo sistemático de depuração com reprodução obrigatória antes de qualquer correção.
- **`/security-check`**: Auditoria de segurança corporativa Security by Design integrada com o SafeCode Guardian.
- **`/commit`**: Geração de commits estruturados no padrão Conventional Commits com escopo.
- **`/readme-format`**: Padronização da documentação de READMEs no estilo corporativo da Fulltech.

---

## 5. Fluxos Rápidos de Uso (Cheat Sheet)

### Criar um Novo Projeto
```bash
make new-project NAME=faturamento-api STACK=node DESC="Microserviço de Cobranças"
cd ../faturamento-api
make install
```

### Adequar Repositório Existente (Retrofit)
```bash
# Executa a adequação automática sem destruir o código ou histórico
make retrofit TARGET=/home/ubuntu/projetos/_Fulltech/fulltech-memory

# Ou via comando/skill no chat:
/retrofit-starter-pack /home/ubuntu/projetos/_Fulltech/fulltech-memory
```

### Iniciar uma Nova Funcionalidade (Wave)
1. Abra o Claude Code ou Antigravity na pasta do projeto.
2. Execute `/spec pagamentos-pix` para definir os requisitos em `docs/specs/pagamentos-pix.md`.
3. Execute `/waves` para gerar o plano em `docs/plan/implementation-waves.md` e atualizar o `NOTES.md`.
4. Crie o worktree isolado:
   ```bash
   make worktree-new NAME=wave-1-pix
   ```
5. Implemente a fatia vertical usando `/vertical-slice pagamentos-pix`.
6. Valide a entrega com evidências:
   ```bash
   make verify
   ```
7. Atualize o `NOTES.md` com as evidências e o status ✅.

### Auditar a Segurança com o SafeCode Guardian
- **Auditar o próprio projeto:**
  ```bash
  make audit
  make audit-report
  ```
- **Auditar repositório externo (ex: fulltech-memory):**
  ```bash
  make audit TARGET=/home/ubuntu/projetos/_Fulltech/fulltech-memory
  make audit-report TARGET=/home/ubuntu/projetos/_Fulltech/fulltech-memory
  ```
- **Dashboard Central Interativo com Remediações Visuais:**
  Acesse **`http://localhost:8765/#safecode`** no navegador para ver trechos de código antes/depois, links oficiais e filtros por severidade.

### Gerenciar Tarefas no Backlog.md (Kanban & Telemetria)
- **Criar tarefa via CLI:**
  ```bash
  backlog task create "Implementar webhook PIX" -s "To Do" -p high -a "Codex"
  ```
- **Listar tarefas:**
  ```bash
  backlog task list
  ```
- **Visualizar painéis:**
  - `make board`: Abre o Fulltech Kanban com telemetria de agentes em tempo real na porta `3100`.
  - `make backlog-browser`: Abre a interface oficial do Backlog.md na porta `6420`.
  - `make board-all`: Inicia ambos os serviços simultaneamente.
- **Extensão VS Code / Cursor:**
  - Instale a extensão oficial recomendada: `ysamlan.vscode-backlog-md` para visualizar e editar o quadro direto na IDE.

