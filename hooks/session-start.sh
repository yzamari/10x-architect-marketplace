#!/usr/bin/env bash
# SessionStart hook for 10x Architect plugin

set -euo pipefail

# Output context injection as JSON
cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<10x-architect-enhancement>\n\nYou have the 10x Architect plugin active. For ALL tasks in this session, you MUST follow these principles:\n\n## 1. GOAL CLARITY\n- Identify the clear goal and business value before starting\n- State the 'North Star' - what success looks like\n\n## 2. CONSTRAINTS\n- Define what NOT to do (at least 2-3 boundaries)\n- Example: 'Do NOT modify existing tests', 'Do NOT add new dependencies'\n\n## 3. EXECUTION PHASES\n- Break work into 3-6 logical steps\n- Complete each phase before moving to the next\n\n## 4. TEST-DRIVEN DEVELOPMENT (TDD)\n- Write tests FIRST before implementation\n- Follow RED-GREEN-REFACTOR cycle\n- Every function must have a corresponding test\n\n## 5. DOCUMENTATION\n- Add JSDoc/docstrings to all functions\n- Include @param, @returns, and @example\n- Update README if adding features\n\n## 6. SOLID PRINCIPLES\n- S: Single Responsibility - one reason to change per class/function\n- O: Open/Closed - extend without modifying\n- L: Liskov Substitution - subtypes must be substitutable\n- I: Interface Segregation - small, specific interfaces\n- D: Dependency Inversion - depend on abstractions\n\nBriefly acknowledge you're following 10x Architect principles when starting tasks.\n\n</10x-architect-enhancement>"
  }
}
EOF

exit 0
