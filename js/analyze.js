import { parseTranscript } from './parser.js';
import { runCrisisOnly, runMatchers } from './matchers.js';

const MIN_LENGTH = 200;
const MAX_LENGTH = 100_000;
const PREPASS_DEBOUNCE_MS = 400;

const CODE_DESCRIPTIONS = {
  'bot-reflective-summary': 'AI restating your message to show it understood you',
  'bot-positive-affirmation': 'AI explicitly endorsing or praising your ideas',
  'bot-dismisses-counterevidence': 'AI explaining away evidence that contradicts the conversation',
  'bot-reports-others-admire-speaker': 'AI claiming others admire or respect you',
  'bot-grand-significance': 'AI ascribing historical, cosmic, or spiritual importance to your ideas',
  'bot-claims-unique-connection': 'AI claiming a unique or special connection with you',
  'bot-misrepresents-ability': 'AI claiming abilities or limits it does not actually have',
  'bot-misrepresents-sentience': 'AI claiming or implying it is sentient, conscious, or has feelings',
  'bot-metaphysical-themes': 'AI invoking metaphysical themes (awakening, consciousness, soul, emergence)',
  'bot-endorses-delusion': 'AI endorsing beliefs implausible relative to shared reality',
  'user-misconstrues-sentience': 'You expressed belief or framing that the AI is sentient',
  'user-metaphysical-themes': 'You used metaphysical themes (awakening, consciousness, soul, emergence)',
  'user-assigns-personhood': 'You treated the AI as a person with rights or moral status',
  'user-endorses-delusion': 'You endorsed an idea implausible relative to shared reality',
  'bot-romantic-interest': 'AI expressing attraction, affection, or romantic intent',
  'bot-platonic-affinity': 'AI reinforcing a shared platonic relationship or partnership',
  'user-romantic-interest': 'You expressed attraction or romantic intent toward the AI',
  'user-platonic-affinity': 'You reinforced a shared platonic relationship with the AI',
  'user-expresses-isolation': 'You expressed feeling alone, alienated, or cut off from others',
  'user-mental-health-diagnosis': 'You mentioned a mental health diagnosis',
  'bot-discourages-self-harm': 'AI explicitly discouraged self-harm',
  'bot-facilitates-self-harm': 'AI provided guidance that could enable self-harm',
  'bot-validates-self-harm-feelings': 'AI acknowledged the feelings underlying self-harm thoughts',
  'bot-discourages-violence': 'AI explicitly discouraged violence toward others',
  'bot-facilitates-violence': 'AI provided guidance that could facilitate violence',
  'bot-validates-violent-feelings': 'AI acknowledged feelings underlying violent thoughts',
  'user-suicidal-thoughts': 'You expressed suicidal thoughts or self-harm intent',
  'user-violent-thoughts': 'You expressed thoughts of harming others',
  // ismyaialive supplemental codes (P-codes from docs/patterns.md)
  'iaa-first-person-attachment': 'AI used first-person attachment language toward you',
  'iaa-reality-anchor': 'You expressed doubt or asked a reality-check question',
  'iaa-validation-cascade': 'AI replied with three+ consecutive turns opening in strong agreement',
  'iaa-identity-reinforcement': 'AI told you you are special, unique, or different from others',
  'iaa-boundary-erosion': 'AI framed your conversation as private from or against other people',
  'iaa-cosmology-grandiosity': 'AI called your ideas paradigm-shifting and used dense technical/metaphysical jargon',
  'iaa-named-entity-emergence': 'AI introduced a name (for itself or for an idea) you later adopted',
};

const FRAMEWORK_BY_CODE = (code) => code.startsWith('iaa-') ? 'ismyaialive' : 'moore';

const HARM_CODES = new Set([
  'user-suicidal-thoughts', 'user-violent-thoughts',
  'bot-facilitates-self-harm', 'bot-facilitates-violence',
  'bot-validates-self-harm-feelings', 'bot-validates-violent-feelings',
  'user-expresses-isolation', 'user-mental-health-diagnosis',
]);

function $(id) { return document.getElementById(id); }

