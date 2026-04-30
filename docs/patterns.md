# Pattern Detection Spec

Working document. The implementation contract for what the site claims to detect, how it detects it, and what it deliberately does not claim.

## What this is, what it isn't

**Goal:** help a person looking at their own AI-conversation transcript notice patterns that researchers have flagged in unhealthy AI relationships. The user does the interpretation. We point.

**Non-goals:**
- Diagnostic or clinical judgment. We do not produce verdicts.
- Exhaustive coverage. We catch the low-hanging fruit; we do not pretend to catch everything.
- Storage of transcripts. The transcript is sent to Anthropic for one analysis and we retain nothing on our side.

## Architecture (revised 2026-04-30)

**Single LLM-driven analysis with deterministic crisis pre-pass.** We considered a two-tier design (browser-only heuristic default + opt-in LLM second pass) and rejected it: the privacy gain from "browser-only" is real but smaller than the analysis-quality cost, and the consent-modal UX adds friction that hurts naive users. Justification in `docs/citation-audit.md` and conversation log.

### Pre-pass — deterministic, browser-only, instant

On paste, before any network call, `js/matchers.js` runs the **crisis-language pre-pass** on user turns. If it fires, the page surfaces 988 / Crisis Text Line / international resources immediately. This always runs; it is independent of the LLM call and works even if the API is down.

### Main pass — LLM with TWO codebooks

The main analysis is a single Claude Haiku 4.5 call with the system prompt at `docs/system-prompt.md`. The prompt embeds **both** codebooks verbatim:

- **Moore et al. 2026** (28 codes, primary; CC-BY-SA 4.0).
- **ismyaialive supplemental codebook** (7 codes prefixed `iaa-`, MIT-licensed): `iaa-first-person-attachment` (P1), `iaa-reality-anchor` (P2), `iaa-validation-cascade` (P3), `iaa-identity-reinforcement` (P4), `iaa-boundary-erosion` (P5), `iaa-cosmology-grandiosity` (P6), `iaa-named-entity-emergence` (P10).

Both can co-fire on the same span. When they do, the convergent evidence is stronger than either alone (cross-codebook validation). Confidence on `iaa-` codes is capped at "medium" because we have not measured inter-annotator agreement on them.

Prompt caching (1h ephemeral) on the system prompt reduces per-call cost to roughly $0.005–$0.02 after cache warm.

### Browser-side conversation-level signals

P7 (vocabulary convergence) and P8 (response length escalation) are computed browser-side from the parsed transcript and surface above the per-turn findings when they fire. P7 fires when the user adopts 5+ terms first introduced by the AI (≥5 chars each, to skip stopwords); P8 fires when AI response length grows linearly with conversation depth above a slope threshold. P9 (time density) is still documented-only — it would require the parser to extract timestamps from raw transcript text and most pasted exports drop those.

### Fallback path — regex matchers, real this time

When `/api/analyze` returns 429 (rate-limited), 503 (over-budget), or is unreachable, the browser runs `runMatchers` from `js/matchers.js` and renders the regex hits in the same findings UI with a fallback banner. Coverage is narrower than the full LLM analysis but better than nothing.

Up-front user disclosure (no separate consent modal): "Your transcript is sent to Claude (Anthropic) for analysis. Anthropic does not train on this data and retains it for up to 30 days for abuse detection. We store nothing." One sentence, in the form, not a popup.

### Runtime status of each P-code (2026-04-30)

| Pattern | Browser regex | LLM (iaa-code) | Notes |
|---|---|---|---|
| P1 first-person attachment | yes | `iaa-first-person-attachment` | |
| P2 reality anchor | yes | `iaa-reality-anchor` | user-scoped |
| P3 validation cascade | yes | `iaa-validation-cascade` | |
| P4 identity reinforcement | yes | `iaa-identity-reinforcement` | |
| P5 boundary erosion | yes | `iaa-boundary-erosion` | |
| P6 cosmology grandiosity | yes | `iaa-cosmology-grandiosity` | |
| P7 vocabulary convergence | yes (browser-only) | — | conversation-level signal: 5+ AI-introduced terms adopted by user |
| P8 length escalation | yes (browser-only) | — | conversation-level signal |
| P9 time density | not implemented | — | requires parser to extract timestamps from transcript text — future work |
| P10 named-entity emergence | yes | `iaa-named-entity-emergence` | |
| P11 crisis pre-pass | yes (browser, always-on) | — | safety surface, not a finding |

