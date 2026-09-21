#!/usr/bin/env bash
# scripts/agent-pulse-hook.sh — Hook do Claude Code para o board.
#   PreToolUse (Bash)      -> pulso "working" com validade de 10 min (comando longo não some do board)
#   PostToolUse            -> pulso "working" com a ferramenta usada (inclui Read/Grep/Glob: ler também é trabalho)
#   SubagentStop/SessionEnd -> pulso "done" (remove o agente do board na hora)
# Lê o JSON do hook em stdin, infere o card pela branch do cwd (worktree). Nunca bloqueia: sai 0 sempre.
set -u
INPUT=$(cat)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
EVENT=$(printf '%s' "$INPUT" | jq -r '.hook_event_name // "PostToolUse"' 2>/dev/null)
TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // "tool"' 2>/dev/null)
AGENT_TYPE=$(printf '%s' "$INPUT" | jq -r '.agent_type // empty' 2>/dev/null)
DETAIL=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.command // .tool_input.description // ""' 2>/dev/null | head -c 70)
SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
TRANSCRIPT=$(printf '%s' "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
AGENT_ID=$(printf '%s' "$INPUT" | jq -r '.agent_id // empty' 2>/dev/null)
# Modelo: última mensagem do assistente no transcript (subagente tem transcript próprio em <sessão>/subagents/agent-<id>.jsonl)
model_from() { [ -r "$1" ] && tail -c 400000 "$1" 2>/dev/null | grep -o -E '"model":"[^"]+"' | tail -n 1 | cut -d'"' -f4; }
MODEL=""
if [ -n "$AGENT_ID" ] && [ -n "$TRANSCRIPT" ]; then
  MODEL=$(model_from "$(dirname "$TRANSCRIPT")/${SESSION_ID}/subagents/agent-${AGENT_ID}.jsonl")
fi
[ -z "$MODEL" ] && [ -n "$TRANSCRIPT" ] && MODEL=$(model_from "$TRANSCRIPT")
[ -z "$CWD" ] && exit 0

BRANCH=$(git -C "$CWD" branch --show-current 2>/dev/null)
CARD=$(cd "$CWD" && node "$DIR/board-config.mjs" infer-card "$BRANCH" 2>/dev/null)
[ -z "$CARD" ] && exit 0

if [ -n "$AGENT_TYPE" ]; then AGENT="Claude Code · $AGENT_TYPE"; else AGENT="Claude Code"; fi

TTL=""
case "$EVENT" in
  SubagentStop|SessionEnd)
    STATUS="done"; ACTION="encerrado ($EVENT)" ;;
  PreToolUse)
    # Comando começando: o pulso vale 10 min para o agente não sumir do board no meio de um vitest/build longo.
    # O PostToolUse seguinte devolve a validade normal (90 s).
    STATUS="working"; ACTION="executando $TOOL"; [ -n "$DETAIL" ] && ACTION="executando: $DETAIL"; TTL="600000" ;;
  *)
    STATUS="working"; ACTION="$TOOL"; [ -n "$DETAIL" ] && ACTION="$TOOL: $DETAIL" ;;
esac

if command -v timeout >/dev/null 2>&1; then
  BOARD_AUTOSTART=0 timeout 4 node "$DIR/agent-pulse.mjs" --harness claude --agent "$AGENT" --card "$CARD" --action "$ACTION" --status "$STATUS" ${TTL:+--ttl "$TTL"} ${MODEL:+--model "$MODEL"} >/dev/null 2>&1 || true
else
  BOARD_AUTOSTART=0 node "$DIR/agent-pulse.mjs" --harness claude --agent "$AGENT" --card "$CARD" --action "$ACTION" --status "$STATUS" ${TTL:+--ttl "$TTL"} ${MODEL:+--model "$MODEL"} >/dev/null 2>&1 || true
fi
exit 0
