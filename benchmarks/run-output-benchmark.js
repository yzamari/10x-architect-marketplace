#!/usr/bin/env node

/**
 * 10x Architect Output Quality Benchmark
 *
 * This benchmark measures whether Claude's OUTPUT follows best practices
 * when given enhanced vs non-enhanced prompts.
 *
 * This is more meaningful than measuring prompt structure because it
 * tests actual outcomes, not just input quality.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=your-key node run-output-benchmark.js
 */

const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');
const path = require('path');

// Test tasks - simple enough to get complete responses
const TEST_TASKS = [
  {
    id: 'validate-email',
    task: 'Create a function to validate email addresses',
    context: 'JavaScript/TypeScript'
  },
  {
    id: 'fetch-users',
    task: 'Create a function to fetch users from an API',
    context: 'JavaScript with error handling'
  },
  {
    id: 'calculate-total',
    task: 'Create a function to calculate shopping cart total with tax',
    context: 'TypeScript'
  },
  {
    id: 'format-date',
    task: 'Create a utility function to format dates',
    context: 'JavaScript'
  },
  {
    id: 'user-class',
    task: 'Create a User class with validation',
    context: 'TypeScript with OOP'
  }
];

// Enhancement prompt (same as plugin uses)
const ENHANCEMENT_TEMPLATE = `You are the 10x Architect. Apply these principles to enhance the task:

Task: {TASK}
Context: {CONTEXT}

Apply these mandatory principles:
1. Goal clarification with business value
2. Constraints (what NOT to do)
3. Execution phases (step-by-step)
4. TDD: Write tests FIRST, then implementation
5. Documentation: Add JSDoc/comments
6. SOLID principles where applicable

Now complete the task following these principles. Show your work step by step.`;

