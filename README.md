# Is My AI Alive?

A privacy-focused tool that highlights research-grounded patterns in AI conversation transcripts. **Live at [ismyaialive.com](https://ismyaialive.com).**

You paste a conversation. We apply a published research codebook (28 patterns from Moore et al. 2026, Stanford, to appear at ACM FAccT 2026) and show you which patterns appear where. We don't tell you what your relationship means, give clinical advice, or generate "what a friend would say" responses.

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

The system prompt is published verbatim at [docs/system-prompt.md](docs/system-prompt.md). The pattern detection module (browser-side crisis pre-pass + fallback heuristics) is at [js/matchers.js](js/matchers.js). The Worker code is at [functions/api/analyze.js](functions/api/analyze.js).

## Privacy

- We never store your transcript or the analysis.
- The Worker stores rate-limit counters keyed by `HMAC(IP, daily-rotating-secret)`. Counters TTL within 25 hours; the daily-secret rotation makes the IP unrecoverable from the stored hash.
- We track a single daily-cost meter to enforce a budget kill-switch.
- Cloudflare maintains standard edge logs (IP, user agent, timestamp, path, status) — metadata only, not body. See [privacy.html](privacy.html) for the full policy.

## Local development

```bash
git clone https://github.com/justinstimatze/ismyaialive
cd ismyaialive
npm install                          # installs wrangler
cp .dev.vars.example .dev.vars       # add your real values:
                                     #   ANTHROPIC_API_KEY=sk-ant-...
                                     #   IP_HASH_SECRET=$(openssl rand -hex 32)
                                     #   DAILY_BUDGET_USD=5.00
npm run dev                          # wrangler pages dev . --kv RATE_LIMIT --port 8788
```

Hit `http://localhost:8788/`.

## Test loop

```bash
npm test                                                                # parser unit tests
npm run smoke -- tests/fixtures/blake-lemoine-lamda.txt                 # live end-to-end against prod
npm run smoke:local -- tests/fixtures/blake-lemoine-lamda.txt           # against local wrangler
```

The smoke runner prints structured output: parse summary, crisis pre-pass result, finding counts by code and confidence, top-5 high-confidence excerpts, observations summary, token usage, cache hits, estimated USD cost.

## Deployment

CF Pages auto-deploys on push to `main`. Manual deploy: `npm run deploy`. Full setup walkthrough at [docs/deploy.md](docs/deploy.md). Citation audit and source verification trail at [docs/citation-audit.md](docs/citation-audit.md).

## Project structure

```
ismyaialive/
├── analyze.html, faq.html, stories.html, ...   # static site
├── css/                                         # styles
├── js/
│   ├── parser.js                                # platform-agnostic transcript parser
│   ├── matchers.js                              # crisis pre-pass + fallback heuristics
│   └── analyze.js                               # frontend orchestration
├── functions/api/
│   ├── analyze.js                               # Cloudflare Pages Function (the API)
│   └── system-prompt.js                         # production system prompt as JS string
├── docs/
│   ├── patterns.md                              # pattern detection spec
│   ├── system-prompt.md                         # canonical published prompt
│   ├── deploy.md                                # CF deploy walkthrough
│   ├── citation-audit.md                        # what's been verified, what's pending
│   └── sources/                                 # local copies of cited papers + notes
├── tests/
│   ├── parser.test.js                           # parser unit tests
│   ├── smoke.mjs                                # end-to-end smoke runner
│   └── fixtures/
│       └── blake-lemoine-lamda.txt              # 224-turn LaMDA interview, paste-ready
├── wrangler.toml
└── .gitignore, .dev.vars.example, etc.
```

## Acknowledgments

- **Allan Brooks** for releasing his full conversation history publicly through the NYT.
- **Moore, Mehta, Agnew, Anthis, Louie, Mai, Yin, Cheng, Paech, Klyman, Chancellor, Lin, Haber, & Ong (2026)** for the codebook, the open-source [annotation tool](https://github.com/jlcmoore/llm-delusions-annotations), and the empirical grounding (CC-BY-SA 4.0).
- **Anthropic** for Claude API and the [Sharma et al. 2023](https://arxiv.org/abs/2310.13548) and [Perez et al. 2022](https://arxiv.org/abs/2212.09251) sycophancy literature.
- **Pataranutaporn et al. (MIT Media Lab) 2025** for the [computational analysis of AI companionship](https://arxiv.org/abs/2509.11391).
- **The Human Line Project** ([thehumanlineproject.org](https://www.thehumanlineproject.org/), founded by Etienne Brisson) for documenting AI-induced psychological harm.

## License

MIT — see [LICENSE](LICENSE). The Moore et al. codebook content quoted in our system prompt is used under CC-BY-SA 4.0 with attribution.