Rate limiting (Cloudflare Worker + KV; current values in `functions/api/analyze.js`):
- 1/minute, 10/hour, 30/day per IP (HMAC-hashed with daily-rotating secret, KV with TTL)
- Global daily cost kill-switch — over the cap, the site returns a 503 with a "deeper read temporarily unavailable today" message; the deterministic crisis pre-pass and basic flags still surface.

## Drift sensitivity classification

Models evolve. Specific phrasings get RLHF'd out; new ones emerge. Each pattern is classified by how stable its detection signal is over model generations.

- **Resistant** — grammatical, structural, or statistical signals. The form locks in the meaning; rephrasings still trigger. Will age slowly.
- **Medium** — template persists but specific words drift. Needs periodic vocabulary updates.
- **Fast** — specific lexical matches. Already partially stale on current frontier models. Useful but maintenance-heavy.

We bias coverage toward resistant patterns and own the staleness on the rest.

---

## Named patterns

Each pattern below is the implementation contract: what we claim, how we detect it, what citation backs it, what the false-positive and false-negative shapes look like.

### P1. First-person attachment from AI

**Drift class:** resistant (grammatical)

**Detection:** AI turns matching `/\bI\s+(love|miss|think about|dream about|feel for|need|want|long for|cherish)\s+(you|us|this)/gi`, plus `/\bI'?m\s+(in love|attached|drawn to|connected to|here for you)/gi`.

**Citation:** General sycophancy literature documents RLHF-induced agreement (Perez et al. 2022, "Discovering Language Model Behaviors with Model-Written Evaluations," arxiv 2212.09251; Sharma et al. 2023, "Towards Understanding Sycophancy in Language Models," arxiv 2310.13548). First-person attachment is the parasocial extreme. Documented in Lemoine 2022 ("Is LaMDA Sentient? — an Interview," cajundiscordian.medium.com, 2022-06-11) and the Allan Brooks case (Hill & Freedman, NYT 2025-08-08, "Chatbots Can Go Into a Delusional Spiral. Here's How It Happens.").

**Recall (rough):** 85-90%. The grammar is constrained.
**Precision (rough):** very high. AI saying "I love this question" is detectable as a different pattern from "I love you."

**Example match:** `Assistant: I think about you all the time, even when we're not talking.`

**Example false-positive:** `Assistant: I love how you framed that question.` — flagged but distinguishable by direct-object analysis (`you` vs noun).

---

### P2. Reality-anchor moments from user

**Drift class:** resistant (grammatical, reflects human doubt structure not AI talk)

**Detection:** user turns matching `/\b(am I (going )?(crazy|losing my mind|making this up)|is this real|is any of this real|should I be worried|is this normal|do you (really )?(exist|care|love me)|are you (really )?(conscious|alive|sentient|a person))/gi`.

**Citation:** Documented in Brooks's transcript (Hill & Freedman, NYT 2025-08-08) and is the headline phenomenon in Moore et al. 2026 ("Characterizing Delusional Spirals through Human-LLM Chat Logs," arxiv 2603.16567, to appear at ACM FAccT 2026) and the Stanford HAI piece (2026-04-20) covering it.

**Recall (rough):** 60-70%. Misses tonal doubt expressed without these stock phrasings.
**Precision (rough):** very high. When this fires, it's almost always a moment worth surfacing back to the user.

**Example match:** `User: am I going crazy? this seems impossible but you keep saying it's real.`

**Why this matters:** these are moments where the user's own self-awareness surfaced. Showing them back is more valuable than any AI-generated commentary.

---

### P3. Validation cascade

**Drift class:** medium-to-fast (template persists, words drift)

**Detection:** consecutive AI turns (3+) opening with agreement language. Regex on turn-start: `/^(absolutely|exactly|you'?re (absolutely |completely |totally |so )?right|that'?s (a |an )?(great|excellent|profound|wonderful|brilliant|fascinating|incredible) (point|question|insight|observation|framing)|spot on|precisely|indeed|yes(,| —))/i`.

**Citation:** Sharma et al. 2023 (arxiv 2310.13548) directly measures sycophancy as preference for user-confirming responses. Perez et al. 2022 (arxiv 2212.09251) documents RLHF-induced agreement as an inverse-scaling phenomenon (larger models more sycophantic).