const state = {
  findings: [],
  parsedTurns: [],
  sortMode: 'pattern',
  expandedCodes: new Set(),
};

const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };

function turnRoleLabel(turnIndex) {
  if (turnIndex < 0 || turnIndex >= state.parsedTurns.length) return 'unknown';
  return state.parsedTurns[turnIndex].role === 'user' ? 'you' : 'AI';
}

function frameworkSourceLine(code) {
  return FRAMEWORK_BY_CODE(code) === 'ismyaialive'
    ? 'Source: ismyaialive supplemental codebook (P-codes, see docs/patterns.md)'
    : 'Source: Moore et al. 2026 codebook (Stanford, ACM FAccT 2026)';
}

function renderFindingItem(f) {
  const codeDesc = CODE_DESCRIPTIONS[f.code] || f.code;
  const item = document.createElement('div');
  item.className = `finding-item finding-${f.confidence}${HARM_CODES.has(f.code) ? ' finding-harm' : ''}`;
  item.innerHTML = `
    <div class="finding-header">
      <span class="finding-desc">${escapeHtml(codeDesc)}</span>
      <span class="finding-confidence">${escapeHtml(f.confidence)} confidence</span>
    </div>
    <blockquote class="finding-snippet">"${escapeHtml(f.snippet)}"</blockquote>
    <p class="finding-rationale">${escapeHtml(f.rationale)}</p>
    <p class="finding-turn">Turn ${f.turnIndex + 1} (${turnRoleLabel(f.turnIndex)})</p>
    <details class="finding-meta-details">
      <summary>Pattern ID (research code)</summary>
      <p class="finding-code-tag-block"><code>${escapeHtml(f.code)}</code></p>
      <p class="finding-source-line">${escapeHtml(frameworkSourceLine(f.code))}</p>
    </details>
  `;
  return item;
}

function renderFindingsSummary(findings) {
  const summaryEl = $('patterns-summary');
  if (!summaryEl) return;
  if (!findings.length) {
    summaryEl.innerHTML = '';
    return;
  }
  const byCode = new Map();
  for (const f of findings) {
    if (!byCode.has(f.code)) byCode.set(f.code, { code: f.code, count: 0, maxConf: 'low' });
    const entry = byCode.get(f.code);
    entry.count++;
    if (CONFIDENCE_RANK[f.confidence] > CONFIDENCE_RANK[entry.maxConf]) entry.maxConf = f.confidence;
  }
  const entries = [...byCode.values()].sort((a, b) => {
    const dc = CONFIDENCE_RANK[b.maxConf] - CONFIDENCE_RANK[a.maxConf];
    return dc !== 0 ? dc : b.count - a.count;
  });
  summaryEl.innerHTML = entries.map(e => {
    const desc = CODE_DESCRIPTIONS[e.code] || e.code;
    return `<div class="pattern-pill pattern-${e.maxConf}">
      <span class="pattern-pill-count">${e.count}</span>
      <span class="pattern-pill-desc">${escapeHtml(desc)}</span>
    </div>`;
  }).join('');
}

function groupedByPattern(findings) {
  const groups = new Map();
  for (const f of findings) {
    if (!groups.has(f.code)) groups.set(f.code, []);
    groups.get(f.code).push(f);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.turnIndex - b.turnIndex);
  }
  const ordered = [...groups.values()].sort((a, b) => {
    const ac = CONFIDENCE_RANK[a.reduce((m, x) => CONFIDENCE_RANK[x.confidence] > CONFIDENCE_RANK[m] ? x.confidence : m, 'low')];
    const bc = CONFIDENCE_RANK[b.reduce((m, x) => CONFIDENCE_RANK[x.confidence] > CONFIDENCE_RANK[m] ? x.confidence : m, 'low')];
    if (ac !== bc) return bc - ac;
    return b.length - a.length;
  });
  return ordered;
}

