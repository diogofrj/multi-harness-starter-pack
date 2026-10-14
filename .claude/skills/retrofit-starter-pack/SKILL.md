---
name: retrofit-starter-pack
description: Adequa um repositório existente aos padrões do Multi-Harness Enterprise Starter Pack e do SafeCode Guardian sem sobrescrever o que já existe. Injeta bloco gerenciado nos contratos, mescla settings e hooks, acrescenta alvos ausentes ao Makefile, provisiona Backlog.md pelo CLI, roda a auditoria e orienta a remediação (achado real no código, falso positivo com safecode-ignore e motivo).
argument-hint: "[caminho-do-repositorio]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Retrofitting an Existing Project to the Multi-Harness Enterprise Standard

Use esta skill sempre que o usuário pedir para "adequar", "migrar", "adaptar", "modernizar" ou "aplicar o starter-pack" em outro repositório existente que não esteja aderente aos padrões da Fulltech.

## Procedimento de Execução

### Passo 1: Obter o Caminho do Repositório Alvo
- Se o usuário forneceu um caminho nos argumentos (`$ARGUMENTS`), resolva o caminho absoluto.
- Caso contrário, pergunte o caminho do repositório ou verifique o diretório atual de trabalho.

### Passo 2: Pré-visualizar e executar o motor de retrofit
O alvo precisa estar com a árvore git limpa, para o diff mostrar só o que o retrofit fez. Rode primeiro em modo de pré-visualização:
```bash
node scripts/retrofit-project.mjs --target "<caminho-do-repositorio>" --dry-run --skip-audit
node scripts/retrofit-project.mjs --target "<caminho-do-repositorio>"
```
Garantias do motor, cobertas por `scripts/retrofit-project.test.mjs`:
1. Arquivo que já existe no alvo nunca é sobrescrito. Ele aparece em "Preservados". Use `--emit-starter-copies` para gerar `<arquivo>.starter` e comparar. `--force` só com pedido explícito.
2. `AGENTS.md` e `NOTES.md` existentes recebem só o bloco entre `<!-- fulltech-governance:start/end -->`, idempotente. `CLAUDE.md`, `GEMINI.md` e `RUNBOOK.md` existentes ficam intactos. Quando ausentes, nascem do template com a stack detectada; o que não for detectado vira `[CUSTOMIZE]`.
3. `.claude/settings.json` é mesclado: hooks do starter entram por união, deny de leitura de segredo entra, o resto vira sugestão no relatório.
4. Makefile recebe só os alvos e variáveis ausentes. `verify` roda `ci` (ou `test`) e `audit-gate`, que falha com Red Flag aberta.
5. Backlog.md pelo CLI `backlog` (`backlog init`, `backlog task create`); nada escrito à mão em `backlog/`.
6. Todo hook instalado tem os scripts de que depende; faltando, sai em "Atenção".

Depois de rodar, revise `git diff` e `git status` no alvo e trate cada item de "Atenção".

### Passo 3: Avaliar o diagnóstico de segurança
```bash
make audit-report TARGET="<caminho-do-repositorio>"
```
Red Flags bloqueantes:
- **RF1 (Segredos):** chaves, senhas de banco ou tokens literais.
- **RF2 (Validação Client):** falta de validação estrita no backend.
- **RF3 (Erros/Stack Traces):** stack trace ou credencial em resposta ou log.
- **RF4 (Rate Limiting):** sem controle de vazão no app nem na borda (Traefik, nginx, ingress).

Para cada achado, decida se é real ou falso positivo lendo o código, não o título da regra.

### Passo 4: Remediar
1. Achado real: corrija no código e rode os testes do projeto.
2. Falso positivo: `safecode-ignore <REGRA>: <motivo>` na linha (ou na de cima), ou `safecode-ignore-file <REGRA>: <motivo>` nas 10 primeiras linhas do arquivo. Motivo obrigatório.
3. Nunca reescreva código correto só para calar o scanner. Se a regra do scanner estiver errada, corrija o scanner em `~/projetos/00-Guidelines/monitor` com teste.
4. O que exigir mudança de produto vira card via `backlog task create`.

### Passo 5: Comprovar
```bash
make verify
```
Só conta como concluído com `verify` saindo 0, o que exige o gate do projeto verde e todas as Red Flags fechadas. Painel: `http://localhost:8765/#safecode`.
