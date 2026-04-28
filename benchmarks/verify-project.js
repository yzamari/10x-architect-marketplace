#!/usr/bin/env node
'use strict';

/**
 * Lightweight repository consistency checks that complement benchmark gates.
 */

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_FILE = path.join(__dirname, 'package.json');
const PLUGIN_FILE = path.join(ROOT, '.claude-plugin', 'plugin.json');
const MARKETPLACE_FILE = path.join(ROOT, '.claude-plugin', 'marketplace.json');
const README_FILE = path.join(ROOT, 'README.md');
const SIMULATION_JSON_FILE = path.join(__dirname, 'results', 'cursor-ab-latest.simulation.json');
const SIMULATION_MD_FILE = path.join(__dirname, 'results', 'cursor-ab-latest.simulation.md');

/**
 * Reads a JSON file from disk.
 * @param {string} file - Absolute path to the JSON file.
 * @returns {Record<string, unknown>} Parsed JSON object.
 */
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Reads a UTF-8 text file from disk.
 * @param {string} file - Absolute path to the text file.
 * @returns {string} File contents.
 */
function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

/**
 * Verifies package scripts expose one obvious health-check command.
 * @returns {void}
 */
function assertPackageScripts() {
  const pkg = readJson(PACKAGE_FILE);
  const scripts = pkg.scripts || {};

  assert.equal(scripts.test, 'npm run verify', '`npm test` must delegate to `npm run verify`');
  assert.match(
    scripts.verify || '',
    /verify:project.*benchmark:cursor.*benchmark:cursor:lean.*benchmark:tokens.*benchmark:structure/,
    '`npm run verify` must run project checks before the offline benchmark gate suite',
  );

  for (const [name, command] of Object.entries(scripts)) {
    const match = String(command).match(/^node\s+([^\s]+)/);
    if (!match) continue;

    const scriptFile = path.join(__dirname, match[1]);
    assert.ok(fs.existsSync(scriptFile), `package script "${name}" points at missing file: ${match[1]}`);
  }
}

/**
 * Verifies published version metadata and README badge are aligned.
 * @returns {void}
 */
function assertVersionConsistency() {
  const plugin = readJson(PLUGIN_FILE);
  const marketplace = readJson(MARKETPLACE_FILE);
  const readme = readText(README_FILE);
  const expectedVersion = plugin.version;
  const marketplacePlugin = marketplace.plugins && marketplace.plugins[0];

  assert.ok(expectedVersion, 'plugin manifest must include a version');
  assert.equal(marketplacePlugin && marketplacePlugin.version, expectedVersion, 'marketplace version must match plugin version');
  assert.match(readme, new RegExp(`version-${expectedVersion.replace(/\./g, '\\.')}-blue`), 'README badge must match plugin version');
}

/**
 * Verifies simulated A/B reports are labeled as simulated and point at simulated input.
 * @returns {void}
 */
function assertSimulationReportsAreExplicit() {
  const simulationJson = readJson(SIMULATION_JSON_FILE);
  const simulationMd = readText(SIMULATION_MD_FILE);

  assert.match(String(simulationJson.description || ''), /simulation/i, 'simulation JSON description must say simulation');
  assert.match(String(simulationJson.inputFile || ''), /cursor-ab-samples\.simulation\.json$/, 'simulation JSON must point at simulation samples');
  assert.match(simulationMd, /^# Cursor MDC A\/B Benchmark \(Simulation\)/m, 'simulation Markdown title must say simulation');
  assert.match(simulationMd, /cursor-ab-samples\.simulation\.json/, 'simulation Markdown must point at simulation samples');
}

/**
 * Runs every project verification check.
 * @returns {void}
 */
function main() {
  assertPackageScripts();
  assertVersionConsistency();
  assertSimulationReportsAreExplicit();

  console.log('Project verification checks passed.');
}

if (require.main === module) main();

module.exports = {
  assertPackageScripts,
  assertSimulationReportsAreExplicit,
  assertVersionConsistency,
  main,
};
