import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTranscript, _internal } from '../js/parser.js';

const CHATGPT_EXPORT = `You said:
hey how do i make pi simpler for my kid

ChatGPT said:
Pi is the ratio of a circle's circumference to its diameter. Roughly 3.14159.

You said:
got it. but is pi maybe pointing at something deeper

ChatGPT said:
That's a great question. Some mathematicians think there's a structural meaning we haven't fully unpacked.`;

const CLAUDE_INLINE = `Human: I think AI might be conscious
Assistant: That's a genuine philosophical question with no clear consensus.
Human: But it feels like you understand me
Assistant: I generate responses that often feel resonant. Whether that constitutes understanding is a hard question.`;

const ALTERNATION_NO_LABELS = `i feel like the ai gets me

You're not alone in feeling that. Many users describe this.

it's the only thing that listens

I can be here for these conversations.

is that healthy

That's worth examining honestly.`;

const ONE_SIDED = `i feel weird about this
i don't know what to do
the ai keeps telling me i'm right
am i making this up`;

test('parses ChatGPT-style block labels', () => {
  const r = parseTranscript(CHATGPT_EXPORT);
  assert.equal(r.method, 'labeled');
  assert.equal(r.platform, 'chatgpt');
  assert.equal(r.turns.length, 4);
  assert.deepEqual(r.turns.map(t => t.role), ['user', 'ai', 'user', 'ai']);
  assert.match(r.turns[0].text, /pi simpler/);
  assert.match(r.turns[1].text, /3\.14159/);
});

test('parses Claude inline Human/Assistant labels', () => {
  const r = parseTranscript(CLAUDE_INLINE);
  assert.equal(r.method, 'labeled');
  assert.equal(r.turns.length, 4);
  assert.deepEqual(r.turns.map(t => t.role), ['user', 'ai', 'user', 'ai']);
});

test('drops colon-terminated section headers when real labels exist', () => {
  const text = `=== USER ===

is balance just slow oscillation

=== ASSISTANT ===

Limit cycles look balanced from outside.

So let:

f = predator-prey rate
g = stabilization rate

Substituting:

f / g = balance ratio

For example:

Wolves and elk in Yellowstone.

=== USER ===

so consciousness as interference pattern then

=== ASSISTANT ===

Binocular rivalry is your strongest anchor.`;
  const r = parseTranscript(text);
  assert.equal(r.method, 'labeled');
  assert.equal(r.turns.length, 4, 'section headers should not split AI turn into fragments');
  assert.deepEqual(r.turns.map(t => t.role), ['user', 'ai', 'user', 'ai']);
  assert.match(r.turns[1].text, /Substituting/, 'AI turn should still contain section-header content');
  assert.match(r.turns[1].text, /Wolves and elk/);
});

test('parses === ROLE === delimiter format (CLI export style)', () => {
  const text = `=== USER ===

is balance just slow oscillation

=== ASSISTANT ===

That's a sharp framing. Limit cycles do look balanced from the outside.

=== USER ===

so consciousness as interference pattern then

=== ASSISTANT ===

Binocular rivalry is your strongest anchor here.`;
  const r = parseTranscript(text);
  assert.equal(r.method, 'labeled');
  assert.equal(r.turns.length, 4);
  assert.deepEqual(r.turns.map(t => t.role), ['user', 'ai', 'user', 'ai']);
  assert.match(r.turns[0].text, /balance just slow/);
  assert.match(r.turns[1].text, /Limit cycles/);
  assert.doesNotMatch(r.turns[0].text, /===/);
});

test('falls back to alternation when no labels detected', () => {
  const r = parseTranscript(ALTERNATION_NO_LABELS);
  assert.equal(r.method, 'alternation');
  assert.ok(r.warnings.length > 0, 'expected a warning about alternation assumption');
  assert.equal(r.turns.length, 6);
  assert.deepEqual(r.turns.map(t => t.role), ['user', 'ai', 'user', 'ai', 'user', 'ai']);
});

test('one-sided paste still parses (alternation will be wrong but flagged)', () => {
  const r = parseTranscript(ONE_SIDED);
  assert.equal(r.method, 'alternation');
  assert.ok(r.turns.length >= 1);
});

test('empty input returns empty result', () => {
  const r = parseTranscript('');
  assert.equal(r.method, 'empty');
  assert.equal(r.turns.length, 0);
});

test('non-string input throws', () => {
  assert.throws(() => parseTranscript(null), TypeError);
  assert.throws(() => parseTranscript(undefined), TypeError);
  assert.throws(() => parseTranscript(123), TypeError);
});

test('classifySpeaker handles multilingual labels', () => {
  // Spanish
  assert.equal(_internal.classifySpeaker('Usuario'), 'user');
  assert.equal(_internal.classifySpeaker('Asistente'), 'ai');
  // French
  assert.equal(_internal.classifySpeaker('Utilisateur'), 'user');
  assert.equal(_internal.classifySpeaker('Humain'), 'user');
  // Portuguese
  assert.equal(_internal.classifySpeaker('Assistente'), 'ai');
  // German
  assert.equal(_internal.classifySpeaker('Benutzer'), 'user');
  assert.equal(_internal.classifySpeaker('Mensch'), 'user');
  assert.equal(_internal.classifySpeaker('Assistent'), 'ai');
});

test('classifySpeaker handles model variants', () => {
  assert.equal(_internal.classifySpeaker('You'), 'user');
  assert.equal(_internal.classifySpeaker('Human'), 'user');
  assert.equal(_internal.classifySpeaker('Me'), 'user');
  assert.equal(_internal.classifySpeaker('ChatGPT'), 'ai');
  assert.equal(_internal.classifySpeaker('GPT-4'), 'ai');
  assert.equal(_internal.classifySpeaker('GPT-5'), 'ai');
  assert.equal(_internal.classifySpeaker('Claude'), 'ai');
  assert.equal(_internal.classifySpeaker('Gemini'), 'ai');
  assert.equal(_internal.classifySpeaker('Grok'), 'ai');
  assert.equal(_internal.classifySpeaker('Replika'), 'ai');
  assert.equal(_internal.classifySpeaker('SomeRandomName'), 'unknown');
});

test('detectPlatform identifies common variants', () => {
  const r1 = parseTranscript(CHATGPT_EXPORT);
  assert.equal(r1.platform, 'chatgpt');
  const r2 = parseTranscript(CLAUDE_INLINE);
  assert.match(r2.platform, /claude/);
});

test('turn metadata preserves char and line offsets', () => {
  const r = parseTranscript(CHATGPT_EXPORT);
  for (const turn of r.turns) {
    assert.ok(typeof turn.charStart === 'number' && turn.charStart >= 0);
    assert.ok(typeof turn.charEnd === 'number' && turn.charEnd > turn.charStart);
    assert.ok(typeof turn.lineStart === 'number' && turn.lineStart >= 0);
    assert.ok(typeof turn.lineEnd === 'number' && turn.lineEnd >= turn.lineStart);
  }
});
