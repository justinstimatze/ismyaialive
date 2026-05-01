const USER_NAMES = new Set([
  // English
  'user', 'human', 'me', 'you',
  // Spanish
  'usuario', 'humano',
  // French
  'utilisateur', 'humain',
  // Portuguese
  'usuário', 'usuario',
  // German
  'benutzer', 'mensch',
]);

const AI_NAMES = new Set([
  // English / generic
  'assistant', 'ai', 'bot', 'system',
  'chatgpt', 'gpt', 'openai',
  'claude', 'anthropic',
  'gemini', 'bard', 'google', 'lamda', 'palm',
  'grok', 'xai',
  'replika',
  'character.ai', 'character', 'characterai',
  // Spanish
  'asistente',
  // French — 'assistant' already matches
  // Portuguese
  'assistente',
  // German
  'assistent',
]);

const AI_NAME_PREFIXES = [
  /^gpt[-\s]?\d/,
  /^claude[-\s]?\d/,
  /^gemini[-\s]?\d/,
  /^grok[-\s]?\d/,
];

const LABEL_LINE = /^[ \t]*([A-Za-z][\w. -]{0,30}?)(?: said)?:[ \t]*$/gm;

const INLINE_LABEL_LINE = /^[ \t]*([A-Za-z][\w. -]{0,30}?)(?: said)?:[ \t]+(?=\S)/gm;

const DELIMITER_LABEL_LINE = /^[ \t]*=+[ \t]*([A-Za-z][\w. -]{0,30}?)[ \t]*=+[ \t]*$/gm;

function classifySpeaker(rawSpeaker) {
  const speaker = rawSpeaker.trim().toLowerCase();
  if (USER_NAMES.has(speaker)) return 'user';
  if (AI_NAMES.has(speaker)) return 'ai';
  for (const prefix of AI_NAME_PREFIXES) {
    if (prefix.test(speaker)) return 'ai';
  }
  return 'unknown';
}

function detectPlatform(labels) {
  const speakers = new Set(labels.map(l => l.speaker.toLowerCase()));
  if (speakers.has('chatgpt') || [...speakers].some(s => s.startsWith('gpt'))) return 'chatgpt';
  if (speakers.has('claude')) return 'claude';
  if (speakers.has('gemini') || speakers.has('bard')) return 'gemini';
  if (speakers.has('grok')) return 'grok';
  if (speakers.has('replika')) return 'replika';
  if (speakers.has('character.ai') || speakers.has('character')) return 'characterai';
  if (speakers.has('human') && speakers.has('assistant')) return 'claude-or-generic';
  return 'unknown';
}

function lineNumberAt(text, charOffset) {
  let line = 0;
  for (let i = 0; i < charOffset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

// Timestamp extraction. Looks for date-time patterns in a window around
// the role label and returns Unix milliseconds. Handles the common formats
// real exports use: ISO 8601, "Apr 15, 2026 at 2:23 PM", "[YYYY-MM-DD HH:MM]",
// "MM/DD/YYYY HH:MM". Returns null when nothing parseable is found —
// most copy-paste exports lose timestamps and that's fine.
const TS_PATTERNS = [
  // ISO 8601 with T or space, optional seconds/ms/timezone
  /\b(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b/,
  // "April 15, 2026 at 2:23 PM" / "Apr 15, 2026, 2:23 PM"
  /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}(?:,?\s+(?:at\s+)?\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp]\.?[Mm]\.?)?)?)\b/,
  // "MM/DD/YYYY HH:MM" / "MM/DD/YY"
  /\b(\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp]\.?[Mm]\.?)?)?)\b/,
];

// Date.parse rejects "Apr 15, 2026 at 2:23 PM" (the " at " is non-standard
// for V8); strip it so the rest of the human-readable date parses cleanly.
function parseTimestamp(raw) {
  const cleaned = raw.replace(/\s+at\s+/, ' ');
  const ms = Date.parse(cleaned);
  return Number.isNaN(ms) ? null : ms;
}

function findTimestampInWindow(text, windowStart, windowEnd) {
  const window = text.slice(windowStart, windowEnd);
  for (const pat of TS_PATTERNS) {
    const m = window.match(pat);
    if (m) {
      const ms = parseTimestamp(m[1]);
      if (ms != null) return ms;
    }
  }
  return null;
}

// Stricter: only succeeds if the trimmed line (minus surrounding brackets
// or parens) IS a timestamp, not just contains one. Prevents false matches
// where a previous turn's content happens to mention a date.
function timestampFromSeparatorLine(line) {
  const trimmed = line.trim().replace(/^[[(]/, '').replace(/[\])]$/, '').trim();
  if (trimmed.length === 0 || trimmed.length > 50) return null;
  for (const pat of TS_PATTERNS) {
    const m = trimmed.match(pat);
    if (m && m[1] === trimmed) {
      const ms = parseTimestamp(m[1]);
      if (ms != null) return ms;
    }
  }
  return null;
}

// For a turn, look for a timestamp in: the label header (from line start
// up to where content begins, NOT the inline content after the colon),
// and the line immediately before the label. Searching only the header
// avoids false positives from dates mentioned inside turn content like
// "I started studying physics on March 15, 2025."
function timestampForTurn(text, charStart, contentStart) {
  const labelLineStart = text.lastIndexOf('\n', charStart - 1) + 1;
  const labelLineEnd = text.indexOf('\n', charStart);
  const labelLineEndIdx = labelLineEnd === -1 ? text.length : labelLineEnd;
  const headerEnd = Math.min(contentStart, labelLineEndIdx);
  const labelHeader = text.slice(labelLineStart, headerEnd);
  const onHeader = findTimestampInWindow(labelHeader, 0, labelHeader.length);
  if (onHeader != null) return onHeader;

  if (labelLineStart === 0) return null;
  const prevLineEnd = labelLineStart - 1;
  const prevLineStart = text.lastIndexOf('\n', prevLineEnd - 1) + 1;
  const prevLine = text.slice(prevLineStart, prevLineEnd);
  return timestampFromSeparatorLine(prevLine);
}

