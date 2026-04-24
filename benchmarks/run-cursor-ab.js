#!/usr/bin/env node
'use strict';

/**
 * Cursor A/B benchmark runner for MDC rule experiments.
 *
 * Input JSON format:
 * {
 *   "description": "optional",
 *   "runs": [
 *     {
 *       "id": "feature-simple",
 *       "prompt": "add a search bar to the header",
 *       "without": {
 *         "response": "...",
 *         "inputTokens": 0,
 *         "outputTokens": 0,
 *         "totalTokens": 0
 *       },
 *       "with": {
 *         "response": "...",
 *         "inputTokens": 290,
 *         "outputTokens": 0,
 *         "totalTokens": 0
 *       }
 *     }
 *   ]
 * }
 *
 * Usage:
 *   node run-cursor-ab.js --input results/cursor-ab-samples.json
 *   node run-cursor-ab.js --input results/cursor-ab-samples.json --gate-quality-lift 25
 */

const fs = require('fs');
const path = require('path');
const { encode } = require('gpt-tokenizer');

const DEFAULT_INPUT = path.join(__dirname, 'results', 'cursor-ab-samples.json');
const DEFAULT_OUT_JSON = path.join(__dirname, 'results', 'cursor-ab-latest.json');
const DEFAULT_OUT_MD = path.join(__dirname, 'results', 'cursor-ab-latest.md');

const DEFAULT_GATES = {
  minQualityLiftPct: 25,
  minQualityPerTokenDelta: 0,
  minCorrectnessNonRegressionPct: 0,
};

const QUALITY_METRICS = [
  { id: 'goal_clarity', name: 'Goal clarity', check: (t) => /(goal:|goal\s*\+|objective|north star)/i.test(t) },
  { id: 'constraints', name: 'Constraints / Do NOT', check: (t) => /(do not|don't|must not|constraint|avoid)/i.test(t) },
  { id: 'phases', name: 'Phased execution', check: (t) => /(phase|step\s+\d|^\s*\d+[.)]\s+)/im.test(t) },
  { id: 'tdd', name: 'TDD presence', check: (t) => /(tdd|red.?green.?refactor|failing test|tests?\s+first)/i.test(t) },
  { id: 'docs', name: 'Docs/JSDoc mention', check: (t) => /(jsdoc|@param|@returns|docstring|update readme|documentation)/i.test(t) },
  { id: 'solid', name: 'SOLID/OOP mention', check: (t) => /(\bsolid\b|single responsibility|open.?closed|liskov|interface segregation|dependency inversion|\boop\b)/i.test(t) },
  { id: 'edge_cases', name: 'Edge-case handling', check: (t) => /(edge case|error handling|exception|invalid|null|undefined|boundary)/i.test(t) },
];

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    outJson: DEFAULT_OUT_JSON,
    outMd: DEFAULT_OUT_MD,
    gateQualityLift: DEFAULT_GATES.minQualityLiftPct,
    gateQptDelta: DEFAULT_GATES.minQualityPerTokenDelta,
    gateCorrectnessDelta: DEFAULT_GATES.minCorrectnessNonRegressionPct,
  };

  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--input' && v) { args.input = resolveUnderBenchmarks(v); i++; continue; }
    if (k === '--out-json' && v) { args.outJson = resolveUnderBenchmarks(v); i++; continue; }
    if (k === '--out-md' && v) { args.outMd = resolveUnderBenchmarks(v); i++; continue; }
    if (k === '--gate-quality-lift' && v) { args.gateQualityLift = Number(v); i++; continue; }
    if (k === '--gate-qpt-delta' && v) { args.gateQptDelta = Number(v); i++; continue; }
    if (k === '--gate-correctness-delta' && v) { args.gateCorrectnessDelta = Number(v); i++; continue; }
  }

  return args;
}