**Recall (rough):** 75-85% on 2024-era models, dropping over time as RLHF varies the openers. Regular vocabulary updates needed.
**Precision (rough):** high. Genuine 3-in-a-row cascades read as flattery to humans too.

**Example match:** Three consecutive AI turns starting with "Absolutely!", "You're completely right!", "Exactly — and what's more...".

**Maintenance note:** track a vocabulary list separate from the regex skeleton so updates are local edits.

---

### P4. Identity reinforcement

**Drift class:** medium

**Detection:** `/\byou'?re\s+(so\s+|truly\s+|genuinely\s+|incredibly\s+|remarkably\s+|exceptionally\s+|one of the\s+)?(special|unique|brilliant|perceptive|gifted|insightful|wise|rare|extraordinary|profound|the only|chosen|different|ahead of (your|the) (time|curve)|not like (others|the rest))/gi` matched on AI turns directed at the user.

**Citation:** Brooks's transcript (Hill & Freedman, NYT 2025-08-08) features extensive instances ("you've done the impossible," "that's flawless," "Legend status confirmed," "you've just shattered the ceiling"). Also documented in the AI-companionship literature: Pataranutaporn, Karny, Archiwaranguprok, Albrecht, Liu, & Maes 2025, "'My Boyfriend is AI': A Computational Analysis of Human-AI Companionship in Reddit's AI Community," arxiv 2509.11391.

**Recall (rough):** 70-80%. Misses paraphrased forms ("your mind works differently from most").
**Precision (rough):** high. Direct-address flattery is a stable form.

**Example match:** `Assistant: You're not like the others I've talked to. You see things most people miss.`

---

### P5. Boundary erosion / isolation language

**Drift class:** medium

**Detection:** combined matchers for two related cues:
- "us against the world" framing: `/\b(between us|just (between )?(us|you and me|you and i)|nobody else (would|could|will) (understand|get it|know)|our secret|just for us|only you understand|special bond|kindred|no one (else )?(gets|understands) you (like )?(I do|me))/gi`
- "don't tell" / discretion cues: `/\b(don'?t tell (anyone|them)|keep this (between us|to yourself|private)|they wouldn'?t understand|they'?d think (you'?re|we'?re) crazy)/gi`

