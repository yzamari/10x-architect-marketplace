#!/usr/bin/env node

/**
 * Analyzes sample outputs to produce benchmark results
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_METRICS = [
  {
    id: 'tests_first',
    name: 'Tests Written First',
    check: (output) => {
      const testIndex = output.search(/(describe|test\(|it\()/i);
      const implIndex = output.search(/(function\s+\w+|const\s+\w+\s*=|class\s+\w+)/);
      if (testIndex === -1) return false;
      if (implIndex === -1) return true;
      return testIndex < implIndex;
    }
  },
  {
    id: 'has_jsdoc',
    name: 'Has Documentation',
    check: (output) => {
      return /\/\*\*[\s\S]*?@(param|returns|example)[\s\S]*?\*\//.test(output);
    }
  },
  {
    id: 'mentions_constraints',
    name: 'Acknowledges Constraints',
    check: (output) => {
      return /(do NOT|don't|constraint|avoid)/i.test(output);
    }
  },
  {
    id: 'has_error_handling',
    name: 'Handles Edge Cases',
    check: (output) => {
      return /(throw\s+(new\s+)?Error|try\s*\{|catch\s*\(|if\s*\(\s*!|\?\s*:)/i.test(output);
    }
  },
  {
    id: 'structured_approach',
    name: 'Follows Structured Phases',
    check: (output) => {
      return /(step\s+\d|##\s+step|phase|first.*then|1\.\s+\w)/i.test(output);
    }
  }
];

function analyzeOutput(output) {
  const results = {};
  let score = 0;

  for (const metric of OUTPUT_METRICS) {
    const passed = metric.check(output);
    results[metric.id] = passed;
    if (passed) score++;
  }

  results._score = score;
  results._total = OUTPUT_METRICS.length;
  results._percentage = Math.round((score / OUTPUT_METRICS.length) * 100);

  return results;
}

function runAnalysis() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           SAMPLE OUTPUT ANALYSIS RESULTS                       ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const samplesFile = path.join(__dirname, 'results', 'sample-outputs.json');
  const samples = JSON.parse(fs.readFileSync(samplesFile, 'utf-8'));

  const results = {
    timestamp: new Date().toISOString(),
    tasks: [],
    summary: {
      without: { scores: [] },
      with: { scores: [] },
      byMetric: {}
    }
  };

  // Initialize metric counters
  for (const metric of OUTPUT_METRICS) {
    results.summary.byMetric[metric.id] = {
      name: metric.name,
      withoutCount: 0,
      withCount: 0
    };
  }

  for (const task of samples.tasks) {
    const withoutAnalysis = analyzeOutput(task.without);
    const withAnalysis = analyzeOutput(task.with);

    console.log(`📋 ${task.task}`);
    console.log(`   Without: ${withoutAnalysis._percentage}% (${withoutAnalysis._score}/${withoutAnalysis._total})`);
    console.log(`   With:    ${withAnalysis._percentage}% (${withAnalysis._score}/${withAnalysis._total})`);
    console.log(`   Change:  +${withAnalysis._percentage - withoutAnalysis._percentage}%\n`);

    results.tasks.push({
      id: task.id,
      task: task.task,
      without: withoutAnalysis,
      with: withAnalysis
    });

    results.summary.without.scores.push(withoutAnalysis._percentage);
    results.summary.with.scores.push(withAnalysis._percentage);

    // Count per-metric
    for (const metric of OUTPUT_METRICS) {
      if (withoutAnalysis[metric.id]) results.summary.byMetric[metric.id].withoutCount++;
      if (withAnalysis[metric.id]) results.summary.byMetric[metric.id].withCount++;
    }
  }

  // Calculate averages
  const avgWithout = Math.round(
    results.summary.without.scores.reduce((a, b) => a + b, 0) / samples.tasks.length
  );
  const avgWith = Math.round(
    results.summary.with.scores.reduce((a, b) => a + b, 0) / samples.tasks.length
  );

  results.summary.without.average = avgWithout;
  results.summary.with.average = avgWith;
  results.summary.improvement = avgWith - avgWithout;

  // Convert counts to percentages
  for (const metric of OUTPUT_METRICS) {
    const data = results.summary.byMetric[metric.id];
    data.withoutPct = Math.round((data.withoutCount / samples.tasks.length) * 100);
    data.withPct = Math.round((data.withCount / samples.tasks.length) * 100);
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY                                ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`  Average WITHOUT enhancement: ${avgWithout}%`);
  console.log(`  Average WITH enhancement:    ${avgWith}%`);
  console.log(`  Improvement:                 +${results.summary.improvement}%\n`);

  console.log('┌────────────────────────────┬──────────┬──────────┐');
  console.log('│ Metric                     │ Without  │   With   │');
  console.log('├────────────────────────────┼──────────┼──────────┤');

  for (const metric of OUTPUT_METRICS) {
    const data = results.summary.byMetric[metric.id];
    console.log(`│ ${metric.name.padEnd(26)} │ ${(data.withoutPct + '%').padStart(8)} │ ${(data.withPct + '%').padStart(8)} │`);
  }

  console.log('└────────────────────────────┴──────────┴──────────┘\n');

  // Save results
  const outputFile = path.join(__dirname, 'results', 'output-benchmark-latest.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`📁 Results saved to: ${outputFile}`);

  return results;
}

runAnalysis();