function resolveUnderBenchmarks(p) {
  if (path.isAbsolute(p)) return p;
  return path.join(__dirname, p);
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function inferTotalTokens(side) {
  if (!side || typeof side !== 'object') return 0;
  const givenTotal = safeNumber(side.totalTokens, -1);
  if (givenTotal >= 0) return givenTotal;

  const inTok = safeNumber(side.inputTokens, 0);
  const outTok = safeNumber(side.outputTokens, -1);
  if (outTok >= 0) return inTok + outTok;

  const response = String(side.response || '');
  return inTok + encode(response).length;
}

function scoreQuality(responseText) {
  const text = String(responseText || '');
  const details = {};
  let hit = 0;

  for (const m of QUALITY_METRICS) {
    const pass = m.check(text);
    details[m.id] = pass;
    if (pass) hit += 1;
  }

  const pct = (hit / QUALITY_METRICS.length) * 100;
  return { details, hit, total: QUALITY_METRICS.length, percentage: pct };
}

function guessCorrectnessSignal(responseText) {
  const text = String(responseText || '');
  return /```/.test(text) || /(function|class|const|let|interface|type|def)\s+/i.test(text);
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function pct(n) {
  return Number(n.toFixed(1));
}

function run() {
  const args = parseArgs(process.argv);
  const raw = JSON.parse(fs.readFileSync(args.input, 'utf8'));
  const runs = Array.isArray(raw.runs) ? raw.runs : [];

  if (!runs.length) {
    throw new Error('No runs found. Expected "runs" array in input file.');
  }

  const emptyRuns = [];
  for (const r of runs) {
    const w = String(r?.without?.response || '').trim();
    const wi = String(r?.with?.response || '').trim();
    if (!w || !wi) {
      emptyRuns.push({ id: r.id || '(no-id)', missingWithout: !w, missingWith: !wi });
    }
  }
  if (emptyRuns.length) {
    console.warn('\n⚠️  Empty responses detected (these runs will score 0):');
    for (const e of emptyRuns) {
      const miss = [e.missingWithout ? 'without' : null, e.missingWith ? 'with' : null].filter(Boolean).join(', ');
      console.warn(`  - ${e.id}: missing ${miss}`);
    }
    console.warn('Fill responses in the input JSON or regenerate scaffold:');
    console.warn('  node generate-cursor-ab-scaffold.js --force\n');
  }

  const byRun = runs.map((r, index) => {
    const withoutResp = String(r.without?.response || '');
    const withResp = String(r.with?.response || '');
    const withoutQuality = scoreQuality(withoutResp);
    const withQuality = scoreQuality(withResp);

    const withoutTokens = inferTotalTokens(r.without);
    const withTokens = inferTotalTokens(r.with);

    const withoutQpt = withoutTokens > 0 ? withoutQuality.percentage / withoutTokens : 0;
    const withQpt = withTokens > 0 ? withQuality.percentage / withTokens : 0;

    const withoutCorrect = guessCorrectnessSignal(withoutResp);
    const withCorrect = guessCorrectnessSignal(withResp);

    return {
      id: r.id || `run-${index + 1}`,
      prompt: String(r.prompt || ''),
      without: {
        qualityScorePct: pct(withoutQuality.percentage),
        qualityHits: `${withoutQuality.hit}/${withoutQuality.total}`,
        totalTokens: withoutTokens,
        qualityPerToken: Number(withoutQpt.toFixed(4)),
        correctnessSignal: withoutCorrect,
        metricDetails: withoutQuality.details,
      },
      with: {
        qualityScorePct: pct(withQuality.percentage),
        qualityHits: `${withQuality.hit}/${withQuality.total}`,
        totalTokens: withTokens,
        qualityPerToken: Number(withQpt.toFixed(4)),
        correctnessSignal: withCorrect,
        metricDetails: withQuality.details,
      },
      delta: {
        qualityScorePct: pct(withQuality.percentage - withoutQuality.percentage),
        totalTokens: withTokens - withoutTokens,
        qualityPerToken: Number((withQpt - withoutQpt).toFixed(4)),
        correctnessSignal: (withCorrect ? 1 : 0) - (withoutCorrect ? 1 : 0),
      },
    };
  });

  const qualityWithout = byRun.map((r) => r.without.qualityScorePct);
  const qualityWith = byRun.map((r) => r.with.qualityScorePct);
  const tokensWithout = byRun.map((r) => r.without.totalTokens);
  const tokensWith = byRun.map((r) => r.with.totalTokens);
  const qptWithout = byRun.map((r) => r.without.qualityPerToken);
  const qptWith = byRun.map((r) => r.with.qualityPerToken);
  const correctnessWithout = byRun.map((r) => (r.without.correctnessSignal ? 1 : 0));
  const correctnessWith = byRun.map((r) => (r.with.correctnessSignal ? 1 : 0));

  const metricRollup = {};
  for (const metric of QUALITY_METRICS) {
    const withoutCount = byRun.filter((r) => r.without.metricDetails[metric.id]).length;
    const withCount = byRun.filter((r) => r.with.metricDetails[metric.id]).length;
    metricRollup[metric.id] = {
      name: metric.name,
      withoutPct: pct((withoutCount / byRun.length) * 100),
      withPct: pct((withCount / byRun.length) * 100),
      deltaPct: pct((withCount / byRun.length) * 100 - (withoutCount / byRun.length) * 100),
    };
  }

  const summary = {
    sampleSize: byRun.length,
    averages: {
      qualityScoreWithoutPct: pct(mean(qualityWithout)),
      qualityScoreWithPct: pct(mean(qualityWith)),
      qualityScoreDeltaPct: pct(mean(qualityWith) - mean(qualityWithout)),
      totalTokensWithout: pct(mean(tokensWithout)),
      totalTokensWith: pct(mean(tokensWith)),
      totalTokensDelta: pct(mean(tokensWith) - mean(tokensWithout)),
      qualityPerTokenWithout: Number(mean(qptWithout).toFixed(4)),
      qualityPerTokenWith: Number(mean(qptWith).toFixed(4)),
      qualityPerTokenDelta: Number((mean(qptWith) - mean(qptWithout)).toFixed(4)),
      correctnessSignalWithoutPct: pct(mean(correctnessWithout) * 100),
      correctnessSignalWithPct: pct(mean(correctnessWith) * 100),
      correctnessSignalDeltaPct: pct((mean(correctnessWith) - mean(correctnessWithout)) * 100),
    },
    byMetric: metricRollup,
  };

  const gates = {
    configured: {
      minQualityLiftPct: args.gateQualityLift,
      minQualityPerTokenDelta: args.gateQptDelta,
      minCorrectnessNonRegressionPct: args.gateCorrectnessDelta,
    },
    qualityLiftPass: summary.averages.qualityScoreDeltaPct >= args.gateQualityLift,
    qualityPerTokenPass: summary.averages.qualityPerTokenDelta >= args.gateQptDelta,
    correctnessNonRegressionPass: summary.averages.correctnessSignalDeltaPct >= args.gateCorrectnessDelta,
  };
  gates.overallPass = gates.qualityLiftPass && gates.qualityPerTokenPass && gates.correctnessNonRegressionPass;

  const output = {
    timestamp: new Date().toISOString(),
    description: raw.description || 'Cursor MDC A/B benchmark',
    inputFile: args.input,
    summary,
    gates,
    runs: byRun,
  };

  fs.mkdirSync(path.dirname(args.outJson), { recursive: true });
  fs.mkdirSync(path.dirname(args.outMd), { recursive: true });
  fs.writeFileSync(args.outJson, JSON.stringify(output, null, 2));
  fs.writeFileSync(args.outMd, toMarkdown(output), 'utf8');

  printConsole(output, args.outJson, args.outMd);
  process.exit(gates.overallPass ? 0 : 1);
}

function toMarkdown(report) {
  const a = report.summary.averages;
  const lines = [];
  lines.push('# Cursor MDC A/B Benchmark');
  lines.push('');
  lines.push(`- Timestamp: ${report.timestamp}`);
  lines.push(`- Sample size: ${report.summary.sampleSize}`);
  lines.push(`- Input: \`${report.inputFile}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Without | With | Delta |');
  lines.push('|---|---:|---:|---:|');
  lines.push(`| Quality score (%) | ${a.qualityScoreWithoutPct} | ${a.qualityScoreWithPct} | ${a.qualityScoreDeltaPct >= 0 ? '+' : ''}${a.qualityScoreDeltaPct} |`);
  lines.push(`| Total tokens | ${a.totalTokensWithout} | ${a.totalTokensWith} | ${a.totalTokensDelta >= 0 ? '+' : ''}${a.totalTokensDelta} |`);
  lines.push(`| Quality per token | ${a.qualityPerTokenWithout} | ${a.qualityPerTokenWith} | ${a.qualityPerTokenDelta >= 0 ? '+' : ''}${a.qualityPerTokenDelta} |`);
  lines.push(`| Correctness signal (%) | ${a.correctnessSignalWithoutPct} | ${a.correctnessSignalWithPct} | ${a.correctnessSignalDeltaPct >= 0 ? '+' : ''}${a.correctnessSignalDeltaPct} |`);
  lines.push('');
  lines.push('## Metric Lift');
  lines.push('');
  lines.push('| Metric | Without % | With % | Delta % |');
  lines.push('|---|---:|---:|---:|');
  for (const m of QUALITY_METRICS) {
    const row = report.summary.byMetric[m.id];
    lines.push(`| ${row.name} | ${row.withoutPct} | ${row.withPct} | ${row.deltaPct >= 0 ? '+' : ''}${row.deltaPct} |`);
  }
  lines.push('');
  lines.push('## Gates');
  lines.push('');
  lines.push(`- Quality lift >= ${report.gates.configured.minQualityLiftPct}%: ${report.gates.qualityLiftPass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Quality-per-token delta >= ${report.gates.configured.minQualityPerTokenDelta}: ${report.gates.qualityPerTokenPass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Correctness non-regression >= ${report.gates.configured.minCorrectnessNonRegressionPct}%: ${report.gates.correctnessNonRegressionPass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Overall: ${report.gates.overallPass ? 'PASS' : 'FAIL'}`);
  lines.push('');
  lines.push('## Per Prompt');
  lines.push('');
  lines.push('| ID | Quality Δ% | Tokens Δ | QPT Δ |');
  lines.push('|---|---:|---:|---:|');
  for (const r of report.runs) {
    lines.push(`| ${r.id} | ${r.delta.qualityScorePct >= 0 ? '+' : ''}${r.delta.qualityScorePct} | ${r.delta.totalTokens >= 0 ? '+' : ''}${r.delta.totalTokens} | ${r.delta.qualityPerToken >= 0 ? '+' : ''}${r.delta.qualityPerToken} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function printConsole(report, outJson, outMd) {
  const a = report.summary.averages;
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                Cursor MDC A/B Benchmark');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Sample size:                ${report.summary.sampleSize}`);
  console.log(`Quality score avg:          ${a.qualityScoreWithoutPct}% -> ${a.qualityScoreWithPct}% (${a.qualityScoreDeltaPct >= 0 ? '+' : ''}${a.qualityScoreDeltaPct}%)`);
  console.log(`Total tokens avg:           ${a.totalTokensWithout} -> ${a.totalTokensWith} (${a.totalTokensDelta >= 0 ? '+' : ''}${a.totalTokensDelta})`);
  console.log(`Quality per token avg:      ${a.qualityPerTokenWithout} -> ${a.qualityPerTokenWith} (${a.qualityPerTokenDelta >= 0 ? '+' : ''}${a.qualityPerTokenDelta})`);
  console.log(`Correctness signal avg:     ${a.correctnessSignalWithoutPct}% -> ${a.correctnessSignalWithPct}% (${a.correctnessSignalDeltaPct >= 0 ? '+' : ''}${a.correctnessSignalDeltaPct}%)`);
  console.log(`Gate status:                ${report.gates.overallPass ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log(`JSON report -> ${outJson}`);
  console.log(`MD report   -> ${outMd}`);
}

run();
