<div align="center">

<img src="claude-lendo.png" alt="Multi-Harness Starter Pack" width="160">

# ⚡ Multi-Harness Starter Pack
### *Google Antigravity · Claude Code · Codex*

**A fundação definitiva para desenvolvimento de software governado por agentes e múltiplos harnesses.**  
*Contrato Canônico Único · Memória Persistente (Muninn MCP) · Desenvolvimento em Waves · Blindagem contra Amnésia e Vazamentos.*

<br>

[![Antigravity](https://img.shields.io/badge/Antigravity-IDE_%26_CLI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://antigravity.google)
[![Claude Code](https://img.shields.io/badge/Claude_Code-v2.1%2B-D97757?style=for-the-badge&logo=anthropic&logoColor=white)](https://claude.ai)
[![Codex](https://img.shields.io/badge/Codex-CLI-10A37F?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![Muninn](https://img.shields.io/badge/Second_Brain-MCP_Muninn-9333EA?style=for-the-badge)](https://muninn.fulltech.app)
[![License](https://img.shields.io/badge/license-MIT-3FB950?style=for-the-badge)](LICENSE)

</div>

---

## 📑 Índice

- [🎯 O que é e Por que Existe](#-o-que-é-e-por-que-existe)
- [🏛️ A Arquitetura dos 5 Pilares](#️-a-arquitetura-dos-5-pilares)
- [🎭 Divisão de Papéis Multi-Harness](#-divisão-de-papéis-multi-harness)
- [🌊 Protocolo de Desenvolvimento em Waves](#-protocolo-de-desenvolvimento-em-waves)
- [🚀 Quick Start (Começando um Projeto Novo)](#-quick-start-começando-um-projeto-novo)
- [🧠 Segundo Cérebro Compartilhado (Muninn MCP)](#-segundo-cérebro-compartilhado-muninn-mcp)
- [🗂️ Estrutura de Pastas](#️-estrutura-de-pastas)
- [🛡️ Guardrails e Hooks Determinísticos](#️-guardrails-e-hooks-determinísticos)
- [🛠️ Comandos do Makefile](#️-comandos-do-makefile)

---

## 🎯 O que é e Por que Existe

Ao trabalhar com múltiplos agentes de IA (**Antigravity**, **Claude Code** e **Codex**), todo projeto novo sofre dos mesmos 3 gargalos:

1. **Amnésia Cruzada:** O que um harness decide em uma sessão é ignorado pelo outro.
2. **Duplicação de Regras:** Ter que manter e sincronizar arquivos de regras diferentes (`CLAUDE.md`, `GEMINI.md`, prompts soltos).
3. **Colisão de Arquivos:** Rodar agentes simultâneos sobre a mesma árvore de arquivos gera race conditions e merges quebrados.

O **Multi-Harness Starter Pack** resolve isso na raiz. Ele fornece um **contrato canônico universal (`AGENTS.md`)**, pontes específicas para cada harness, uma esteira padronizada de **desenvolvimento em Waves (`NOTES.md`)** e integração nativa com o **Segundo Cérebro (MCP Muninn)**.

---

## 🏛️ A Arquitetura dos 5 Pilares

```
                            ┌────────────────────────┐
                            │      AGENTS.md         │
                            │  Contrato Universal    │
                            └──────────┬─────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
   ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
   │    CLAUDE.md    │        │    GEMINI.md    │        │      Codex      │
   │  (Claude Code)  │        │  (Antigravity)  │        │   (CLI/Editor)  │
   └────────┬────────┘        └────────┬────────┘        └────────┬────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │      MCP MUNINN (Memória)     │
                       │   Decisões · Lições · Regras  │
                       └───────────────────────────────┘
```

| Pilar | Arquivo | Função |
| :--- | :--- | :--- |
| 📜 **Contrato Canônico** | `AGENTS.md` | O documento central de verdade que **todos os harnesses leem**. Define ética de engenharia (cautela > velocidade, cirurgia de código, sem dead code). |
| 🪐 **Ponte Antigravity** | `GEMINI.md` + `.agents/` | Apontador do Antigravity IDE. Expõe skills e regras contextuais para o ecossistema Google. |
| 🧠 **Ponte Claude Code** | `CLAUDE.md` + `.claude/` | Apontador enxuto do Claude Code, integrando hooks de segurança e comandos essenciais de build/test. |
| 🌊 **Protocolo de Waves** | `NOTES.md` | Rastreamento da entrega em fatias ordenadas (Wave 0 Spec → Wave 1 Core → Wave 2 UI). Evita amnésia no `/compact`. |
| 🔌 **Barramento MCP** | `.mcp.json` | Ponto de conexão unificado com o **Muninn** e ferramentas de infraestrutura. |

---

## 🎭 Divisão de Papéis Multi-Harness

Cada harness é excelente em uma etapa do ciclo de desenvolvimento:

| Harness | Superpoder | Casos de Uso Ideais |
| :--- | :--- | :--- |
| 🪐 **Antigravity (AGY)** | Visão fullstack, orquestração visual, testes com browser nativo | Construção de UI/Design System, validação de responsividade com browser subagent, inspeção interativa de diffs. |
| 🧠 **Claude Code** | Raciocínio arquitetural profundo, depuração intrincada | Desenho de schemas, modelagem DDD/VSA, resolução de bugs difíceis, auditorias de segurança e code review estrito. |
| ⚡ **Codex** | Execução cirúrgica, geração em lote no terminal | Automação de migrações, scripts de seed, geração rápida de testes unitários repetitivos. |

> [!TIP]
> **Concorrência sem colisão:** Se precisar rodar Claude Code e Antigravity ao mesmo tempo, use **Git Worktrees** (`make worktree-new NAME=minha-wave`). Nunca rode dois agentes na mesma pasta simultaneamente!

---

## 🌊 Protocolo de Desenvolvimento em Waves

O fluxo canônico para entregar projetos sem alucinação e sem perda de contexto:

```
[Wave 0: Spec & DoD] ──► [Wave 1: Core Backend] ──► [Wave 2: Frontend & E2E] ──► [Hand-off / Deploy]
        │                           │                           │
  Definir regras              Migrations, APIs            Telas, Componentes            Check verde
  e validar premissas         e testes unitários          e validação no browser        e registro Muninn
```

1. **Wave 0 (Spec & DoD):** No início da tarefa, preencha o `NOTES.md`. Defina claramente o que será construído, as premissas e a Definition of Done (DoD).
2. **Execução Fatiada:** Cada harness executa a wave na sua especialidade, marcando os checkboxes no `NOTES.md`.
3. **Hand-off limpo:** Ao fechar uma wave, registre no log do `NOTES.md`, salve lições duráveis no Muninn e rode `/compact`. O próximo harness re-ancora instantaneamente.

---

## 🚀 Quick Start (Começando um Projeto Novo)

Pegou um projeto novo ou vai começar do zero? Siga este roteiro de 3 minutos:

### 1. Copie o starter pack para o seu novo projeto
```bash
# Clone ou copie para a raiz do seu novo repositório
cp -a /caminho/para/multi-harness-starter-pack/. /meu-novo-projeto/
cd /meu-novo-projeto
```

### 2. Preencha os campos da stack
No arquivo `CLAUDE.md`, defina a stack do seu projeto:
```markdown
## Stack do Projeto
- **Backend:** Node.js 22 + Fastify + Prisma
- **Frontend:** Next.js 15 (App Router) + TailwindCSS
- **Banco / Infra:** PostgreSQL + Supabase
- **Memória:** MCP Muninn
```

### 3. Inicie a Wave 0 no `NOTES.md`
Abra o `NOTES.md` e descreva o objetivo da sprint na seção **Wave 0**.

### 4. Comece a codar no seu harness preferido
* No **Antigravity**: Abra a pasta no IDE e interaja pelo painel de Chat/Agent.
* No **Claude Code**: Execute `claude` no terminal.
* No **Codex**: Invoque comandos de geração rápida.

---

## 🧠 Segundo Cérebro Compartilhado (Muninn MCP)

O repositório já vem preparado para conectar-se ao **MCP Muninn** via `.mcp.json`:

```json
{
  "$schema": "https://json.schemastore.org/mcp.json",
  "mcpServers": {
    "muninn": {
      "type": "sse",
      "url": "https://muninn.fulltech.app/mcp",
      "headers": {
        "Authorization": "Bearer ${MUNINN_API_KEY}"
      }
    }
  }
}
```

### Regras de Ouro com o Muninn:
* **Antes de codificar:** O agente busca notas anteriores com `muninn_search` e `muninn_recall`.
* **Ao finalizar tarefa substancial:** Se aprendeu algo reutilizável (padrão, decisão técnica, lição aprendida), grava no Muninn com a tag do universo correspondente (`universe:<nome>`).

---

## 🗂️ Estrutura de Pastas

```text
multi-harness-starter-pack/
├── AGENTS.md                          # 🌟 Contrato canônico universal (AGY + Claude + Codex)
├── CLAUDE.md                          # 🧠 Entrypoint do Claude Code (comandos e stack)
├── GEMINI.md                          # 🪐 Entrypoint do Antigravity IDE (escopo e browser)
├── NOTES.md                           # 🌊 Rastreamento de Waves, DoD e log de Hand-off
├── Makefile                           # 🛠️ Comandos padronizados (install, dev, lint, test, worktree)
├── .mcp.json                          # 🔌 Configuração de MCP Servers (Muninn centralizado)
├── .gitignore                         # 🛡️ Blindagem estrita (bloqueio de .env, chaves e caches)
├── .claude/
│   ├── settings.json                  # ⚙️ Permissões determinísticas e env flags
│   ├── hooks/                         # 🪝 Scripts que rodam 100% das vezes
│   │   ├── pre-bash-guard.sh          # 🛡️ Bloqueia comandos destrutivos (rm -rf, sudo, force push)
│   │   ├── pre-commit-secrets.sh      # 🔍 Varredura de credenciais antes do commit
│   │   ├── post-edit-format.sh        # 🎨 Formatação e lint automático pós-edição
│   │   └── block-secrets.sh           # 🔒 Proteção de arquivos confidenciais
│   └── skills/                        # 🧠 Especialistas sob demanda (compartilhados)
│       ├── code-review-b2/            # Revisão estrita de arquitetura
│       ├── security-check/            # Auditoria Security by Design / OWASP
│       ├── commit/                    # Conventional Commits assistidos
│       └── frontend-design/           # Design System apurado (anti-AI slop)
└── .agents/                           # 🪐 Customizações nativas do Antigravity
    ├── rules/                         # Regras contextuais do IDE
    └── skills/                        # Symlinks para .claude/skills/ (zero duplicação!)
```

---

## 🛡️ Guardrails e Hooks Determinísticos

Nenhum agente deve ter permissão para destruir o ambiente ou comitar segredos. O starter pack aplica regras no `.claude/settings.json` e hooks em `.claude/hooks/`:

* **Comandos Bloqueados:** `sudo`, `rm -rf /`, `curl ... | sh`, `git push --force main`.
* **Arquivos Bloqueados:** Leitura/escrita em `.env*`, `secrets/**`, `*.pem`, `*.key`, `id_rsa*`.
* **Formatação Automática:** O hook `post-edit-format.sh` garante que todo arquivo modificado passe pelo linter do projeto imediatamente.

---

## 🛠️ Comandos do Makefile

Use o `Makefile` para manter uma interface uniforme em qualquer máquina:

```bash
make help              # Lista todos os comandos documentados
make install           # Instala dependências (detecta pnpm/npm, pip/poetry)
make dev               # Sobe o servidor de desenvolvimento
make lint              # Executa checagem estática (ruff, eslint)
make typecheck         # Executa checagem rigorosa de tipos (tsc, mypy)
make test              # Roda a suite de testes automatizados
make test-watch        # Roda testes em modo watch

# Helpers para Multi-Harness e Concorrência Segura
make worktree-new NAME=wave-1-claude   # Cria branch e worktree isolado
make worktree-list                     # Lista worktrees ativos
make worktree-clean                    # Limpa worktrees órfãos
```

---

<div align="center">

Desenvolvido para engenharia ágil e governança agêntica.  
**Cautela sobre velocidade · Cirurgia sobre refatoração · Memória unificada.**

</div>
