#!/usr/bin/env bash
# Install 10x Architect rule into a Cursor project.
# Usage: bash install.sh [target-project-dir]
#   Default target: current working directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-$PWD}"
RULES_DIR="$TARGET_DIR/.cursor/rules"

mkdir -p "$RULES_DIR"
cp "$SCRIPT_DIR/rules/10x-architect.mdc" "$RULES_DIR/10x-architect.mdc"

echo "✅ 10x Architect installed → $RULES_DIR/10x-architect.mdc"
echo "   Open a new Cursor chat to activate (alwaysApply: true)."
echo ""
echo "   To verify: open Cursor → Chat → type any message."
echo "   The AI should respond with structured goal/constraints/phases/TDD/SOLID guidance."
echo ""
echo "   To update later: re-run this script."
