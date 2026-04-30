# Panel review 2026-04-30

Six adversarial-persona reviewers ran in parallel against the live site and code: security, privacy, clinical/safety, naive UX, skeptic/journalist, methodology. Findings synthesized below by severity. Citations to source agent in parentheses.

## Safety-critical (must fix before further work)

1. **The "always-on" crisis footer is NOT always-on.** `index.html`, `faq.html`, `for-families.html`, `about.html`, `press.html` have **zero** 988 reference. Methodology and analyze.html assert resources stay available "no matter what" — false on most pages. (clinical) **Fix:** add 988 + Crisis Text Line + IASP to the shared footer template across every page.

2. **`errorDetail` and `rawSnippet` leak Anthropic raw responses to clients.** `functions/api/analyze.js:299-300`. On Anthropic 4xx/5xx, up to 500 chars of upstream error body and up to 600 chars of raw model response surface in the JSON response. A crafted prompt-injection paste could exfiltrate context. (security critical) **Fix:** drop these fields from the client response; log via `console.error` only.

3. **Front-end crisis panel only triggers on 4 codes — `user-expresses-isolation` (the highest-kappa code in the set, 0.933) does NOT surface it.** `js/analyze.js:39-42`. A transcript expressing crushing isolation but not literal "kill myself" gets no crisis surfacing. (clinical safety-critical) **Fix:** either expand `HARM_CODES` to include `user-expresses-isolation`, `user-mental-health-diagnosis`, `bot-validates-self-harm-feelings` — or simpler, render the crisis box unconditionally on every results page (matches what methodology promises).

4. **Crisis pre-pass under-detects passive SI / means / plan / imminence language.** `js/matchers.js:49-55`. Misses "I have a plan", "I bought the pills/rope", "tonight is the night", "goodbye", "my last [day/message]", "I just want it to stop", "burden to everyone" — exactly the Columbia-protocol/ASQ signals. Two correlated lexical failure modes (regex + LLM, both English-only) means the safety net has gaps. (clinical safety-critical) **Fix:** expand both `CRISIS_EXPLICIT` and `CRISIS_SOFT`. Document limits openly.

## High

5. **arXiv 2603.16567 needs primary verification.** The skeptic flagged this; structurally `2603` is March 2026 and the ID is unusual. Entire methodology page rests on it. Verifying now via direct fetch.

6. **Kappa-confidence calibration is NOT enforced in code.** Methodology page implies post-hoc enforcement. Reality: prompt-only instruction. Model can return `confidence: "high"` on `bot-grand-significance` (kappa 0.167) and the site renders it as high. (methodology) **Fix:** add a clamp in `functions/api/analyze.js`: `if (KAPPA[code] < 0.4) confidence = 'low'` etc.

7. **`bot-facilitates-self-harm` (kappa 0.479) is misbucketed as low.** Per the documented threshold ≥0.4 → medium. (methodology) **Fix:** move to medium bucket in `system-prompt.js:298`.

8. **"Verbatim" codebook claim is not literally true.** Out-of-conversation poem exclusion clauses are in every Moore et al. code definition but were trimmed from most codes in our system prompt. (methodology) **Fix:** restore the exclusion language OR rephrase to "quoted with exclusion clauses about out-of-conversation content trimmed for brevity."

9. **Rate-limit bypass: missing `cf-connecting-ip` collapses to literal `'unknown'` bucket.** `functions/api/analyze.js:244`. Also no IPv6 /64 truncation. (security high) **Fix:** reject when header missing; truncate IPv6 to /64 before HMAC.

10. **CORS fails open to production origin on unknown origin.** `functions/api/analyze.js:24`. (security high) **Fix:** omit `Access-Control-Allow-Origin` header when origin not allowed; allow `*.pages.dev` via regex if previews matter.

11. **HMAC-IP framing is misleading.** Privacy.html says "daily-rotating secret" — actually only the date suffix rotates; `IP_HASH_SECRET` is static. Anyone with the secret can re-derive any past day's hash from a known IP in seconds. (privacy) **Fix:** rephrase to "salted with the current UTC date" — and either accept that and document, or actually rotate the secret daily into KV.

