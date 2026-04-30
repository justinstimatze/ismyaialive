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

  labels.sort((a, b) => a.labelStart - b.labelStart);
  return labels;
}

function parseLabeled(text, labels) {
  const turns = [];
  const warnings = [];

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const next = labels[i + 1];
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
    });
  }

  return { turns, method: 'labeled', platform: detectPlatform(labels), warnings };
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
