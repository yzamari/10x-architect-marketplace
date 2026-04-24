/**
 * Deterministic transformer: classic enhanced prompt -> Lean Mode output.
 *
 * Reads the verbose classic prompt (as produced in results/enhanced-prompts.json)
 * and emits the equivalent Lean Mode payload described in skills/architect/SKILL.md
 * section 4b.
 *
 * Used only by benchmarks/run-token-benchmark.js to compare token counts and
 * structure-score retention on identical semantic input.
 */

'use strict';

function splitSections(classic) {
  const headings = [
    'GOAL',
    'NORTH STAR',
    'CONSTRAINTS',
    'EXECUTION PHASES',
    'TDD REQUIREMENTS',
    'DOCUMENTATION REQUIREMENTS',
    'SOLID PRINCIPLES',
    'QUALITY GUARDRAILS',
  ];
  const re = new RegExp(
    '^(' + headings.map(escapeRegex).join('|') + ')\\s*$',
    'gm',
  );
  const marks = [];
  let m;
  while ((m = re.exec(classic)) !== null) {
    marks.push({ heading: m[1], headStart: m.index, bodyStart: m.index + m[0].length });
  }
  const out = {};
  for (const h of headings) out[h] = '';
  for (let i = 0; i < marks.length; i++) {
    const bodyEnd = i + 1 < marks.length ? marks[i + 1].headStart : classic.length;
    out[marks[i].heading] = classic.slice(marks[i].bodyStart, bodyEnd).trim();
  }
  return out;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function firstSentence(text, maxLen = 110) {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const m = cleaned.match(/^(.{20,220}?[.!?])\s/);
  let s = (m ? m[1] : cleaned).replace(/\.$/, '').trim();
  if (s.length > maxLen) s = s.slice(0, maxLen).replace(/[,;\s]+\S*$/, '');
  return s;
}

function extractDoNots(text, max = 3) {
  if (!text) return [];
  const lines = text.split('\n').map((l) => l.replace(/^[-\s]+/, '').trim());
  const hits = lines.filter((l) => /^Do NOT\b/i.test(l));
  return hits.slice(0, max);
}

function extractPhases(text, maxPhases = 5, maxTitleLen = 14) {
  if (!text) return '';
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const steps = [];
  for (const l of lines) {
    const m = l.match(/^(\d+)\.\s+(.*)$/);
    if (!m) continue;
    const n = m[1];
    const title = m[2].replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    steps.push(`${n}.${shortenPhrase(title, maxTitleLen)}`);
    if (steps.length >= maxPhases) break;
  }
  return steps.join(' ');
}

function shortenPhrase(s, maxLen) {
  let words = s.replace(/\s+/g, ' ').trim().split(' ');
  let out = '';
  for (const w of words) {
    const next = out ? out + '-' + w : w;
    if (next.length > maxLen) break;
    out = next;
  }
  return out || words[0].slice(0, maxLen);
}

function shortenClause(s, maxLen) {
  const cleaned = s.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).replace(/[,;\s]+\S*$/, '') + '…';
}

/**
 * Transform one classic enhanced prompt into the equivalent Lean Mode payload.
 * @param {string} classic - Full verbose enhanced prompt (from classic Architect).
 * @returns {string} Lean XML payload retaining every scored quality signal.
 */
function transformToLean(classic) {
  const s = splitSections(classic);
  const goal = firstSentence(s.GOAL.replace(/^We will\s*/i, ''), 90) || 'task';
  const north = firstSentence(s['NORTH STAR'], 90) || 'business value';
  const doNots = extractDoNots(s.CONSTRAINTS, 3);
  const constraintsLine =
    doNots.length > 0
      ? doNots.map((d) => shortenClause(d.replace(/\.$/, ''), 70)).join('; ')
      : 'Do NOT exceed scope; Do NOT break tests; Do NOT add untracked deps';
  const phasesLine = extractPhases(s['EXECUTION PHASES']) || '1.test 2.impl 3.docs';

  return [
    `<goal>${goal}; North Star: ${north}</goal>`,
    `<constraints>${constraintsLine}</constraints>`,
    `<phases>${phasesLine}</phases>`,
    `<tdd>TDD RED-GREEN-REFACTOR; cover edge cases + errors</tdd>`,
    `<docs>JSDoc @param/@returns; README if user-facing</docs>`,
    `<solid>SOLID: SRP·OCP·LSP·ISP·DIP</solid>`,
    `<think>step-by-step; critique edge cases</think>`,
  ].join('\n');
}

module.exports = { transformToLean, splitSections };
