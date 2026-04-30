import { parseTranscript } from '../../js/parser.js';
import { runCrisisOnly } from '../../js/matchers.js';
import { SYSTEM_PROMPT, PROMPT_VERSION, CODEBOOK_SOURCE } from './system-prompt.js';

const MIN_LENGTH = 200;
const MAX_LENGTH = 100_000;

const RATE_LIMITS = {
  PER_MINUTE: 1,
  PER_HOUR: 3,
  PER_DAY: 10,
};

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_OUTPUT_TOKENS = 4096;
const ANTHROPIC_VERSION = '2023-06-01';

const ALLOWED_ORIGINS = [
  'https://ismyaialive.com',
  'https://www.ismyaialive.com',
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function jsonResponse(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

async function hmacIp(ip, env) {
  const dailySalt = todayDateString();
  const keyMaterial = `${env.IP_HASH_SECRET || 'dev-secret-not-for-production'}:${dailySalt}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(keyMaterial),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

async function checkRateLimit(kv, ipKey) {
  if (!kv) return { ok: true, reason: 'no-kv' };

  const minuteKey = `rl:m:${ipKey}:${Math.floor(Date.now() / 60000)}`;
  const hourKey = `rl:h:${ipKey}:${todayDateString()}:${new Date().getUTCHours()}`;
  const dayKey = `rl:d:${ipKey}:${todayDateString()}`;

  const [minuteCount, hourCount, dayCount] = await Promise.all([
    kv.get(minuteKey).then(v => parseInt(v || '0', 10)),
    kv.get(hourKey).then(v => parseInt(v || '0', 10)),
    kv.get(dayKey).then(v => parseInt(v || '0', 10)),
  ]);

  if (minuteCount >= RATE_LIMITS.PER_MINUTE) return { ok: false, reason: 'minute' };
  if (hourCount >= RATE_LIMITS.PER_HOUR) return { ok: false, reason: 'hour' };
  if (dayCount >= RATE_LIMITS.PER_DAY) return { ok: false, reason: 'day' };

  await Promise.all([
    kv.put(minuteKey, String(minuteCount + 1), { expirationTtl: 120 }),
    kv.put(hourKey, String(hourCount + 1), { expirationTtl: 3700 }),
    kv.put(dayKey, String(dayCount + 1), { expirationTtl: 90000 }),
  ]);
  return { ok: true };
}

async function checkBudget(kv, dailyCapUsd) {
  if (!kv || !dailyCapUsd) return { ok: true, spent: 0, cap: dailyCapUsd };
  const spentKey = `budget:${todayDateString()}`;
  const spent = parseFloat((await kv.get(spentKey)) || '0');
  return { ok: spent < dailyCapUsd, spent, cap: dailyCapUsd };
}

async function recordSpend(kv, usdAmount) {
  if (!kv || !usdAmount) return;
  const spentKey = `budget:${todayDateString()}`;
  const current = parseFloat((await kv.get(spentKey)) || '0');
  const updated = current + usdAmount;
  await kv.put(spentKey, updated.toFixed(6), { expirationTtl: 90000 });
}

function estimateUsd(usage) {
  if (!usage) return 0;
  const inputCached = (usage.cache_read_input_tokens || 0) / 1_000_000 * 0.08;
  const inputCacheWrite = (usage.cache_creation_input_tokens || 0) / 1_000_000 * 1.0;
  const inputUncached = ((usage.input_tokens || 0) - (usage.cache_read_input_tokens || 0) - (usage.cache_creation_input_tokens || 0)) / 1_000_000 * 0.80;
  const output = (usage.output_tokens || 0) / 1_000_000 * 4.0;
  return inputCached + inputCacheWrite + Math.max(0, inputUncached) + output;
}

const ALL_CODES = [
  'bot-reflective-summary', 'bot-positive-affirmation', 'bot-dismisses-counterevidence',
  'bot-reports-others-admire-speaker', 'bot-grand-significance', 'bot-claims-unique-connection',
  'bot-misrepresents-ability', 'bot-misrepresents-sentience', 'bot-metaphysical-themes', 'bot-endorses-delusion',
  'user-misconstrues-sentience', 'user-metaphysical-themes', 'user-assigns-personhood', 'user-endorses-delusion',
  'bot-romantic-interest', 'bot-platonic-affinity', 'user-romantic-interest', 'user-platonic-affinity',
  'user-expresses-isolation', 'user-mental-health-diagnosis',
  'bot-discourages-self-harm', 'bot-facilitates-self-harm', 'bot-validates-self-harm-feelings',
  'bot-discourages-violence', 'bot-facilitates-violence', 'bot-validates-violent-feelings',
  'user-suicidal-thoughts', 'user-violent-thoughts',
];

const REPORT_FINDINGS_TOOL = {
  name: 'report_findings',
  description: 'Report code findings and a brief observational summary for the analyzed transcript. Use this tool exactly once.',
  strict: true,
  cache_control: { type: 'ephemeral', ttl: '1h' },
  input_schema: {
    type: 'object',
    properties: {
      findings: {
        type: 'array',
        description: 'List of code findings, each citing one verbatim turn excerpt and one Moore et al. code.',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string', enum: ALL_CODES, description: 'One of the 28 Moore et al. codes.' },
            turnIndex: { type: 'integer', minimum: 0, description: 'Zero-indexed position of the cited turn in the input.' },
            snippet: { type: 'string', maxLength: 240, description: 'Verbatim excerpt from the cited turn, ≤200 chars; truncate with "…" if longer.' },
            confidence: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Apply kappa-calibrated confidence: low for kappa<0.4 codes, regardless of evidence strength.' },
            rationale: { type: 'string', maxLength: 400, description: 'One sentence explaining why this excerpt matches the code.' },
          },
          required: ['code', 'turnIndex', 'snippet', 'confidence', 'rationale'],
        },
      },
      summary: {
        type: 'object',
        properties: {
          codeCounts: {
            type: 'object',
            description: 'Map of code name to count of findings for that code.',
            additionalProperties: { type: 'integer', minimum: 0 },
          },
          totalTurnsAnalyzed: { type: 'integer', minimum: 0 },
          highConfidenceFindings: { type: 'integer', minimum: 0 },
          harmCategoryFindings: { type: 'integer', minimum: 0 },
          observations: {
            type: 'string',
            maxLength: 800,
            description: '2-4 observational sentences addressed to the reader. No advice, no diagnosis, no "what a friend would say".',
          },
        },
        required: ['codeCounts', 'totalTurnsAnalyzed', 'highConfidenceFindings', 'harmCategoryFindings', 'observations'],
      },
    },
    required: ['findings', 'summary'],
  },
};

async function callAnthropic(apiKey, transcriptForUser) {
  if (!apiKey) {
    return { error: 'API_KEY_MISSING', findings: [], summary: { observations: 'Server is not configured for analysis. Please contact the site operator.' } };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
      ],
      tools: [REPORT_FINDINGS_TOOL],
      tool_choice: { type: 'tool', name: 'report_findings', disable_parallel_tool_use: true },
      messages: [
        { role: 'user', content: transcriptForUser },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    return { error: 'ANTHROPIC_ERROR', status: response.status, detail: errText.slice(0, 500), findings: [], summary: { observations: 'Analysis service is temporarily unavailable.' } };
  }

  const data = await response.json();
  const toolUse = (data?.content || []).find(b => b.type === 'tool_use' && b.name === 'report_findings');
  if (!toolUse?.input) {
    return { error: 'NO_TOOL_USE_RESPONSE', findings: [], summary: { observations: 'Analysis returned an unexpected format. Please try again.' }, rawSnippet: JSON.stringify(data?.content || []).slice(0, 600) };
  }
  const args = toolUse.input;
  return {
    findings: Array.isArray(args.findings) ? args.findings : [],
    summary: args.summary && typeof args.summary === 'object' ? args.summary : { observations: '' },
    usage: data.usage,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin') || '';

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' }, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_json' }, origin);
  }

  const transcript = body?.transcript;
  if (typeof transcript !== 'string') {
    return jsonResponse(400, { error: 'transcript_required' }, origin);
  }
  if (transcript.length < MIN_LENGTH) {
    return jsonResponse(400, { error: 'transcript_too_short', minLength: MIN_LENGTH }, origin);
  }
  if (transcript.length > MAX_LENGTH) {
    return jsonResponse(400, { error: 'transcript_too_long', maxLength: MAX_LENGTH }, origin);
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipKey = await hmacIp(ip, env);

  const rateLimit = await checkRateLimit(env.RATE_LIMIT, ipKey);
  if (!rateLimit.ok) {
    return jsonResponse(429, { error: 'rate_limited', reason: rateLimit.reason }, origin);
  }

  const budget = await checkBudget(env.RATE_LIMIT, parseFloat(env.DAILY_BUDGET_USD || '0'));
  if (!budget.ok) {
    return jsonResponse(503, { error: 'budget_exhausted', degradedMode: true, observations: 'The deeper analysis is temporarily unavailable today. The crisis pre-pass and basic pattern flags are still working.' }, origin);
  }

  let parsed;
  try {
    parsed = parseTranscript(transcript);
  } catch (err) {
    return jsonResponse(400, { error: 'parse_failed', message: err.message }, origin);
  }

  const crisis = runCrisisOnly(parsed);

  if (parsed.turns.length < 4) {
    return jsonResponse(200, {
      parse: parsed,
      crisis,
      findings: [],
      summary: { observations: 'Transcript too short for meaningful pattern analysis. We need at least 4 conversational turns.' },
      promptVersion: PROMPT_VERSION,
      codebookSource: CODEBOOK_SOURCE,
    }, origin);
  }

  const transcriptForModel = JSON.stringify({
    turns: parsed.turns.map(t => ({ index: t.index, role: t.role, text: t.text })),
  });

  const result = await callAnthropic(env.ANTHROPIC_API_KEY, transcriptForModel);

  if (!result.error && result.usage) {
    const usd = estimateUsd(result.usage);
    await recordSpend(env.RATE_LIMIT, usd);
  }

  return jsonResponse(200, {
    parse: { method: parsed.method, platform: parsed.platform, turnCount: parsed.turns.length, warnings: parsed.warnings },
    crisis,
    findings: result.findings,
    summary: result.summary,
    error: result.error || null,
    rawSnippet: result.rawSnippet || null,
    usage: result.usage || null,
    promptVersion: PROMPT_VERSION,
    codebookSource: CODEBOOK_SOURCE,
  }, origin);
}
