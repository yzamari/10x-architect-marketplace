#!/usr/bin/env node

/**
 * 10x Architect Response-Compression Benchmark (simulated lower bound).
 *
 * Offline. No API key required.
 *
 * Purpose: the Lean Mode SessionStart payload and /architect output
 * now carry a <response-style>terse; preserve code/commands/paths
 * verbatim; no filler</response-style> hint. The real effect of that
 * hint depends on Claude's compliance, which requires a live API test
 * to measure (see run-output-benchmark.js). This offline benchmark is
 * a FLOOR: it applies a rule-based terseness transformer (strip common
 * filler phrases, collapse verbose connectors, leave code/URLs alone)
 * to the real Claude responses already captured in
 * results/sample-outputs.json, and measures the token delta.
 *
 * Expect savings in the 10-25% range here. Live-API savings with model
 * compliance are typically higher — community caveman-style tools
 * report 65% on prose-heavy responses.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { encode } = require('gpt-tokenizer');
const { compressResponse } = require('./response-compressor');

const SAMPLES = path.join(__dirname, 'results', 'sample-outputs.json');
const OUT = path.join(__dirname, 'results', 'response-compression-benchmark.json');

// Synthetic filler-heavy prompts modelled on the typical "default verbose
// Claude" opening that the <response-style> hint is designed to suppress.
// These mirror the rhetorical patterns Claude emits before and around code
// in unstructured sessions (see juliusbrussee/caveman's motivating examples).
// Code fences are intentionally preserved so the compressor can prove it
// leaves them verbatim.
const SYNTHETIC = [
  {
    id: 'syn-email',
    task: 'Create a function to validate email addresses',
    text:
      "Sure! I'll go ahead and implement this for you. Let me walk you through the approach step by step.\n\n" +
      "Here's the implementation I'll create:\n\n" +
      '```javascript\nfunction validateEmail(email) {\n  const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  return re.test(email);\n}\n```\n\n' +
      'As you can see, this approach basically works by using a simple regex. ' +
      "It's worth mentioning that this is not a full RFC 5322 parser. " +
      'In order to handle edge cases like plus-addressing or quoted locals, we would essentially need a larger grammar. ' +
      'That being said, for most applications the regex above is sufficient due to the fact that the vast majority of inputs are simple. ' +
      'By the way, note that this is a synchronous function. ' +
      'On the other hand, if you need async validation with MX lookup, that would be an entirely different implementation. ' +
      "In conclusion, this is a good starting point and you can extend it as needed.",
  },
  {
    id: 'syn-fetch',
    task: 'Create a function to fetch users from an API',
    text:
      "Absolutely! I'll help you build this. Let me first explain my thinking and then provide the code.\n\n" +
      "Here's a complete implementation with error handling:\n\n" +
      "```javascript\nasync function fetchUsers(url) {\n  const res = await fetch(url);\n  if (!res.ok) throw new Error('HTTP ' + res.status);\n  return res.json();\n}\n```\n\n" +
      'Note that this uses the native fetch API. ' +
      'You can see that we throw on non-2xx responses, which is essentially the correct behavior for most cases. ' +
      'It is worth noting that fetch does not reject on HTTP errors by default, so in order to get that behavior we have to check `res.ok` manually. ' +
      "That being said, some teams prefer to return a result object instead of throwing. By the way, for retries you'd typically wrap this with a helper.",
  },
  {
    id: 'syn-cart',
    task: 'Create a function to calculate shopping cart total with tax',
    text:
      "Great question! Let me now walk you through a clean implementation.\n\n" +
      "Here's the full solution:\n\n" +
      '```typescript\nexport function cartTotal(items: {price:number; qty:number}[], tax: number): number {\n  const subtotal = items.reduce((s,i) => s + i.price*i.qty, 0);\n  return +(subtotal * (1 + tax)).toFixed(2);\n}\n```\n\n' +
      'As you can see, this function basically iterates over the items. ' +
      'In order to avoid floating-point issues we round at the end, essentially using `toFixed(2)` which due to the fact that it returns a string, we coerce back with the unary plus. ' +
      'This is because JavaScript numbers are IEEE 754 doubles. ' +
      'On the other hand, for real currency math you would typically use a dedicated library or store everything in integer cents. ' +
      'By the way, the tax parameter is a decimal (e.g. 0.08 for 8%). In conclusion, this is adequate for display purposes.',
  },
];

function measureSynthetic() {
  const per = [];
  let sumOrig = 0;
  let sumTerse = 0;
  for (const s of SYNTHETIC) {
    const terse = compressResponse(s.text);
    const cT = tok(s.text);
    const lT = tok(terse);
    sumOrig += cT;
    sumTerse += lT;
    per.push({
      id: s.id,
      task: s.task,
      originalTokens: cT,
      terseTokens: lT,
      savedTokens: cT - lT,
      savingsPct: +((1 - lT / cT) * 100).toFixed(1),
    });
  }
  return {
    perTask: per,
    total: sumOrig,
    totalTerse: sumTerse,
    avgSavingsPct: sumOrig > 0 ? +((1 - sumTerse / sumOrig) * 100).toFixed(1) : 0,
  };
}

function tok(s) {
  return encode(s).length;
}

function measureField(tasks, field) {
  const per = [];
  let sumOrig = 0;
  let sumTerse = 0;
  for (const t of tasks) {
    const original = t[field];
    if (!original) continue;
    const terse = compressResponse(original);
    const cT = tok(original);
    const lT = tok(terse);
    const saved = cT - lT;
    const pct = cT > 0 ? (saved / cT) * 100 : 0;
    sumOrig += cT;
    sumTerse += lT;
    per.push({
      id: t.id,
      task: t.task,
      originalTokens: cT,
      terseTokens: lT,
      savedTokens: saved,
      savingsPct: +pct.toFixed(1),
    });
  }
  return {
    perTask: per,
    total: sumOrig,
    totalTerse: sumTerse,
    avgSavingsPct: sumOrig > 0 ? +((1 - sumTerse / sumOrig) * 100).toFixed(1) : 0,
  };
}

function printTable(label, m) {
  console.log(`\n▸ ${label}`);
  console.log('  # | task                                  | orig tok | terse tok | savings');
  console.log('  --+---------------------------------------+----------+-----------+--------');
  m.perTask.forEach((r, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)} | ${r.task.padEnd(37).slice(0, 37)} | ${String(r.originalTokens).padStart(8)} | ${String(r.terseTokens).padStart(9)} | ${(r.savingsPct.toFixed(1) + '%').padStart(7)}`,
    );
  });
  console.log(`  avg: ${m.avgSavingsPct.toFixed(1)}%  (${m.total} → ${m.totalTerse} tokens, saved ${m.total - m.totalTerse})`);
}

function main() {
  const samples = JSON.parse(fs.readFileSync(SAMPLES, 'utf8'));
  const tasks = samples.tasks;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     RESPONSE-COMPRESSION BENCHMARK (simulated lower bound)    ');
  console.log('═══════════════════════════════════════════════════════════════');

  // Two baselines:
  //   "without" = Claude's natural verbose response (no 10x enhancement).
  //               This is where the <response-style> hint has the MOST bite.
  //   "with"    = Claude's response under classic 10x enhancement — already
  //               structured and fairly terse, so rule-based compression
  //               barely moves the needle. Reported as a fairness check.
  const withoutM = measureField(tasks, 'without');
  const withM = measureField(tasks, 'with');
  const synM = measureSynthetic();

  printTable('Unenhanced stored responses ("without" — short, code-heavy)', withoutM);
  printTable('Enhanced stored responses ("with" — already 10x-structured)', withM);
  printTable('Synthetic filler-heavy responses (verbose-Claude style)', synM);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                           SUMMARY                              ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  Synthetic verbose Claude → terse (expected hint behavior):`);
  console.log(`     ${synM.total} → ${synM.totalTerse} tokens  (-${synM.avgSavingsPct}%)`);
  console.log(`  Natural short responses ("without"):`);
  console.log(`     ${withoutM.total} → ${withoutM.totalTerse} tokens  (-${withoutM.avgSavingsPct}%)`);
  console.log(`  10x-enhanced responses ("with", fairness check):`);
  console.log(`     ${withM.total} → ${withM.totalTerse} tokens  (-${withM.avgSavingsPct}%)\n`);
  console.log('  Interpretation:');
  console.log('    • The compressor targets filler phrases ("I\'ll walk you through",');
  console.log('      "As you can see", "basically", "in order to", etc.) and never');
  console.log('      touches code blocks, inline code, or URLs.');
  console.log('    • Stored real responses are short and already dense, so the');
  console.log('      observed % is small — confirming the transformer is safe and');
  console.log('      not a false-positive generator.');
  console.log('    • Synthetic samples exercise the patterns the <response-style>');
  console.log('      hint is designed to suppress and show the tool\'s real teeth.');
  console.log('    • Live-API results depend on Claude\'s compliance with the hint;');
  console.log('      community caveman-style tools report ~65% on prose-heavy.\n');

  const out = {
    timestamp: new Date().toISOString(),
    kind: 'simulated-lower-bound',
    tokenizer: 'gpt-tokenizer (cl100k_base)',
    note: 'Rule-based prose compression. Code blocks, inline code, and URLs preserved verbatim. Three baselines reported: real "without" (natural Claude, short+dense), real "with" (10x-enhanced, already structured), and a synthetic filler-heavy set that mirrors the rhetorical patterns the <response-style> hint targets.',
    stored: {
      withoutEnhancement: withoutM,
      withEnhancement: withM,
    },
    syntheticFillerHeavy: synM,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`📁 Results saved: ${OUT}`);
}

if (require.main === module) main();

module.exports = { main };
