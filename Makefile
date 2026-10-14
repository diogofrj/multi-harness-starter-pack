.PHONY: help install dev board board-docker board-status board-stop board-smoke pulse-watch lint typecheck test test-watch deploy-staging deploy-prod worktree-new worktree-list worktree-clean audit audit-report audit-gate verify new-project retrofit spec waves backlog-browser board-all

BOARD_DEFAULT_PORT := $(shell node scripts/board-config.mjs get port)
BOARD_PORT_VALUE := $(if $(BOARD_PORT),$(BOARD_PORT),$(BOARD_DEFAULT_PORT))
BACKLOG_PORT ?= 6420
TARGET ?= $(CURDIR)

help: ## Exibe os comandos disponíveis
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependências do projeto e o CLI Backlog.md
	@set -e; \
	if [ -f pnpm-lock.yaml ]; then command -v pnpm >/dev/null || { echo "pnpm não instalado"; exit 1; }; pnpm install; \
	elif [ -f package.json ]; then npm install; fi; \
	if ! command -v backlog >/dev/null 2>&1; then \
		echo "📦 Instalando CLI backlog.md global..."; \
		npm install -g backlog.md || echo "⚠️ Não foi possível instalar backlog.md globalmente (sem permissão root)."; \
	fi; \
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

board: ## Sobe (ou reaproveita) o board local e o watcher de presença
	@if curl -sf -m 2 "http://127.0.0.1:$(BOARD_PORT_VALUE)/api/agents" >/dev/null 2>&1; then echo "board já no ar"; \
	else if command -v setsid >/dev/null 2>&1; then setsid nohup env BOARD_PORT=$(BOARD_PORT_VALUE) BOARD_DIST=$${BOARD_DIST:-/tmp/$(notdir $(CURDIR))-board-index.html} node $(CURDIR)/server.mjs >/tmp/$(notdir $(CURDIR))-board.log 2>&1 </dev/null & else nohup env BOARD_PORT=$(BOARD_PORT_VALUE) BOARD_DIST=$${BOARD_DIST:-/tmp/$(notdir $(CURDIR))-board-index.html} node $(CURDIR)/server.mjs >/tmp/$(notdir $(CURDIR))-board.log 2>&1 </dev/null & fi; attempts=0; until curl -sf -m 1 "http://127.0.0.1:$(BOARD_PORT_VALUE)/api/agents" >/dev/null 2>&1; do attempts=$$((attempts + 1)); if [ $$attempts -ge 30 ]; then echo "board não iniciou; veja /tmp/$(notdir $(CURDIR))-board.log"; exit 1; fi; sleep .1; done; echo "board iniciado (log /tmp/$(notdir $(CURDIR))-board.log)"; fi
	@scripts/worktree-pulse-daemon.sh status >/dev/null 2>&1 || scripts/worktree-pulse-daemon.sh start
	@echo "🪐 Fulltech Board: http://localhost:$(BOARD_PORT_VALUE)"

backlog-browser: ## Inicia o Backlog.md Browser oficial (porta 6420)
	@if curl -sf -m 2 "http://127.0.0.1:$(BACKLOG_PORT)" >/dev/null 2>&1; then \
		echo "backlog browser já no ar em http://localhost:$(BACKLOG_PORT)"; \
	else \
		if command -v setsid >/dev/null 2>&1; then \
			setsid nohup backlog browser --port $(BACKLOG_PORT) --no-open </dev/null >/tmp/$(notdir $(CURDIR))-backlog-browser.log 2>&1 & \
		else \
			nohup backlog browser --port $(BACKLOG_PORT) --no-open </dev/null >/tmp/$(notdir $(CURDIR))-backlog-browser.log 2>&1 & \
		fi; \
		sleep 1; \
		echo "📋 Backlog.md Browser: http://localhost:$(BACKLOG_PORT) (log /tmp/$(notdir $(CURDIR))-backlog-browser.log)"; \
	fi