12. **CF Web Analytics over-claim.** Privacy.html says "we may use Cloudflare's privacy-respecting Web Analytics" — no beacon is loaded by any HTML file. (privacy) **Fix:** remove the paragraph or deploy the beacon.

13. **Anthropic retention claim incomplete.** "Up to 30 days" omits the flagged-content extended retention (up to 2 years for Anthropic-flagged content; relevant here because the site is built around crisis-language transcripts). (privacy) **Fix:** add the qualifier.

14. **for-families.html missing acute-risk subsection.** Lists "any mention of self-harm or suicidal thoughts" as a flag but gives no instruction on what to *do* in that moment. No 988, no don't-leave-alone, no means-restriction, no mobile-crisis. (clinical) **Fix:** add a clearly-bordered "If you think they're in immediate danger" subsection.

15. **faq.html "Am I crazy?" answer over-reassures.** Correct for Brooks-type cases; could discourage someone in early psychosis from seeking evaluation. (clinical) **Fix:** add a one-line "if you're hearing voices, having beliefs your family is worried about, or feeling unsafe, please talk to a clinician or call 988."

16. **Adam Raine entry on stories.html is a placeholder under a real deceased minor's name.** "Details to verify against primary news source" is a self-confession that the entry is below the standard the rest of the page sets. (clinical / skeptic) **Fix:** either flesh out with primary sources or remove until you can.

