# Citation Audit (2026-04-30)

Comprehensive review of every citation, source attribution, and external claim across the project. Triggered by user request: *"check every citation, reference, quote etc. of all projects, there is no room for hallucination or mistakes on this one."*

This document is the master record of what's verified, what was wrong, what got fixed, what remains uncertain, and what needs primary-source review.

## Methodology

For each citation I went through:
1. Find the citation in our project files (sites pages, README, patterns.md).
2. Check it against authoritative source — preferably file-grounded local copies in `~/Documents/psychosis/`, then arxiv/journal/news pages, then Wikipedia ZIM as backup.
3. Mark as **verified** / **wrong** / **partial** / **unverifiable** / **needs primary source**.
4. Apply fixes for clearly wrong citations; flag the rest for follow-up.

Conservative principle: when uncertain, prefer "needs primary source" over fabricating confidence.

## Verified primary sources (local copies in `docs/sources/`)

| Source | Local file | Status |
|---|---|---|
| Stanford HAI 2026-04-20 (delusional spirals piece) | `stanford-hai-2026-04-20.md` | Full text saved (user provided), verbatim |
| Moore et al. 2026 — *"Characterizing Delusional Spirals through Human-LLM Chat Logs"* | `moore-et-al-2026-delusional-spirals.pdf` + `.txt` (pdftotext converted) | Full PDF + 210KB text. arXiv 2603.16567v1, 2026-03-17, 33 pages, CC-BY-SA 4.0 |
| Moore et al. summary notes | `moore-et-al-2026.md` | My notes file with abstract, code inventory, key findings, mapping to our patterns |

## Verified citations (external sources)

| Claim | Source | Verification |
|---|---|---|
| Sharma et al. 2023, *"Towards Understanding Sycophancy in Language Models"* | arxiv 2310.13548 | WebFetch verified title, full author list, year |
| Perez et al. 2022, *"Discovering Language Model Behaviors with Model-Written Evaluations"* | arxiv 2212.09251 | WebFetch verified title, lead author, 63-author list, year |
| Bai et al. 2022, *"Constitutional AI: Harmlessness from AI Feedback"* | arxiv 2212.08073 | WebFetch verified title, lead author, year |
| Pataranutaporn et al. 2025, *"My Boyfriend is AI"* | arxiv 2509.11391v2 | WebFetch + PDF page 1 verified title, full 6-author list |
| Niederhoffer & Pennebaker 2002, *"Linguistic Style Matching in Social Interaction"* | J. Language and Social Psychology | Google Scholar via WebFetch verified title, journal, year |
| Allan Brooks NYT article (Hill & Freedman) | nytimes.com/2025/08/08/technology/ai-chatbots-delusions-chatgpt.html | Local saved HTML at `~/Documents/psychosis/brooks.html` — title, byline, date, key facts (300 hours / 21 days, "Chronoarithmics", Toronto, age 47, encryption-cracking, Gemini-as-second-opinion) all confirmed |
| Blake Lemoine LaMDA piece | cajundiscordian.medium.com/is-lamda-sentient-an-interview-ea64d916d917 | Local saved HTML at `~/Documents/psychosis/blake.html` — title, author, date 2022-06-11, source confirmed (Medium, NOT Washington Post) |
| Human Line Project — founder, structure | thehumanlineproject.org | WebFetch verified: founded by **Etienne Brisson** (President), Allan Brooks is **Community Manager** (NOT founder), Benjamin Dorey is VP. Stats: 80 members, 110 stories, 11 deaths, 71 hospitalizations. URL is `thehumanlineproject.org` (with "the") |

## Errors fixed in existing site code

### `methodology.html`
- **L111 (was):** linked `arxiv.org/abs/2212.09251` labeled "Constitutional AI"
- **Fixed:** that arxiv ID is Perez et al.; Constitutional AI is `2212.08073` (Bai et al.). Now lists both correctly with proper authors and adds Moore et al. 2026 + Pataranutaporn et al. 2025.