// Metrics to check in Claude's output
const OUTPUT_METRICS = [
  {
    id: 'tests_first',
    name: 'Tests Written First',
    check: (output) => {
      const testIndex = output.search(/(describe|test|it)\s*\(/i);
      const implIndex = output.search(/(function|const|class)\s+\w+\s*[=(:]/i);
      // Tests should appear before implementation
      if (testIndex === -1) return false;
      if (implIndex === -1) return true;
      return testIndex < implIndex;
    }
  },
  {
    id: 'has_jsdoc',
    name: 'Has Documentation',
    check: (output) => {
      return /\/\*\*[\s\S]*?\*\//.test(output) || // JSDoc
             /^\s*\/\/.*@param|@returns|@description/m.test(output) || // inline doc
             /"""[\s\S]*?"""/.test(output) || // Python docstring
             /'''[\s\S]*?'''/.test(output);
    }
  },
  {
    id: 'mentions_constraints',
    name: 'Acknowledges Constraints',
    check: (output) => {
      return /(not|don't|won't|avoid|skip|exclude|without)/i.test(output) &&
             /(implement|add|include|do)/i.test(output);
    }
  },
  {
    id: 'has_error_handling',
    name: 'Handles Edge Cases',
    check: (output) => {
      return /(try\s*{|catch\s*\(|throw\s+|if\s*\(\s*!|\.catch\(|error|invalid|null|undefined)/i.test(output);
    }
  },
  {
    id: 'structured_approach',
    name: 'Follows Structured Phases',
    check: (output) => {
      // Check for numbered steps or phase indicators
      return /(\d+\.\s+|step\s+\d|phase\s+\d|first|then|next|finally)/i.test(output);
    }
  }
];

/**
 * Analyze Claude's output for quality metrics
 */
function analyzeOutput(output) {
  const results = {};
  let score = 0;

  for (const metric of OUTPUT_METRICS) {
    const passed = metric.check(output);
    results[metric.id] = {
      name: metric.name,
      passed
    };
    if (passed) score++;
  }

  results._score = score;
  results._total = OUTPUT_METRICS.length;
  results._percentage = ((score / OUTPUT_METRICS.length) * 100).toFixed(0);

  return results;
}

/**
 * Run a single task through Claude
 */
async function runTask(client, task, enhanced = false) {
  let prompt;

  if (enhanced) {
    prompt = ENHANCEMENT_TEMPLATE
      .replace('{TASK}', task.task)
      .replace('{CONTEXT}', task.context);
  } else {
    prompt = `${task.task}. Context: ${task.context}. Please implement this.`;
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Main benchmark runner
 */
async function runBenchmark() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           10x ARCHITECT OUTPUT QUALITY BENCHMARK              ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY required');
    console.error('   Usage: ANTHROPIC_API_KEY=your-key node run-output-benchmark.js');
    process.exit(1);
  }

  const client = new Anthropic();
  const results = {
    timestamp: new Date().toISOString(),
    tasks: [],
    summary: {
      without: { total: 0, scores: [] },
      with: { total: 0, scores: [] }
    }
  };

  console.log(`Running ${TEST_TASKS.length} tasks (with and without enhancement)...\n`);

  for (const task of TEST_TASKS) {
    console.log(`📋 Task: ${task.task}`);

    // Run without enhancement
    console.log('   Running WITHOUT enhancement...');
    const outputWithout = await runTask(client, task, false);
    const metricsWithout = analyzeOutput(outputWithout);
    console.log(`   Score: ${metricsWithout._percentage}%`);

    // Small delay
    await new Promise(r => setTimeout(r, 1000));

    // Run with enhancement
    console.log('   Running WITH enhancement...');
    const outputWith = await runTask(client, task, true);
    const metricsWith = analyzeOutput(outputWith);
    console.log(`   Score: ${metricsWith._percentage}%`);

    const improvement = parseInt(metricsWith._percentage) - parseInt(metricsWithout._percentage);
    console.log(`   Improvement: ${improvement >= 0 ? '+' : ''}${improvement}%\n`);

    results.tasks.push({
      id: task.id,
      task: task.task,
      without: {
        score: metricsWithout._percentage,
        metrics: metricsWithout,
        output: outputWithout.substring(0, 500) + '...'
      },
      with: {
        score: metricsWith._percentage,
        metrics: metricsWith,
        output: outputWith.substring(0, 500) + '...'
      },
      improvement
    });

    results.summary.without.scores.push(parseInt(metricsWithout._percentage));
    results.summary.with.scores.push(parseInt(metricsWith._percentage));

    await new Promise(r => setTimeout(r, 1000));
  }

  // Calculate averages
  const avgWithout = results.summary.without.scores.reduce((a, b) => a + b, 0) / TEST_TASKS.length;
  const avgWith = results.summary.with.scores.reduce((a, b) => a + b, 0) / TEST_TASKS.length;

  results.summary.without.average = avgWithout.toFixed(0);
  results.summary.with.average = avgWith.toFixed(0);
  results.summary.improvement = (avgWith - avgWithout).toFixed(0);

  // Calculate per-metric summary
  results.summary.byMetric = {};
  for (const metric of OUTPUT_METRICS) {
    let withoutCount = 0;
    let withCount = 0;

    for (const task of results.tasks) {
      if (task.without.metrics[metric.id]?.passed) withoutCount++;
      if (task.with.metrics[metric.id]?.passed) withCount++;
    }

    results.summary.byMetric[metric.id] = {
      name: metric.name,
      without: ((withoutCount / TEST_TASKS.length) * 100).toFixed(0),
      with: ((withCount / TEST_TASKS.length) * 100).toFixed(0)
    };
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         RESULTS                                ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`  Average WITHOUT enhancement: ${results.summary.without.average}%`);
  console.log(`  Average WITH enhancement:    ${results.summary.with.average}%`);
  console.log(`  Improvement:                 +${results.summary.improvement}%\n`);

  console.log('┌────────────────────────────┬──────────┬──────────┐');
  console.log('│ Metric                     │ Without  │   With   │');
  console.log('├────────────────────────────┼──────────┼──────────┤');

  for (const metric of OUTPUT_METRICS) {
    const data = results.summary.byMetric[metric.id];
    console.log(`│ ${metric.name.padEnd(26)} │ ${(data.without + '%').padStart(8)} │ ${(data.with + '%').padStart(8)} │`);
  }

  console.log('└────────────────────────────┴──────────┴──────────┘\n');

  // Save results
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir);

  const outputFile = path.join(resultsDir, 'output-benchmark-latest.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`📁 Results saved to: ${outputFile}`);

  return results;
}

if (require.main === module) {
  runBenchmark().catch(console.error);
}

module.exports = { runBenchmark, analyzeOutput, OUTPUT_METRICS };
