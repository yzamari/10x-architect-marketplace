---
name: architect
description: Auto-enhance prompts using Greg Isenberg's 10 Rules for Claude Code. Invoke with "architect [task]" to transform vague requests into precise, structured prompts with goals, constraints, phased execution, TDD, documentation, and SOLID principles.
---

# The 10x Architect

Transform any request into an optimized prompt using the **10 Rules for Claude Code** plus **mandatory engineering principles**.

## Visual Feedback

- **Lean Mode (default, v2.4.0+)** — the plugin is quiet. No banner, no acknowledgment. Evidence it's active: Claude's replies start following the principles and stay terse.
- **Classic Mode (`"lean": false`)** — you still see the v2.2.1-era banner:

```
✨ 10x Architect Enhanced
├─ Goal: [your clarified goal]
├─ Constraints: [count] boundaries set
├─ Phases: [count] execution steps
├─ TDD: Tests required first
├─ Docs: Documentation enforced
└─ SOLID: OOP principles applied
```

- **Explicit `/architect [task]`** — the skill prints the structured breakdown (Lean XML tags or Classic blocks, depending on config) so you can edit before Claude executes (modes B/C).

## Usage

```
architect [task]
architect --mode=A [task]   # Silent - no prompt shown
architect --mode=B [task]   # Show prompt, execute immediately
architect --mode=C [task]   # Show prompt, wait 5s (default)
architect --lean [task]     # Force Lean Mode for this invocation
```

## Execution Protocol

### 1. Check Config

Read `.claude/architect-config.json`. As of v2.4.0 this file is written automatically by the SessionStart hook on first run — it will normally exist. If it doesn't (e.g. user deleted it), the plugin still works with built-in defaults (Lean on, mode C).

Config field `lean` (boolean, **default `true`** as of v2.4.0) selects the output profile:

- `"lean": true`  → **Lean Mode** output (section 4b below, **default**): compact XML, ~55–70% fewer tokens, same quality signals (goal, north-star, Do NOT, phases, TDD, RED-GREEN-REFACTOR, JSDoc, README, SOLID). Also emits `<response-style>` so Claude's replies stay terse.
- `"lean": false` → Classic output (section 4a below): verbose, decorated, human-readable (v2.2.1 behavior, opt-out).

CLI flag `--lean` on a single invocation forces Lean Mode for that call regardless of config. There is no `--classic` flag — set `"lean": false` in the config if you want Classic as your session default.

### 2. Parse Request

Extract: task description, mode override (`--mode=X`), any mentioned technologies.

### 3. Auto-Detect Context

If `autoDetect: true`, scan for: `package.json`, `requirements.txt`, `tsconfig.json`, etc. Build tech stack summary.

### 4. Generate Enhanced Prompt

Apply the 10 principles + mandatory engineering principles.

#### 4a. Classic output (default, `lean: false`)

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

  <tdd>
    - Write failing test first (RED)
    - Implement minimum code to pass (GREEN)
    - Refactor while keeping tests green (REFACTOR)
  </tdd>

  <documentation>
    - Add JSDoc/docstrings to all functions
    - Update README if adding features
    - Document complex logic inline
  </documentation>

  <solid_principles>
    - Apply Single Responsibility
    - Follow Open/Closed principle
    - Ensure proper abstractions
  </solid_principles>

  <instructions>
    Think step-by-step through each phase.
    Critique your implementation for edge cases.
  </instructions>
</enhanced_prompt>
```

#### 4b. Lean output (`lean: true`, v2.3.0+)

Compact XML that retains every quality signal the benchmark measures while cutting ~55–70% of tokens. Each tag is required; keep content telegraphic (semicolons between items, no filler prose).

```xml
<goal>[specific action]; North Star: [business value]</goal>
<constraints>Do NOT [a]; Do NOT [b]; Do NOT [c]</constraints>
<phases>1.test-[x] 2.impl-[x] 3.test-[y] 4.impl-[y] 5.docs</phases>
<tdd>TDD RED-GREEN-REFACTOR; every fn has test; cover edge cases + errors</tdd>
<docs>JSDoc @param/@returns; README if user-facing; comment complex logic</docs>
<solid>SOLID: SRP · OCP · LSP · ISP · DIP applied (Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion)</solid>
<response-style>terse; preserve code/commands/paths verbatim; skip filler prose</response-style>
<think>step-by-step; list edge cases; critique for boundary conditions</think>
```

Rules for Lean output:
- Every tag is emitted (no skipping) so the structure score stays at 100%.
- Keywords `North Star`, `Do NOT`, `TDD`, `RED-GREEN-REFACTOR`, `JSDoc`, `README`, `SOLID`, `Single Responsibility`, `edge case`, `step-by-step` must appear verbatim somewhere in the payload — they are the scoring hooks.
- No bullet prose, no headers, no decoration characters beyond the XML tags.
- Target: ≤ 250 tokens for a typical feature task.

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

---

## Mandatory Engineering Principles (v1.3.0+)

### 🧪 Test-Driven Development (TDD)

**Every feature MUST follow the RED-GREEN-REFACTOR cycle:**

```
┌─────────────────────────────────────────────────────────┐
│                    TDD WORKFLOW                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1. RED    → Write a failing test first                │
│   2. GREEN  → Write minimum code to pass the test       │
│   3. REFACTOR → Improve code while tests stay green     │
│                                                         │
│   Repeat for every function/feature                     │
└─────────────────────────────────────────────────────────┘
```

**Requirements:**
- Every function must have a corresponding test
- Tests must be written BEFORE implementation
- Test edge cases and error conditions
- Maintain test coverage for all new code

### 📝 Documentation

**Every feature MUST be documented:**

| What | How |
|------|-----|
| Functions | JSDoc (JS/TS) or docstrings (Python) |
| Classes | Class-level documentation with purpose |
| Modules | Module header with overview |
| Features | README updates for user-facing changes |
| Complex Logic | Inline comments explaining "why" |
| APIs | OpenAPI/Swagger or equivalent |

**Example:**
```typescript
/**
 * Calculates the total price including tax and discounts.
 *
 * @param items - Array of cart items with price and quantity
 * @param taxRate - Tax rate as decimal (e.g., 0.08 for 8%)
 * @param discountCode - Optional discount code to apply
 * @returns Total price after tax and discounts
 * @throws {InvalidDiscountError} If discount code is invalid
 *
 * @example
 * const total = calculateTotal(items, 0.08, 'SAVE10');
 */