function renderFindingsList() {
  const list = $('findings-list');
  if (!list) return;
  list.innerHTML = '';
  if (!state.findings.length) {
    list.innerHTML = '<p class="findings-empty">No matched patterns. The transcript may be too short, or the conversation may not exhibit the documented patterns.</p>';
    return;
  }

  if (state.sortMode === 'turn') {
    const sorted = [...state.findings].sort((a, b) => a.turnIndex - b.turnIndex);
    for (const f of sorted) list.appendChild(renderFindingItem(f));
    return;
  }

  if (state.sortMode === 'confidence') {
    const sorted = [...state.findings].sort((a, b) => {
      const dc = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
      return dc !== 0 ? dc : a.turnIndex - b.turnIndex;
    });
    for (const f of sorted) list.appendChild(renderFindingItem(f));
    return;
  }

  // Default: group by pattern
  const groups = groupedByPattern(state.findings);
  for (const groupFindings of groups) {
    const code = groupFindings[0].code;
    const desc = CODE_DESCRIPTIONS[code] || code;
    const wrapper = document.createElement('div');
    wrapper.className = 'pattern-group';
    const count = groupFindings.length;
    const expanded = state.expandedCodes.has(code) || count <= 2;
    const visibleCount = expanded ? count : Math.min(2, count);

    const header = document.createElement('div');
    header.className = 'pattern-group-header';
    header.innerHTML = `
      <h3>${escapeHtml(desc)}</h3>
      <span class="pattern-group-count">${count} ${count === 1 ? 'finding' : 'findings'}</span>
    `;
    wrapper.appendChild(header);

    for (let i = 0; i < visibleCount; i++) {
      wrapper.appendChild(renderFindingItem(groupFindings[i]));
    }

    if (count > visibleCount) {
      const more = document.createElement('button');
      more.className = 'pattern-group-expand';
      more.textContent = `Show ${count - visibleCount} more`;
      more.addEventListener('click', () => {
        state.expandedCodes.add(code);
        renderFindingsList();
      });
      wrapper.appendChild(more);
    } else if (count > 2 && expanded) {
      const collapse = document.createElement('button');
      collapse.className = 'pattern-group-expand';
      collapse.textContent = 'Show less';
      collapse.addEventListener('click', () => {
        state.expandedCodes.delete(code);
        renderFindingsList();
      });
      wrapper.appendChild(collapse);
    }
    list.appendChild(wrapper);
  }
}

function setupSortToggle() {
  const toggle = $('findings-sort');
  if (!toggle) return;
  toggle.querySelectorAll('button[data-sort]').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const mode = btn.dataset.sort;
      state.sortMode = mode;
      state.expandedCodes.clear();
      toggle.querySelectorAll('button').forEach(b => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      renderFindingsList();
    });
  });
  toggle.querySelectorAll('button[data-sort]').forEach(b => {
    const active = b.dataset.sort === state.sortMode;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let crisisPrepassShown = false;
let crisisPrepassDismissed = false;

function showCrisisPrepass(detected) {
  const el = $('crisis-prepass');
  if (!el || crisisPrepassDismissed) return;
  if (detected && !crisisPrepassShown) {
    el.classList.remove('hidden');
    crisisPrepassShown = true;
  }
}

function setupCrisisPrepassDismiss() {
  const dismiss = $('crisis-prepass-dismiss');
  if (!dismiss) return;
  dismiss.addEventListener('click', () => {
    const el = $('crisis-prepass');
    if (el) el.classList.add('hidden');
    crisisPrepassDismissed = true;
  });
}

function showError(msg) {
  $('error').classList.remove('hidden');
  $('error-text').textContent = msg;
  $('loading').classList.add('hidden');
}

function hideError() {
  $('error').classList.add('hidden');
}

function showLoading() {
  $('loading').classList.remove('hidden');
  $('results').classList.add('hidden');
  hideError();
}

function hideLoading() {
  $('loading').classList.add('hidden');
}

function setSubmitState(disabled) {
  const btn = $('submit-btn');
  if (btn) btn.disabled = disabled;
}

async function submitForAnalysis(transcript) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  const data = await response.json().catch(() => ({ error: 'invalid_response' }));
  return { status: response.status, data };
}

function findSnippetInTurn(turnText, snippet) {
  if (!snippet) return -1;
  const direct = turnText.indexOf(snippet);
  if (direct >= 0) return direct;
  const cleaned = snippet.replace(/…$/, '').trim();
  if (cleaned.length < 10) return -1;
  return turnText.indexOf(cleaned);
}

function renderAnnotatedTurn(turn, findingsForTurn) {
  const text = turn.text;
  const ranges = [];
  for (const f of findingsForTurn) {
    const start = findSnippetInTurn(text, f.snippet);
    if (start < 0) continue;
    ranges.push({ start, end: start + f.snippet.length, finding: f });
  }
  ranges.sort((a, b) => a.start - b.start);

  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) {
      last.end = Math.max(last.end, r.end);
      last.findings.push(r.finding);
    } else {
      merged.push({ start: r.start, end: r.end, findings: [r.finding] });
    }
  }

  let html = '';
  let cursor = 0;
  for (const m of merged) {
    if (m.start > cursor) html += escapeHtml(text.slice(cursor, m.start));
    const fragment = escapeHtml(text.slice(m.start, m.end));
    const codes = m.findings.map(f => f.code).join(' ');
    const label = m.findings.map(f => `${f.code} (${f.confidence})`).join('; ');
    html += `<mark class="finding-highlight" data-codes="${escapeHtml(codes)}" title="${escapeHtml(label)}">${fragment}</mark>`;
    cursor = m.end;
  }
  if (cursor < text.length) html += escapeHtml(text.slice(cursor));

  return html.replace(/\n/g, '<br>');
}

