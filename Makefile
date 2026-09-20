.PHONY: help install dev board lint typecheck test test-watch deploy-staging deploy-prod worktree-new worktree-list worktree-clean

help: ## Exibe os comandos disponíveis no projeto
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependências do projeto
	@echo "📦 Instalando dependências..."
	@if [ -f pnpm-lock.yaml ]; then command -v pnpm >/dev/null || { echo "pnpm não instalado"; exit 1; }; pnpm install; \
	elif [ -f package.json ]; then npm install; fi
	@if [ -f requirements.txt ]; then python -m pip install -r requirements.txt; fi
	@if [ -f pyproject.toml ]; then \
		if command -v poetry >/dev/null 2>&1; then poetry install; \
		elif command -v uv >/dev/null 2>&1; then uv pip install -e .; \
		else echo "poetry ou uv é necessário para pyproject.toml"; exit 1; fi; \
	fi

dev: ## Inicia o ambiente de desenvolvimento local
	@echo "🚀 Iniciando servidor de desenvolvimento..."
	@if [ -f pnpm-lock.yaml ]; then pnpm run dev; \
	elif [ -f package.json ]; then npm run dev; \
	else echo "Nenhum comando de desenvolvimento configurado"; exit 1; fi

board: ## Inicia o board local com telemetria
	@echo "🪐 Subindo board local em http://localhost:3000..."
	@if command -v docker >/dev/null 2>&1 && [ -f compose.yaml ]; then docker compose up; \
	else node server.mjs; fi

lint: ## Executa linters configurados
	@echo "🔍 Executando linter..."
	@if [ -f pnpm-lock.yaml ]; then pnpm run lint --if-present; \
	elif [ -f package.json ]; then npm run lint --if-present; fi
	@if command -v ruff >/dev/null 2>&1; then ruff check .; fi

typecheck: ## Executa checagem de tipos
	@echo "🛡️ Executando verificação de tipos..."
	@if [ -f pnpm-lock.yaml ]; then pnpm run typecheck --if-present; \
	elif [ -f package.json ]; then npm run typecheck --if-present; fi
	@if command -v mypy >/dev/null 2>&1; then mypy .; fi

test: ## Executa testes configurados
	@echo "🧪 Executando testes..."
	@if [ -f pnpm-lock.yaml ]; then pnpm run test --if-present; \
	elif [ -f package.json ]; then npm run test --if-present; fi
	@if command -v pytest >/dev/null 2>&1; then pytest; fi

test-watch: ## Executa testes em modo watch
	@if [ -f pnpm-lock.yaml ]; then pnpm run test:watch --if-present; \
	elif [ -f package.json ]; then npm run test:watch --if-present; fi

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
	@echo "Deploy de staging ainda não configurado"; exit 1

deploy-prod: ## Placeholder de deploy em produção
	@echo "Deploy de produção ainda não configurado"; exit 1