board-all: board backlog-browser ## Sobe simultaneamente o Fulltech Board (3100) e o Backlog Browser (6420)
	@echo "✨ Ambos os dashboards estão disponíveis:"
	@echo "   - Fulltech Kanban & Telemetria: http://localhost:$(BOARD_PORT_VALUE)"
	@echo "   - Backlog.md Interactive UI:   http://localhost:$(BACKLOG_PORT)"

board-docker: ## Sobe o board pelo Docker Compose na porta configurada
	@BOARD_PORT=$(BOARD_PORT_VALUE) docker compose up

board-status: ## Exibe o estado do board e do watcher
	@curl -sf -m 2 "http://127.0.0.1:$(BOARD_PORT_VALUE)/api/agents" >/dev/null 2>&1 && echo "board: no ar em http://localhost:$(BOARD_PORT_VALUE)" || echo "board: fora do ar"
	@curl -sf -m 2 "http://127.0.0.1:$(BACKLOG_PORT)" >/dev/null 2>&1 && echo "backlog browser: no ar em http://localhost:$(BACKLOG_PORT)" || echo "backlog browser: fora do ar"
	@scripts/worktree-pulse-daemon.sh status || true

board-stop: ## Para o watcher, o board Fulltech e o backlog browser
	@scripts/worktree-pulse-daemon.sh stop || true
	@pkill -f "node $(CURDIR)/[s]erver.mjs" 2>/dev/null && echo "board parado" || echo "board não estava rodando"
	@pkill -f "[b]acklog.*browser.*$(BACKLOG_PORT)" 2>/dev/null && echo "backlog browser parado" || true

board-smoke: ## Executa o smoke Playwright em uma porta isolada
	@node scripts/board-smoke.mjs

pulse-watch: ## Publica presença dos harnesses por worktree
	@node scripts/worktree-pulse.mjs

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

audit: ## Executa auditoria do SafeCode Guardian (Ex: make audit TARGET=/caminho/repo)
	@if [ -f /home/ubuntu/projetos/00-Guidelines/monitor/guardian.py ]; then \
		python3 /home/ubuntu/projetos/00-Guidelines/monitor/guardian.py --path $(TARGET); \
	else \
		echo "Guardião não encontrado em ~/projetos/00-Guidelines"; exit 1; \
	fi

audit-report: ## Exibe relatório detalhado da auditoria com diagnóstico e remediações (Ex: make audit-report TARGET=/caminho/repo)
	@node scripts/audit-report.mjs $(TARGET)

audit-gate: ## Falha se alguma Red Flag do SafeCode Guardian estiver aberta
	@node scripts/audit-gate.mjs $(TARGET)

verify: ## Gate do projeto (ci se existir, senão test) + audit-gate; falha se qualquer um falhar
	@if grep -qE '^ci[[:space:]]*:' $(firstword $(MAKEFILE_LIST)); then $(MAKE) -s ci; else $(MAKE) -s test; fi
	@$(MAKE) -s audit-gate

new-project: ## Cria um novo projeto baseado no starter pack (Ex: make new-project NAME=meu-app STACK=node)
	@node scripts/init-project.mjs $(if $(NAME),--name $(NAME),) $(if $(STACK),--stack $(STACK),) $(if $(DEST),--dest $(DEST),) $(if $(DESC),--desc "$(DESC)",)

retrofit: ## Adequa repositório existente aos padrões do starter pack (Ex: make retrofit TARGET=/caminho/repo)
	@node scripts/retrofit-project.mjs --target $(TARGET)

spec: ## Exibe instruções de Spec-Driven Development
	@echo "Para criar uma spec, execute '/spec [feature]' no Claude Code ou '/plan' no Antigravity."

waves: ## Exibe instruções de planejamento de ondas
	@echo "Para derivar ondas, execute '/waves' ou consulte docs/plan/implementation-waves.md."

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
