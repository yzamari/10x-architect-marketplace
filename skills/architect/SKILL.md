---
name: architect
description: Auto-enhance prompts using Greg Isenberg's 10 Rules for Claude Code. Invoke with "architect [task]" to transform vague requests into precise, structured prompts with goals, constraints, and phased execution.
---

# The 10x Architect

Transform any request into an optimized prompt using the **10 Rules for Claude Code**.

## Usage

```
architect [task]
architect --mode=A [task]   # Silent - no prompt shown
architect --mode=B [task]   # Show prompt, execute immediately
architect --mode=C [task]   # Show prompt, wait 5s (default)
```

## Execution Protocol

### 1. Check Config

Read `.claude/architect-config.json` if exists. If not, ask user for preferred mode (A/B/C) and create config.

### 2. Parse Request

Extract: task description, mode override (`--mode=X`), any mentioned technologies.

### 3. Auto-Detect Context

If `autoDetect: true`, scan for: `package.json`, `requirements.txt`, `tsconfig.json`, etc. Build tech stack summary.

### 4. Generate Enhanced Prompt

Apply the 10 principles to create:

```xml
<enhanced_prompt>
  <goal>
    We will [specific action].
    North Star: [business value/user benefit]
  </goal>

  <constraints>
    - Do NOT [boundary 1]
    - Do NOT [boundary 2]
    - Keep [limit]
  </constraints>

  <execution_phases>
    <phase n="1">[First step]</phase>
    <phase n="2">[Second step]</phase>
    <phase n="3">[Third step]</phase>
  </execution_phases>

  <instructions>
    Think step-by-step through each phase.
    Critique your implementation for edge cases.
  </instructions>
</enhanced_prompt>
```

### 5. Execute by Mode

- **Mode A**: Execute silently using enhanced prompt as internal guidance
- **Mode B**: Display prompt, then execute immediately
- **Mode C**: Display prompt, wait 5 seconds, then execute (user can say "stop" or "edit")

## The 10 Principles

| # | Principle | Application |
|---|-----------|-------------|
| 1 | Draft → Plan → Act | Structure into phases |
| 2 | Collaborative Tone | Use "We" language |
| 3 | Be Explicit | Replace vague verbs |
| 4 | Set Boundaries | Add "Do NOT" constraints |
| 5 | Demand Structure | Use XML tags |
| 6 | Explain the Why | Add North Star goal |
| 7 | Control Verbosity | Set MVP/Production level |
| 8 | Provide Scaffolds | Reference project patterns |
| 9 | Power Phrases | Add "Think step-by-step" |
| 10 | Divide & Conquer | Break into sub-tasks |

## Config

`.claude/architect-config.json`:
```json
{
  "mode": "C",
  "autoDetect": true,
  "autoApproveTimeout": 5
}
```

## Example

**Input:** `architect add search to the header`

**Output:**
```xml
<enhanced_prompt>
  <goal>
    We will add a search bar to the header.
    North Star: Enable users to find content quickly.
  </goal>
  <constraints>
    - Use existing styling patterns
    - Do NOT implement backend search yet
    - Keep component under 100 lines
  </constraints>
  <execution_phases>
    <phase n="1">Read existing Header component</phase>
    <phase n="2">Create SearchBar component</phase>
    <phase n="3">Integrate into Header</phase>
    <phase n="4">Add placeholder behavior</phase>
  </execution_phases>
  <instructions>
    Think step-by-step. Critique for accessibility.
  </instructions>
</enhanced_prompt>
```
