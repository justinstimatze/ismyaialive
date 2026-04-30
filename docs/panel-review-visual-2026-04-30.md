# Visual / UI / UX review — live site, 2026-04-30

Browser walkthrough using Claude in Chrome at 1280×820 desktop and ~390 mobile (resize was glitchy — viewport reported 908 even after a 390-resize, so mobile measurements are partially unreliable). Findings ordered by severity.

## Verified live (good)

- Footer 988 / Crisis Text Line / Human Line Project link present on every page (round-1 fix landed)
- Adam Raine entry removed from `stories.html`
- Texas-teen graphic chatbot quotes collapsed behind `<details>` content-warning
- "University of Hawaiʻi study" line removed
- Slimemold reference present on `methodology.html` (`https://github.com/justinstimatze/slimemold`)
- Skip-link works (top: -40 off-screen, focusable)
- 988 link in `analyze.html` clinical-disclaimer is at top:359 — early in tab order, before the textarea
- Crisis pre-pass hidden at load (good — only appears on detection)
- `/api/health` returns 200 (verified earlier)
- All HTML pages have `og-image.png` referenced consistently

## Friction-level UX issues

### 1. Submit button below the fold on desktop

`#submit-btn` renders at top: 953px on `analyze.html` at 1280×820 (viewport bottom is 820). After pasting, users have to scroll past textarea + privacy summary to find the submit button.

**Fix:** either (a) shrink the textarea row count (`rows="14"` is generous), (b) move privacy-summary above the submit form-actions block AND collapse it to a single line with a "more details" toggle, or (c) make the form-actions block sticky-bottom on long forms.

### 2. Privacy summary on `analyze.html` is now inconsistent with `privacy.html`

Inline privacy text on `analyze.html`: *"Anthropic does not train on it and retains it for up to 30 days for abuse detection. We store nothing."*

`privacy.html` was updated (round 2) to add the flagged-content extended retention caveat (up to 2 years for safety-flagged content). `analyze.html` summary wasn't updated to match.

**Fix:** rephrase the inline summary to: *"Your transcript is sent to Claude (Anthropic) for analysis. Anthropic doesn't train on it; standard retention is up to 30 days, with longer retention possible for safety-flagged content. We store nothing on our end. [Full privacy policy](/privacy.html)."*

### 3. Hero CTA "See What's There" is opaque

The submit button on `analyze.html` reads "Show me what's there" — almost identical wording to the homepage's "See What's There." Two different actions, near-identical copy. Naive users don't know which goes where.

**Fix:** homepage CTA → "Analyze a conversation". Submit button stays "Show me what's there." Distinct verbs.

### 4. "For Families" only reachable from footer

Only one link to `for-families.html` on the homepage, in the footer. Worried-family-member persona has no path from hero or nav.

**Fix:** add a small secondary CTA below the primary hero button: "Worried about someone else? → For families". Adds a second entry without crowding.

### 5. Mobile nav link touch targets are small

Nav links report 23px height. WCAG / Apple HIG / MDN recommend minimum 44–48px tappable height. The mobile CSS already bumps `.btn` and `.radio-label` to 48px min — the nav rule was missed.

**Fix:** add `min-height: 48px` and vertical padding to `.nav-links a` inside the `@media (max-width: 640px)` block.

### 6. Body paragraph color borderline

First paragraph on homepage rendered at `rgb(102, 102, 102)` (= `#666`). On `#fff` background that's a 5.74:1 contrast ratio — passes WCAG AA for normal text (≥4.5) but is below AAA (≥7) and is the kind of light-gray-on-white that ages badly on cheap LCD/OLED screens. For a vulnerable-user audience (some may be reading at 2am on a phone with low brightness), bias toward higher contrast.

**Fix:** check whether this paragraph is the hero subhead (intentionally muted) or body copy. If body, bump `--color-text-muted` toward `#444` or use the un-muted color for body paragraphs. Hero subheads can stay muted by design.

## Things I couldn't measure reliably

- **Mobile viewport behavior.** `resize_window` to 390×844 produced a viewport that still reported `documentElement.clientWidth = 908`. Either devtools/scrollbar reservation or a `meta viewport` quirk. Worth manual testing on a real phone or via `chrome://inspect` device emulation.
- **Dynamic results rendering.** I didn't submit a real transcript through the live UI in the browser session because of rate-limit budget; the smoke test runs against the API directly. Worth a one-off paste-and-render check after the next batch of fixes lands.

## Already addressed

These were already fixed in earlier rounds; verifying live:
- Footer 988 propagation ✓
- Stories.html cleanup ✓
- Slimemold reference ✓
- Crisis pre-pass dismissable ✓ (existence verified, behavior not exercised in this run)
- Sort toggle relabeled ✓ (verified DOM)

## Triage

Quick wins (apply now):
- [#2] Privacy summary inconsistency on analyze.html
- [#3] Hero CTA wording fix
- [#4] For-Families secondary CTA
- [#5] Mobile nav 48px tap targets

Defer pending real-device testing:
- [#1] Submit-below-fold (depends on actual viewport behavior)
- [#6] Body color (need to verify it's body copy, not hero subhead)
