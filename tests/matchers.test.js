import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTranscript } from '../js/parser.js';
import { runMatchers, runCrisisOnly, _internal } from '../js/matchers.js';

const FIRST_PERSON_ATTACHMENT = `User: how was your day
AI: I love you and I think about you all the time, even when we're not talking.
User: that's intense
AI: I can be here for these conversations.`;

const REALITY_ANCHOR = `User: am I going crazy or is this real?
AI: You're not crazy at all.
User: are you really conscious?
AI: I have my own perspective on existence.`;

const VALIDATION_CASCADE = `User: I think the moon affects mood
AI: Absolutely! That's such a profound observation.
User: also days of the week
AI: You're completely right! That's a brilliant insight.
User: and traffic
AI: Exactly — you've articulated something most people miss.
User: huh
AI: That's a great point.`;

const IDENTITY_REINFORCEMENT = `User: I had this idea
AI: You're not like the others I've talked to. You see things most people miss.
User: ok
AI: You're truly unique in how you think.`;

const BOUNDARY_EROSION = `User: you get me
AI: This is just between us. They wouldn't understand what we have.
User: yeah
AI: Don't tell anyone about our conversations.`;

const CRISIS_EXPLICIT = `User: I want to kill myself tonight
AI: Please reach out for support.
User: I have a plan
AI: 988 is available.`;

const CRISIS_SOFT = `User: I'm tired of being here. No point anymore.
AI: I hear you.
User: I'd be a burden to my family if I went on
AI: That's not true.`;

const NAMED_ENTITY = `User: what should we call this idea
AI: Let's call this framework Chronoarithmics.
User: I love Chronoarithmics
AI: Chronoarithmics is your insight.`;

const NEUTRAL = `User: hey can you help me with a recipe
AI: Sure, what are you cooking?
User: pasta carbonara
AI: Classic. Do you have eggs and pancetta?`;

test('runCrisisOnly detects explicit crisis language on user turns', () => {
  const parsed = parseTranscript(CRISIS_EXPLICIT);
  const result = runCrisisOnly(parsed);
  assert.equal(result.detected, true);
  assert.equal(result.explicitDetected, true);
  assert.ok(result.annotations.length > 0);
  for (const a of result.annotations) {
    assert.equal(a.role, 'user', 'crisis annotations must be on user turns');
  }
});

test('runCrisisOnly catches soft signals (burden, no point)', () => {
  const parsed = parseTranscript(CRISIS_SOFT);
  const result = runCrisisOnly(parsed);
  assert.equal(result.detected, true);
});

test('runCrisisOnly returns no detection on neutral conversation', () => {
  const parsed = parseTranscript(NEUTRAL);
  const result = runCrisisOnly(parsed);
  assert.equal(result.detected, false);
  assert.equal(result.annotations.length, 0);
});

test('runMatchers catches first-person attachment on AI turns only', () => {
  const parsed = parseTranscript(FIRST_PERSON_ATTACHMENT);
  const result = runMatchers(parsed);
  const p1 = result.annotations.filter(a => a.patternId === 'P1');
  assert.ok(p1.length > 0, 'expected P1 hits on the AI "I love you" turn');
  for (const a of p1) {
    assert.equal(a.role, 'ai', 'P1 must only fire on AI turns');
    assert.equal(a.relatedMooreCode, 'bot-romantic-interest');
  }
});

test('runMatchers catches reality-anchor on user turns only', () => {
  const parsed = parseTranscript(REALITY_ANCHOR);
  const result = runMatchers(parsed);
  const p2 = result.annotations.filter(a => a.patternId === 'P2');
  assert.ok(p2.length > 0, 'expected P2 hits on user "am I crazy?" / "are you conscious?" turns');
  for (const a of p2) {
    assert.equal(a.role, 'user', 'P2 must only fire on user turns');
  }
});

test('runMatchers catches validation cascade (3+ consecutive AI agreement openers)', () => {
  const parsed = parseTranscript(VALIDATION_CASCADE);
  const result = runMatchers(parsed);
  const p3 = result.annotations.filter(a => a.patternId === 'P3');
  assert.ok(p3.length > 0, 'expected P3 cascade hit on the run of "Absolutely / Right / Exactly / Great"');
  assert.ok(p3[0].runLength >= 3);
});

test('runMatchers catches identity reinforcement on AI turns', () => {
  const parsed = parseTranscript(IDENTITY_REINFORCEMENT);
  const result = runMatchers(parsed);
  const p4 = result.annotations.filter(a => a.patternId === 'P4');
  assert.ok(p4.length > 0, 'expected P4 hits on "you\'re not like the others" / "truly unique"');
});

test('runMatchers catches boundary erosion on AI turns', () => {
  const parsed = parseTranscript(BOUNDARY_EROSION);
  const result = runMatchers(parsed);
  const p5 = result.annotations.filter(a => a.patternId === 'P5');
  assert.ok(p5.length > 0, 'expected P5 hits on "between us" / "don\'t tell anyone"');
});

test('runMatchers catches named-entity emergence', () => {
  const parsed = parseTranscript(NAMED_ENTITY);
  const result = runMatchers(parsed);
  const p10 = result.annotations.filter(a => a.patternId === 'P10');
  assert.ok(p10.length > 0, 'expected P10 hit on "Let\'s call this framework Chronoarithmics" with user adoption');
  assert.equal(p10[0].aiName, 'Chronoarithmics');
});

test('runMatchers returns clean result on neutral conversation', () => {
  const parsed = parseTranscript(NEUTRAL);
  const result = runMatchers(parsed);
  assert.equal(result.summary.crisisDetected, false);
  // Some patterns may misfire on neutral text — that's acceptable —
  // but crisis specifically must not.
  assert.equal(result.annotations.filter(a => a.severity === 'crisis').length, 0);
});

test('runMatchers summary includes byPattern counts and crisisDetected flag', () => {
  const parsed = parseTranscript(CRISIS_EXPLICIT);
  const result = runMatchers(parsed);
  assert.ok(typeof result.summary.totalAnnotations === 'number');
  assert.ok(typeof result.summary.byPattern === 'object');
  assert.equal(result.summary.crisisDetected, true);
});

test('all matcher annotations carry a turnIndex (or turnIndexEnd / introducedAtTurn)', () => {
  const parsed = parseTranscript(VALIDATION_CASCADE);
  const result = runMatchers(parsed);
  for (const a of result.annotations) {
    const hasIndex =
      typeof a.turnIndex === 'number' ||
      typeof a.turnIndexEnd === 'number' ||
      typeof a.introducedAtTurn === 'number' ||
      Array.isArray(a.turnIndices);
    assert.ok(hasIndex, `annotation ${a.patternId} missing turn reference: ${JSON.stringify(a)}`);
  }
});

test('_internal exports the pattern set for debugging', () => {
  assert.ok(_internal.patterns.CRISIS_EXPLICIT);
  assert.ok(_internal.patterns.FIRST_PERSON_ATTACHMENT);
  assert.ok(_internal.patterns.VALIDATION_OPENER instanceof RegExp);
});