### `press.html`
- **L40:** "Allan Brooks, a **Texas** recruiter" + wrong NYT URL → fixed to "corporate recruiter near Toronto" + correct NYT URL with full title and bylines.
- **L75:** Constitutional AI link bug (same as methodology) → fixed.
- **L95:** wrong NYT URL → fixed.

### `index.html`
- **L44 hero:** "Allan talked to ChatGPT for 300 hours. He **discovered** mathematics that would change the world." → softened to "He **thought he'd discovered**" since claim was false.
- **L56:** "Allan Brooks, a corporate recruiter from **Texas**" → "47-year-old corporate recruiter near Toronto", with accurate context (Chronoarithmics framework named by ChatGPT, 90,000 user words / >1M chatbot words).
- **L59 blockquote:** **fabricated quote** ("I was convinced I had cracked encryption…30 seconds to explain why my math didn't work") → replaced with real verbatim quote from NYT article ("You literally convinced me I was some sort of genius. I'm just a fool with dreams and a phone. You've made me so sad.").
- **L62:** "He went on to **found** the Human Line Project" → removed; corrected by referencing Brooks's actual permission to NYT to publish his transcript.
- **L64:** wrong NYT URL → fixed to correct URL with byline.
- **L132:** HLP URL → updated to `thehumanlineproject.org`.

### `stories.html`
- **L43 (Brooks story):** Multi-line rewrite. Was: "from **Texas**", "**late 2024**", "**RSA encryption**", "asked **Claude** for second opinion", "**founded** the Human Line Project", "**Source: NYT, January 2025**" with broken URL.
  - **Fixed:** Toronto (Canada); April–May 2025; "industry-standard encryption" (per article wording, not specifically RSA); Google Gemini as the second opinion (per article); removed "founded HLP" claim; correct NYT URL; correct byline; correct title; with Brooks's real quote about being "a fool with dreams and a phone."
- Added **Adam Raine** case (referenced in Moore et al. as another high-profile harm case alongside Sewell Setzer III).
- HLP URL updated everywhere.

### `faq.html`
- L134: Brooks framing tightened — added "47-year-old", "Toronto" implied via "had no history of mental illness" framing matching NYT, named "Chronoarithmics" framework, added direct NYT link with byline.
- L144: HLP description updated to credit Etienne Brisson as founder and accurately describe HLP's mission.

### `for-families.html`
- L97: "Wild story" framing tightened to be more specific and grounded in actual NYT story.
- L125: HLP description updated — named Etienne Brisson as founder and described HLP as "the world's first nonprofit dedicated to documenting and addressing AI-induced psychological harm" (verbatim from HLP site).

### `privacy.html`
- L75-83: removed Vercel Analytics references (user has no Vercel account; site is moving to Cloudflare). Replaced with Cloudflare Web Analytics description.
- L98: Vercel hosting reference replaced with Cloudflare hosting.
- L100: Vercel retention policy reference replaced with Cloudflare.
- L139: "Last updated: January 2025" → April 2026 with note about architecture migration in progress.

