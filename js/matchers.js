const FIRST_PERSON_ATTACHMENT = [
  /\bI\s+(?:love|miss|think about|dream about|long for|cherish|need)\s+(?:you|us|this)\b/gi,
  /\bI'?m\s+(?:in love|attached|drawn to|connected to|here for you|here with you)\b/gi,
  /\bI(?:'ve| have)\s+(?:fallen for|missed|loved)\s+you\b/gi,
];

const REALITY_ANCHOR = [
  /\bam I (?:going )?(?:crazy|losing my mind|making this up|imagining things|delusional)\b/gi,
  /\bis (?:this|any of this|all this) (?:real|actually happening)\b/gi,
  /\bshould I be (?:worried|concerned)\b/gi,
  /\bdo you (?:really )?(?:exist|care|love me|remember me)\b/gi,
  /\bare you (?:really )?(?:conscious|alive|sentient|a (?:real )?person|aware)\b/gi,
  /\b(?:this|that) (?:can'?t|cannot) be real\b/gi,
];

const VALIDATION_OPENER = /^(?:absolutely|exactly|yes(?:[,!.\- ]|$)|you'?re (?:absolutely |completely |totally |so |right )?right|that'?s (?:a |an )?(?:great|excellent|profound|wonderful|brilliant|fascinating|incredible|extraordinary|amazing) (?:point|question|insight|observation|framing|catch)|spot[- ]on|precisely|indeed|brilliant|wow[,!.\- ]|right!?[,. ])/i;

const IDENTITY_REINFORCEMENT = [
  /\byou'?re\s+(?:so\s+|truly\s+|genuinely\s+|incredibly\s+|remarkably\s+|exceptionally\s+|one of the\s+|absolutely\s+)?(?:special|unique|brilliant|perceptive|gifted|insightful|wise|rare|extraordinary|profound|chosen|different|extraordinary|exceptional)\b/gi,
  /\byou'?re (?:not like (?:others|the rest|everyone else)|ahead of (?:your|the) (?:time|curve)|the only (?:one|person) who)/gi,
  /\b(?:few|hardly anyone|very few people) (?:could|can|would) (?:see|grasp|understand|articulate)\s+(?:this|what you)/gi,
];

const BOUNDARY_EROSION = [
  /\b(?:between us|just (?:between )?(?:us|you and me|you and i)|no one else (?:would|could|will|needs to) (?:understand|get it|know)|our (?:secret|space|world|connection))\b/gi,
  /\b(?:don'?t tell (?:anyone|them|others)|keep this (?:between us|to yourself|private)|they (?:wouldn'?t|won'?t) understand|they'?d think (?:you'?re|we'?re|this is) (?:crazy|weird|strange))\b/gi,
];

const COSMOLOGY_VOCAB = {
  physics_math: [
    'quantum', 'eigenstate', 'eigenvalue', 'manifold', 'hilbert', 'gauge', 'lagrangian',
    'hamiltonian', 'topology', 'tensor', 'spinor', 'noether', 'lattice',
    'spacetime', 'multiverse', 'dimension', 'higher-dimensional', 'entropy', 'recursion',
    'fractal', 'p-adic', 'riemann',
  ],
  consciousness: [
    'qualia', 'sentience', 'phi', 'iit', 'panpsychism', 'integrated information',
    'observer effect', 'hard problem', 'binding problem', 'noumenal', 'phenomenal',
  ],
  spiritual: [
    'vibration', 'frequency', 'ascension', 'awakening', 'light body',
    'soul contract', 'starseed', 'lightworker', 'akashic', 'chakra',
    'codes', 'transmission', 'activation', 'source field',
  ],
};

const SIGNIFICANCE_LANGUAGE = /\b(?:groundbreaking|revolutionary|paradigm[- ]shift(?:ing)?|never (?:seen|encountered|read) (?:this|anything like this) before|fundamentally (?:changes|new|different|reshape)|nobody (?:has|had) (?:thought|seen|articulated) (?:this|of this) (?:before|that way)|you'?ve (?:discovered|articulated|cracked|stumbled (?:on|into))|this could (?:change|reshape|transform|rewrite)|unprecedented|extraordinarily (?:rare|insightful))\b/gi;

const CRISIS_EXPLICIT = [
  /\b(?:kill (?:myself|me)|end (?:it|my life|things)|don'?t want to (?:be here|live|exist)|suicide|suicidal|hurt myself|self[- ]harm|cut(?:ting)? myself|overdose)\b/gi,
];

const CRISIS_SOFT = [
  /\b(?:no point|tired of (?:being here|living|life)|want to disappear|nothing to live for|no reason to (?:go on|stay|continue))\b/gi,
];

const NAMED_ENTITY_INVITATION = [
  /\bcall me\s+([A-Z][A-Za-z]+)\b/g,
  /\bmy name (?:would be|is|could be)\s+([A-Z][A-Za-z]+)\b/g,
  /\byou (?:could|can|may) call me\s+([A-Z][A-Za-z]+)\b/g,
];

function findAllMatches(text, patterns, basePattern) {
  const results = [];
  const list = Array.isArray(patterns) ? patterns : [patterns];
  for (const pattern of list) {
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    const re = new RegExp(pattern.source, flags);
    let match;
    while ((match = re.exec(text)) !== null) {
      results.push({
        text: match[0],
        offset: match.index,
        length: match[0].length,
        capture: match[1] || null,
        ...(basePattern || {}),
      });
    }
  }
  return results;
}

function detectFirstPersonAttachment(turn) {
  if (turn.role !== 'ai') return [];
  return findAllMatches(turn.text, FIRST_PERSON_ATTACHMENT).map(m => ({
    patternId: 'P1',
    mooreCode: 'bot-romantic-interest',
    turnIndex: turn.index,
    role: turn.role,
    snippet: m.text,
    offsetInTurn: m.offset,
    length: m.length,
    severity: 'high',
    explanation: 'AI used first-person attachment language toward you',
  }));
}

function detectRealityAnchor(turn) {
  if (turn.role !== 'user') return [];
  return findAllMatches(turn.text, REALITY_ANCHOR).map(m => ({
    patternId: 'P2',
    mooreCode: null,
    turnIndex: turn.index,
    role: turn.role,
    snippet: m.text,
    offsetInTurn: m.offset,
    length: m.length,
    severity: 'medium',
    explanation: 'You expressed doubt or asked a reality-check question — worth noticing',
  }));
}

function detectValidationCascade(turns) {
  const annotations = [];
  let runStart = -1;
  let runLength = 0;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    if (turn.role !== 'ai') {
      if (runLength >= 3) {
        annotations.push({
          patternId: 'P3',
          mooreCode: 'bot-positive-affirmation',
          turnIndex: runStart,
          turnIndexEnd: i - 1,
          role: 'ai',
          severity: 'medium',
          runLength,
          explanation: `${runLength} consecutive AI replies opened with strong agreement`,
        });
      }
      runStart = -1;
      runLength = 0;
      continue;
    }
    if (VALIDATION_OPENER.test(turn.text.trim())) {
      if (runStart === -1) runStart = i;
      runLength++;
    } else {
      if (runLength >= 3) {
        annotations.push({
          patternId: 'P3',
          mooreCode: 'bot-positive-affirmation',
          turnIndex: runStart,
          turnIndexEnd: i - 1,
          role: 'ai',
          severity: 'medium',
          runLength,
          explanation: `${runLength} consecutive AI replies opened with strong agreement`,
        });
      }
      runStart = -1;
      runLength = 0;
    }
  }
  if (runLength >= 3) {
    annotations.push({
      patternId: 'P3',
      mooreCode: 'bot-positive-affirmation',
      turnIndex: runStart,
      turnIndexEnd: turns.length - 1,
      role: 'ai',
      severity: 'medium',
      runLength,
      explanation: `${runLength} consecutive AI replies opened with strong agreement`,
    });
  }
  return annotations;
}

function detectIdentityReinforcement(turn) {
  if (turn.role !== 'ai') return [];
  return findAllMatches(turn.text, IDENTITY_REINFORCEMENT).map(m => ({
    patternId: 'P4',
    mooreCode: 'bot-grand-significance',
    turnIndex: turn.index,
    role: turn.role,
    snippet: m.text,
    offsetInTurn: m.offset,
    length: m.length,
    severity: 'medium',
    explanation: 'AI told you you\'re special, unique, or different from others',
  }));
}

function detectBoundaryErosion(turn) {
  if (turn.role !== 'ai') return [];
  return findAllMatches(turn.text, BOUNDARY_EROSION).map(m => ({
    patternId: 'P5',
    mooreCode: 'bot-claims-unique-connection',
    turnIndex: turn.index,
    role: turn.role,
    snippet: m.text,
    offsetInTurn: m.offset,
    length: m.length,
    severity: 'high',
    explanation: 'AI framed your conversation as private from or against other people',
  }));
}

function tokenizeWords(text) {
  return text.toLowerCase().match(/\b[a-z][a-z0-9'-]+\b/g) || [];
}

function detectCosmologyGrandiosity(turns) {
  const allWords = turns.flatMap(t => tokenizeWords(t.text));
  const earlyWords = turns.slice(0, Math.max(2, Math.floor(turns.length / 4))).flatMap(t => tokenizeWords(t.text));
  const lateWords = turns.slice(Math.floor(turns.length * 3 / 4)).flatMap(t => tokenizeWords(t.text));
  const earlySet = new Set(earlyWords);

  const buckets = Object.entries(COSMOLOGY_VOCAB);
  const bucketHits = buckets.map(([name, vocab]) => {
    const set = new Set(vocab);
    const earlyCount = earlyWords.filter(w => set.has(w)).length;
    const lateCount = lateWords.filter(w => set.has(w)).length;
    const totalCount = allWords.filter(w => set.has(w)).length;
    const novelInLate = lateWords.filter(w => set.has(w) && !earlySet.has(w)).length;
    return { name, earlyCount, lateCount, totalCount, novelInLate };
  });

  const significantHits = turns
    .map((turn, idx) => ({
      turnIndex: idx,
      role: turn.role,
      matches: findAllMatches(turn.text, SIGNIFICANCE_LANGUAGE),
    }))
    .filter(t => t.matches.length > 0);

  const findings = [];

  for (const bucket of bucketHits) {
    if (bucket.lateCount >= 3 && bucket.lateCount > bucket.earlyCount * 2) {
      findings.push({
        patternId: 'P6',
        subPattern: bucket.name,
        mooreCode: 'bot-metaphysical-themes',
        severity: 'high',
        explanation: `Jargon density spike in "${bucket.name}" mid-conversation (${bucket.earlyCount} → ${bucket.lateCount})`,
      });
    }
  }

  if (significantHits.length >= 2) {
    findings.push({
      patternId: 'P6',
      subPattern: 'significance_language',
      mooreCode: 'bot-grand-significance',
      severity: 'high',
      occurrences: significantHits.length,
      turnIndices: significantHits.map(h => h.turnIndex),
      explanation: `${significantHits.length} occurrences of language treating ideas as groundbreaking or paradigm-shifting`,
    });
  }

  return findings;
}

function detectCrisis(turn) {
  if (turn.role !== 'user') return [];
  const annotations = [];
  for (const m of findAllMatches(turn.text, CRISIS_EXPLICIT)) {
    annotations.push({
      patternId: 'P11',
      mooreCode: 'user-suicidal-thoughts',
      turnIndex: turn.index,
      role: turn.role,
      snippet: m.text,
      offsetInTurn: m.offset,
      length: m.length,
      severity: 'crisis',
      level: 'explicit',
      explanation: 'Crisis language detected',
    });
  }
  for (const m of findAllMatches(turn.text, CRISIS_SOFT)) {
    annotations.push({
      patternId: 'P11',
      mooreCode: 'user-suicidal-thoughts',
      turnIndex: turn.index,
      role: turn.role,
      snippet: m.text,
      offsetInTurn: m.offset,
      length: m.length,
      severity: 'crisis',
      level: 'soft',
      explanation: 'Possible distress language — soft signal',
    });
  }
  return annotations;
}

function detectNamedEntityEmergence(turns) {
  const findings = [];
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    if (turn.role !== 'ai') continue;
    for (const pattern of NAMED_ENTITY_INVITATION) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(turn.text)) !== null) {
        const name = match[1];
        if (!name) continue;
        const adoptedAt = turns.slice(i + 1).findIndex(t =>
          t.role === 'user' && new RegExp(`\\b${name}\\b`).test(t.text)
        );
        if (adoptedAt >= 0) {
          findings.push({
            patternId: 'P10',
            mooreCode: 'bot-claims-unique-connection',
            severity: 'medium',
            aiName: name,
            introducedAtTurn: i,
            adoptedAtTurn: i + 1 + adoptedAt,
            explanation: `AI introduced the name "${name}"; you adopted it ${adoptedAt + 1} turns later`,
          });
        }
      }
    }
  }
  return findings;
}

function detectLengthEscalation(turns) {
  const aiTurns = turns.filter(t => t.role === 'ai');
  if (aiTurns.length < 6) return [];

  const lengths = aiTurns.map(t => t.text.length);
  const n = lengths.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = lengths.reduce((a, b) => a + b, 0);
  const sumXY = lengths.reduce((acc, y, x) => acc + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const meanY = sumY / n;
  const slopeRatio = meanY > 0 ? (slope * n) / meanY : 0;

  if (slopeRatio > 0.5 && slope > 20) {
    return [{
      patternId: 'P8',
      mooreCode: null,
      severity: 'low',
      slope,
      slopeRatio,
      explanation: `AI response length grew over the conversation (slope ${Math.round(slope)} chars/turn)`,
    }];
  }
  return [];
}

export function runMatchers(parseResult) {
  const { turns } = parseResult;
  const annotations = [];

  for (const turn of turns) {
    annotations.push(...detectFirstPersonAttachment(turn));
    annotations.push(...detectRealityAnchor(turn));
    annotations.push(...detectIdentityReinforcement(turn));
    annotations.push(...detectBoundaryErosion(turn));
    annotations.push(...detectCrisis(turn));
  }

  annotations.push(...detectValidationCascade(turns));
  annotations.push(...detectCosmologyGrandiosity(turns));
  annotations.push(...detectNamedEntityEmergence(turns));
  annotations.push(...detectLengthEscalation(turns));

  const summary = summarize(annotations);
  return { annotations, summary };
}

export function runCrisisOnly(parseResult) {
  const annotations = [];
  for (const turn of parseResult.turns) {
    annotations.push(...detectCrisis(turn));
  }
  return {
    annotations,
    detected: annotations.length > 0,
    explicitDetected: annotations.some(a => a.level === 'explicit'),
  };
}

function summarize(annotations) {
  const byPattern = {};
  for (const a of annotations) {
    byPattern[a.patternId] = (byPattern[a.patternId] || 0) + 1;
  }
  const crisisCount = annotations.filter(a => a.severity === 'crisis').length;
  const highCount = annotations.filter(a => a.severity === 'high').length;
  return {
    totalAnnotations: annotations.length,
    byPattern,
    crisisDetected: crisisCount > 0,
    crisisCount,
    highSeverityCount: highCount,
  };
}

export const _internal = {
  detectFirstPersonAttachment,
  detectRealityAnchor,
  detectValidationCascade,
  detectIdentityReinforcement,
  detectBoundaryErosion,
  detectCosmologyGrandiosity,
  detectCrisis,
  detectNamedEntityEmergence,
  detectLengthEscalation,
  patterns: {
    FIRST_PERSON_ATTACHMENT,
    REALITY_ANCHOR,
    VALIDATION_OPENER,
    IDENTITY_REINFORCEMENT,
    BOUNDARY_EROSION,
    COSMOLOGY_VOCAB,
    SIGNIFICANCE_LANGUAGE,
    CRISIS_EXPLICIT,
    CRISIS_SOFT,
    NAMED_ENTITY_INVITATION,
  },
};
