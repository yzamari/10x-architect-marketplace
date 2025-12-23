#!/usr/bin/env node

/**
 * 10x Architect Benchmark Runner
 *
 * This script runs real benchmarks comparing prompts with and without
 * the 10x Architect plugin enhancement.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=your-key node run-benchmark.js
 *
 * Or set the API key in your environment.
 */

const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');
const path = require('path');

// The same prompt template used in plugin.json
const ENHANCEMENT_PROMPT = `You are the 10x Architect. Apply Greg Isenberg's 10 Rules for Claude Code to enhance this prompt.

User's prompt: {USER_PROMPT}

Analyze the prompt and create architectural guidance.

Rules to apply:
1. Goal clarification with North Star (business value)
2. Constraints (what NOT to do) - at least 2-3 boundaries
3. Execution phases (step-by-step breakdown) - 3-6 phases
4. Quality guardrails and edge case considerations

MANDATORY PRINCIPLES (always enforce):
5. TEST-DRIVEN DEVELOPMENT (TDD): Write tests FIRST before implementation. Every function must have a test. Follow RED-GREEN-REFACTOR cycle.
6. DOCUMENTATION: Every feature, function, and module must be documented. Include JSDoc/docstrings, README updates, and inline comments for complex logic.
7. OOP & SOLID PRINCIPLES: Apply Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. Use proper encapsulation, inheritance, and polymorphism.

Provide the enhanced prompt with all guidance included. Format it clearly with sections for:
- GOAL
- NORTH STAR
- CONSTRAINTS
- EXECUTION PHASES
- TDD REQUIREMENTS
- DOCUMENTATION REQUIREMENTS
- SOLID PRINCIPLES
- QUALITY GUARDRAILS`;

/**
 * Measures a text against defined metrics
 */
function measureMetrics(text, metrics) {
  const results = {};
  let totalScore = 0;
  let maxScore = 0;

  for (const metric of metrics) {
    const regex = new RegExp(metric.pattern, 'gim');
    const matches = text.match(regex) || [];

    if (metric.type === 'count') {
      results[metric.id] = {
        name: metric.name,
        value: matches.length,
        type: 'count'
      };
      // For count metrics, score based on having at least some
      const countScore = Math.min(matches.length / 3, 1) * metric.weight;
      totalScore += countScore;
      maxScore += metric.weight;
    } else {
      const found = matches.length > 0;
      results[metric.id] = {
        name: metric.name,
        value: found,
        type: 'boolean'
      };
      totalScore += found ? metric.weight : 0;
      maxScore += metric.weight;
    }
  }

  results._totalScore = totalScore;
  results._maxScore = maxScore;
  results._percentage = maxScore > 0 ? (totalScore / maxScore * 100).toFixed(1) : 0;

  return results;
}

/**
 * Calls Claude API to enhance a prompt
 */
async function enhancePrompt(client, userPrompt) {
  const prompt = ENHANCEMENT_PROMPT.replace('{USER_PROMPT}', userPrompt);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      { role: 'user', content: prompt }
    ]
  });

  return response.content[0].text;
}

/**
 * Main benchmark runner
 */