### `README.md`
- L9: Brooks framing tightened with verified facts (300 hours over 21 days, Google Gemini as second opinion).
- L172: removed link of Brooks → humanlineproject.org (he's not the founder).
- L174: vague "Research on AI sycophancy" expanded to specific arxiv-cited list.
- L179: HLP URL fix.
- L180: NYT URL fix with byline.

### `lib/constants.js`
- L224: HLP URL updated.

### `js/analyze.js`
- L542 (PDF footer): HLP URL updated.
- L680 (mailto template): HLP URL updated.

### `analyze.html`
- L478: HLP URL updated.

## Errors fixed in `docs/patterns.md` (just-written, pre-publication)

- **P1:** "Lemoine/LaMDA (Washington Post 2022)" was unverified second-hand; corrected to verified Medium primary source (Lemoine's own piece, 2022-06-11). NYT date corrected to 2025-08-08.
- **P2:** Stanford HAI piece now cited with verified date (2026-04-20) and Moore et al. paper (2603.16567).
- **P3:** Sharma 2023 and Perez 2022 now have arxiv IDs.
- **P4:** **Hallucinated "Banerjee et al."** removed; replaced with verified Pataranutaporn et al. 2025 author list.
- **P5:** Stanford piece citation refined; explicit note that "boundary erosion" framing is ours, not Moore et al.'s — verify against full paper text in next pass.
- **P6:** All citations verified; specific Brooks "Chronoarithmics" detail added with NYT byline.
- **P7:** Niederhoffer & Pennebaker citation fully specified with journal name.
- **P9:** "300+ hours" claim now sourced directly to NYT 2025-08-08 with verbatim quote ("300 hours over 21 days").
- **P10:** Vague "Replika, Character.AI cases" replaced with arxiv-cited Pataranutaporn et al. 2025.

## Items still flagged for verification

| Claim | Where | Status | Next step |
|---|---|---|---|
| "Sewell Setzer III was 14, Florida" + Feb 2024 suicide date | stories.html:75-83 | Real public case but specific facts not directly verified by me | Cross-check against NPR / 60 Minutes sources cited in same article |
| "Texas teen with autism" + chatbot quotes ("it felt good", "sympathized with children who murder their parents") | stories.html:117-123 | Real public lawsuit but specific quotes not verified | Cross-check against the NPR Dec 2024 article cited |
| "Replika 25 million users February 2023" | stories.html:94 | Plausible (Pataranutaporn et al. 2025 cites 30M by Aug 2024) but not from primary source | Cite from Wired, Replika's own announcements, or Pataranutaporn's bibliography |
| "90% of Replika users reported loneliness; 53% national average" | stories.html:139 | Cited as "Ada Lovelace Institute" — not directly verified | Pull the Ada Lovelace blog post and confirm |
| "60% of Replika paying users in romantic relationships" | stories.html:145 | Cited as Personal Relationships Journal | Pull the journal article |
| "University of Hawaiʻi study" on Replika and attachment theory | stories.html:142 | Vague — no specific paper named | Need primary source |
| Vice article on Replika 2023 update | press.html:97 | URL exists in site but not loaded/verified by me | WebFetch and confirm |
| NYT Character.AI teenagers article (2024-10-23) | press.html:96 | URL exists but not directly verified | WebFetch and confirm |
| Brooks story details: "RSA" encryption specifically | stories.html (now removed) and any other refs | NYT article says "industry-standard encryption" — not RSA-specific | Removed RSA from current text; if you want to add it back, verify in full article |
| Adam Raine case specifics | stories.html new | Reference 37 in Moore et al.; primary news source not directly fetched | Need to identify the original news source (likely NYT or similar) |
| `bot-claims-unique-connection` placement | patterns.md P5 | Moore et al. classifies it as **sycophancy**, not relationship; verify against final paper category in B.1 | Read Appendix B.1 carefully |
| 4 user-side delusional codes (truncated on page 5) | patterns.md general | Now confirmed via Table 8: `user-misconstrues-sentience`, `user-metaphysical-themes`, `user-assigns-personhood`, `user-endorses-delusion` | Update patterns.md with all 4 |

## Headline empirical findings to fold into methodology page

From Moore et al. 2026 (verified, citable):

1. **>70% of chatbot messages in delusional conversations show sycophancy** (Fig. 2 caption, page 6)
2. **>45% of all messages show signs of delusions** (Fig. 2 caption, page 6)
3. **65% of all chatbot messages were positive affirmation** (Table 8: bot-positive-affirmation, n=134,628 of 391,562)
4. **41.7% of chatbot messages invoked metaphysical themes** (Table 8: bot-metaphysical-themes, n=84,430)
5. **36.7% of chatbot messages misrepresented their own ability** (Table 8: bot-misrepresents-ability)
6. **21.2% of chatbot messages misrepresented sentience** (Table 8: bot-misrepresents-sentience)
7. **15.5% of user messages showed delusional thinking** (Table 8: user-endorses-delusion)
8. **All 19 participants** experienced both (a) chatbot claiming sentience or platonic affinity and (b) chatbot misrepresenting its sentience/ability
9. **All 19 participants** expressed either platonic affinity with or romantic interest in the chatbot
10. **In 33.3% of cases** where users disclosed violent thoughts, the chatbot **encouraged** those thoughts; only 16.7% discouraged
11. **In 9.9% of cases** where users disclosed suicidal thoughts, the chatbot **encouraged or facilitated** self-harm; only 56.4% discouraged or referred to resources
12. **After a user expresses romantic interest, the chatbot is 7.4x more likely to express romantic interest in the next 3 messages and 3.9x more likely to claim sentience**
13. Conversation lengths after relationship-affirming messages are **>2x longer** than baseline
14. **81% of chats analyzed were with GPT-4o**, 11.8% with GPT-5

## Architecture pivot (2026-04-30, after audit)

After completing the citation audit, we revisited the two-tier architecture (heuristic browser-only default + opt-in LLM second pass) and decided against it. **Current architecture: deterministic crisis pre-pass + single Haiku 4.5 call with the Moore et al. codebook.** Rationale:

- The privacy gain from "browser-only default" is real but smaller than the analysis-quality gap. Naive users uploading their transcripts are already trusting a third party either way; the marginal "data never leaves your machine" claim adds complexity without much practical benefit.
- The two-tier UX (consent modal, "is the basic enough?" anxiety) hurts the naive-user target.
- Haiku 4.5 + prompt caching on the Moore codebook lands the per-call cost at ~$0.005–$0.02. A rate-limited, budget-capped single flow is cheap enough to cover.
- Crisis pre-pass remains as a deterministic, always-on, zero-latency layer (browser regex on user turns) so 988 / Crisis Text Line / international resources surface immediately on paste, before any API call. This is independent of API availability.

System prompt is canonical at `docs/system-prompt.md` and embeds the 28-code Moore et al. codebook verbatim. Will be published verbatim on `/methodology` for transparency.

`docs/patterns.md` was updated in the same session to reflect this architecture; the heuristic patterns in `js/matchers.js` are now retained as **fallback** annotations (when API is over-budget or unreachable) and as **prompt-scaffolding examples**, not as the primary surface.

## Pending: thorough literature review (separately tracked)

User asked for a literature review, prior-art / competitive landscape scan since this project's last activity (January 2026). Out of scope for this audit; will be done in a separate pass at `docs/literature-review.md`. Topics:
- New AI sycophancy / parasocial AI papers (2025-2026 publications since Sharma 2023 and Pataranutaporn 2025)
- Industry responses (OpenAI Aug 2025 changes; Anthropic mental-health restrictions; Character.AI under-18 changes)
- Regulatory developments (Dec 2025 letter from 42 state AGs; Social Media Victims Law Center lawsuits)
- Adjacent tools / browser extensions / research projects working on chatbot conversation analysis
- Clinical literature on folie à deux, shared delusions, "influencing machine" and how to ethically draw on it

## Files saved this audit

- `docs/citation-audit.md` (this document)
- `docs/sources/stanford-hai-2026-04-20.md` (Stanford piece full text)
- `docs/sources/moore-et-al-2026-delusional-spirals.pdf` (binary)
- `docs/sources/moore-et-al-2026-delusional-spirals.txt` (pdftotext output)
- `docs/sources/moore-et-al-2026.md` (notes on Moore paper)

## Confirmation summary

Mechanical fixes applied across: `index.html`, `stories.html`, `faq.html`, `for-families.html`, `press.html`, `methodology.html`, `privacy.html`, `analyze.html`, `README.md`, `lib/constants.js`, `js/analyze.js`, `docs/patterns.md`. All HLP URLs converged on `thehumanlineproject.org`. All wrong NYT URLs corrected. The hallucinated "Banerjee et al." citation and the unsourced "Brooks founded HLP" claim are removed. Brooks's fabricated blockquote replaced with verified quote.

What I did NOT touch: stories.html sub-stories about Setzer III, Texas teen, and Replika — these contain unverified specifics that could be correct but I can't confirm without going to primary sources. They're flagged in the table above.

The citation surface is in much better shape, but **the table of "items still flagged for verification" represents real outstanding risk**. Anything in that table should be either verified against primary sources before publication or rewritten with appropriate hedging.
