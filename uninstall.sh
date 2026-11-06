#!/usr/bin/env bash
# Removes the VS Code extension and the Claude Code mod.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
MOD_DIR="$HOME/.claude/mods/usage-statusbar"
SETTINGS="$HOME/.claude/settings.json"

if command -v code >/dev/null; then
  code --uninstall-extension local.claude-usage-statusbar || true
fi

echo "Removing the Claude Code mod"
node "$ROOT/scripts/plugin-dirs.js" remove "$SETTINGS" "$MOD_DIR"
rm -rf "$MOD_DIR"
rm -f "$HOME/.claude/usage-now.json" "$HOME"/.claude/usage-now.json.*.tmp

cat <<'EOF'

Uninstalled. Now:
  1. In each VS Code window, run "Developer: Reload Window".
  2. Start new Claude chats. Chats that are open now keep the mod until they end.
EOF
