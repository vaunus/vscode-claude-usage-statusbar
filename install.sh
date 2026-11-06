#!/usr/bin/env bash
# Installs the Claude Code mod and the VS Code extension.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
MOD_DIR="$HOME/.claude/mods/usage-statusbar"
SETTINGS="$HOME/.claude/settings.json"

for tool in node npx code; do
  if ! command -v "$tool" >/dev/null; then
    echo "Missing '$tool'. See Requirements in README.md." >&2
    exit 1
  fi
done

echo "Installing the Claude Code mod in $MOD_DIR"
mkdir -p "$MOD_DIR"
cp -R "$ROOT/claude-code-mod/.claude-plugin" "$ROOT/claude-code-mod/hooks" "$MOD_DIR/"
node "$ROOT/scripts/plugin-dirs.js" add "$SETTINGS" "$MOD_DIR"

echo "Building and installing the VS Code extension"
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT
(cd "$ROOT/vscode-extension" && npm run --silent package -- --out "$BUILD/claude-usage-statusbar.vsix" >/dev/null)
code --install-extension "$BUILD/claude-usage-statusbar.vsix"

cat <<'EOF'

Installed. Now:
  1. In each VS Code window, run "Developer: Reload Window".
  2. Start a new Claude chat. The bars show after its first reply.
EOF