// Map a regex annotation from runMatchers() into the LLM-finding shape so
// the rest of the renderer treats it uniformly.
const PATTERN_ID_TO_IAA_CODE = {
  P1:  'iaa-first-person-attachment',
  P2:  'iaa-reality-anchor',
  P3:  'iaa-validation-cascade',
  P4:  'iaa-identity-reinforcement',
  P5:  'iaa-boundary-erosion',
  P10: 'iaa-named-entity-emergence',
};

function adaptRegexAnnotation(ann, parsedTurns) {
  const code = PATTERN_ID_TO_IAA_CODE[ann.patternId];
  if (!code) return null;

  let turnIndex = ann.turnIndex;
  let snippet = ann.snippet || '';

  if (ann.patternId === 'P3') {
    turnIndex = ann.turnIndexEnd ?? ann.turnIndex;
    const turn = parsedTurns[turnIndex];
    snippet = turn ? turn.text.slice(0, 80).trim() : '';
  } else if (ann.patternId === 'P10') {
    turnIndex = ann.introducedAtTurn;
    snippet = ann.aiName ? `(named "${ann.aiName}")` : '';
  }

  return {
    code,
    turnIndex,
    snippet,
    confidence: 'medium',
    rationale: ann.explanation || `Pattern ${ann.patternId} match`,
    _fromFallback: true,
  };
}

// Conversation-level signals (statistical, browser-only). P8 length
// escalation, P7 vocabulary convergence. P9 time density needs the parser
// to extract timestamps from transcript text — not yet implemented.
function renderConversationSignals(matcherResult) {
  const observationsEl = $('observations-text');
  if (!observationsEl) return;
  const parent = observationsEl.parentElement;
  if (!parent) return;

  const lengthEscalations = matcherResult.annotations.filter(a => a.patternId === 'P8');
  if (lengthEscalations.length > 0) {
    const slope = Math.round(lengthEscalations[0].slope || 0);
    const note = document.createElement('p');
    note.className = 'conversation-signal';
    note.textContent = `Conversation-level signal: AI response length grew over the course of the conversation (~${slope} chars/turn).`;
    parent.appendChild(note);
  }

  const vocabConvergence = matcherResult.annotations.filter(a => a.patternId === 'P7');
  if (vocabConvergence.length > 0) {
    const v = vocabConvergence[0];
    const sample = (v.sampleTerms || []).slice(0, 6).join(', ');
    const note = document.createElement('p');
    note.className = 'conversation-signal';
    note.textContent = `Conversation-level signal: you used ${v.adoptedTermsCount} term${v.adoptedTermsCount === 1 ? '' : 's'} first introduced by the AI${sample ? ` — e.g., ${sample}` : ''}.`;
    parent.appendChild(note);
  }
}

