#!/usr/bin/env bash
# .claude/hooks/block-secrets.sh
# PreToolUse hook — bloqueia operações em arquivos/comandos sensíveis.
#
# Contrato:
#   - Lê JSON do stdin com tool_input
#   - Exit 0  = permitir
#   - Exit 2  = BLOCK (stderr vai pro Claude como contexto)
#   - Outros  = erro de hook (não bloqueia, loga warning)
#
# ref: docs.claude.com/en/docs/claude-code/hooks

set -euo pipefail

# Lê input do Claude Code via stdin
INPUT=$(cat)

# Extrai campos relevantes (jq necessário)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Patterns proibidos — adicione aqui o que for sensível no seu projeto
DENY_PATTERNS=(
  # .env como arquivo (início, após / ou espaço), não como trecho de código (process.env.X)
  '(^|[^[:alnum:]_])\.env(\.[[:alnum:]_-]+)?([^[:alnum:]_.-]|$)'
  'secrets/'
  'credentials\.json'
  'service-account.*\.json'
  'id_rsa'
  'id_ed25519'
  '\.pem$'
  '\.p12$'
  '\.pfx$'
  '/\.aws/'
  '/\.config/gcloud/'
  '/\.ssh/'
  '/\.kube/config'
)

# Comandos perigosos que merecem bloqueio mesmo se path estiver ok
# shellcheck disable=SC2016  # padrões literais: casam o texto $HOME no comando
DANGEROUS_COMMANDS=(
  'rm -rf /'
  'rm -rf ~'
  'rm -rf \$HOME'
  ':(){ :|:& };:'              # fork bomb
  'dd if=/dev/zero of=/dev/'
  'mkfs\.'
  'chmod -R 777 /'
)

# Arquivos-modelo de ambiente não têm segredo: saem da checagem.
strip_env_templates() {
  printf '%s' "$1" | sed -E 's/\.env\.(example|sample|template|dist)([^[:alnum:]_.-]|$)/\2/g'
}

# Verifica file_path
if [[ -n "$FILE_PATH" ]]; then
  CHECK_PATH=$(strip_env_templates "$FILE_PATH")
  for pattern in "${DENY_PATTERNS[@]}"; do
    if [[ "$CHECK_PATH" =~ $pattern ]]; then
      echo "[block-secrets] BLOCKED: file_path '$FILE_PATH' casa com pattern proibido '$pattern'" >&2
      echo "[block-secrets] tool: $TOOL_NAME" >&2
      exit 2
    fi
  done
fi

# Verifica command (para tool Bash)
if [[ -n "$COMMAND" ]]; then
  # Patterns sensíveis no comando inteiro
  CHECK_CMD=$(strip_env_templates "$COMMAND")
  for pattern in "${DENY_PATTERNS[@]}"; do
    if [[ "$CHECK_CMD" =~ $pattern ]]; then
      echo "[block-secrets] BLOCKED: command toca em path sensível ('$pattern')" >&2
      echo "[block-secrets] command: $COMMAND" >&2
      exit 2
    fi
  done

  # Patterns destrutivos
  for pattern in "${DANGEROUS_COMMANDS[@]}"; do
    if [[ "$COMMAND" =~ $pattern ]]; then
      echo "[block-secrets] BLOCKED: comando destrutivo detectado ('$pattern')" >&2
      exit 2
    fi
  done
fi

exit 0
