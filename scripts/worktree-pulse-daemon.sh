#!/usr/bin/env bash
# scripts/worktree-pulse-daemon.sh — sobe/derruba o watcher de pulso por worktree em segundo plano.
# Uso: scripts/worktree-pulse-daemon.sh start|stop|status|restart
# Env: BOARD_PORT e PULSE_INTERVAL sobrescrevem o board.json; PULSE_PIDFILE e PULSE_LOG ajustam arquivos locais.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$DIR/.." && pwd)"
PIDFILE="${PULSE_PIDFILE:-/tmp/$(basename "$REPO")-worktree-pulse.pid}"
LOG="${PULSE_LOG:-/tmp/$(basename "$REPO")-worktree-pulse.log}"
PORT="${BOARD_PORT:-$(cd "$REPO" && node "$DIR/board-config.mjs" get port)}"
INTERVAL="${PULSE_INTERVAL:-$(cd "$REPO" && node "$DIR/board-config.mjs" get presence.intervalSeconds)}"

alive() { [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; }

case "${1:-status}" in
  start)
    if alive; then echo "watcher já ativo (pid $(cat "$PIDFILE"))"; exit 0; fi
    if command -v setsid >/dev/null 2>&1; then
      BOARD_PORT="$PORT" BOARD_AUTOSTART="${BOARD_AUTOSTART:-1}" setsid nohup node "$DIR/worktree-pulse.mjs" --interval "$INTERVAL" --repo "$REPO" >"$LOG" 2>&1 < /dev/null &
    else
      BOARD_PORT="$PORT" BOARD_AUTOSTART="${BOARD_AUTOSTART:-1}" nohup node "$DIR/worktree-pulse.mjs" --interval "$INTERVAL" --repo "$REPO" >"$LOG" 2>&1 < /dev/null &
    fi
    echo $! > "$PIDFILE"
    sleep 1
    if alive; then echo "watcher iniciado (pid $(cat "$PIDFILE"), log $LOG, board http://localhost:${PORT})"; else echo "falhou; veja $LOG"; exit 1; fi
    ;;
  stop)
    if alive; then kill "$(cat "$PIDFILE")" && rm -f "$PIDFILE" && echo "watcher parado"; else rm -f "$PIDFILE"; echo "watcher não estava rodando"; fi
    ;;
  restart) "$0" stop; "$0" start ;;
  status)
    if alive; then echo "ativo (pid $(cat "$PIDFILE"))"; tail -n 3 "$LOG" 2>/dev/null || true; else echo "inativo"; exit 1; fi
    ;;
  *) echo "uso: $0 start|stop|status|restart"; exit 2 ;;
esac
