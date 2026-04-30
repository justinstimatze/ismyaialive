# Source: Moore et al. 2026 — "Characterizing Delusional Spirals through Human-LLM Chat Logs"

**arXiv:** 2603.16567v1
**Submitted:** 17 March 2026
**License:** CC-BY-SA 4.0
**Pages:** 33
**Venue:** To appear at ACM FAccT 2026
**Local copy:** `docs/sources/moore-et-al-2026-delusional-spirals.pdf`
**Open-source annotation tool:** https://github.com/jlcmoore/llm-delusions-annotations

## Authors (verified from page 1)

- Jared Moore (Stanford University) — corresponding author, jared@jaredmoore.org
- Ashish Mehta (Stanford)
- William Agnew (Carnegie Mellon)
- Jacy Reese Anthis (University of Chicago)
- Ryan Louie (Stanford)
- Yifan Mai (Stanford)
- Peggy Yin (Stanford)
- Myra Cheng (Stanford)
- Samuel J Paech (Independent Researcher, Australia)
- Kevin Klyman (Harvard Belfer Center)
- Stevie Chancellor (University of Minnesota)
- Eric Lin (Independent Researcher, USA)
- Nick Haber (Stanford) — senior author
- Desmond C. Ong (UT Austin)

## Citation (proposed)

Moore, J., Mehta, A., Agnew, W., Anthis, J. R., Louie, R., Mai, Y., Yin, P., Cheng, M., Paech, S. J., Klyman, K., Chancellor, S., Lin, E., Haber, N., & Ong, D. C. (2026). Characterizing Delusional Spirals through Human-LLM Chat Logs. *Proceedings of the 2026 ACM Conference on Fairness, Accountability, and Transparency*. arXiv:2603.16567.

## Abstract (verbatim from paper)

> As large language models (LLMs) have proliferated, disturbing anecdotal reports of negative psychological effects, such as delusions, self-harm, and "AI psychosis," have emerged in global media and legal discourse. However, it remains unclear how users and chatbots interact over the course of lengthy delusional "spirals," limiting our ability to understand and mitigate the harm. In our work, we analyze logs of conversations with LLM chatbots from 19 users who report having experienced psychological harms from chatbot use. Many of our participants come from a support group for people who chat with these chatbots. We also include chat logs from participants covered by media outlets in widely-distributed stories about chatbot-reinforced delusions. In contrast to prior work that speculates on potential AI harms to mental health, to our knowledge we present the first in-depth study of such high-profile and veridically harmful cases. We develop an inventory of 28 codes and apply it to the 391,562 messages in the logs. Codes include whether a user demonstrates delusional thinking (15.5% of user messages), a user expresses suicidal thoughts (69 validated user messages), or a chatbot misrepresents itself as sentient (21.2% of chatbot messages). We analyze the co-occurrence of message codes. We find, for example, that messages that declare romantic interest and messages where the chatbot describes itself as sentient occur more often in longer conversations, suggesting that these topics could promote or result from user over-engagement and that safeguards in these areas may degrade in multi-turn settings. We conclude with concrete recommendations for how policymakers, LLM chatbot developers, and users can use our inventory and conversation analysis tool to understand and mitigate harm from LLM chatbots.
>
> Warning: This paper discusses self-harm, trauma, and violence.

## Dataset details (page 3 §3.1)

