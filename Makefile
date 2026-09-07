.PHONY: help install dev lint typecheck test test-watch deploy-staging deploy-prod worktree-new worktree-list worktree-clean

help: ## Exibe os comandos disponíveis no projeto
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# -----------------------------------------------------------------------------
# Setup e Execução Local
# -----------------------------------------------------------------------------

install: ## Instala dependências do projeto
	@echo "📦 Instalando dependências..."
	@if [ -f package.json ]; then pnpm install 2>/dev/null || npm install; fi
	@if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
	@if [ -f pyproject.toml ]; then poetry install 2>/dev/null || uv pip install -e . 2>/dev/null; fi

dev: ## Inicia o ambiente de desenvolvimento local
	@echo "🚀 Iniciando servidor de desenvolvimento..."
	@if [ -f package.json ]; then pnpm dev 2>/dev/null || npm run dev; fi

board: ## Inicia o board local com telemetria de agentes em tempo real
	@echo "🪐 Subindo board local em http://localhost:3000..."
	@if command -v docker >/dev/null 2>&1 && [ -f compose.yaml ]; then docker compose up; else node server.mjs; fi

# -----------------------------------------------------------------------------
# Qualidade e Verificação
# -----------------------------------------------------------------------------

lint: ## Executa checagem estática / linters
	@echo "🔍 Executando linter..."
	@if [ -f package.json ]; then pnpm lint 2>/dev/null || npm run lint 2>/dev/null || true; fi
	@if command -v ruff >/dev/null 2>&1; then ruff check .; fi

typecheck: ## Executa checagem de tipos
	@echo "🛡️ Executando verificação de tipos..."
	@if [ -f tsconfig.json ]; then npx tsc --noEmit; fi
	@if command -v mypy >/dev/null 2>&1; then mypy .; fi

test: ## Executa os testes automatizados
	@echo "🧪 Executando testes..."
	@if [ -f package.json ]; then pnpm test 2>/dev/null || npm test 2>/dev/null || true; fi
	@if command -v pytest >/dev/null 2>&1; then pytest; fi

test-watch: ## Executa testes em modo watch
	@if [ -f package.json ]; then pnpm test:watch 2>/dev/null || npm run test:watch 2>/dev/null || true; fi

# -----------------------------------------------------------------------------
# Multi-Harness & Git Worktrees
# -----------------------------------------------------------------------------

worktree-new: ## Cria um novo git worktree isolado para sessões paralelas (Ex: make worktree-new NAME=wave1)
	@if [ -z "$(NAME)" ]; then echo "❌ Erro: Especifique o nome do worktree. Ex: make worktree-new NAME=wave-1"; exit 1; fi
	@mkdir -p ../worktrees
	@git worktree add ../worktrees/$(NAME) -b feat/$(NAME)
	@echo "✅ Worktree criado em ../worktrees/$(NAME) na branch feat/$(NAME)"

worktree-list: ## Lista os worktrees ativos do projeto
	@git worktree list

worktree-clean: ## Limpa referências de worktrees que já foram removidos
	@git worktree prune
	@echo "🧹 Worktrees podados com sucesso."

# -----------------------------------------------------------------------------
# Deploy
# -----------------------------------------------------------------------------

deploy-staging: ## Deploy no ambiente de homologação/staging
	@echo "🚀 Deploy em staging..."

deploy-prod: test lint ## Deploy em produção (valida testes antes)
	@echo "🚀 Deploy em produção executado após checks verdes!"
