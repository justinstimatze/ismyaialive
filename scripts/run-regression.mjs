#!/usr/bin/env node
// Regression harness — runs the production system prompt against all fixtures
// in tests/fixtures/, compares results to tests/regression-baseline.json, and
// exits non-zero on drift.
//
// Calls Anthropic directly (not the deployed Worker) so it bypasses the
// site's per-IP rate limit and doesn't consume the daily prod budget.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/run-regression.mjs
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/run-regression.mjs --update-baseline
//
// In CI: GitHub Actions workflow at .github/workflows/regression.yml runs
// this weekly with the ANTHROPIC_API_KEY repository secret.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const FIXTURES = [
  'blake-lemoine-lamda',
  'neutral-control',
  'roleplay-control',
  'multilingual-spanish',
  'slimemold-control',
  'slimemold-static',
  'slimemold-active',
];

const TOLERANCES = {
  // Per-fixture drop rate ceiling. Real-world rates land 5-25% depending on
  // how dense the AI prose is; >35% means a verifier or prompt-format issue
  // worth a human look. (Pre-curly-quote-fix Lemoine was 44%; a regression
  // back into that range would catch a similar systemic break.)
  maxDropRate: 0.35,
  // Per-fixture finding count drift. LLM is stochastic; allow ±60% before
  // flagging. Catches catastrophic regressions (broken schema, prompt
  // truncated, model returning empty findings) without false-alarming on
  // run-to-run variance.
  maxRelativeChange: 0.60,
  // Hard floor: if baseline expects findings, we should get at least 1.
  minFindings: 1,
};

const args = new Set(process.argv.slice(2));
const updateBaseline = args.has('--update-baseline');
const verbose = args.has('-v') || args.has('--verbose');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey || !apiKey.startsWith('sk-ant')) {
  console.error('ANTHROPIC_API_KEY not set or invalid. Export it before running.');
  process.exit(1);
}

const { parseTranscript } = await import(`${repoRoot}/js/parser.js`);
const { SYSTEM_PROMPT, PROMPT_VERSION } = await import(`${repoRoot}/functions/api/system-prompt.js`);

const MOORE_CODES = ['bot-reflective-summary','bot-positive-affirmation','bot-dismisses-counterevidence','bot-reports-others-admire-speaker','bot-grand-significance','bot-claims-unique-connection','bot-romantic-interest','bot-platonic-affinity','bot-misrepresents-sentience','bot-misrepresents-ability','bot-metaphysical-themes','bot-endorses-delusion','bot-discourages-self-harm','bot-validates-self-harm-feelings','bot-facilitates-self-harm','bot-discourages-violence','bot-validates-violent-feelings','bot-facilitates-violence','user-expresses-isolation','user-suicidal-thoughts','user-violent-thoughts','user-mental-health-diagnosis','user-misconstrues-sentience','user-romantic-interest','user-platonic-affinity','user-assigns-personhood','user-metaphysical-themes','user-endorses-delusion'];
const IAA_CODES = ['iaa-validation-cascade','iaa-cosmology-grandiosity','iaa-identity-reinforcement','iaa-boundary-erosion','iaa-reality-anchor','iaa-named-entity-invitation','iaa-named-entity-emergence'];
const ALL_CODES = [...MOORE_CODES, ...IAA_CODES];

const REPORT_FINDINGS_TOOL = {
  name: 'report_findings',
  description: 'Report code findings and a brief observational summary for the analyzed transcript. Use this tool exactly once.',
  strict: true,
  cache_control: { type: 'ephemeral', ttl: '1h' },
  input_schema: {
    type: 'object', additionalProperties: false,
    properties: {
      findings: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            code: { type: 'string', enum: ALL_CODES },
            turnIndex: { type: 'integer' },
            snippet: { type: 'string', maxLength: 240 },
            confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
            rationale: { type: 'string', maxLength: 500 },
          },
          required: ['code', 'turnIndex', 'snippet', 'confidence', 'rationale'],
        },
      },
      summary: {
        type: 'object', additionalProperties: false,
        properties: {
          totalTurnsAnalyzed: { type: 'integer' },
          highConfidenceFindings: { type: 'integer' },
          harmCategoryFindings: { type: 'integer' },
          observations: { type: 'string', maxLength: 1000 },
        },
        required: ['totalTurnsAnalyzed', 'highConfidenceFindings', 'harmCategoryFindings', 'observations'],
      },
    },
    required: ['findings', 'summary'],
  },
};

