---
name: init-project
description: Inicializa um novo projeto corporativo a partir deste starter pack com scaffolding limpo, substituição de placeholders, configuração de stack e validação de conformidade.
argument-hint: "[nome-do-projeto]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Initializing a New Multi-Harness Project

Quando o usuário solicitar criar ou inicializar um novo projeto:

1. **Identificar os parâmetros essenciais:**
   - **Nome do projeto:** `$ARGUMENTS` ou perguntar ao usuário.
   - **Stack pretendida:** `node` (Node/TypeScript/Fastify), `python` (FastAPI/Django), `go`, `rust`.
   - **Descrição funcional:** O que o projeto irá fazer.
   - **Diretório de destino:** Padrão `../<nome-do-projeto>` ou caminho informado pelo usuário.

2. **Executar o motor de scaffolding:**
   Execute no terminal do starter pack:
   ```bash
   node scripts/init-project.mjs --name "<nome-do-projeto>" --stack "<stack>" --desc "<descricao>" --dest "<caminho>" --non-interactive
   ```

3. **Verificar o resultado:**
   - Confirme se o diretório de destino foi criado e o Git inicializado.
   - Verifique se a auditoria inicial do SafeCode Guardian confirmou o **Grau A**.

4. **Orientar os próximos passos:**
   - Indique o comando `cd <caminho>`
   - Recomende iniciar a **Wave 0** rodando `/spec` para definir a especificação funcional.
