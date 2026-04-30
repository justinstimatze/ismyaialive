# Contributing to Is My AI Alive?

Thanks for your interest. This project helps people understand their AI conversations; contributions that advance that mission are welcome.

## Code of conduct

Be kind, compassionate, and constructive. Users of this tool may be in vulnerable states. Code and communication should reflect that.

## How to contribute

### Reporting bugs

1. Check existing issues first.
2. Open an issue with steps to reproduce, expected vs. actual, and browser/Node version.
3. For security issues, do not open a public issue — see [SECURITY.md](SECURITY.md).

### Suggesting features

1. Open an issue describing the use case and how it helps users.
2. Concrete UX or pattern-detection improvements are easier to evaluate than abstract proposals.

### Pull requests

1. Fork and create a feature branch.
2. Run `npm test` to confirm the parser tests still pass.
3. For changes that affect analysis output, run a smoke test against your local dev server (see below) and include sample output in the PR description.
4. Open the PR with a clear description of the change and its motivation.

## Development setup

Requirements: Node.js 20+, an Anthropic API key, a Cloudflare account if you want to deploy.

```bash
git clone https://github.com/justinstimatze/ismyaialive
cd ismyaialive
npm install
cp .dev.vars.example .dev.vars
# Edit .dev.vars: add your real ANTHROPIC_API_KEY and run `openssl rand -hex 32`
# for IP_HASH_SECRET. DAILY_BUDGET_USD=5.00 is a reasonable dev value.

npm run dev          # serves at http://localhost:8788
```

## Tests and lint

```bash
npm run lint                                                      # ESLint (flat config)
npm test                                                          # parser unit tests
npm run smoke -- tests/fixtures/blake-lemoine-lamda.txt           # end-to-end against prod
npm run smoke:local -- tests/fixtures/blake-lemoine-lamda.txt     # against local dev server
```

CI runs `npm run lint` and `npm test` on every push and PR. `npm run smoke` makes a real Anthropic API call and consumes rate-limit budget — use `smoke:local` while iterating.

## Code style

- No build step — vanilla HTML/CSS/JS, ES modules
- Two-space indent, single quotes in JS
- The Worker is in `functions/api/`; the browser code is in `js/`
- Prefer adding to existing patterns over introducing new abstractions

## Areas where help is welcome

- Internationalization: translations, non-English crisis resources
- Accessibility: screen reader testing, keyboard navigation
- Pattern detection: adding fixtures, reducing false positives, drift-resistance
- Documentation: clarifications, examples

## What we won't merge

- Features that store user transcripts or add tracking
- Pathologizing or judgmental language
- Changes that reduce safety surfacing (988, Crisis Text Line, IASP)

## Questions

Open an issue or email <hello@ismyaialive.com>.
