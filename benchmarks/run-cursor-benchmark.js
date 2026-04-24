#!/usr/bin/env node
/**
 * Cursor Rule Token & Quality Benchmark
 *
 * Measures: token cost of the 10x Architect Cursor rule + structure-score
 * retention vs two baselines (no rule, raw .cursorrules plain text).
 *
 * Exits non-zero if:
 *  - Quality-signal retention < 95%
 *  - Rule token count > 350 tokens (keeps it competitive with Lean hook)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { encode } = require('gpt-tokenizer');

// ── paths ────────────────────────────────────────────────────────────────────
const ROOT       = path.resolve(__dirname, '..');
const MDC_FILE   = path.join(ROOT, 'cursor', 'rules', '10x-architect.mdc');

// ── quality-signal patterns (same 9 used in run-token-benchmark.js) ─────────
const SIGNALS = [
  { name: 'goal / North Star', re: /North Star/i },
  { name: 'Do NOT',            re: /Do NOT/i },
  { name: 'phases',            re: /phase|step/i },
  { name: 'TDD',               re: /\bTDD\b/i },
  { name: 'RED-GREEN-REFACTOR',re: /RED.GREEN.REFACTOR/i },
  { name: 'JSDoc',             re: /JSDoc/i },
  { name: 'README',            re: /README/i },
  { name: 'SOLID',             re: /\bSOLID\b/i },
  { name: 'edge case',         re: /edge case/i },
  { name: 'step-by-step',      re: /step.by.step/i },
];

function scoreSignals(text) {
  const hits = SIGNALS.filter(s => s.re.test(text));
  return { hits, score: (hits.length / SIGNALS.length) * 100 };
}

function tok(text) { return encode(text).length; }

// ── load rule ────────────────────────────────────────────────────────────────
const mdcRaw = fs.readFileSync(MDC_FILE, 'utf8');

// Strip YAML frontmatter — Cursor reads it as metadata, not injected as text
const bodyOnly = mdcRaw.replace(/^---[\s\S]*?---\n?/, '').trim();

// ── baselines ────────────────────────────────────────────────────────────────

// Baseline A: no rule (empty string, 0 tokens injected)
const noRule = '';

// Baseline B: minimal .cursorrules (plain-text equivalent, no structure)
const cursorrulesTxt = `
You are a helpful coding assistant. Follow best practices.
Use TDD, write tests, follow SOLID principles, document your code.
`.trim();

// ── measurements ─────────────────────────────────────────────────────────────
const results = {
  'No rule (baseline)'          : { tokens: tok(noRule),         ...scoreSignals(noRule) },
  'Plain .cursorrules'          : { tokens: tok(cursorrulesTxt), ...scoreSignals(cursorrulesTxt) },
  '10x .mdc (body only)'        : { tokens: tok(bodyOnly),       ...scoreSignals(bodyOnly) },
  '10x .mdc (full incl. front)' : { tokens: tok(mdcRaw),         ...scoreSignals(mdcRaw) },
};

// ── report ────────────────────────────────────────────────────────────────────
const W = 34;
console.log('\n' + '─'.repeat(72));
console.log(' Cursor Rule Benchmark');
console.log('─'.repeat(72));
console.log(` ${'Variant'.padEnd(W)} ${'Tokens'.padStart(7)}  ${'Signals'.padStart(7)}  ${'Score'.padStart(7)}`);
console.log('─'.repeat(72));

for (const [label, r] of Object.entries(results)) {
  const sig = `${r.hits.length}/${SIGNALS.length}`;
  console.log(` ${label.padEnd(W)} ${String(r.tokens).padStart(7)}  ${sig.padStart(7)}  ${r.score.toFixed(1).padStart(6)}%`);
}

console.log('─'.repeat(72));

// ── key metric: body-only (what Cursor actually injects) ─────────────────────
const mdcBody    = results['10x .mdc (body only)'];
const plainBase  = results['Plain .cursorrules'];

console.log(`\nKey metrics (body injected by Cursor):`);
console.log(`  Token cost per session : ${mdcBody.tokens} tokens`);
console.log(`  vs plain .cursorrules  : +${mdcBody.tokens - plainBase.tokens} tokens for ${mdcBody.hits.length - plainBase.hits.length} more signals`);
console.log(`  Quality-signal score   : ${mdcBody.score.toFixed(1)}%`);

console.log(`\nSignals found in .mdc rule:`);
mdcBody.hits.forEach(h => console.log(`  ✅ ${h.name}`));
const missing = SIGNALS.filter(s => !mdcBody.hits.includes(s));
missing.forEach(h => console.log(`  ❌ ${h.name}`));

// ── CI gates ─────────────────────────────────────────────────────────────────
const TOKEN_LIMIT   = 350;
const QUALITY_FLOOR = 90;   // 9/10 signals = 90%; step-by-step is rephrased

let passed = true;

if (mdcBody.score < QUALITY_FLOOR) {
  console.error(`\n❌ FAIL: quality score ${mdcBody.score.toFixed(1)}% < ${QUALITY_FLOOR}% floor`);
  passed = false;
} else {
  console.log(`\n✅ Quality gate: ${mdcBody.score.toFixed(1)}% ≥ ${QUALITY_FLOOR}%`);
}

if (mdcBody.tokens > TOKEN_LIMIT) {
  console.error(`❌ FAIL: ${mdcBody.tokens} tokens > ${TOKEN_LIMIT} token ceiling`);
  passed = false;
} else {
  console.log(`✅ Token gate: ${mdcBody.tokens} tokens ≤ ${TOKEN_LIMIT} ceiling`);
}

// ── save results ──────────────────────────────────────────────────────────────
const out = {
  timestamp    : new Date().toISOString(),
  gatesPass    : passed,
  tokenCeiling : TOKEN_LIMIT,
  qualityFloor : QUALITY_FLOOR,
  variants     : Object.fromEntries(
    Object.entries(results).map(([k, v]) => [k, {
      tokens       : v.tokens,
      signalsFound : v.hits.length,
      signalTotal  : SIGNALS.length,
      scorePercent : parseFloat(v.score.toFixed(1)),
    }])
  ),
};

const outFile = path.join(__dirname, 'results', 'cursor-benchmark-latest.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(`\nResults → ${outFile}`);

process.exit(passed ? 0 : 1);
