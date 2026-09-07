#!/usr/bin/env bash
# scripts/agent-pulse.sh — Helper shell para envio de telemetria de agentes
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/agent-pulse.mjs" "$@"
