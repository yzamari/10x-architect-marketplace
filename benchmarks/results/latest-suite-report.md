# 10x Architect Benchmark Suite Report

- Date: 2026-04-24
- Commands run:
  - `node run-cursor-benchmark.js`
  - `node run-token-benchmark.js`
  - `node run-benchmark-direct.js`

## 1) Cursor Rule Benchmark

| Variant | Tokens | Signals | Score |
|---|---:|---:|---:|
| No rule (baseline) | 0 | 0/10 | 0.0% |
| Plain `.cursorrules` | 27 | 2/10 | 20.0% |
| 10x `.mdc` (body only) | 290 | 10/10 | 100.0% |

Additional script output:
- `10x .mdc (full incl. front)`: 339 tokens, 10/10, 100.0%

## 2) Lean Token Benchmark

| Metric | Classic | Lean | Delta |
|---|---:|---:|---:|
| SessionStart hook tokens | 319 | 122 | -61.8% |
| `/architect` avg tokens (10 prompts) | 414 | 194 | -53.1% |
| Total tokens | 4137 | 1939 | -53.1% |
| Combined first-turn tax | 733 | 316 | -56.9% |
| Quality-signal retention | 100.0% | 101.1% | +1.1% |

## 3) Direct Structure Benchmark

| Comparison | Score |
|---|---:|
| Average WITHOUT plugin | 1.3% |
| Average WITH plugin | 98.8% |
| Average Improvement | +97.5% |

## Gates

- `run-cursor-benchmark.js`: PASS
  - Quality gate: 100.0% >= 90%
  - Token gate: 290 tokens <= 350 ceiling
- `run-token-benchmark.js`: PASS
  - Targets met: savings >= 50%, retention >= 95%, hook savings >= 60%
- `run-benchmark-direct.js`: PASS
  - Script completed with summary output and saved `benchmarks/results/latest.json`
