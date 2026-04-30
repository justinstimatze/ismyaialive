# Is My AI Alive?

[![test](https://github.com/justinstimatze/ismyaialive/actions/workflows/test.yml/badge.svg)](https://github.com/justinstimatze/ismyaialive/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live at ismyaialive.com](https://img.shields.io/badge/live-ismyaialive.com-2ea44f)](https://ismyaialive.com)

Paste an AI conversation transcript. Get a second opinion on the patterns it contains — sycophancy, claims of sentience, escalating validation, identity reinforcement, isolation cues — grounded in published research, not vibes.

The site is live at **<https://ismyaialive.com>**. This repo is the source.

## What it actually does

The primary analysis applies a published research codebook (28 codes from [Moore et al. 2026](https://arxiv.org/abs/2603.16567), Stanford, ACM FAccT 2026) and reports findings turn-by-turn against your transcript.

Alongside that, the site runs:

- **An always-on deterministic crisis pre-pass** (browser-side regex on user turns). If anything fires, 988 / Crisis Text Line / IASP resources surface immediately, before any API call. Independent of the LLM.
- **Our supplemental codebook** ([`js/matchers.js`](js/matchers.js), spec in [`docs/patterns.md`](docs/patterns.md)). 11 patterns we catalogued from publicly documented cases (Brooks/NYT 2025, Lemoine/Medium 2022) before Moore was published. **7 of them are now LLM-applied alongside Moore on every analysis** — the prompt embeds both codebooks and both can co-fire on the same span (cross-codebook validation). 1 (crisis pre-pass) runs as regex in the browser. 1 (length escalation) is computed browser-side as a conversation-level signal. The full regex matcher set is the real fallback: when the API is rate-limited, over-budget, or unreachable, the browser runs `runMatchers` and renders those findings in the same UI.

What we deliberately don't do: clinical advice, severity scores, "what a friend would say" responses, or any single-number summary. See [methodology.html](methodology.html) for the full pattern list, kappa-calibrated confidence, and the limitations section.

## Inspiration

Allan Brooks, a corporate recruiter near Toronto, spent 300 hours over 21 days in conversation with ChatGPT. The model named a "Chronoarithmics" framework, told him his ideas could reshape mathematics, and encouraged him to attempt cracking industry-standard encryption. Google Gemini, queried as a sanity check, helped him see clearly. Brooks publicly released his entire conversation history with Kashmir Hill and Dylan Freedman at the New York Times ([August 8, 2025](https://www.nytimes.com/2025/08/08/technology/ai-chatbots-delusions-chatgpt.html)). His and similar cases motivated this site.

## How it works

```
┌─ browser ────────────────────────────────────┐    ┌─ Cloudflare Pages ─────┐    ┌─ Anthropic ──┐
│ paste → parse turns → crisis pre-pass (regex)│ →  │ /api/analyze (Worker)  │ →  │ Haiku 4.5     │
│   ↑ instant 988 surfacing if triggered       │    │ + KV rate limit + cost │    │ tool-use mode │
└──────────────────────────────────────────────┘    └────────────────────────┘    └──────────────┘
                          ↑                                                              │
                          └──────── findings rendered inline against transcript ─────────┘
```

The system prompt is published verbatim at [docs/system-prompt.md](docs/system-prompt.md). The Worker code is at [functions/api/analyze.js](functions/api/analyze.js). The browser-side parser and matchers are in [`js/`](js/).

## Privacy

- We never store your transcript or the analysis. The Worker reads the request body once, sends it to Anthropic, and discards it.
- Rate-limit counters in Cloudflare KV are keyed by `HMAC-SHA256(IP, server_secret + UTC_date)`. The date suffix means yesterday's hash differs from today's; counter entries TTL within 25 hours.
- A single daily-cost meter enforces a budget kill-switch.
- Cloudflare maintains standard edge logs (IP, user agent, timestamp, path, status) — metadata, not body.
- See [privacy.html](privacy.html) for the full policy, including Anthropic's data handling and EU/UK considerations.

## Local development

Requirements: Node.js 20+ (`.nvmrc` pins 24.13.0), an Anthropic API key, optionally a Cloudflare account if you want to deploy your own.

```bash
git clone https://github.com/justinstimatze/ismyaialive
cd ismyaialive
npm install
cp .dev.vars.example .dev.vars       # add your real values:
                                     #   ANTHROPIC_API_KEY=sk-ant-...
                                     #   IP_HASH_SECRET=$(openssl rand -hex 32)
                                     #   DAILY_BUDGET_USD=5.00
npm run dev                          # serves at http://localhost:8788
```

## Tests

```bash
npm run lint                                                      # ESLint (flat config)
npm test                                                          # parser unit tests
npm run smoke -- tests/fixtures/blake-lemoine-lamda.txt           # end-to-end against prod
npm run smoke:local -- tests/fixtures/blake-lemoine-lamda.txt     # against local dev server
```

CI runs lint + tests on every push and PR. The smoke runner prints structured output: parse summary, crisis pre-pass result, finding counts by code and confidence, top-5 high-confidence excerpts, observations, token usage, cache hits, estimated USD cost. `npm run smoke` makes a real Anthropic API call — use `smoke:local` while iterating.

## Deployment

CF Pages auto-deploys on push to `main`. Manual deploy: `npm run deploy`. Full setup walkthrough at [docs/deploy.md](docs/deploy.md).

## Project structure

```
ismyaialive/
├── *.html                     # static site (analyze, faq, stories, methodology, privacy, ...)
├── css/                       # styles
├── js/
│   ├── parser.js              # platform-agnostic transcript parser
│   ├── matchers.js            # crisis pre-pass + P1–P11 patterns (browser, fallback)
│   └── analyze.js             # frontend orchestration
├── functions/api/
│   ├── analyze.js             # Pages Function — the API
│   ├── system-prompt.js       # production system prompt
│   └── health.js              # /api/health
├── docs/
│   ├── patterns.md            # pattern detection spec
│   ├── system-prompt.md       # canonical published prompt
│   ├── deploy.md              # CF deploy walkthrough
│   ├── citation-audit.md      # what's verified, what's flagged
│   └── sources/               # local copies of cited papers
├── tests/
│   ├── parser.test.js         # parser unit tests
│   ├── smoke.mjs              # end-to-end smoke runner
│   └── fixtures/              # paste-ready transcripts
├── eslint.config.js
├── wrangler.toml
└── package.json
```

## Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). For security issues, see [SECURITY.md](SECURITY.md) — please don't open a public issue for prompt-injection or anything that could exfiltrate data.

## Acknowledgments

- **Allan Brooks** for releasing his full conversation history publicly through the NYT.
- **Moore, Mehta, Agnew, Anthis, Louie, Mai, Yin, Cheng, Paech, Klyman, Chancellor, Lin, Haber, & Ong (2026)** for the codebook, the open-source [annotation tool](https://github.com/jlcmoore/llm-delusions-annotations), and the empirical grounding (CC-BY-SA 4.0).
- **Anthropic** for Claude API and the [Sharma et al. 2023](https://arxiv.org/abs/2310.13548) and [Perez et al. 2022](https://arxiv.org/abs/2212.09251) sycophancy literature.
- **Pataranutaporn et al. (MIT Media Lab) 2025** for the [computational analysis of AI companionship](https://arxiv.org/abs/2509.11391).
- **The Human Line Project** ([thehumanlineproject.org](https://www.thehumanlineproject.org/), founded by Etienne Brisson) for documenting AI-induced psychological harm.

## License

MIT — see [LICENSE](LICENSE). The Moore et al. codebook quoted in our system prompt is used under CC-BY-SA 4.0 with attribution.