function calculateTotal(items: CartItem[], taxRate: number, discountCode?: string): number
```

### 🏗️ OOP & SOLID Principles

**Every implementation MUST follow SOLID:**

| Principle | Meaning | Application |
|-----------|---------|-------------|
| **S** - Single Responsibility | One class = one reason to change | Split large classes into focused ones |
| **O** - Open/Closed | Open for extension, closed for modification | Use interfaces and inheritance |
| **L** - Liskov Substitution | Subtypes must be substitutable | Derived classes honor base contracts |
| **I** - Interface Segregation | Many specific interfaces > one general | Split fat interfaces |
| **D** - Dependency Inversion | Depend on abstractions, not concretions | Inject dependencies |

**Example - Dependency Inversion:**
```typescript
// ❌ BAD: Direct dependency on concrete class
class OrderService {
  private db = new MySQLDatabase();  // Tight coupling
}

// ✅ GOOD: Depend on abstraction
class OrderService {
  constructor(private db: IDatabase) {}  // Loose coupling
}
```

---

## Config

`.claude/architect-config.json`:
```json
{
  "mode": "C",
  "autoDetect": true,
  "autoApproveTimeout": 5,
  "enforceTDD": true,
  "enforceDocumentation": true,
  "enforceSOLID": true,
  "lean": true
}
```

| Option | Default | Effect |
|--------|:-------:|--------|
| `lean` | `true` (v2.4.0+) | When `true`, both the SessionStart hook and `/architect` output use Lean Mode (compact XML, ~55–70% fewer tokens, session-wide terse-response hint). Quality signals retained. Set to `false` for v2.2.1 verbose behavior. See `benchmarks/run-token-benchmark.js`. |

## Example

**Input:** `architect add search to the header`

### Lean Mode output (default since v2.4.0)

```xml
<goal>Add a search bar to the header component; North Star: enable users to find content quickly</goal>
<constraints>Do NOT implement backend search yet; Do NOT modify existing header layout; Do NOT add new dependencies</constraints>
<phases>1.test-SearchBar 2.impl-SearchBar 3.test-Header 4.integrate 5.docs</phases>
<tdd>TDD RED-GREEN-REFACTOR; cover edge cases + errors</tdd>
<docs>JSDoc @param/@returns; README if user-facing</docs>
<solid>SOLID: SRP·OCP·LSP·ISP·DIP</solid>
<response-style>terse; preserve code/commands/paths verbatim; no filler</response-style>
<think>step-by-step; critique edge cases</think>
```

### Classic Mode output (`"lean": false`, v2.2.1 behavior)

```
┌────────────────────────────────────────────────┐
│ 10x ARCHITECT GUIDANCE                         │
└────────────────────────────────────────────────┘

▶ GOAL
Add a search bar to the header component

★ NORTH STAR
Enable users to find content quickly

⛔ CONSTRAINTS
- Use existing Header styling patterns
- Do NOT implement backend search yet
- Keep component under 100 lines

▷ EXECUTION PHASES
1. Write tests for SearchBar component
2. Create SearchBar component (make tests pass)
3. Write tests for Header integration
4. Integrate SearchBar into Header
5. Add placeholder behavior
6. Document the new component

✔ TEST-DRIVEN DEVELOPMENT
- Write failing test first (RED)
- Implement minimum code to pass (GREEN)
- Refactor while keeping tests green (REFACTOR)
- Every function must have corresponding test
- Test edge cases and error conditions

✍ DOCUMENTATION REQUIREMENTS
- Add JSDoc/docstrings to all functions
- Update README if adding features
- Document complex logic inline
- Include usage examples

❖ OOP & SOLID PRINCIPLES
- S: Single Responsibility - SearchBar does only search UI
- O: Open/Closed - extensible for future search providers
- L: Liskov Substitution - implements ISearchComponent
- I: Interface Segregation - minimal props interface
- D: Dependency Inversion - inject search handler

⚠ QUALITY GUARDRAILS
Think step-by-step through each phase.
Critique your implementation for:
- Accessibility (keyboard navigation, ARIA)
- Performance (debounce input)
- Mobile responsiveness
```

Classic output is ~10× longer for the same semantic content — that's the token saving Lean Mode buys, at 100% structure-score retention on the benchmark rubric.