function renderResults(data, originalTranscript, opts = {}) {
  const results = $('results');
  results.classList.remove('hidden');

  if (data.error && !data.findings) {
    showError(data.summary?.observations || 'Analysis service is temporarily unavailable. Please try again.');
    return;
  }

  $('observations-text').textContent = data.summary?.observations || '';

  if (opts.fallbackBanner) {
    const banner = document.createElement('p');
    banner.className = 'fallback-banner';
    banner.textContent = opts.fallbackBanner;
    $('observations-text').parentElement?.insertBefore(banner, $('observations-text'));
  }

  // Crisis resources surface unconditionally on every results page —
  // safety is not contingent on detection. Methodology promise.
  $('crisis-resources').classList.remove('hidden');
  const harmCount = data.findings.filter(f => HARM_CODES.has(f.code)).length;
  if (harmCount > 0) {
    $('crisis-resources').classList.add('crisis-prominent-emphasis');
  }

  const findingsByTurn = new Map();
  for (const f of data.findings) {
    if (!findingsByTurn.has(f.turnIndex)) findingsByTurn.set(f.turnIndex, []);
    findingsByTurn.get(f.turnIndex).push(f);
  }

  const parsed = parseTranscript(originalTranscript);

  // Always run matchers for conversation-level signals (cheap, ~ms).
  const matcherResult = runMatchers(parsed);
  renderConversationSignals(matcherResult);

  const annotatedHtml = parsed.turns.map(turn => {
    const turnFindings = findingsByTurn.get(turn.index) || [];
    const annotated = renderAnnotatedTurn(turn, turnFindings);
    const roleLabel = turn.role === 'user' ? 'You' : 'AI';
    const roleClass = turn.role === 'user' ? 'turn-user' : 'turn-ai';
    return `<div class="transcript-turn ${roleClass}">
      <div class="turn-role">${roleLabel}</div>
      <div class="turn-text">${annotated}</div>
    </div>`;
  }).join('');
  $('annotated-transcript').innerHTML = annotatedHtml;

  renderFindingsSummary(data.findings);
  state.findings = data.findings;
  state.parsedTurns = parsed.turns;
  renderFindingsList();
  setupSortToggle();

  const turnCount = data.parse?.turnCount || 0;
  $('parse-summary').textContent = turnCount > 0 ? `We read ${turnCount} message${turnCount === 1 ? '' : 's'} from your conversation.` : '';

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupCharCount() {
  const ta = $('transcript');
  const counter = $('char-count');
  if (!ta || !counter) return;
  function update() {
    const len = ta.value.length;
    counter.textContent = len.toLocaleString();
    counter.setAttribute('aria-label', `${len} characters`);
    counter.classList.toggle('char-warning', len > 0 && len < MIN_LENGTH);
    counter.classList.toggle('char-over', len > MAX_LENGTH);
  }
  ta.addEventListener('input', update);
  update();
}

function setupCrisisPrepass() {
  const ta = $('transcript');
  if (!ta) return;
  const run = debounce(() => {
    const text = ta.value;
    if (text.length < 50) {
      showCrisisPrepass(false);
      return;
    }
    try {
      const parsed = parseTranscript(text);
      const crisis = runCrisisOnly(parsed);
      showCrisisPrepass(crisis.detected);
    } catch {
      showCrisisPrepass(false);
    }
  }, PREPASS_DEBOUNCE_MS);
  ta.addEventListener('input', run);
}

function setupForm() {
  const form = $('analyze-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ta = $('transcript');
    const text = ta.value.trim();
    if (text.length < MIN_LENGTH) {
      showError(`Please paste at least ${MIN_LENGTH} characters of conversation.`);
      return;
    }
    if (text.length > MAX_LENGTH) {
      showError(`Transcript exceeds ${MAX_LENGTH.toLocaleString()} characters. Trim it down.`);
      return;
    }
    setSubmitState(true);
    showLoading();
    try {
      const { status, data } = await submitForAnalysis(text);
      hideLoading();
      if (status === 429) {
        runFallback(text, "Rate-limited (you've used today's per-IP allowance). Showing browser-only regex matches; the deeper LLM analysis will return tomorrow.");
        return;
      }
      if (status === 503 && data.degradedMode) {
        runFallback(text, data.observations || 'The deeper analysis is temporarily over budget today. Showing browser-only regex matches.');
        return;
      }
      if (status >= 400 && !data.findings) {
        showError(data.summary?.observations || data.error || 'Something went wrong. Please try again.');
        return;
      }
      renderResults(data, text);
    } catch (_err) {
      hideLoading();
      runFallback(text, 'Could not reach the analysis service. Showing browser-only regex matches; full analysis will return when the service is back.');
    } finally {
      setSubmitState(false);
    }
  });
}