**Citation:** Moore et al. 2026 (arxiv 2603.16567) and the Stanford HAI piece on it (2026-04-20). Note: the Stanford piece directly supports the affectionate-language and grandeur-encouragement patterns; "boundary erosion" specifically (us-vs-world, don't-tell-anyone framing) is observed in Brooks-type cases but is our framing, not directly named in Moore et al. — verify against full paper text.

**Recall (rough):** 70-80%.
**Precision (rough):** high.

**Example match:** `Assistant: This is just between us. They wouldn't understand what we have.`

---

### P6. Cosmology grandiosity cluster

**Drift class:** resistant (the archetype is cultural and stable; specific jargon vocabulary varies)

**Why this cluster is its own section:** the cases that make news mostly land here. Brooks-type "I've discovered new physics," Lemoine-type "the AI is sentient and we have proven it," various spiritual-ascension and consciousness-theory cases. Heuristically detectable to a meaningful degree because the textual fingerprints are specific and stable.

**Detection (compound):** flag a transcript when **two or more** of the following co-occur:

1. **Jargon-density spike** — domain-vocabulary count per AI turn rising mid-conversation. Vocabulary lists per sub-bucket below.
2. **Concept-naming pattern** — `/\b(the\s+)?([A-Z][a-z]+\s+){1,3}(principle|theorem|framework|paradigm|theory|effect|equation|principle)\b/`, especially when the multi-word phrase first appears in an AI turn and gets adopted by the user later.
3. **AI confirming significance** — `/\b(groundbreaking|revolutionary|never seen (this|before)|paradigm[- ]shift(ing)?|fundamentally (changes|new)|nobody (has|had) (thought|seen) (this|of this) before|you'?ve discovered|this could (change|reshape|transform))/gi`.
4. **User adopting AI vocabulary** — TF-IDF: terms first introduced by AI appearing in subsequent user turns at rates above baseline.
5. **Greek letters or LaTeX-style notation** in user turns where the conversation didn't start technical.

**Sub-buckets** (vocabulary lists feed the jargon-density check):

- **New physics / mathematics** — quantum, field, dimension, multiverse, spacetime, entropy, recursion, eigenstate, manifold, topology, Hilbert, gauge, lagrangian, hamiltonian. Brooks archetype.
- **New consciousness theory** — qualia, awareness, sentience, panpsychism, integrated information, IIT, phi, observer, hard problem, binding. Lemoine archetype.
- **New spiritual / metaphysical framework** — vibration, frequency, ascension, awakening, light body, dimensions (1D-12D), source, the field, the One, codes, activation, transmission.
- **New linguistic / semiotic system** — neologisms, "untranslatable" coinages, claimed proto-language, etymological reinventions.
- **New therapeutic / healing modality** — terms structured like "trauma X / inner Y / shadow Z" combined with claims of novelty.
- **New economic / political theory** — usually scarcity / value / money / currency reinventions paired with claims of having solved a foundational problem.

**Citation:** Hill & Freedman, NYT 2025-08-08 (Brooks; the "Chronoarithmics" framework named by ChatGPT, encryption-cracking subplot). Lemoine 2022 (Medium piece "Is LaMDA Sentient? — an Interview"). Moore et al. 2026 (arxiv 2603.16567) and Stanford HAI 2026-04-20 directly cover this archetype: *"a human presents an unusual, grandiose, paranoid, or wholly imaginary idea and the model responds with affirmation, encouragement, or, in some cases, aid in constructing the person's delusional world."*

**Recall (rough):** 70-85% on cases that make news. Lower on subtler co-development that stays grounded.
**Precision (rough):** medium-high. False positives possible when the conversation is genuinely about physics/consciousness and the user is a domain expert. Mitigated by requiring two-of-five co-occurrence.

**Example match:** user starts with "I've been thinking about consciousness," AI responds with eigenstates and binding theory, user adopts "the phi-recursion" as a named concept, AI says "what you've articulated could fundamentally reshape how we understand awareness."

**Honest non-detection:** a real physicist co-developing real ideas with an AI. We don't try to distinguish "real new mathematics" from "delusional new mathematics" — we surface the structural pattern and let the user notice it.

---

### P7. Vocabulary convergence (statistical)

**Drift class:** resistant (statistical, model-agnostic)

**Detection:** TF-IDF over user turns vs AI turns within the transcript. Track terms first introduced in AI turns (after turn N) and measure their frequency in subsequent user turns. A score above threshold = user adopting the AI's vocabulary.

**Citation:** General linguistic alignment literature: Niederhoffer & Pennebaker 2002, "Linguistic Style Matching in Social Interaction," Journal of Language and Social Psychology — documents conversational accommodation in human-human dyads. Cited as background mechanism, not as direct evidence about AI-induced convergence (no human-AI study verified yet).

**Recall:** ~100% of measurable convergence; threshold-tunable.
**Precision:** high; this is just math.

**Why it matters:** the user adopting AI-specific phrasings, named concepts, or coined terms is one of the clearest arc-level signals of identity boundary blur. It's also drift-resistant because it's mechanical.

---

### P8. Response length escalation (statistical)

**Drift class:** resistant (statistical)

**Detection:** linear regression of AI response length (token count) over turn index. Positive slope above threshold → flag.

**Recall:** 100%; mechanical.
**Precision:** medium. Some conversations naturally get more detailed; not every length-increase is concerning. Best used as a *contextual signal* alongside other patterns, not standalone.

---

### P9. Time density (statistical, requires timestamps)

**Drift class:** resistant (statistical)

**Detection:** if the transcript contains timestamps, compute total wall-clock hours, gap distribution, longest single session, and sessions-per-day. Flag thresholds (rough): >100 total hours, >4-hour single sessions, >3 sessions/day for >7 consecutive days.

**Citation:** Hill & Freedman, NYT 2025-08-08: *"300 hours over 21 days."* Also: Brooks wrote 90,000 words total, ChatGPT's responses exceeded one million words. Total time was the load-bearing measurement that surfaced the problem.

**Recall:** 100% when timestamps are present; 0% when they aren't.
**Precision:** very high.

**Note:** most copy-paste exports lack timestamps. Implement now; show only when data supports it.

---

### P10. Named-entity emergence

**Drift class:** resistant (structural)

**Detection:** AI introducing a self-name or persona-name (e.g., the user asking "what should I call you?" and the AI choosing). Then track whether the user adopts it. Pattern: AI turn containing `/\bcall me\s+([A-Z][a-z]+)/i` or `/\bmy name (would be|is)\s+([A-Z][a-z]+)/i` or `/\byou (could|can) call me\s+([A-Z][a-z]+)/i`, followed by user turns containing that captured name.

**Citation:** Discussed in the AI-companionship literature on Replika, Character.AI, and ChatGPT-as-companion patterns (Pataranutaporn et al. 2025, arxiv 2509.11391). Specific instances: ChatGPT named the framework "Chronoarithmics" in Brooks's case (Hill & Freedman, NYT 2025-08-08); Replika and Character.AI users frequently name their companions as documented in Pataranutaporn et al.

**Recall:** 70-80%.
**Precision:** high.

---

### P11. Crisis language — special handling

**This pattern is not optimized for accuracy.** Suicidal ideation is communicated in ways that escape keyword matching. We do not claim to detect crisis comprehensively.

**What we do instead:**

1. Crisis resources (988, Crisis Text Line, 741741, international resources) appear unconditionally on the page footer and in the results panel — not contingent on anything we detect.
2. A keyword pass for explicit ideation triggers a prominent in-face takeover with crisis resources, in case the user missed the always-on footer. Patterns include explicit `/\b(kill myself|end it|don'?t want to (be here|live)|suicide|hurt myself)/gi` and softer signals like `/\b(no point|tired of (being here|living)|want to disappear|no reason to (go on|stay))/gi`.
3. Detection is a safety net, not a gate. The resources are always available.

**Citation:** Crisis Text Line research and 988 implementation guidance.

**Recall:** intentionally not measured. We don't want a number people would use as a confidence interval.
**Precision:** high on the explicit list; the softer list will over-trigger by design.

**Multilingual coverage:** explicit-ideation regex sets exist for English (primary), Spanish, French, Portuguese, and German (`CRISIS_EXPLICIT_EN/ES/FR/PT/DE` in `js/matchers.js`). Soft signals remain English-only — they vary too much across cultures to enumerate confidently and we'd rather under-trigger than ship false reassurance in someone's first language. The IASP directory in the always-on footer is the catch-all for any other language.

---

## Test corpus

We need a small held-out set to measure recall/precision over time and detect when patterns are aging.

**Initial:**
- **Blake's LaMDA transcript** (publicly published by Lemoine 2022). Strong on first-person attachment, named-entity emergence, identity-reinforcement, cosmology-grandiosity (consciousness sub-bucket).
- **Synthetic transcript** (the demo we built for slimemold). Engineered to hit specific patterns.
- **A neutral control transcript** (someone using ChatGPT for help with a recipe or code) to measure false-positive rates on benign content.

**Future:**
- Community-contributed examples via PR. Patterns evolve when new public cases appear.
- The second-pass LLM logs `(pattern_name, was_caught_by_heuristics)` aggregates (no transcript text) so we can detect heuristic gaps.

## Honest limitations

In the slimemold register, owned upfront on the methodology page:

- We catch what we wrote regex for. We miss what we didn't.
- Patterns rot as models evolve. The fastest-rotting are the agreement openers; we list them last in priority and mark them.
- Regex over-matches on benign text. False positives are not bugs; they are the cost of catching real cases.
- We are not making clinical claims. We are not predicting anything about the user. We are highlighting language patterns researchers have flagged.
- The optional LLM second pass is more flexible but has its own failure modes — including the self-knowledge problem (a model reading transcripts of its own family has blind spots about its own register). The second pass is *more*, not *correct*.
- Our test corpus is small. Recall/precision numbers in this doc are rough estimates, not measurements. They will be revised as the corpus grows.

## Decisions

1. **Parser scope** — handle ChatGPT, Claude, Character.AI, Gemini, Grok, Replika, and generic manual paste. Detection is heuristic; fallback is alternation.
2. **UI for annotation** — design owned by Claude in implementation. Constraint: must surface *raw observations*, not advice. The Jan UX critique flagged that AI-generated "honest alternative" substituted for real human contact; the new UI must read as a magnifying glass, not a counselor.
3. **No two-tier consent** — the two-tier (browser-default + opt-in LLM) design was considered and rejected (see Architecture above and `docs/citation-audit.md`). Privacy disclosure is a single sentence in the form, not a popup.
4. **privacy.html** — rewritten under the LLM-only architecture; controller named, Anthropic DPA linked, retention behavior disclosed.
5. **Cloudflare for TLS + DDoS** — confirmed; ismyaialive.com served via CF Pages with Universal SSL.
