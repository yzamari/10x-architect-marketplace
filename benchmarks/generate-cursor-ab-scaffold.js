#!/usr/bin/env node
'use strict';

/**
 * Generate a ready-to-fill scaffold for the Cursor MDC A/B benchmark.
 *
 * Reads benchmarks/test-prompts.json and writes:
 *   - benchmarks/results/cursor-ab-samples.json   (empty responses keyed by prompt id)
 *   - benchmarks/results/cursor-ab-prompts.txt    (numbered prompt list to paste into Cursor)
 *
 * Usage:
 *   node generate-cursor-ab-scaffold.js
 *   node generate-cursor-ab-scaffold.js --force   # overwrite existing samples file
 *   node generate-cursor-ab-scaffold.js --input ./custom-prompts.json
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PROMPTS = path.join(__dirname, 'test-prompts.json');
const OUT_JSON = path.join(__dirname, 'results', 'cursor-ab-samples.json');
const OUT_PROMPTS = path.join(__dirname, 'results', 'cursor-ab-prompts.txt');

function parseArgs(argv) {
  const args = { input: DEFAULT_PROMPTS, force: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--input' && v) {
      args.input = path.isAbsolute(v) ? v : path.join(process.cwd(), v);
      i++;
      continue;
    }
    if (k === '--force') {
      args.force = true;
    }
  }
  return args;
}

function loadPrompts(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(raw.prompts)) {
    throw new Error(`Expected .prompts array in ${file}`);
  }
  return raw.prompts;
}

function main() {
  const args = parseArgs(process.argv);
  const prompts = loadPrompts(args.input);
  if (prompts.length === 0) {
    throw new Error('No prompts found.');
  }

  if (fs.existsSync(OUT_JSON) && !args.force) {
    console.error(`Refusing to overwrite ${OUT_JSON}. Use --force to replace it.`);
    process.exit(1);
  }

  const scaffold = {
    description:
      'Cursor MDC A/B scaffold. Paste real Cursor responses into each without.response and with.response field.',
    generatedAt: new Date().toISOString(),
    instructions: [
      '1) In your test project, disable the MDC rule (run: bash cursor/toggle-rule.sh /path/to/test-project)',
      '2) For each prompt in cursor-ab-prompts.txt, open a NEW Cursor chat and send the prompt.',
      '3) Paste the full reply into the matching without.response field.',
      '4) Re-enable the rule (run the toggle script again) and repeat, pasting into with.response.',
      '5) Optional: fill inputTokens/outputTokens/totalTokens per run from the Cursor UI.',
      '6) Run: npm run benchmark:cursor:ab',
    ],
    runs: prompts.map((p) => ({
      id: p.id,
      prompt: p.prompt,
      without: { response: '' },
      with: { response: '' },
    })),
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(scaffold, null, 2));

  const lines = [
    '# Cursor A/B prompts',
    '# Paste each prompt into a fresh Cursor chat in order.',
    '# Run once with the .mdc rule disabled, once with it enabled.',
    '',
    ...prompts.map((p, i) => `${String(i + 1).padStart(2)}. [${p.id}] ${p.prompt}`),
    '',
  ];
  fs.writeFileSync(OUT_PROMPTS, lines.join('\n'));

  console.log(`Scaffold written: ${OUT_JSON}`);
  console.log(`Prompts list   : ${OUT_PROMPTS}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1) Disable rule in test project, capture responses into without.response fields.');
  console.log('  2) Enable rule, capture responses into with.response fields.');
  console.log('  3) node run-cursor-ab.js --input results/cursor-ab-samples.json');
}

main();
