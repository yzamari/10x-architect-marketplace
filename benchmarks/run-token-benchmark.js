#!/usr/bin/env node

/**
 * 10x Architect Token Benchmark (Lean Mode)
 *
 * Offline benchmark. No API key required.
 *
 * Measures:
 *   1) SessionStart hook token cost: classic vs lean (read directly from
 *      hooks/session-start.sh so numbers track the real payload).
 *   2) /architect enhancement cost: classic (sample outputs already saved
 *      in results/enhanced-prompts.json) vs lean (produced deterministically
 *      by lean-templater.js from the same classic input).
 *   3) Structure-score retention: runs the same pattern-match rubric as
 *      run-benchmark-direct.js on both forms, so we can prove that lean
 *      output still scores >= 95% vs classic.
 *
 * Writes: results/token-benchmark-latest.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { encode } = require('gpt-tokenizer');
const { transformToLean } = require('./lean-templater');

const ROOT = path.resolve(__dirname, '..');
const ENHANCED_FILE = path.join(__dirname, 'results', 'enhanced-prompts.json');
const HOOK_FILE = path.join(ROOT, 'hooks', 'session-start.sh');
const OUT_FILE = path.join(__dirname, 'results', 'token-benchmark-latest.json');
const TEST_FILE = path.join(__dirname, 'test-prompts.json');

const METRICS = [
  { id: 'has_goal', pattern: /(Goal:|GOAL|goal:|We will|objective)/gi },
  { id: 'has_north_star', pattern: /(North Star|NORTH STAR|business value|user benefit)/gi },
  { id: 'has_constraints', pattern: /(Do NOT|Don't|CONSTRAINT|Constraints:|avoid|must not)/gi },
  { id: 'has_phases', pattern: /(Phase|Step \d|\d\.\s+\w|EXECUTION|phases)/gi },
  { id: 'has_tdd', pattern: /(TDD|test.driven|RED.GREEN|write.*test.*first|failing test)/gi },
  { id: 'has_docs', pattern: /(document|JSDoc|docstring|README)/gi },
  { id: 'has_solid', pattern: /(SOLID|Single Responsibility|Open.Closed|Liskov|Interface Segregation|Dependency Inversion)/gi },
  { id: 'has_edge_cases', pattern: /(edge case|error handling|exception|validate|boundary)/gi },
  { id: 'has_step_by_step', pattern: /(step.by.step|think through|systematically|methodically)/gi },
];

function tokens(s) {
  return encode(s).length;
}

function scoreText(s) {
  let hit = 0;
  const details = {};
  for (const m of METRICS) {
    const h = m.pattern.test(s);
    m.pattern.lastIndex = 0;
    details[m.id] = h;
    if (h) hit++;
  }
  return { hit, total: METRICS.length, percentage: (hit / METRICS.length) * 100, details };
}

function extractHookContexts() {
  const src = fs.readFileSync(HOOK_FILE, 'utf8');
  // The hook may emit several payload variants (lean-with-ack, lean-silent,
  // classic). By convention, the first additionalContext is the primary Lean
  // payload and the last is the Classic opt-out payload.
  const re = /"additionalContext":\s*"((?:[^"\\]|\\.)*)"/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) out.push(unescapeJsonString(m[1]));
  if (out.length < 2) throw new Error('Could not parse both hook payloads from ' + HOOK_FILE);
  return { lean: out[0], classic: out[out.length - 1] };
}

function unescapeJsonString(s) {
  return JSON.parse('"' + s + '"');
}

function bar(label, value, max, width = 30) {
  const fill = Math.round((value / max) * width);
  return `${label.padEnd(14)} ${'█'.repeat(fill)}${' '.repeat(width - fill)} ${value}`;
}

function main() {
  const enhanced = JSON.parse(fs.readFileSync(ENHANCED_FILE, 'utf8'));
  const testData = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
  const hookCtx = extractHookContexts();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         10x ARCHITECT TOKEN BENCHMARK — LEAN MODE             ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1) SessionStart hook comparison
  const hookClassicTok = tokens(hookCtx.classic);
  const hookLeanTok = tokens(hookCtx.lean);
  const hookSavingsPct = (1 - hookLeanTok / hookClassicTok) * 100;

  console.log('SessionStart hook (every session pays this):');
  console.log(bar('  classic', hookClassicTok, hookClassicTok));
  console.log(bar('  lean', hookLeanTok, hookClassicTok));
  console.log(`  savings:       ${hookSavingsPct.toFixed(1)}%\n`);

  // 2) Per-prompt enhancement comparison
  const perPrompt = [];
  let sumClassicTok = 0;
  let sumLeanTok = 0;
  let sumClassicScore = 0;
  let sumLeanScore = 0;

  console.log('/architect enhancement (per-prompt, 10 test cases):\n');
  console.log('  #  | classic tok | lean tok | savings | class% | lean% | retention');
  console.log('  ---+-------------+----------+---------+--------+-------+----------');

  for (let i = 0; i < enhanced.length; i++) {
    const classic = enhanced[i];
    const lean = transformToLean(classic);
    const cTok = tokens(classic);
    const lTok = tokens(lean);
    const cScore = scoreText(classic);
    const lScore = scoreText(lean);
    const savingsPct = (1 - lTok / cTok) * 100;
    const retentionPct = cScore.percentage > 0 ? (lScore.percentage / cScore.percentage) * 100 : 100;

    sumClassicTok += cTok;
    sumLeanTok += lTok;
    sumClassicScore += cScore.percentage;
    sumLeanScore += lScore.percentage;

    const tp = testData.prompts[i] || { id: `prompt-${i + 1}` };
    perPrompt.push({
      id: tp.id,
      original: tp.prompt,
      classicTokens: cTok,
      leanTokens: lTok,
      savingsPct: +savingsPct.toFixed(1),
      classicScore: +cScore.percentage.toFixed(1),
      leanScore: +lScore.percentage.toFixed(1),
      retentionPct: +retentionPct.toFixed(1),
      classicDetails: cScore.details,
      leanDetails: lScore.details,
      lean: lean,
    });

    console.log(
      `  ${String(i + 1).padStart(2)} | ${String(cTok).padStart(11)} | ${String(lTok).padStart(8)} | ${(savingsPct.toFixed(1) + '%').padStart(7)} | ${(cScore.percentage.toFixed(0) + '%').padStart(6)} | ${(lScore.percentage.toFixed(0) + '%').padStart(5)} | ${(retentionPct.toFixed(0) + '%').padStart(8)}`,
    );
  }

  const avgSavingsPct = (1 - sumLeanTok / sumClassicTok) * 100;
  const avgRetention = sumClassicScore > 0 ? (sumLeanScore / sumClassicScore) * 100 : 100;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY                                ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  SessionStart hook:           ${hookClassicTok} → ${hookLeanTok} tokens  (-${hookSavingsPct.toFixed(1)}%)`);
  console.log(`  /architect (10 prompts avg): ${Math.round(sumClassicTok / 10)} → ${Math.round(sumLeanTok / 10)} tokens  (-${avgSavingsPct.toFixed(1)}%)`);
  console.log(`  Total classic tokens:        ${sumClassicTok}`);
  console.log(`  Total lean tokens:           ${sumLeanTok}`);
  console.log(`  Overall savings:             ${(sumClassicTok - sumLeanTok)} tokens (-${avgSavingsPct.toFixed(1)}%)`);
  console.log(`  Quality-signal retention:    ${avgRetention.toFixed(1)}% (9-pattern rubric)`);

  // Combined first-turn tax = hook + one /architect invocation
  const combinedClassic = hookClassicTok + Math.round(sumClassicTok / 10);
  const combinedLean = hookLeanTok + Math.round(sumLeanTok / 10);
  const combinedSavingsPct = (1 - combinedLean / combinedClassic) * 100;
  console.log(`  Combined 1st-turn tax:       ${combinedClassic} → ${combinedLean} tokens  (-${combinedSavingsPct.toFixed(1)}%)\n`);

  const out = {
    timestamp: new Date().toISOString(),
    tokenizer: 'gpt-tokenizer (cl100k_base) — used as an offline proxy; absolute counts are ~5% of true Claude values but the RATIO between classic and lean is stable',
    hook: {
      classicTokens: hookClassicTok,
      leanTokens: hookLeanTok,
      savingsPct: +hookSavingsPct.toFixed(1),
    },
    perPrompt,
    summary: {
      totalClassicTokens: sumClassicTok,
      totalLeanTokens: sumLeanTok,
      averageSavingsPct: +avgSavingsPct.toFixed(1),
      averageQualityRetentionPct: +avgRetention.toFixed(1),
      combinedFirstTurnTaxClassic: combinedClassic,
      combinedFirstTurnTaxLean: combinedLean,
      combinedFirstTurnSavingsPct: +combinedSavingsPct.toFixed(1),
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`📁 Results saved: ${OUT_FILE}`);

  // Success bar: return non-zero exit if we regressed below target.
  const OK = avgSavingsPct >= 50 && avgRetention >= 95 && hookSavingsPct >= 60;
  if (!OK) {
    console.error(
      `\n❌ Benchmark did not meet targets: avg savings ≥50% (${avgSavingsPct.toFixed(1)}%), retention ≥95% (${avgRetention.toFixed(1)}%), hook savings ≥60% (${hookSavingsPct.toFixed(1)}%)`,
    );
    process.exit(1);
  }
  console.log('\n✅ Targets met: savings ≥50%, retention ≥95%, hook savings ≥60%');
}

if (require.main === module) main();

module.exports = { scoreText, extractHookContexts };
