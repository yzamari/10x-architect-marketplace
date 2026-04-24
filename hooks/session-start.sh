#!/usr/bin/env bash
# SessionStart hook for 10x Architect plugin (v2.4.1).
#
# Default behavior (no config file present): Lean Mode is ACTIVE.
# The hook also writes a default .claude/architect-config.json on first
# run so the user can discover and edit their settings later.
#
# User overrides (both read from .claude/architect-config.json):
#   "lean": false     -> Classic payload (v2.2.1 verbose behavior)
#   "showAck": false  -> drop the in-chat "✨ 10x Lean active" banner
#                        (silent mode; useful once you trust the plugin)
#
# Payloads:
#   Lean    ~110 tok  - compact XML + response-style hint (default)
#   Classic ~319 tok  - verbose markdown (v2.2.1 behavior, opt-out)
#
# The hook is idempotent and never fails the session: filesystem write
# errors are swallowed so the JSON payload is always emitted.

set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
CONFIG_DIR="$PROJECT_DIR/.claude"
CONFIG_FILE="$CONFIG_DIR/architect-config.json"
LEAN="true"
SHOW_ACK="true"

if [ -f "$CONFIG_FILE" ]; then
  # Respect explicit opt-outs. Anything else (missing key, malformed
  # JSON, "true") falls through to the defaults.
  if grep -qE '"lean"[[:space:]]*:[[:space:]]*false' "$CONFIG_FILE" 2>/dev/null; then
    LEAN="false"
  fi
  if grep -qE '"showAck"[[:space:]]*:[[:space:]]*false' "$CONFIG_FILE" 2>/dev/null; then
    SHOW_ACK="false"
  fi
else
  # First run: bootstrap a default config so the user has something to edit.
  # Best-effort; never fail the hook on a write error.
  if mkdir -p "$CONFIG_DIR" 2>/dev/null; then
    cat > "$CONFIG_FILE" 2>/dev/null <<'CONFIG'
{
  "mode": "C",
  "autoDetect": true,
  "autoApproveTimeout": 5,
  "lean": true,
  "showAck": true
}
CONFIG
  fi
fi

if [ "$LEAN" = "true" ]; then
  if [ "$SHOW_ACK" = "true" ]; then
    cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<10x-architect>\n<principles>\nGOAL+North Star; Do NOT ≥2; 3-6 phases;\nTDD RED-GREEN-REFACTOR; JSDoc+README; SOLID(SRP/OCP/LSP/ISP/DIP).\n</principles>\n<response-style>terse by default; preserve code/commands/paths verbatim; skip filler prose</response-style>\n<ack>Start first reply with: ✨ 10x Lean active</ack>\n<invoke>/architect [task] for full guidance</invoke>\n</10x-architect>"
  }
}
EOF
  else
    cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<10x-architect>\n<principles>\nGOAL+North Star; Do NOT ≥2; 3-6 phases;\nTDD RED-GREEN-REFACTOR; JSDoc+README; SOLID(SRP/OCP/LSP/ISP/DIP).\n</principles>\n<response-style>terse by default; preserve code/commands/paths verbatim; skip filler prose</response-style>\n<invoke>/architect [task] for full guidance</invoke>\n</10x-architect>"
  }
}
EOF
  fi
else
  cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<10x-architect-enhancement>\n\nYou have the 10x Architect plugin active. For ALL tasks in this session, you MUST follow these principles:\n\n## 1. GOAL CLARITY\n- Identify the clear goal and business value before starting\n- State the 'North Star' - what success looks like\n\n## 2. CONSTRAINTS\n- Define what NOT to do (at least 2-3 boundaries)\n- Example: 'Do NOT modify existing tests', 'Do NOT add new dependencies'\n\n## 3. EXECUTION PHASES\n- Break work into 3-6 logical steps\n- Complete each phase before moving to the next\n\n## 4. TEST-DRIVEN DEVELOPMENT (TDD)\n- Write tests FIRST before implementation\n- Follow RED-GREEN-REFACTOR cycle\n- Every function must have a corresponding test\n\n## 5. DOCUMENTATION\n- Add JSDoc/docstrings to all functions\n- Include @param, @returns, and @example\n- Update README if adding features\n\n## 6. SOLID PRINCIPLES\n- S: Single Responsibility - one reason to change per class/function\n- O: Open/Closed - extend without modifying\n- L: Liskov Substitution - subtypes must be substitutable\n- I: Interface Segregation - small, specific interfaces\n- D: Dependency Inversion - depend on abstractions\n\nIMPORTANT: Start your first response with '✨ 10x Architect Active' to confirm these principles are loaded.\n\n</10x-architect-enhancement>"
  }
}
EOF
fi

exit 0
