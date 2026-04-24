#!/usr/bin/env bash
# Toggle the 10x-architect .mdc rule on/off in a target Cursor project.
# Usage:
#   bash cursor/toggle-rule.sh                 # operates on current directory
#   bash cursor/toggle-rule.sh /path/to/proj
#
# The script renames .cursor/rules/10x-architect.mdc to .disabled and back.
# It is a no-op-safe check: prints the current state if nothing to toggle.

set -euo pipefail

PROJECT_DIR="${1:-.}"
RULE_FILE="$PROJECT_DIR/.cursor/rules/10x-architect.mdc"
DISABLED_FILE="$RULE_FILE.disabled"

if [[ -f "$RULE_FILE" && -f "$DISABLED_FILE" ]]; then
  echo "ERROR: Both enabled and disabled files exist. Resolve manually:" >&2
  echo "  $RULE_FILE" >&2
  echo "  $DISABLED_FILE" >&2
  exit 2
fi

if [[ -f "$RULE_FILE" ]]; then
  mv "$RULE_FILE" "$DISABLED_FILE"
  echo "DISABLED: $DISABLED_FILE"
  echo "Open a NEW Cursor chat now to capture without-rule responses."
  exit 0
fi

if [[ -f "$DISABLED_FILE" ]]; then
  mv "$DISABLED_FILE" "$RULE_FILE"
  echo "ENABLED:  $RULE_FILE"
  echo "Open a NEW Cursor chat now to capture with-rule responses."
  exit 0
fi

echo "No rule file found at:" >&2
echo "  $RULE_FILE" >&2
echo "Install it first with: bash cursor/install.sh $PROJECT_DIR" >&2
exit 1
