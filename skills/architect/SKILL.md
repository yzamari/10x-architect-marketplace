---
name: architect
description: Auto-enhance prompts using Greg Isenberg's 10 Rules for Claude Code. Invoke with "architect [task]" to transform vague requests into precise, structured prompts with goals, constraints, phased execution, TDD, documentation, and SOLID principles.
---

# The 10x Architect

Transform any request into an optimized prompt using the **10 Rules for Claude Code** plus **mandatory engineering principles**.

## Visual Feedback (v1.3.0+)

When the plugin enhances your prompt, you'll see:

```
✨ 10x Architect Enhanced
├─ Goal: [your clarified goal]
├─ Constraints: [count] boundaries set
├─ Phases: [count] execution steps
├─ TDD: Tests required first
├─ Docs: Documentation enforced
└─ SOLID: OOP principles applied
```

This confirms the enhancement was applied and shows what was added.

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

Apply the 10 principles + mandatory engineering principles to create:

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
  "enforceSOLID": true
}
```

## Example

**Input:** `architect add search to the header`

**Output:**
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
