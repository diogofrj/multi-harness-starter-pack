#!/usr/bin/env bash
# .claude/hooks/agent-pulse.sh — delega para scripts/agent-pulse-hook.sh (pulso do board por ferramenta usada).
exec "$(dirname "${BASH_SOURCE[0]}")/../../scripts/agent-pulse-hook.sh"