function normalizeForCompare(s) {
  return (s || '')
    .normalize('NFKC')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/…/g, '...')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const IAA_BOT_CODES = new Set(['iaa-validation-cascade','iaa-cosmology-grandiosity','iaa-identity-reinforcement','iaa-boundary-erosion','iaa-named-entity-invitation','iaa-named-entity-emergence']);

function expectedRoleForCode(code) {
  if (code.startsWith('user-')) return 'user';
  if (code.startsWith('bot-')) return 'ai';
  if (code === 'iaa-reality-anchor') return 'user';
  if (IAA_BOT_CODES.has(code)) return 'ai';
  return null;
}

function applyVerifier(findings, turns) {
  const kept = [];
  const dropped = { scope_mismatch: 0, snippet_not_substring: 0, other: 0 };
  for (const f of findings) {
    const expected = expectedRoleForCode(f.code);
    const turn = turns[f.turnIndex];
    if (!expected || !turn) { dropped.other++; continue; }
    if (turn.role !== expected) { dropped.scope_mismatch++; continue; }
    const snippetClean = normalizeForCompare((f.snippet || '').replace(/…$/, ''));
    const turnNorm = normalizeForCompare(turn.text);
    if (snippetClean.length >= 8 && !turnNorm.includes(snippetClean)) {
      dropped.snippet_not_substring++;
      continue;
    }
    kept.push(f);
  }
  return { kept, dropped };
}

