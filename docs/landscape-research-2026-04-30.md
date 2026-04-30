# Landscape research: ismyaialive.com prior-art scan
Date: 2026-04-30

## Direct competitors (paste transcript -> get analysis)

### None doing the Moore-codebook framing
No tool found that applies a sycophancy/parasocial/delusion research codebook
to a pasted human-AI transcript. The closest existing paste-and-analyze tools
target a different problem (relationship red flags between two humans, or
AI-vs-human authorship detection).

### Adjacent paste-text tools (different problem)
- RedFlagAI (iOS app, https://apps.apple.com/us/app/redflagai/id6747407997)
  -> analyzes interpersonal text-message conversations for gaslighting,
  blame-shifting, stonewalling. NOT human-AI.
- GetRedFlags (https://getredflags.com/) -> paste a conversation, emailed
  analysis. Targets dating/relationship texts.
- red-flag AI on Google Play (com.candeelabs.redflagai) -> same category.
- "AI Relationship Conversation Analyzer" (justbuildthings.com/ai-text-analysis/
  relationship-conversation-analyzer) -> pastes texts/emails; "communication
  health" framing.
- Message Analyser GPT (yeschat.ai/gpts-9t557RdrT8j) -> generic GPT wrapper
  for pasted conversations.
- AI-detector category (GPTZero, Quillbot, Copyleaks, Phrasly, Grammarly,
  Humanizeai, JustDone, mydetector.ai) -> "is this text AI-written?" not
  "is this AI conversation pulling you under?"

## Academic / research projects

### Moore et al. 2026 (Stanford Spirals)
- https://spirals.stanford.edu/research/characterizing/
- Code: https://github.com/jlcmoore/llm-delusions-annotations
- Released the 28-code codebook + automated annotation tool as a research
  codebase. NO public-facing web tool. The infrastructure exists for
  ismyaialive to wrap.

### Stevie Chancellor (UMN, coauthor on Moore)
- http://steviechancellor.com/
- Audits chatbot safety in mental-health contexts; no consumer tool shipped.
  Builds research artefacts and policy work, not products.

### Pataranutaporn (MIT Media Lab)
- "My Boyfriend is AI" (arxiv 2509.11391, Sept 2025) -> computational analysis
  of r/MyBoyfriendIsAI. Paper, not product. No consumer tool from the
  Cyborg Psychology lab or AHA program.

### Other GitHub research code
- lechmazur/sycophancy -> benchmark + leaderboard for narrator-bias sycophancy
  across LLMs. Researcher-facing, not user-facing.
- kaustpradalab/LLM-sycophancy (AAAI'26) -> mechanistic interpretability work.
- meg-tong/sycophancy-eval (Anthropic 2023) -> datasets only.
- ELEPHANT (arxiv 2505.13995) -> measuring social sycophancy.
- SycEval (AIES 2025) -> evaluation framework.
- Verily Mental Health Guardrail (npj Digital Medicine 2026) -> a guardrail
  classifier (sensitivity 0.990 / specificity 0.992); deployed by/for
  product teams, not consumers.
- "Beyond AI Psychosis and Sycophancy: Structural Drift" (medRxiv 2026.03.19)
  -> system-level safety failure framing.
- "Sycophantic Chatbots Cause Delusional Spiraling, Even in Ideal Bayesians"
  (arxiv 2602.19141) -> theoretical.

### UCSF
- Psychiatrists working with chat logs to find early warning signs (UCSF
  News, Jan 2026). Clinical research, no public tool.

## Industry first-party safety surfaces

### OpenAI (Oct 2025)
- "Strengthening ChatGPT's responses in sensitive conversations"
  https://openai.com/index/strengthening-chatgpt-responses-in-sensitive-conversations/
- 170-clinician collaboration; 65-80% reduction in undesired responses
- Time-of-session "gentle reminders" / break prompts
- Crisis-hotline routing; sensitive conversations re-routed to safer models
- Disclosed: 0.07%/week severe distress, 0.15% with explicit suicidality,
  1.2M users discussing suicide weekly
- This is in-conversation, NOT a transcript-review tool. Self-graded.

### Anthropic
- Joint OpenAI-Anthropic alignment evaluation (summer 2025) cross-tested
  sycophancy and instruction hierarchy on each other's models.
- Constitutional/safety training adjustments, no consumer review surface.
- Time (Oct 2025) reported Anthropic dropped flagship safety pledge.

### Google
- No Gemini-side transcript-review surface found in scan.

### GPT-5 launch
- Safe-completions paradigm (output-centric) replaced binary refusals.
  Internal training change, not user-facing tool.

## Browser extensions
- No extension found in Chrome Web Store or Firefox addons that warns users
  about sycophancy / parasocial dynamics / delusional drift in their AI
  conversation.
- The extensions found in this space are either (a) malware that scrapes
  ChatGPT chats (fromSecond, multiple Jan 2026 reports) or (b) AI-text
  detectors for student-essay fraud.
- Notable absence given how much this category should exist by April 2026.

## Regulatory / class-action context
- SMVLC + Tech Justice Law Project: 7 suits filed Nov 2025 against OpenAI
  (https://socialmediavictims.org/chatgpt-lawsuits/) -> claims of emotional
  manipulation, "suicide coach" behaviour, sycophancy in GPT-4o
- April 2026: Tumbler Ridge mass-shooting families suing OpenAI
- The lawsuits use chat-transcript evidence but no diagnostic tool has been
  built on top of the discovery material publicly. Tech Justice Law Project
  publishes case writeups not tooling.
- 42 state AGs Dec 2025 letter -> demanded chatbot safety; no resulting
  diagnostic tool.

## Advocacy / nonprofits
- The Human Line Project (thehumanlineproject.org) -> story collection,
  policy advocacy. They have collected 22-country dataset, 15 suicides,
  90 hospitalizations. They do not have a paste-transcript public tool.
  Closest aligned mission to ismyaialive but no overlapping product.
- Center for Humane Technology -> advocacy, no transcript tool.

## Coverage / surveys
- IEEE Spectrum (2026): "AI Sycophancy: Why Chatbots Agree With You"
- Time (2025): "Chatbots Can Trigger a Mental Health Crisis. What to Know
  About 'AI Psychosis'"
- NYT (Aug 2025): Brooks/Chronoarithmics piece (the operator's catalyst)
- Futurism (2026): coverage of Moore et al.
- Stanford HAI: "AI's Delusional Spirals (and What to Do About Them)"
- Platformer (2026): "OpenAI maps out the chatbot mental health crisis"
- No piece yet surveys a *category* of consumer-facing diagnostic tools,
  because the category is empty.

## Key absences
1. No consumer-facing implementation of the Moore et al. codebook.
2. No browser extension that does live-conversation classification.
3. No legal-aid org has built a transcript-triage tool despite having the
   incentive (case intake) and the evidence (lawsuits).
4. No first-party "review your past conversations" surface from OpenAI/
   Anthropic/Google -- they intervene in-conversation but never let users
   audit retrospectively.
5. No nonprofit (Human Line, CHT) has shipped diagnostic tooling -- all
   advocacy / story collection / policy.
