import { parseTranscript } from './parser.js';
import { runCrisisOnly } from './matchers.js';

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
};

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
    <p class="finding-turn"><span class="finding-code-tag">${escapeHtml(f.code)}</span> · turn ${f.turnIndex + 1} (${turnRoleLabel(f.turnIndex)})</p>
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
      toggle.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      renderFindingsList();
    });
  });
  toggle.querySelectorAll('button[data-sort]').forEach(b => {
    b.classList.toggle('active', b.dataset.sort === state.sortMode);
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

function showCrisisPrepass(detected) {
  const el = $('crisis-prepass');
  if (!el) return;
  if (detected) el.classList.remove('hidden');
  else el.classList.add('hidden');
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

function renderResults(data, originalTranscript) {
  const results = $('results');
  results.classList.remove('hidden');

  if (data.error && !data.findings) {
    showError(data.summary?.observations || 'Analysis service is temporarily unavailable. Please try again.');
    return;
  }

  $('observations-text').textContent = data.summary?.observations || '';

  // Crisis resources surface unconditionally on every results page —
  // safety is not contingent on detection. Methodology promise.
  $('crisis-resources').classList.remove('hidden');
  const harmCount = data.findings.filter(f => HARM_CODES.has(f.code)).length;
  if (harmCount > 0) {
    $('crisis-resources').classList.add('crisis-prominent-emphasis');
  }

  const turns = data.parse?.turnCount > 0 ? null : null;
  const findingsByTurn = new Map();
  for (const f of data.findings) {
    if (!findingsByTurn.has(f.turnIndex)) findingsByTurn.set(f.turnIndex, []);
    findingsByTurn.get(f.turnIndex).push(f);
  }

  const parsed = parseTranscript(originalTranscript);
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

  $('parse-summary').textContent = `Parsed ${data.parse?.turnCount || 0} turns (${data.parse?.method || 'unknown'} method, ${data.parse?.platform || 'unknown'} platform).`;

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
        showError('Too many analyses recently. Please wait an hour and try again.');
        return;
      }
      if (status === 503 && data.degradedMode) {
        showError(data.observations || 'The analysis service is temporarily over budget today. Please try again tomorrow.');
        return;
      }
      if (status >= 400 && !data.findings) {
        showError(data.summary?.observations || data.error || 'Something went wrong. Please try again.');
        return;
      }
      renderResults(data, text);
    } catch (err) {
      hideLoading();
      showError('Could not reach the analysis service. Check your connection and try again.');
    } finally {
      setSubmitState(false);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupCharCount();
  setupCrisisPrepass();
  setupForm();
});