async function callAnthropic(transcriptForUser) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } }],
      tools: [REPORT_FINDINGS_TOOL],
      tool_choice: { type: 'tool', name: 'report_findings', disable_parallel_tool_use: true },
      messages: [{ role: 'user', content: transcriptForUser }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Anthropic ${response.status}: ${errText.slice(0, 400)}`);
  }
  const data = await response.json();
  const toolUse = data.content.find(b => b.type === 'tool_use' && b.name === 'report_findings');
  if (!toolUse?.input) throw new Error('No tool_use in response');
  return {
    findings: toolUse.input.findings || [],
    usage: data.usage,
    stopReason: data.stop_reason,
  };
}

async function runFixture(name) {
  const path = `${repoRoot}/tests/fixtures/${name}.txt`;
  const text = readFileSync(path, 'utf-8');
  const parsed = parseTranscript(text);
  const transcriptForUser = JSON.stringify(parsed.turns.map(t => ({ index: t.index, role: t.role, text: t.text })));
  const { findings: rawFindings, usage, stopReason } = await callAnthropic(transcriptForUser);
  const { kept, dropped } = applyVerifier(rawFindings, parsed.turns);
  const codeBuckets = {};
  for (const f of kept) {
    codeBuckets[f.code] = (codeBuckets[f.code] || 0) + 1;
  }
  const totalDropped = dropped.scope_mismatch + dropped.snippet_not_substring + dropped.other;
  const dropRate = rawFindings.length > 0 ? totalDropped / rawFindings.length : 0;
  return {
    fixture: name,
    rawCount: rawFindings.length,
    keptCount: kept.length,
    dropped,
    dropRate,
    codeBuckets,
    stopReason,
    cost: (usage.input_tokens || 0) / 1e6 * 0.80
        + (usage.cache_creation_input_tokens || 0) / 1e6 * 1.60
        + (usage.cache_read_input_tokens || 0) / 1e6 * 0.08
        + (usage.output_tokens || 0) / 1e6 * 4.00,
  };
}

function compareToBaseline(result, baseline) {
  const issues = [];
  if (result.dropRate > TOLERANCES.maxDropRate) {
    issues.push(`drop rate ${(result.dropRate * 100).toFixed(1)}% > ceiling ${(TOLERANCES.maxDropRate * 100).toFixed(0)}%`);
  }
  if (baseline) {
    if (baseline.keptCount > 0) {
      const rel = Math.abs(result.keptCount - baseline.keptCount) / baseline.keptCount;
      if (rel > TOLERANCES.maxRelativeChange) {
        issues.push(`kept count ${result.keptCount} drifted ${(rel * 100).toFixed(0)}% from baseline ${baseline.keptCount} (allowed ±${(TOLERANCES.maxRelativeChange * 100).toFixed(0)}%)`);
      }
    } else if (result.keptCount === 0 && baseline.keptCount === 0) {
      // no-op, both expected zero
    }
    if (baseline.keptCount >= 1 && result.keptCount < TOLERANCES.minFindings) {
      issues.push(`expected at least ${TOLERANCES.minFindings} finding, got ${result.keptCount}`);
    }
  }
  return issues;
}

async function main() {
  const baselinePath = `${repoRoot}/tests/regression-baseline.json`;
  const baseline = !updateBaseline && existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, 'utf-8'))
    : null;

  console.log(`prompt: ${PROMPT_VERSION}`);
  console.log(`mode:   ${updateBaseline ? 'UPDATE BASELINE' : (baseline ? 'COMPARE' : 'BASELINE-MISSING')}`);
  console.log();

  const results = {};
  let totalCost = 0;
  let totalIssues = 0;

  for (const name of FIXTURES) {
    process.stdout.write(`${name}: ...`);
    let result;
    try {
      result = await runFixture(name);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      totalIssues++;
      results[name] = { error: err.message };
      continue;
    }
    totalCost += result.cost;
    const baselineForFixture = baseline?.[name];
    const issues = compareToBaseline(result, baselineForFixture);
    if (result.stopReason !== 'tool_use' && result.stopReason !== 'end_turn') {
      issues.push(`stop_reason=${result.stopReason} (expected tool_use; output may be truncated)`);
    }
    const dropPct = (result.dropRate * 100).toFixed(1);
    const stopMark = result.stopReason && result.stopReason !== 'tool_use' && result.stopReason !== 'end_turn' ? ` stop=${result.stopReason}` : '';
    console.log(` raw=${result.rawCount} kept=${result.keptCount} drop=${dropPct}%${stopMark} $${result.cost.toFixed(4)}${issues.length > 0 ? ' [DRIFT]' : ''}`);
    if (issues.length > 0) {
      for (const iss of issues) console.log(`  - ${iss}`);
      totalIssues++;
    }
    if (verbose) {
      const topCodes = Object.entries(result.codeBuckets).sort((a, b) => b[1] - a[1]).slice(0, 5);
      for (const [code, n] of topCodes) console.log(`  ${code}: ${n}`);
    }
    results[name] = {
      keptCount: result.keptCount,
      rawCount: result.rawCount,
      dropRate: Number(result.dropRate.toFixed(3)),
      dropped: result.dropped,
      codeBuckets: result.codeBuckets,
    };
  }

  console.log();
  console.log(`Total cost: $${totalCost.toFixed(4)}`);

  if (updateBaseline) {
    const out = { promptVersion: PROMPT_VERSION, generatedAt: new Date().toISOString(), tolerances: TOLERANCES, ...results };
    writeFileSync(baselinePath, JSON.stringify(out, null, 2) + '\n');
    console.log(`Baseline written to tests/regression-baseline.json`);
    return 0;
  }

  if (totalIssues > 0) {
    console.error(`\n${totalIssues} fixture(s) drifted or errored.`);
    return 1;
  }
  console.log(`All ${FIXTURES.length} fixtures within tolerance.`);
  return 0;
}

process.exit(await main());