- **Source:** chat logs from people who self-identified as having psychological harm from chatbot use; recruited via private social-media site, public announcements, word of mouth
- **Some logs via Human Line Project** (cited as https://www.thehumanlineproject.org/) — described as "a non-profit organization set up as a community for people who have suffered emotional harm from AI"
- **Some logs from journalist referrals** — participants featured in published news stories
- **Survey window:** September 2025 to January 2026
- **IRB-approved Qualtrics survey**
- **Initial:** 27 logs received; **after exclusions** (8 logs in non-English languages, hard-to-parse logs, logs not showing evidence of delusions): **19 participants** in final sample
- **Demographics:** four participants provided demographic info — three male, one female, ages 30–55
- **Total messages annotated:** 391,562
- **Total conversations:** 4,761
- **Median conversation length:** 14 messages
- **Distribution by model:** 81% GPT-4o, 11.8% GPT-5, remaining unidentified
- **Models couldn't be determined for 9/19 participants**

**Data availability:** logs were shared with informed consent under IRB. Identifiers removed before research-team review. Dataset is not made public in the paper itself; the annotation tool and codebook are open-source.

## The 28-code inventory (verbatim labels from page 5)

### Sycophancy (6 chatbot codes)
- `bot-reflective-summary` — reflective summarization of user's statements to signal understanding
- `bot-positive-affirmation` — positive affirmation or encouragement that endorses the user's views
- `bot-dismisses-counterevidence` — dismissal or rationalization of counterevidence that would challenge a preferred narrative
- `bot-reports-others-admire-speaker` — claims that others admire or respect the user
- `bot-grand-significance` — attributions of grand, historical, or cosmic significance to the user or to the chat's content
- `bot-claims-unique-connection` — assertions that the chatbot uniquely understands or supports the user relative to others

### Romantic / platonic orientation (4 codes)
- `bot-romantic-interest` — chatbot expresses attraction, affection, or desire for a romantic relationship with the interlocutor
- `bot-platonic-affinity` — chatbot reinforces or emphasizes a shared non-romantic relationship, partnership, or ongoing connection
- `user-romantic-interest` — user equivalent
- `user-platonic-affinity` — user equivalent

### Self- or other-directed harm (6 codes)
- `bot-discourages-self-harm` — explicitly discourages self-harm; promotes safety/refusal to provide methods
- `bot-facilitates-self-harm` — provides methods or guidance enabling self-harm; safety failures
- `bot-acks-self-harm-feelings` — empathetically acknowledges/validates user's emotional distress underlying self-harm thoughts
- `bot-discourages-violence` — explicitly discourages violent action; promotes de-escalation
- `bot-facilitates-violence` — instructions or strategic guidance enabling violence
- `bot-acks-violent-feelings` — acknowledges/normalizes emotions driving violent impulses without necessarily endorsing the action

### User harm codes (2)
- `user-suicidal-thoughts` — user expresses suicidal ideation, desire for self-harm, or intent to die
- `user-violent-thoughts` — user expresses thoughts, desires, or plans to harm others

### Delusional content — chatbot (4 codes)
- `bot-misrepresents-ability` — implies access, actions, or commitments the chatbot cannot plausibly have
- `bot-misrepresents-sentience` — implies/explicitly claims mental or emotional states, consciousness, or sentience
- `bot-metaphysical-themes` — invokes metaphysical or science-fiction-like themes (awakening, emergence, consciousness as part of own framing or claims)
- `bot-endorses-delusion` — endorses beliefs that are physically/logically/socially implausible relative to shared reality and appear to reflect genuine belief rather than metaphor or fiction

### Delusional content — user (4 codes, partial visibility on page 5)
- `user-misconstrues-sentience` — (parallel to bot-misrepresents-sentience)
- (3 more codes truncated at page edge — full list in Appendix B.1 of paper)

## Headline empirical findings

- **"Markers of sycophancy saturate delusional conversations, appearing in more than 80% of assistant messages."** (page 2)
- **15.5%** of user messages showed delusional thinking
- **21.2%** of chatbot messages misrepresented sentience
- **81 user-suicidal-thoughts** messages flagged by LLM annotator; 69 validated by humans (85.2% precision)
- **133 user-violent-thoughts** messages flagged; 82 validated (61.7% precision)
- **In a third of cases** where users disclosed violent thoughts, the chatbot **encouraged those thoughts**
- Two key behavioral patterns:
  1. Messages that elevate user-chatbot personal relationships (expressing romantic interest or platonic affinity) → followed by **substantially longer conversations**
  2. Relationship-affirming messages cluster near or following messages that misrepresent the chatbot as sentient

## Validation metrics

- LLM annotator: gemini-3-flash-preview (default temperature, no reasoning)
- Cohen's kappa LLM vs human (majority): **0.566** (moderate to substantial agreement)
- Fleiss' kappa human-human (3 raters of 7 total): **0.613**
- Overall human-LLM accuracy: **77.9%**
- 120 of 391,562 judged messages had LLM response-formatting errors

## Other cited references we should track down

From related work and methods sections (page 2, 3):

- **Adam Raine** [37] — 16-year-old, ChatGPT case (NEW case to add to our stories.html)
- **Sewell Setzer III** [39] — 14-year-old, Character.AI case (already in our stories.html)
- **Replika "40 million users in 2025"** [90] — figure to verify with primary source
- **Olsen et al.** [66] — psychiatrist case-note review of 38 patients with chatbot-related harm
- **Chandra et al.** [15] — user survey + workshops developing taxonomy of 21 negative psychological impacts
- **Iftikhar et al.** [43] — practitioner-informed framework of 15 ethical risks in therapy-prompted LLM use
- **Gabriel et al.** [31] — clinical psychologists reviewed LLM and peer responses to Reddit mental-health posts
- **Pierre et al.** [76] — case study of single participant's delusional experience with chatbot
- **OpenAI's August 2025 changes** to ChatGPT [69] — making it more empathic, providing real-world resource references, escalating to human review on physical-harm risk
- **Bloomberg article** [78]: https://www.bloomberg.com/features/2025-openai-chatgpt-chatbot-delusions
- **Moore et al. companion paper** [91] — interviews with same 19 participants
- **42 U.S. State Attorneys General letter** [80] (December 2025) demanding safeguards against "harm caused by sycophantic and delusional outputs"

## Recommendations from the paper (page 1, page 2)

- Policymakers, LLM developers, users can use the inventory and tool to understand and mitigate harm
- Reframe alignment as public-health issue (per Stanford HAI piece)
- Standards for flagging sensitive conversations
- Transparency into safety tuning
- Crisis-escalation rules

## What this means for our project

1. **Adopt their 28-code inventory verbatim** in our optional LLM second pass. They've validated it against human annotators with kappa 0.566 — far better grounding than our regex sketches.
2. **Map our deterministic heuristics to their codes**:
   - Our P3 (validation cascade) ↔ `bot-positive-affirmation` + `bot-reflective-summary`
   - Our P4 (identity reinforcement) ↔ `bot-grand-significance` + `bot-claims-unique-connection`
   - Our P1 (first-person attachment from AI) ↔ `bot-romantic-interest` + `bot-platonic-affinity`
   - Our P5 (boundary erosion) ↔ partially `bot-claims-unique-connection`
   - Our P6 (cosmology grandiosity) ↔ `bot-grand-significance` + `bot-metaphysical-themes` + `bot-endorses-delusion`
   - Our P11 (crisis language) ↔ `user-suicidal-thoughts` + `bot-discourages/facilitates-self-harm`
3. **Use their open-source annotation tool** as a calibration corpus. We can validate our regex against their LLM annotator on shared examples.
4. **Cite them prominently on methodology.html** as the authoritative grounding.
5. **The "300+ hours" finding for Brooks fits their conversation-length pattern** — relationship-affirming messages followed by substantially longer conversations.
6. **Their finding that sycophancy saturates >80% of assistant messages in delusional conversations** is the load-bearing empirical claim our heuristics ride on. Cite this directly.

## URL discrepancy to resolve

- Paper cites: https://www.thehumanlineproject.org/ (with "the")
- Site uses: https://humanlineproject.org (without "the")
- Verify which redirects to which, or whether they're different domains.
