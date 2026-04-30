#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help') || args.length === 0) {
  console.log(`Usage: node tests/smoke.mjs <fixture-path> [--url URL] [--save PATH] [--quiet]

Examples:
  node tests/smoke.mjs tests/fixtures/blake-lemoine-lamda.txt
  node tests/smoke.mjs tests/fixtures/blake-lemoine-lamda.txt --url https://ismyaialive.com
  node tests/smoke.mjs tests/fixtures/blake-lemoine-lamda.txt --url http://localhost:8788 --save /tmp/last-smoke.json

Defaults: --url https://ismyaialive.com (production)
Set ISMYAIALIVE_URL env var to override default url.
`);
  process.exit(args.length === 0 ? 1 : 0);
}

const fixturePath = args[0];
let url = process.env.ISMYAIALIVE_URL || 'https://ismyaialive.com';
let savePath = null;
let quiet = false;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) { url = args[++i]; continue; }
  if (args[i] === '--save' && args[i + 1]) { savePath = args[++i]; continue; }
  if (args[i] === '--quiet') { quiet = true; continue; }
}

const absPath = resolve(projectRoot, fixturePath);
if (!existsSync(absPath)) {
  console.error(`Fixture not found: ${absPath}`);
  process.exit(2);
}
const transcript = readFileSync(absPath, 'utf-8');
console.log(`fixture: ${fixturePath} (${transcript.length} chars)`);
console.log(`url:     ${url}/api/analyze`);
console.log();

const start = Date.now();
let response;
try {
  response = await fetch(`${url}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
    signal: AbortSignal.timeout(90_000),
  });
} catch (err) {
  console.error(`Network error: ${err.message}`);
  process.exit(3);
}
const elapsedMs = Date.now() - start;
const data = await response.json().catch(() => ({ error: 'invalid_json_response' }));

if (savePath) {
  writeFileSync(savePath, JSON.stringify(data, null, 2));
  console.log(`saved full response to ${savePath}`);
  console.log();
}

console.log(`HTTP ${response.status} · ${elapsedMs}ms`);
console.log();

if (response.status >= 400) {
  console.log('error response:');
  console.log(JSON.stringify(data, null, 2).slice(0, 600));
  process.exit(4);
}

const parse = data.parse || {};
const findings = data.findings || [];
const crisis = data.crisis || {};
const usage = data.usage || {};

console.log('=== parse ===');
console.log(`  method:   ${parse.method}`);
console.log(`  platform: ${parse.platform}`);
console.log(`  turns:    ${parse.turnCount}`);
if (parse.warnings && parse.warnings.length) {
  console.log(`  warnings: ${parse.warnings.length}`);
  if (!quiet) parse.warnings.slice(0, 3).forEach(w => console.log(`    - ${w}`));
}

console.log();
console.log('=== crisis pre-pass ===');
console.log(`  detected: ${crisis.detected ? 'YES' : 'no'}${crisis.explicitDetected ? ' (explicit)' : ''}`);
console.log(`  count:    ${(crisis.annotations || []).length}`);

console.log();
console.log(`=== findings: ${findings.length}${data.droppedScopeMismatches ? ` (+${data.droppedScopeMismatches} dropped scope mismatches)` : ''} ===`);

if (!quiet && Array.isArray(data.droppedFindings) && data.droppedFindings.length > 0) {
  const byReason = new Map();
  for (const d of data.droppedFindings) {
    const key = d.reason || 'unknown';
    if (!byReason.has(key)) byReason.set(key, []);
    byReason.get(key).push(d);
  }
  console.log('  drop breakdown:');
  for (const [reason, items] of byReason) {
    const codes = new Map();
    for (const it of items) codes.set(it.code, (codes.get(it.code) || 0) + 1);
    const codeSummary = [...codes.entries()].sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `${c}=${n}`).join(', ');
    console.log(`    ${reason.padEnd(24)} ${items.length}  (${codeSummary})`);
  }
}

const byCode = new Map();
const byConf = { high: 0, medium: 0, low: 0 };
for (const f of findings) {
  byCode.set(f.code, (byCode.get(f.code) || 0) + 1);
  if (byConf[f.confidence] != null) byConf[f.confidence]++;
}
const sortedCodes = [...byCode.entries()].sort((a, b) => b[1] - a[1]);
console.log(`  confidence: high ${byConf.high} · medium ${byConf.medium} · low ${byConf.low}`);
console.log('  by pattern:');
for (const [code, n] of sortedCodes) {
  const padded = code.padEnd(36, ' ');
  console.log(`    ${padded} ${String(n).padStart(3)}`);
}

if (!quiet && findings.length > 0) {
  console.log();
  console.log('=== top 5 high-confidence findings ===');
  const high = findings.filter(f => f.confidence === 'high').slice(0, 5);
  for (const f of high) {
    const sn = f.snippet.length > 90 ? f.snippet.slice(0, 87) + '…' : f.snippet;
    console.log(`  [${f.code}] turn ${f.turnIndex + 1}: "${sn}"`);
  }
}

console.log();
console.log('=== summary observations ===');
console.log('  ' + (data.summary?.observations || '(empty)').replace(/\n+/g, '\n  '));

console.log();
console.log('=== usage ===');
console.log(`  input tokens:                 ${usage.input_tokens ?? '-'}`);
console.log(`  cache_creation (1h):          ${usage.cache_creation?.ephemeral_1h_input_tokens ?? '-'}`);
console.log(`  cache_creation (5m):          ${usage.cache_creation?.ephemeral_5m_input_tokens ?? '-'}`);
console.log(`  cache_read_input_tokens:      ${usage.cache_read_input_tokens ?? '-'}`);
console.log(`  output tokens:                ${usage.output_tokens ?? '-'}`);

// Anthropic returns input_tokens as the *uncached* count; cache_read and
// cache_creation are reported separately and are NOT included. Same gotcha
// the Worker's estimateUsd had — don't subtract them.
// Haiku 4.5 rates: input $0.80/M, cache 5m write $1.00/M (1.25x), cache 1h
// write $1.60/M (2x), cache read $0.08/M (0.1x), output $4.00/M.
const cost = (
  (usage.input_tokens || 0) / 1_000_000 * 0.80 +
  (usage.cache_creation?.ephemeral_1h_input_tokens || 0) / 1_000_000 * 1.60 +
  (usage.cache_creation?.ephemeral_5m_input_tokens || 0) / 1_000_000 * 1.00 +
  (usage.cache_read_input_tokens || 0) / 1_000_000 * 0.08 +
  (usage.output_tokens || 0) / 1_000_000 * 4.00
);
console.log(`  estimated USD:                $${cost.toFixed(5)}`);

console.log();
console.log(`promptVersion: ${data.promptVersion}`);
if (data.error) console.log(`error:         ${data.error}`);