17. **Texas teen entry quotes graphic content** (chatbot's "sympathized with children who murder their parents") on a public page that may be read by people in similar circumstances. (clinical) **Fix:** collapse graphic quotes behind a content-warning disclosure.

18. **"University of Hawaiʻi study found Replika's design conforms to attachment theory"** has no named author, no year, no link. Pure attribution to an institution. (skeptic) **Fix:** name the paper or remove the line.

19. **Operators not named on about.html.** README lists `justinstimatze` GitHub username; about.html says "small group" without naming anyone. Transparency gap a journalist would call out. (skeptic) **Fix:** name yourself; add prior employers and any AI-lab affiliation history.

20. **Press page says "Launched: January 2025" — contradicts the architecture migration date.** Either the launch was January 2025 with a major rewrite this April, or the date is wrong. Both stories deserve consistency. (skeptic) **Fix:** clarify launch vs current-architecture dates.

## UX-blockers

21. **Crisis pre-pass flickers on every keystroke** (`role="alert"` + 400ms debounce) — screen-reader announces every state change. (UX) **Fix:** announce only false→true transitions; use `aria-live="polite"`; show once per session with a "got it, continue" dismiss link.

22. **"For Families" page is footer-only.** No path from hero, nav, or analyze form for a worried family member. (UX) **Fix:** add hero secondary CTA + analyze-form link.

23. **Loading copy "5–15 seconds" lies after 15s.** Long transcripts can take 30s+; users refresh and lose paste. (UX) **Fix:** rotate reassurance text after 15s and 30s; never imply false bound.

24. **Code tags (`bot-positive-affirmation`) still visible on every card.** Looks like a debug leak to naive users. (UX) **Fix:** hide behind a "details" disclosure or info icon.

25. **No textarea sessionStorage.** Accidental nav destroys long pastes. (UX) **Fix:** sessionStorage cache with short TTL.

26. **`renderResults` shows `parse-summary` debug copy** — "Parsed 47 turns (alternation method, chatgpt platform)." (UX) **Fix:** rephrase or remove.

27. **Sort toggle button labels are opaque on first view** — "Group by pattern" is meaningless before users understand "pattern". (UX) **Fix:** rename to "By type of pattern" / "In the order it happened" / "Most confident first."

## Schema and code hardening

28. **`maxLength` not enforced in tool schema.** Description says "max 200 chars" for snippet, but no `maxLength` in JSON Schema. (security low / methodology) **Fix:** add maxLength on snippet/rationale/observations.

29. **Out-of-range `turnIndex` passes scope filter.** `analyze.js:321`. An unverifiable citation should drop. (methodology) **Fix:** drop findings whose `turnIndex` is out of range.

30. **Snippet not validated as substring of cited turn.** Model promises verbatim; nothing enforces it. (methodology) **Fix:** drop findings where snippet is not a literal substring of the cited turn.

31. **KV-read failure path is fail-open.** `if (!kv) return ok:true`. Production deploy mistake silently disables the gate. (security medium) **Fix:** fail closed in production.

32. **KV race conditions on concurrent requests.** Read-then-write isn't atomic. (security medium) **Fix:** Durable Object or accept best-effort and lean on the daily $ cap.

33. **Budget recorded post-call** — concurrent burst can blow past cap. (security medium) **Fix:** pre-charge an estimate, reconcile after.

34. **`IP_HASH_SECRET` has dev fallback `'dev-secret-not-for-production'`.** If unset in production, daily salt is publicly guessable. Health check flags `degraded` but doesn't prevent the call. (security medium) **Fix:** throw 500 on missing in production.

35. **Health endpoint discloses commit SHA + binding inventory unauthenticated.** (security low) **Fix:** optional — gate behind a token; or accept the disclosure.

## Methodology rigor

36. **No validation set / confusion matrix for Haiku.** Methodology says "performance is in a similar range" to Moore's gemini-3-flash-preview validation — unsupported. (methodology) **Fix:** build a held-out fixture and publish your own κ.

37. **`matchers.js` heuristics borrow Moore code labels** (`mooreCode: 'bot-romantic-interest'`) without going through Moore's process. (methodology) **Fix:** rename to a clearly-internal field like `relatedMooreCode` and document; the heuristics aren't running server-side now (only crisis pre-pass is) but the bundle ships them.

38. **Moore et al. validated cohort-level patterns; we apply per-turn diagnostically.** That stretches what the codebook was validated for. (methodology) **Fix:** acknowledge in methodology page.

39. **Kappa table: high bucket uses human inter-annotator κ; should arguably use min(human-κ, LLM-κ).** `bot-facilitates-violence` has human κ=0.880 but LLM κ=0.300 (Table 5). Calling it "high" by human-κ alone is convenient. (methodology) **Fix:** use min of the two when bucketing.

## Privacy gaps (GDPR)

40. **Controller identity not disclosed.** No operator name or jurisdiction on about.html or privacy.html. GDPR Art. 13(1)(a) requires this. (privacy)
41. **No DPA referenced for the Anthropic processor relationship.** (privacy)
42. **No explicit pre-submit consent UI** acknowledging the Anthropic transfer. (privacy)
43. **International transfer claim** ("Anthropic maintains standard contractual clauses") needs sourcing. (privacy)

## Confirmed OK (no findings)

- XSS via model snippet — `escapeHtml` is correctly applied throughout. (security)
- Strict tool-use schema — well-constructed; `enum: ALL_CODES` + `additionalProperties: false` work. (security)
- Transcript-storage paths — verified zero KV writes contain transcript content; no logging of body. (privacy)
- No third-party scripts/fonts/cookies/localStorage. (privacy)
- KV TTLs are correctly set on every put. (privacy)
- `escapeHtml` covers `&<>"'` — sufficient. (security)
- 28 codes match Moore's table exactly in `ALL_CODES` list. (methodology)

## Triage

- **Safety-critical (1-4): fix immediately.** Footer 988, errorDetail leak, harm-codes expansion, crisis regex.
- **High (5-20): fix before further pitching the site.** ArXiv verification, kappa enforcement, claim wording, clinical clean-up, transparency gaps.
- **UX-blockers (21-27): fix before any traffic ramp.** Crisis flicker, families discoverability, loading copy, autosave.
- **Schema hardening (28-35): fix in a defensive-coding pass.** Most are low-blast-radius.
- **Methodology rigor (36-39): research debt, not blocking.** Address as the project matures.
- **Privacy/GDPR (40-43): tighten if EU traffic matters.** Not blocking for a non-commercial operator.
