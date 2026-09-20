.PHONY: help install dev board lint typecheck test test-watch deploy-staging deploy-prod worktree-new worktree-list worktree-clean

help: ## Exibe os comandos disponíveis
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependências
	@set -e; \
	if [ -f pnpm-lock.yaml ]; then command -v pnpm >/dev/null || { echo "pnpm não instalado"; exit 1; }; pnpm install; \
	elif [ -f package.json ]; then npm install; fi; \
	if [ -f requirements.txt ]; then python -m pip install -r requirements.txt; fi; \
	if [ -f pyproject.toml ]; then \
		if command -v poetry >/dev/null 2>&1; then poetry install; \
		elif command -v uv >/dev/null 2>&1; then uv pip install -e .; \
		else echo "poetry ou uv é necessário para pyproject.toml"; exit 1; fi; \
	fi

dev: ## Inicia o ambiente local
	@set -e; \
	if [ -f package.json ] && node -e "const p=require('./package.json');process.exit(p.scripts?.dev?0:1)"; then \
		if [ -f pnpm-lock.yaml ]; then pnpm run dev; else npm run dev; fi; \
	else echo "Nenhum comando dev configurado"; exit 2; fi

board: ## Inicia o board local com telemetria
	@echo "🪐 Board local: http://localhost:3000"
	@if command -v docker >/dev/null 2>&1 && [ -f compose.yaml ]; then docker compose up; else node server.mjs; fi

lint: ## Executa linters; falha se nenhum estiver configurado
	@set -e; ran=0; \
	if [ -f package.json ] && node -e "const p=require('./package.json');process.exit(p.scripts?.lint?0:1)"; then \
		ran=1; if [ -f pnpm-lock.yaml ]; then pnpm run lint; else npm run lint; fi; \
	fi; \
	if command -v ruff >/dev/null 2>&1 && { [ -f pyproject.toml ] || [ -f requirements.txt ]; }; then ran=1; ruff check .; fi; \
	if [ $$ran -eq 0 ]; then echo "Nenhum linter configurado"; exit 2; fi

typecheck: ## Executa checagem de tipos; falha se nenhuma estiver configurada
	@set -e; ran=0; \
	if [ -f package.json ] && node -e "const p=require('./package.json');process.exit(p.scripts?.typecheck?0:1)"; then \
		ran=1; if [ -f pnpm-lock.yaml ]; then pnpm run typecheck; else npm run typecheck; fi; \
	fi; \
	if command -v mypy >/dev/null 2>&1 && { [ -f pyproject.toml ] || [ -f requirements.txt ]; }; then ran=1; mypy .; fi; \
	if [ $$ran -eq 0 ]; then echo "Nenhum typecheck configurado"; exit 2; fi

test: ## Executa testes; falha se nenhum estiver configurado
	@set -e; ran=0; \
	if [ -f package.json ] && node -e "const p=require('./package.json');process.exit(p.scripts?.test?0:1)"; then \
		ran=1; if [ -f pnpm-lock.yaml ]; then pnpm run test; else npm run test; fi; \
	fi; \
	if command -v pytest >/dev/null 2>&1 && { [ -d tests ] || [ -f pytest.ini ] || [ -f pyproject.toml ]; }; then ran=1; pytest; fi; \
	if [ $$ran -eq 0 ]; then echo "Nenhuma suíte de testes configurada"; exit 2; fi

test-watch: ## Executa testes em modo watch
	@set -e; \
	if [ -f package.json ] && node -e "const p=require('./package.json');process.exit(p.scripts?.['test:watch']?0:1)"; then \
		if [ -f pnpm-lock.yaml ]; then pnpm run test:watch; else npm run test:watch; fi; \
	else echo "Nenhum test:watch configurado"; exit 2; fi

worktree-new: ## Cria worktree isolado (Ex: make worktree-new NAME=wave-1)
	@if [ -z "$(NAME)" ]; then echo "❌ Especifique NAME. Ex: make worktree-new NAME=wave-1"; exit 1; fi
	@mkdir -p ../worktrees
	@git worktree add ../worktrees/$(NAME) -b feat/$(NAME)
	@echo "✅ Worktree criado em ../worktrees/$(NAME)"

worktree-list: ## Lista worktrees
	@git worktree list

worktree-clean: ## Remove apenas referências órfãs
	@git worktree prune
	@echo "🧹 Referências órfãs removidas."

deploy-staging: ## Placeholder de deploy em staging
	@echo "Deploy de staging ainda não configurado"; exit 2

deploy-prod: ## Placeholder de deploy em produção
	@echo "Deploy de produção ainda não configurado"; exit 2