async function runBenchmarks() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                  10x ARCHITECT BENCHMARK SUITE                 ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable is required');
    console.error('   Usage: ANTHROPIC_API_KEY=your-key node run-benchmark.js');
    process.exit(1);
  }

  const client = new Anthropic();

  // Load test prompts
  const testData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'test-prompts.json'), 'utf-8')
  );

  const results = {
    timestamp: new Date().toISOString(),
    version: testData.version,
    summary: {
      totalPrompts: testData.prompts.length,
      withoutPlugin: { avgScore: 0, metrics: {} },
      withPlugin: { avgScore: 0, metrics: {} }
    },
    detailed: []
  };

  let totalWithoutScore = 0;
  let totalWithScore = 0;

  console.log(`📋 Running ${testData.prompts.length} test prompts...\n`);

  for (let i = 0; i < testData.prompts.length; i++) {
    const testPrompt = testData.prompts[i];
    console.log(`[${i + 1}/${testData.prompts.length}] Testing: "${testPrompt.prompt}"`);
    console.log(`    Category: ${testPrompt.category} | Complexity: ${testPrompt.complexity}`);

    // Measure raw prompt (without plugin)
    const withoutMetrics = measureMetrics(testPrompt.prompt, testData.metrics.items);
    console.log(`    Without plugin: ${withoutMetrics._percentage}%`);

    // Enhance with plugin
    let enhancedPrompt;
    let withMetrics;

    try {
      enhancedPrompt = await enhancePrompt(client, testPrompt.prompt);
      withMetrics = measureMetrics(enhancedPrompt, testData.metrics.items);
      console.log(`    With plugin:    ${withMetrics._percentage}%`);
    } catch (error) {
      console.error(`    ❌ Error enhancing prompt: ${error.message}`);
      withMetrics = { _percentage: 0, _totalScore: 0, _maxScore: 0 };
      enhancedPrompt = 'ERROR: ' + error.message;
    }

    const improvement = withMetrics._percentage - withoutMetrics._percentage;
    console.log(`    Improvement:    +${improvement.toFixed(1)}%\n`);

    totalWithoutScore += parseFloat(withoutMetrics._percentage);
    totalWithScore += parseFloat(withMetrics._percentage);

    results.detailed.push({
      id: testPrompt.id,
      prompt: testPrompt.prompt,
      category: testPrompt.category,
      complexity: testPrompt.complexity,
      without: {
        score: withoutMetrics._percentage,
        metrics: withoutMetrics
      },
      with: {
        score: withMetrics._percentage,
        enhanced: enhancedPrompt,
        metrics: withMetrics
      },
      improvement: improvement.toFixed(1)
    });

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Calculate summary
  results.summary.withoutPlugin.avgScore = (totalWithoutScore / testData.prompts.length).toFixed(1);
  results.summary.withPlugin.avgScore = (totalWithScore / testData.prompts.length).toFixed(1);
  results.summary.improvement = (
    parseFloat(results.summary.withPlugin.avgScore) -
    parseFloat(results.summary.withoutPlugin.avgScore)
  ).toFixed(1);

  // Calculate per-metric summary
  for (const metric of testData.metrics.items) {
    let withoutCount = 0;
    let withCount = 0;

    for (const detail of results.detailed) {
      if (detail.without.metrics[metric.id]?.value) withoutCount++;
      if (detail.with.metrics[metric.id]?.value) withCount++;
    }

    results.summary.withoutPlugin.metrics[metric.id] = {
      name: metric.name,
      percentage: ((withoutCount / testData.prompts.length) * 100).toFixed(0)
    };
    results.summary.withPlugin.metrics[metric.id] = {
      name: metric.name,
      percentage: ((withCount / testData.prompts.length) * 100).toFixed(0)
    };
  }

  // Save results
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }

  const resultsFile = path.join(resultsDir, `benchmark-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

  // Also save as latest
  const latestFile = path.join(resultsDir, 'latest.json');
  fs.writeFileSync(latestFile, JSON.stringify(results, null, 2));

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                         BENCHMARK RESULTS                       ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│                    OVERALL SCORES                           │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│  Without Plugin:  ${results.summary.withoutPlugin.avgScore.padStart(5)}%                                  │`);
  console.log(`│  With Plugin:     ${results.summary.withPlugin.avgScore.padStart(5)}%                                  │`);
  console.log(`│  Improvement:     +${results.summary.improvement.padStart(4)}%                                  │`);
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│                    METRIC BREAKDOWN                         │');
  console.log('├──────────────────────────────┬──────────┬──────────┬────────┤');
  console.log('│ Metric                       │ Without  │   With   │ Change │');
  console.log('├──────────────────────────────┼──────────┼──────────┼────────┤');

  for (const metric of testData.metrics.items) {
    if (metric.type === 'count') continue; // Skip count metrics in summary

    const without = results.summary.withoutPlugin.metrics[metric.id]?.percentage || '0';
    const withP = results.summary.withPlugin.metrics[metric.id]?.percentage || '0';
    const change = parseInt(withP) - parseInt(without);
    const changeStr = change > 0 ? `+${change}%` : `${change}%`;

    console.log(`│ ${metric.name.padEnd(28)} │ ${(without + '%').padStart(8)} │ ${(withP + '%').padStart(8)} │ ${changeStr.padStart(6)} │`);
  }

  console.log('└──────────────────────────────┴──────────┴──────────┴────────┘\n');

  console.log(`📁 Full results saved to: ${resultsFile}`);
  console.log(`📁 Latest results: ${latestFile}\n`);

  return results;
}

// Run if called directly
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

module.exports = { runBenchmarks, measureMetrics, enhancePrompt };
