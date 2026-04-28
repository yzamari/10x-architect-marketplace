# Cursor MDC A/B Benchmark (Simulation)

- Timestamp: 2026-04-24T09:16:26.680Z
- Sample size: 10
- Input: `/Users/yahavzamari/Projects/GitHub/10x-architect-marketplace/benchmarks/results/cursor-ab-samples.simulation.json`
- Scope: simulation only; publish real captured results from `cursor-ab-latest.*` after filling `cursor-ab-samples.json`.

## Summary

| Metric | Without | With | Delta |
|---|---:|---:|---:|
| Quality score (%) | 1.4 | 90 | +88.6 |
| Total tokens | 82.5 | 291 | +208.5 |
| Quality per token | 0.0357 | 0.3174 | +0.2817 |
| Correctness signal (%) | 80 | 80 | +0 |

## Metric Lift

| Metric | Without % | With % | Delta % |
|---|---:|---:|---:|
| Goal clarity | 0 | 100 | +100 |
| Constraints / Do NOT | 0 | 100 | +100 |
| Phased execution | 0 | 100 | +100 |
| TDD presence | 0 | 50 | +50 |
| Docs/JSDoc mention | 10 | 100 | +90 |
| SOLID/OOP mention | 0 | 80 | +80 |
| Edge-case handling | 0 | 100 | +100 |

## Gates

- Quality lift >= 25%: PASS
- Quality-per-token delta >= 0: PASS
- Correctness non-regression >= 0%: PASS
- Overall: PASS

## Per Prompt

| ID | Quality Δ% | Tokens Δ | QPT Δ |
|---|---:|---:|---:|
| feature-simple | +100 | +206 | +0.3175 |
| feature-medium | +100 | +253 | +0.2545 |
| feature-complex | +85.7 | +229 | +0.2514 |
| bugfix-simple | +85.7 | +221 | +0.2956 |
| bugfix-medium | +85.7 | +191 | +0.3348 |
| refactor-simple | +85.7 | +169 | +0.4062 |
| refactor-medium | +85.7 | +219 | +0.2896 |
| refactor-complex | +85.7 | +210 | +0.314 |
| docs-simple | +71.4 | +176 | +0.0397 |
| test-simple | +100 | +211 | +0.3135 |
