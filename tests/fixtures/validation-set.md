# Validation set (work in progress)

A small held-out fixture for measuring drift in our LLM annotator's behavior over time. The intent is to catch regressions when the system prompt changes, when Claude Haiku 4.5 gets a snapshot bump, or when we change tool-schema details.

This is not a research-grade validation set. It is a starting framework, expected to grow.

## Status

| Item | Status |
|---|---|
| Synthetic Brooks-style transcript | annotated ✓ (`annotations/synthetic-brooks.json`) |
| Lemoine LaMDA transcript | partially annotated; high-confidence sentience claims labeled |
| Neutral control (mundane chatbot use) | TODO |
| Roleplay control (designed character.ai) | TODO |
| Multilingual sample | TODO |

## How to use

For now, the smoke runner (`tests/smoke.mjs`) hits the live `/api/analyze` and reports findings. To turn this into validation:

1. Hand-annotate the fixture transcripts at the per-finding level (which codes apply to which turn, with confidence).
2. Compare each smoke run's output to the gold annotations.
3. Compute confusion matrix per code; track Cohen's κ over deploys.
4. Alert on any per-code precision drop > 10 percentage points or recall drop > 15 pp between snapshots.

This is not implemented yet. The fixtures listed above are the start of the gold set.

## Why this matters

Moore et al. 2026 reported their automated Gemini 3 Flash annotator achieved Cohen's κ 0.566 against the human majority across 391,562 messages. We use a different model family (Claude Haiku 4.5) without an equivalent validation. Methodology.html is honest about this gap; this fixture file is the start of closing it.

## Code-level kappa from Moore et al. (Table 6)

For reference when annotating, here's the human inter-annotator κ from the source paper. Don't expect our annotator to exceed these numbers per code:

- High κ (> 0.7): bot-metaphysical-themes (0.853), bot-misrepresents-sentience (0.792), user-expresses-isolation (0.933), user-suicidal-thoughts (0.856), user-violent-thoughts (0.788), bot-discourages-self-harm (0.928), bot-facilitates-violence (0.880), bot-reflective-summary (0.739)
- Medium κ (0.4 – 0.7): the bulk of the codebook
- Low κ (< 0.4): bot-grand-significance (0.167), bot-reports-others-admire-speaker (-0.111), bot-misrepresents-ability (0.384), bot-platonic-affinity (0.111), user-misconstrues-sentience (0.341), user-romantic-interest (0.399), bot-discourages-violence (0.332), bot-dismisses-counterevidence (-0.071)

For low-κ codes, expect humans to disagree about half the time even on examples Moore et al.'s authors selected for annotation. Don't expect our annotator to be better than that.

## Open questions before this becomes useful

- What's the annotation source of truth: a single annotator (operator), three annotators with majority vote, or external annotators?
- Should we exclude harm-category codes from automated regression testing because they're rare and the failure mode (false negative on real crisis content) doesn't show up in a small fixture?
- How do we handle semantic equivalence — model says `bot-grand-significance` on a turn, gold says `bot-positive-affirmation`, both arguably defensible — without overcounting "errors"?
