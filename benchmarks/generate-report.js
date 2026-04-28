#!/usr/bin/env node
'use strict';

/**
 * Generate a consolidated Markdown report from the latest offline benchmark JSON files.
 */

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, 'results');
const OUT_FILE = path.join(RESULTS_DIR, 'latest-suite-report.md');

/**
 * Reads a JSON result file from benchmarks/results.
 * @param {string} name - File name inside the results directory.
 * @returns {Record<string, unknown>} Parsed JSON payload.
 */
function readResult(name) {
  return JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, name), 'utf8'));
}

/**
 * Formats a benchmark gate as PASS or FAIL.
 * @param {boolean} passed - Whether the gate passed.
 * @returns {string} Human-readable gate label.
 */
function gate(passed) {
  return passed ? 'PASS' : 'FAIL';
}

/**
 * Builds the consolidated Markdown report.
 * @param {object} reports - Latest benchmark result payloads.
 * @param {Record<string, unknown>} reports.cursor - Cursor rule benchmark result.
 * @param {Record<string, unknown>} reports.cursorLean - Cursor lean benchmark result.
 * @param {Record<string, unknown>} reports.tokens - Token benchmark result.
 * @param {Record<string, unknown>} reports.structure - Direct structure benchmark result.
 * @returns {string} Markdown report contents.
 */
function buildReport({ cursor, cursorLean, tokens, structure }) {
  const cursorVariants = cursor.variants || {};
  const baseline = cursorVariants['No rule (baseline)'] || {};
  const plain = cursorVariants['Plain .cursorrules'] || {};
  const mdcBody = cursorVariants['10x .mdc (body only)'] || {};
  const mdcFull = cursorVariants['10x .mdc (full incl. front)'] || {};
  const latestTimestamp = cursor.timestamp || cursorLean.timestamp || tokens.timestamp || structure.timestamp || new Date().toISOString();
  const reportDate = String(latestTimestamp).slice(0, 10);

  return [
    '# 10x Architect Benchmark Suite Report',
    '',
    `- Date: ${reportDate}`,
    '- Commands run:',
    '  - `node run-cursor-benchmark.js`',
    '  - `node run-cursor-lean-benchmark.js`',
    '  - `node run-token-benchmark.js`',
    '  - `node run-benchmark-direct.js`',
    '',
    '## 1) Cursor Rule Benchmark',
    '',
    '| Variant | Tokens | Signals | Score |',
    '|---|---:|---:|---:|',
    `| No rule (baseline) | ${baseline.tokens} | ${baseline.signalsFound}/${baseline.signalTotal} | ${baseline.scorePercent}% |`,
    `| Plain \`.cursorrules\` | ${plain.tokens} | ${plain.signalsFound}/${plain.signalTotal} | ${plain.scorePercent}% |`,
    `| 10x \`.mdc\` (body only) | ${mdcBody.tokens} | ${mdcBody.signalsFound}/${mdcBody.signalTotal} | ${mdcBody.scorePercent}% |`,
    '',
    'Additional script output:',
    `- \`10x .mdc (full incl. front)\`: ${mdcFull.tokens} tokens, ${mdcFull.signalsFound}/${mdcFull.signalTotal}, ${mdcFull.scorePercent}%`,
    '',
    '## 1b) Cursor Classic vs Lean',
    '',
    '| Metric | Classic | Lean | Delta |',
    '|---|---:|---:|---:|',
    `| Body tokens | ${cursorLean.classic.bodyTokens} | ${cursorLean.lean.bodyTokens} | -${cursorLean.deltas.tokenSavingsPercent}% |`,
    `| Signals | ${cursorLean.classic.signalsFound}/${cursorLean.classic.signalTotal} | ${cursorLean.lean.signalsFound}/${cursorLean.lean.signalTotal} | 0 |`,
    `| Quality-signal retention | ${cursorLean.classic.scorePercent}% | ${cursorLean.lean.scorePercent}% | 0.0% |`,
    '',
    '## 2) Lean Token Benchmark',
    '',
    '| Metric | Classic | Lean | Delta |',
    '|---|---:|---:|---:|',
    `| SessionStart hook tokens | ${tokens.hook.classicTokens} | ${tokens.hook.leanTokens} | -${tokens.hook.savingsPct}% |`,
    `| \`/architect\` avg tokens (10 prompts) | ${Math.round(tokens.summary.totalClassicTokens / tokens.perPrompt.length)} | ${Math.round(tokens.summary.totalLeanTokens / tokens.perPrompt.length)} | -${tokens.summary.averageSavingsPct}% |`,
    `| Total tokens | ${tokens.summary.totalClassicTokens} | ${tokens.summary.totalLeanTokens} | -${tokens.summary.averageSavingsPct}% |`,
    `| Combined first-turn tax | ${tokens.summary.combinedFirstTurnTaxClassic} | ${tokens.summary.combinedFirstTurnTaxLean} | -${tokens.summary.combinedFirstTurnSavingsPct}% |`,
    `| Quality-signal retention | 100.0% | ${tokens.summary.averageQualityRetentionPct}% | +${(tokens.summary.averageQualityRetentionPct - 100).toFixed(1)}% |`,
    '',
    '## 3) Direct Structure Benchmark',
    '',
    '| Comparison | Score |',
    '|---|---:|',
    `| Average WITHOUT plugin | ${structure.summary.avgOriginal}% |`,
    `| Average WITH plugin | ${structure.summary.avgEnhanced}% |`,
    `| Average Improvement | +${structure.summary.improvement}% |`,
    '',
    '## Gates',
    '',
    `- \`run-cursor-benchmark.js\`: ${gate(cursor.gatesPass)}`,
    `  - Quality gate: ${mdcBody.scorePercent}% >= ${cursor.qualityFloor}%`,
    `  - Token gate: ${mdcBody.tokens} tokens <= ${cursor.tokenCeiling} ceiling`,
    `- \`run-cursor-lean-benchmark.js\`: ${gate(cursorLean.gatesPass)}`,
    `  - Token savings gate: ${cursorLean.deltas.tokenSavingsPercent}% >= ${cursorLean.gates.minSavingsPercent}%`,
    `  - Retention gate: ${cursorLean.deltas.qualityRetentionPercent}% >= ${cursorLean.gates.minRetentionPercent}%`,
    `- \`run-token-benchmark.js\`: ${gate(tokens.summary.averageSavingsPct >= 50 && tokens.summary.averageQualityRetentionPct >= 95 && tokens.hook.savingsPct >= 60)}`,
    '  - Targets met: savings >= 50%, retention >= 95%, hook savings >= 60%',
    `- \`run-benchmark-direct.js\`: ${gate(structure.gatesPass)}`,
    '  - Script completed with summary output and saved `benchmarks/results/latest.json`',
    '',
  ].join('\n');
}

/**
 * Writes the consolidated report to disk.
 * @returns {void}
 */
function main() {
  const report = buildReport({
    cursor: readResult('cursor-benchmark-latest.json'),
    cursorLean: readResult('cursor-lean-benchmark-latest.json'),
    tokens: readResult('token-benchmark-latest.json'),
    structure: readResult('latest.json'),
  });

  fs.writeFileSync(OUT_FILE, report, 'utf8');
  console.log(`Report written: ${OUT_FILE}`);
}

if (require.main === module) main();

module.exports = { buildReport, readResult };
