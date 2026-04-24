/**
 * Deterministic, conservative response-length compressor.
 *
 * Used by run-response-compression-benchmark.js to produce a
 * LOWER-BOUND estimate of how much output-token savings Lean Mode's
 * <response-style>terse; preserve code/commands/paths verbatim; no filler</response-style>
 * hint is likely to deliver. This is rule-based, not a language model,
 * so savings here should be treated as the floor, not the ceiling.
 * Community tools like juliusbrussee/caveman report 65% savings on
 * prose-heavy responses; we don't approach that with pure regex.
 *
 * Hard contract: code fences (```...```), inline code (`x`), URLs,
 * file paths, and shell commands are preserved verbatim. Only prose
 * outside those regions is touched.
 */

'use strict';

const FILLER_STRIPS = [
  /^\s*(Sure|Absolutely|Great|Perfect|Of course|Certainly|Excellent)[!,.]?\s+/gmi,
  /\bI(?:'ll| will) (?:now |then |go ahead and )?(?:help (?:you )?|implement |create |write |build |follow |walk you through )/gi,
  /\bLet me (?:now |first |go ahead and )?(?:help (?:you )?|implement |create |write |build |explain |walk you through |start by )/gi,
  /\bHere(?:'s| is) (?:the |a )?(?:complete |full |detailed )?(?:implementation|solution|function|example|version|approach)[:.]?\s*/gi,
  /\bAs (?:you (?:can )?(?:see|notice)|mentioned (?:above|earlier)|noted (?:above|earlier))[,.]?\s*/gi,
  /\bNote that\b/gi,
  /\bYou can (?:see|notice) that\b/gi,
  /\bIt(?:'s| is) (?:worth|important) (?:to )?(?:note|mention) that\b/gi,
  /\bbasically\b/gi,
  /\bessentially\b/gi,
  /\bby the way[,.]?\s*/gi,
  /\bthat being said[,.]?\s*/gi,
  /\bon the other hand[,.]?\s*/gi,
  /\bin conclusion[,.]?\s*/gi,
  /\b(?:really|very|quite|actually) really\b/gi,
];

const REPLACEMENTS = [
  [/\bIn order to\b/gi, 'To'],
  [/\bThis is because\b/gi, 'Because'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\bat this (?:point in time|moment)\b/gi, 'now'],
  [/\bat the present time\b/gi, 'now'],
  [/\ba large number of\b/gi, 'many'],
  [/\ba small number of\b/gi, 'few'],
  [/\bin the event that\b/gi, 'if'],
  [/\bin the process of\b/gi, ''],
  [/\bwith regard to\b/gi, 'about'],
  [/\bwith respect to\b/gi, 'about'],
  [/\bin terms of\b/gi, 'for'],
  [/\bmake use of\b/gi, 'use'],
  [/\bmake a decision\b/gi, 'decide'],
  [/\bprior to\b/gi, 'before'],
  [/\bsubsequent to\b/gi, 'after'],
];

/**
 * Split text into alternating prose / verbatim segments.
 * Verbatim segments are preserved untouched. A segment is verbatim if it is:
 *   - A fenced code block (``` ... ```)
 *   - An inline code span (`x`)
 *   - A URL
 *   - A shell command-ish path (preserved via inline-code rule in practice)
 */
function segmentText(text) {
  const parts = [];
  // Single regex with alternation keeps ordering right.
  const re = /```[\s\S]*?```|`[^`\n]+`|https?:\/\/\S+/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: 'prose', text: text.slice(last, m.index) });
    parts.push({ kind: 'verbatim', text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'prose', text: text.slice(last) });
  return parts;
}

function compressProse(prose) {
  let out = prose;
  for (const re of FILLER_STRIPS) out = out.replace(re, '');
  for (const [re, rep] of REPLACEMENTS) out = out.replace(re, rep);
  // Collapse triple+ newlines and trailing spaces on lines.
  out = out.replace(/[ \t]+$/gm, '');
  out = out.replace(/\n{3,}/g, '\n\n');
  // Collapse runs of 2+ spaces mid-line.
  out = out.replace(/([^\s])  +/g, '$1 ');
  return out;
}

/**
 * Compress a full response. Preserves all code and URLs; only rewrites prose.
 * @param {string} text - Original response text.
 * @returns {string} Compressed text.
 */
function compressResponse(text) {
  const parts = segmentText(text);
  return parts.map((p) => (p.kind === 'verbatim' ? p.text : compressProse(p.text))).join('');
}

module.exports = { compressResponse, compressProse, segmentText };