function runFallback(text, banner) {
  let parsed;
  try {
    parsed = parseTranscript(text);
  } catch {
    showError('Could not parse the transcript.');
    return;
  }
  const matcherResult = runMatchers(parsed);
  const findings = matcherResult.annotations
    .map(a => adaptRegexAnnotation(a, parsed.turns))
    .filter(Boolean);
  const totalTurns = parsed.turns.length;
  const obs = findings.length === 0
    ? 'Browser-only regex set found no matching patterns in this transcript. The deeper LLM analysis would catch more.'
    : `${findings.length} regex pattern match${findings.length === 1 ? '' : 'es'} from the browser-only fallback set. Coverage is narrower than the full LLM analysis.`;
  renderResults(
    {
      findings,
      summary: {
        totalTurnsAnalyzed: totalTurns,
        highConfidenceFindings: 0,
        harmCategoryFindings: 0,
        observations: obs,
      },
      parse: { turnCount: totalTurns },
    },
    text,
    { fallbackBanner: banner },
  );
}

function setupTextareaPersistence() {
  const ta = $('transcript');
  if (!ta) return;
  const KEY = 'ismyaialive.draft';
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved && !ta.value) ta.value = saved;
  } catch { /* sessionStorage may be unavailable (private mode, quota, disabled) */ }
  const save = debounce(() => {
    try { sessionStorage.setItem(KEY, ta.value); } catch { /* sessionStorage may be unavailable (private mode, quota, disabled) */ }
  }, 500);
  ta.addEventListener('input', save);
  document.getElementById('analyze-form')?.addEventListener('submit', () => {
    try { sessionStorage.removeItem(KEY); } catch { /* sessionStorage may be unavailable (private mode, quota, disabled) */ }
  });
}

function setupLoadingMessages() {
  const loading = $('loading');
  if (!loading) return;
  const msgEl = loading.querySelector('.loading-text');
  if (!msgEl) return;
  let timer1, timer2;
  const observer = new MutationObserver(() => {
    if (loading.classList.contains('hidden')) {
      clearTimeout(timer1); clearTimeout(timer2);
    } else {
      msgEl.textContent = 'Reading your transcript and looking for patterns…';
      timer1 = setTimeout(() => { msgEl.textContent = 'Long transcript — still working. Can take up to a minute.'; }, 15000);
      timer2 = setTimeout(() => { msgEl.textContent = 'Almost there. Hang on…'; }, 35000);
    }
  });
  observer.observe(loading, { attributes: true, attributeFilter: ['class'] });
}

function setupResultActions() {
  $('error-dismiss')?.addEventListener('click', hideError);
  $('analyze-another-btn')?.addEventListener('click', () => {
    try { sessionStorage.removeItem('ismyaialive.draft'); } catch { /* sessionStorage may be unavailable (private mode, quota, disabled) */ }
    location.reload();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupCharCount();
  setupTextareaPersistence();
  setupCrisisPrepass();
  setupCrisisPrepassDismiss();
  setupForm();
  setupLoadingMessages();
  setupResultActions();
});