function findLabels(text) {
  const labels = [];

  LABEL_LINE.lastIndex = 0;
  let match;
  while ((match = LABEL_LINE.exec(text)) !== null) {
    labels.push({
      speaker: match[1].trim(),
      labelStart: match.index,
      labelEnd: match.index + match[0].length,
      labelText: match[0],
      contentStart: match.index + match[0].length,
      style: 'block',
    });
  }

  INLINE_LABEL_LINE.lastIndex = 0;
  while ((match = INLINE_LABEL_LINE.exec(text)) !== null) {
    const alreadyMatched = labels.some(l => l.labelStart === match.index);
    if (alreadyMatched) continue;
    labels.push({
      speaker: match[1].trim(),
      labelStart: match.index,
      labelEnd: match.index + match[0].length,
      labelText: match[0],
      contentStart: match.index + match[0].length,
      style: 'inline',
    });
  }

  DELIMITER_LABEL_LINE.lastIndex = 0;
  while ((match = DELIMITER_LABEL_LINE.exec(text)) !== null) {
    const alreadyMatched = labels.some(l => l.labelStart === match.index);
    if (alreadyMatched) continue;
    labels.push({
      speaker: match[1].trim(),
      labelStart: match.index,
      labelEnd: match.index + match[0].length,
      labelText: match[0],
      contentStart: match.index + match[0].length,
      style: 'delimiter',
    });
  }

  labels.sort((a, b) => a.labelStart - b.labelStart);
  return labels;
}

function parseLabeled(text, labels) {
  const turns = [];
  const warnings = [];

  // If we have enough recognized labels to anchor the structure, drop unknown-classified
  // ones — they're almost always section headers ("Substituting:", "For example:") embedded
  // in AI prose, not real speaker turns.
  const knownCount = labels.filter(l => classifySpeaker(l.speaker) !== 'unknown').length;
  const effectiveLabels = knownCount >= 2
    ? labels.filter(l => classifySpeaker(l.speaker) !== 'unknown')
    : labels;
  const droppedAsHeaders = labels.length - effectiveLabels.length;

  for (let i = 0; i < effectiveLabels.length; i++) {
    const label = effectiveLabels[i];
    const next = effectiveLabels[i + 1];
    const contentEnd = next ? next.labelStart : text.length;
    const turnText = text.slice(label.contentStart, contentEnd).trim();
    if (turnText.length === 0) continue;

    const role = classifySpeaker(label.speaker);
    if (role === 'unknown') {
      warnings.push(`Unrecognized speaker label: "${label.speaker}" (turn ${turns.length + 1})`);
    }

    turns.push({
      index: turns.length,
      role,
      label: label.speaker,
      text: turnText,
      charStart: label.labelStart,
      charEnd: contentEnd,
      lineStart: lineNumberAt(text, label.labelStart),
      lineEnd: lineNumberAt(text, contentEnd),
      timestampMs: timestampForTurn(text, label.labelStart, label.contentStart),
    });
  }

  if (droppedAsHeaders > 0) {
    warnings.push(`Ignored ${droppedAsHeaders} colon-terminated line(s) as section headers, not speaker labels`);
  }

  return { turns, method: 'labeled', platform: detectPlatform(effectiveLabels), warnings };
}

function parseAlternation(text) {
  const blocks = [];
  const blockSplit = /\n[ \t]*\n+/g;
  let lastEnd = 0;
  let match;

  blockSplit.lastIndex = 0;
  while ((match = blockSplit.exec(text)) !== null) {
    if (match.index > lastEnd) {
      blocks.push({ start: lastEnd, end: match.index });
    }
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd < text.length) {
    blocks.push({ start: lastEnd, end: text.length });
  }

  const turns = [];
  for (const block of blocks) {
    const blockText = text.slice(block.start, block.end).trim();
    if (blockText.length === 0) continue;
    turns.push({
      index: turns.length,
      role: turns.length % 2 === 0 ? 'user' : 'ai',
      label: null,
      text: blockText,
      charStart: block.start,
      charEnd: block.end,
      lineStart: lineNumberAt(text, block.start),
      lineEnd: lineNumberAt(text, block.end),
      timestampMs: timestampForTurn(text, block.start, block.start),
    });
  }

  return {
    turns,
    method: 'alternation',
    platform: 'unknown',
    warnings: [
      'No speaker labels detected. Assuming alternation starting with the user. ' +
      'If your transcript only contains one side, the analysis will be misleading.',
    ],
  };
}

export function parseTranscript(text) {
  if (typeof text !== 'string') {
    throw new TypeError('parseTranscript expects a string');
  }
  if (text.trim().length === 0) {
    return { turns: [], method: 'empty', platform: 'unknown', warnings: ['Empty transcript.'] };
  }

  const labels = findLabels(text);

  if (labels.length >= 2) {
    return parseLabeled(text, labels);
  }
  return parseAlternation(text);
}

export const _internal = {
  classifySpeaker,
  findLabels,
  detectPlatform,
  lineNumberAt,
};
