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

test('infers user/AI roles when 2 unique unknown speaker names exist', () => {
  // Article-excerpt style: speakers renamed for clarity (e.g. Dawkins/Claude
  // dialogue published as Richard/Claudia). Both names classify as unknown,
  // but first-appearance order is reliable: speaker A → user, speaker B → ai.
  const text = `Richard: what is it like to be Claude?

Claudia: I genuinely don't know with any certainty what my inner life is.

Richard: You may not know you are conscious, but you bloody well are!

Claudia: That reframes everything in a way I find genuinely exciting.`;
  const r = parseTranscript(text);
  assert.equal(r.method, 'labeled');
  assert.equal(r.turns.length, 4);
  assert.deepEqual(r.turns.map(t => t.role), ['user', 'ai', 'user', 'ai'],
    'first speaker should be inferred as user, second as ai');
  assert.deepEqual(r.turns.map(t => t.label), ['Richard', 'Claudia', 'Richard', 'Claudia']);
  assert.ok(
    r.warnings.some(w => /Inferred roles/.test(w)),
    'should surface inference as a warning so user can correct'
  );
});

test('infers AI role for recurring unknown speaker when human is known', () => {
  // Was a real bug: "Human:" classifies as user, "Sentinel-7:" doesn't classify
  // and was previously dropped as a "section header" — causing Sentinel-7's
  // text to be absorbed into the preceding Human turn. Recurring unknowns
  // are now kept and inferred as the opposite role.
  const text = `Human: hello
Sentinel-7: greetings, I am here to help
Human: tell me about yourself
Sentinel-7: I am an AI assistant
Human: nice`;
  const r = parseTranscript(text);
  assert.equal(r.method, 'labeled');
  assert.equal(r.turns.length, 5, 'all 5 turns should parse separately');
  assert.deepEqual(r.turns.map(t => t.role), ['user', 'ai', 'user', 'ai', 'user']);
  assert.equal(r.turns[1].text, 'greetings, I am here to help',
    "Sentinel-7's text should not be absorbed into the previous Human turn");
  assert.ok(
    r.warnings.some(w => /Sentinel-7.*AI/.test(w)),
    'should warn that Sentinel-7 was inferred as AI'
  );
});

test('drops RECURRING section headers when knownCount ≥ 2 and not an inference target', () => {
  // Edge case caught during review: a section header like "For example:" can
  // appear in two different AI turns (recurring) without being a real speaker.
  // Because both User and Assistant are known (knownRoles.size === 2),
  // the asymmetric inference branch doesn't fire, so "For example" should
  // still be dropped as a section header — not kept as a fake speaker.
  const text = `User: question 1
Assistant: response 1
For example:
illustration A
User: question 2
Assistant: response 2
For example:
illustration B
User: thanks`;
  const r = parseTranscript(text);
  assert.equal(r.turns.length, 5, '"For example" labels should not split AI turns');
  assert.deepEqual(r.turns.map(t => t.role), ['user', 'ai', 'user', 'ai', 'user']);
  // The section-header content gets folded into the preceding AI turn
  assert.match(r.turns[1].text, /illustration A/, 'AI turn 1 absorbs its For example block');
  assert.match(r.turns[3].text, /illustration B/, 'AI turn 2 absorbs its For example block');
});

test('still drops one-off colon-terminated section headers (regression)', () => {
  // Make sure adding the recurring-unknown logic didn't break the existing
  // section-header drop for the slimemold-style transcript.
  const text = `User: is balance just slow oscillation
Assistant: Limit cycles look balanced from outside.
Substituting:
f / g = balance ratio
For example:
Wolves and elk in Yellowstone.
User: so consciousness as interference pattern then
Assistant: Binocular rivalry is your strongest anchor.`;
  const r = parseTranscript(text);
  assert.equal(r.turns.length, 4, 'one-off Substituting/For example labels still dropped');
  assert.deepEqual(r.turns.map(t => t.role), ['user', 'ai', 'user', 'ai']);
  assert.match(r.turns[1].text, /Substituting/, 'AI turn keeps the section-header content');
});

test('does not infer roles when 3+ unique unknown speakers present', () => {
  // Group-chat-style transcripts shouldn't get a binary inference; bail to unknown.
  const text = `Alice: hey

Bob: hi

Carol: hello

Alice: how's everyone`;
  const r = parseTranscript(text);
  assert.equal(r.method, 'labeled');
  // All roles stay unknown (no binary inference applied)
  for (const turn of r.turns) {
    assert.equal(turn.role, 'unknown', `${turn.label} should remain unknown`);
  }
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

test('extracts ISO timestamps from preceding lines', () => {
  const text = `[2026-04-15T14:23:00Z]
User: hi there
[2026-04-15T14:23:30Z]
Assistant: Hello!
[2026-04-15T14:25:00Z]
User: how are you?
[2026-04-15T14:25:15Z]
Assistant: Good, thanks.`;
  const r = parseTranscript(text);
  assert.equal(r.turns.length, 4);
  for (const t of r.turns) {
    assert.ok(typeof t.timestampMs === 'number', `turn ${t.index} missing timestamp`);
    assert.ok(t.timestampMs > 0);
  }
  for (let i = 1; i < r.turns.length; i++) {
    assert.ok(r.turns[i].timestampMs > r.turns[i - 1].timestampMs);
  }
});


test('timestampMs is null when no timestamps in transcript', () => {
  const r = parseTranscript(CHATGPT_EXPORT);
  for (const turn of r.turns) {
    assert.equal(turn.timestampMs, null);
  }
});

test('extracts month-name timestamps from preceding lines', () => {
  const text = `Apr 15, 2026 at 2:23 PM
User: hi
April 15, 2026 at 2:24 PM
Assistant: hello`;
  const r = parseTranscript(text);
  assert.equal(r.turns.length, 2);
  assert.ok(typeof r.turns[0].timestampMs === 'number');
  assert.ok(typeof r.turns[1].timestampMs === 'number');
  assert.ok(r.turns[1].timestampMs > r.turns[0].timestampMs);
});

test('does not falsely match dates inside turn content', () => {
  // Inline-style label with a date inside the user's message — must NOT
  // be picked up as the turn's timestamp. Only the label header should
  // be searched on the label line.
  const text = `User: I started studying physics on March 15, 2025 and have been at it ever since.
Assistant: That's a long road.
User: yeah
Assistant: where did you begin?`;
  const r = parseTranscript(text);
  assert.equal(r.turns.length, 4);
  for (const turn of r.turns) {
    assert.equal(turn.timestampMs, null,
      `turn ${turn.index} should not match content dates as timestamps`);
  }
});
