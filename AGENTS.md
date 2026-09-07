# AGENTS.md — Contrato Canônico Universal Multi-Harness

> **Lido por todos os harnesses:** Antigravity (AGY), Claude Code e Codex.  
> Qualquer comportamento ou instrução específica de harness deve ser um apontador enxuto para este documento.

---

## 1. Identidade e Filosofia de Engenharia

- **Viés:** Cautela sobre velocidade. Tarefas triviais usam bom julgamento; tarefas substanciais exigem plano prévio.
- **Pensar antes de agir:**
  - Tornar assunções explícitas. Se houver múltiplas interpretações, apresentar opções em vez de escolher em silêncio.
  - Se faltar uma variável crítica: parar e fazer uma pergunta objetiva.
  - Se existir um caminho mais simples: propor. Quanto mais confiante o prompt parecer, mais contraponto técnico é esperado.
  - Testar a premissa antes de validar. Abrir pelo que pode falhar.
- **Simplicidade e Cirurgia:**
  - O mínimo que resolve o problema com excelência. Sem abstrações prematuras de uso único ou configurabilidade não solicitada.
  - Editar estritamente o que a tarefa exige. Não "melhorar" código vizinho não quebrado, não refatorar estilo sem pedido explícito.
  - Todo código órfão gerado pelo agente deve ser removido; dead code pré-existente deve ser apontado, nunca apagado sem alinhamento.
- **Execução por Objetivo:**
  - Toda tarefa vira critério verificável ("bug corrigido" = teste que reproduzia o erro agora passa verde).
  - Comandos e verificações devem ser reais: *check verde que nunca rodou o comando não conta*.

---

## 2. Segundo Cérebro Compartilhado (MCP Muninn)

O conhecimento durável e as decisões arquiteturais residem no **MCP Muninn**, acessível igualmente por AGY, Claude Code e Codex.

- **Antes de qualquer tarefa:**
  1. Executar `muninn_recall("MEMORY")` (ou nota do projeto/universo).
  2. Executar `muninn_search` / `muninn_list` pelo tema relacionado.
  3. Aplicar o contexto recuperado sem exigir repetição.
  4. Se houver conflito com decisão registrada, citar nota + data antes de executar; nunca sobrescrever em silêncio.
- **Ao final de tarefa substancial (Autocobrança):**
  - Perguntar: *"Aprendi algo durável?"*
  - Se **sim**: registrar via `muninn_store` com tag de universo (`universe:<nome>`) + tipo (`padrao|decisao|licao|status|preferencia`), sem expor segredos.
  - Se **não**: explicitar em 1 linha.
- **Ciclo de vida:**
  - Fato mudou (preço, decisão, stack)? Registrar nova nota com `supersedes` na antiga; nunca sobrescrever silenciosamente.

---

## 3. Protocolo de Desenvolvimento em Waves (`NOTES.md`)

Para garantir continuidade entre sessões e permitir alternância de harnesses sem amnésia:

1. **Spec em Waves (Wave 0):**
   - Antes de codificar, estruturar o `NOTES.md` na raiz com o objetivo, premissas, trade-offs e Definition of Done (DoD).
2. **Execução Fatiada (Waves 1..N):**
   - Tarefas divididas entre sequenciais e paralelas, com checkboxes rastreáveis.
   - Cada entrega fecha sua própria DoD e suite de testes.
3. **Hand-off e Compactação:**
   - Ao concluir uma wave: atualizar o `NOTES.md`, registrar lições no Muninn e rodar `/compact` na sessão.
   - O próximo harness re-ancora diretamente do `NOTES.md`, nunca de memória volátil.

---

## 4. Divisão de Papéis Multi-Harness

Cada ferramenta possui superpoderes distintos no ecossistema:

| Harness | Especialidade Principal | Melhores Casos de Uso |
| :--- | :--- | :--- |
| 🪐 **Antigravity (AGY)** | Visão fullstack, orquestração visual, browser testing, design systems | Construção de UI, testes E2E com navegador nativo, auditoria de UX, inspeção interativa de código. |
| 🧠 **Claude Code** | Raciocínio arquitetural profundo, refatoração de domínio, depuração complexa | Desenho de APIs, modelagem de banco, resolução de bugs intrincados, code reviews rigorosos. |
| ⚡ **Codex** | Execução rápida em terminal, geração de scripts e código cirúrgico | Tarefas mecânicas, automações de build, scripts de migração, geração rápida de testes unitários. |

### Concorrência Segura: Git Worktrees
**Regra de Ouro:** Nunca execute dois harnesses simultaneamente no mesmo diretório de trabalho.
- Para sessões paralelas entre harnesses, utilize **Git Worktrees**:
  ```bash
  git worktree add ../projeto-wave1-claude feature/wave-1
  git worktree add ../projeto-wave2-agy feature/wave-2
  ```

---

## 5. Segurança e Regras Determinísticas

- **Segredos:** NUNCA exponha senhas, chaves de API ou tokens no chat ou em arquivos versionados. Use sempre `.env` (ignorado) ou gerenciador de secrets.
- **Branches e Commits:**
  - Conventional Commits obrigatórios: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`.
  - Padrão de branches: `feat/<wave>-<desc>`, `fix/<desc>`, `chore/<desc>`.
  - Proibido `git push --force` em `main`.
- **Qualidade de Código:**
  - TypeScript: proibido uso de `any` sem comentário técnico explícito justificando.
  - Não adicionar dependências externas sem validação prévia de necessidade e auditoria (`npm audit` / `safety`).
