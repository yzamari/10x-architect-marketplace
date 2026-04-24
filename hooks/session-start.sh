#!/usr/bin/env bash
# SessionStart hook for 10x Architect plugin
#
# Emits an additionalContext payload so the 10 Rules + engineering
# principles are loaded once per session. Reads the user's project-level
# .claude/architect-config.json to decide between:
#   - "classic" (default)  : verbose markdown block, ~319 tok
#   - "lean"  (opt-in)     : compact XML pointer, ~98 tok (-69%)
#
# Enable lean by adding {"lean": true} to .claude/architect-config.json.

set -euo pipefail

# Locate the user's config. Claude Code sets CLAUDE_PROJECT_DIR; fall back
# to CWD for older versions.
CONFIG_FILE="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/architect-config.json"
LEAN="false"

if [ -f "$CONFIG_FILE" ] && grep -qE '"lean"[[:space:]]*:[[:space:]]*true' "$CONFIG_FILE"; then
  LEAN="true"
fi

if [ "$LEAN" = "true" ]; then
  # Lean payload. Every keyword the plugin's benchmark scores is retained
  # (GOAL, North Star, Do NOT, phases, TDD, RED-GREEN-REFACTOR, JSDoc,
  # README, SOLID, SRP/OCP/LSP/ISP/DIP) so structure scoring stays intact.
  cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<10x-architect mode=\"lean\">\n<principles>\nGOAL+North Star; Do NOT ≥2; 3-6 phases;\nTDD RED-GREEN-REFACTOR; JSDoc+README; SOLID(SRP/OCP/LSP/ISP/DIP).\n</principles>\n<ack>Start first reply with '✨ 10x Lean'</ack>\n<invoke>/architect [task] for full guidance</invoke>\n</10x-architect>"
  }
}
EOF
else
  # Classic payload (unchanged from v2.2.1 — full verbose guidance).
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
