#!/usr/bin/env node
/**
 * Cursor Lean Benchmark
 *
 * Compares classic vs lean Cursor .mdc rule payloads.
 *
 * Exits non-zero if:
 *  - Lean token savings < 40%
 *  - Lean quality retention < 95%
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { encode } = require('gpt-tokenizer');

const ROOT = path.resolve(__dirname, '..');
const CLASSIC_FILE = path.join(ROOT, 'cursor', 'rules', '10x-architect.classic.mdc');
const LEAN_FILE = path.join(ROOT, 'cursor', 'rules', '10x-architect.mdc');

const SIGNALS = [
  { name: 'goal / North Star', re: /North Star/i },
  { name: 'Do NOT', re: /Do NOT/i },
  { name: 'phases', re: /phase|step/i },
  { name: 'TDD', re: /\bTDD\b/i },
  { name: 'RED-GREEN-REFACTOR', re: /RED.GREEN.REFACTOR/i },
  { name: 'JSDoc', re: /JSDoc/i },
  { name: 'README', re: /README/i },
  { name: 'SOLID', re: /\bSOLID\b/i },
  { name: 'edge case', re: /edge case/i },
  { name: 'step-by-step', re: /step.by.step/i },
];

function stripFrontmatter(raw) {
  return raw.replace(/^---[\s\S]*?---\n?/, '').trim();
}

function tok(text) {
  return encode(text).length;
}

function scoreSignals(text) {
  const hits = SIGNALS.filter((s) => s.re.test(text));
  return {
    hits,
    missing: SIGNALS.filter((s) => !hits.includes(s)),
    score: (hits.length / SIGNALS.length) * 100,
  };
}

const classicRaw = fs.readFileSync(CLASSIC_FILE, 'utf8');
const leanRaw = fs.readFileSync(LEAN_FILE, 'utf8');

const classicBody = stripFrontmatter(classicRaw);
const leanBody = stripFrontmatter(leanRaw);

const classic = {
  tokens: tok(classicBody),
  ...scoreSignals(classicBody),
};
const lean = {
  tokens: tok(leanBody),
  ...scoreSignals(leanBody),
};

const tokenSavings = classic.tokens === 0
  ? 0
  : ((classic.tokens - lean.tokens) / classic.tokens) * 100;
const retention = classic.score === 0
  ? 100
  : (lean.score / classic.score) * 100;

console.log('\n' + '═'.repeat(64));
console.log('           CURSOR CLASSIC VS LEAN BENCHMARK');
console.log('═'.repeat(64));
console.log('');
console.log(`  Classic body tokens: ${classic.tokens}`);
console.log(`  Lean body tokens:    ${lean.tokens}`);
console.log(`  Token savings:       ${tokenSavings.toFixed(1)}%`);
console.log('');
console.log(`  Classic signals:     ${classic.hits.length}/${SIGNALS.length} (${classic.score.toFixed(1)}%)`);
console.log(`  Lean signals:        ${lean.hits.length}/${SIGNALS.length} (${lean.score.toFixed(1)}%)`);
console.log(`  Signal retention:    ${retention.toFixed(1)}%`);
console.log('');

if (lean.missing.length > 0) {
  console.log('  Lean missing signals:');
  lean.missing.forEach((m) => console.log(`    - ${m.name}`));
  console.log('');
}

const MIN_SAVINGS = 40;
const MIN_RETENTION = 95;
let passed = true;

if (tokenSavings < MIN_SAVINGS) {
  console.error(`❌ FAIL: token savings ${tokenSavings.toFixed(1)}% < ${MIN_SAVINGS}%`);
  passed = false;
} else {
  console.log(`✅ Token savings gate: ${tokenSavings.toFixed(1)}% >= ${MIN_SAVINGS}%`);
}

if (retention < MIN_RETENTION) {
  console.error(`❌ FAIL: retention ${retention.toFixed(1)}% < ${MIN_RETENTION}%`);
  passed = false;
} else {
  console.log(`✅ Retention gate: ${retention.toFixed(1)}% >= ${MIN_RETENTION}%`);
}

const out = {
  timestamp: new Date().toISOString(),
  gatesPass: passed,
  gates: {
    minSavingsPercent: MIN_SAVINGS,
    minRetentionPercent: MIN_RETENTION,
  },
  classic: {
    file: path.relative(ROOT, CLASSIC_FILE),
    bodyTokens: classic.tokens,
    signalsFound: classic.hits.length,
    signalTotal: SIGNALS.length,
    scorePercent: parseFloat(classic.score.toFixed(1)),
  },
  lean: {
    file: path.relative(ROOT, LEAN_FILE),
    bodyTokens: lean.tokens,
    signalsFound: lean.hits.length,
    signalTotal: SIGNALS.length,
    scorePercent: parseFloat(lean.score.toFixed(1)),
  },
  deltas: {
    tokenSavingsPercent: parseFloat(tokenSavings.toFixed(1)),
    qualityRetentionPercent: parseFloat(retention.toFixed(1)),
  },
};

const outFile = path.join(__dirname, 'results', 'cursor-lean-benchmark-latest.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(`\nResults → ${outFile}`);

process.exit(passed ? 0 : 1);
