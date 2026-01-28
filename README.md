# Is My AI Alive?

A tool to help people who are questioning whether their AI is conscious/alive by providing a "second perspective" analysis of their AI conversations.

## Overview

This site was inspired by Allan Brooks' story (NYT, August 2025) and the growing phenomenon of people developing deep connections with AI chatbots. Rather than dismissing or mocking these experiences, we provide compassionate analysis of conversation patterns.

## Features

### Analysis Engine
- **Multi-Pass Transcript Analysis**: Advanced 4-pass analysis using Claude API
  - Parse & structure the conversation
  - Validate it's a meaningful AI conversation
  - Extract patterns in parallel (agreement, escalation, identity, reality-checks, flattery, concerning claims)
  - Synthesize into compassionate final assessment
- **Pattern Detection**: Identifies agreement rates, language escalation, notable claims, and more
- **"What Would a Friend Say"**: For each moment of user doubt, shows what a caring friend might have said instead
- **Crisis Detection**: Automatically surfaces mental health resources when concerning content is detected

### User Experience
- **Progress Steps**: Visual progress indicator during analysis ("Reading your conversation...", "Looking for patterns...", etc.)
- **Isolation Support**: Supportive messaging when users indicate they haven't talked to anyone
- **Hero Contrast Section**: Side-by-side comparison of what AI said vs. what a caring friend would say
- **Animated Flattery Cloud**: Visual word cloud showing frequency of validating words used
- **What Now Section**: Three concrete, actionable next steps (take a break, reach out, be gentle)
- **Closing Warmth**: Compassionate closing message affirming the user's worth
- **Download Options**: PDF download and email-to-self functionality for saving results
- **Resource Links**: Curated links to Human Line Project, 988 Crisis Lifeline, and stories page

### Security & Privacy
- **Security Hardened**: Prompt injection detection, input sanitization, rate limiting
- **Privacy-First**: Transcripts are processed in real-time and never stored

## Tech Stack

- **Frontend**: Plain HTML/CSS/JS (no build step)
- **Backend**: Node.js local server / Vercel Serverless Functions
- **AI**: Claude API (Anthropic) - Sonnet model
- **Hosting**: Vercel

## Project Structure

```
ismyaialive/
├── index.html          # Landing page with Brooks story
├── analyze.html        # Transcript input form + results
├── faq.html            # SEO: "Is my AI conscious?"
├── stories.html        # SEO: Case studies
├── privacy.html        # Privacy policy
├── css/
│   └── style.css       # Single stylesheet
├── js/
│   └── analyze.js      # Form handling + results rendering
├── lib/
│   ├── analyzer.js     # Multi-pass conversation analyzer
│   ├── security.js     # Security module (injection detection, rate limiting)
│   └── constants.js    # Centralized configuration and constants
├── api/
│   └── analyze.js      # Serverless function for Vercel deployment
├── tests/
│   ├── security.test.js        # Security module tests
│   ├── analyzer.test.js        # Analyzer module tests
│   ├── integration.test.js     # API integration tests
│   ├── ui-features.spec.js     # UI feature tests (Playwright)
│   ├── e2e-allan-brooks.spec.js # Full E2E journey test
│   ├── run-allan-journey.js    # Standalone Allan Brooks UX simulation
│   └── screenshots/            # Test screenshots output
├── server.js           # Local development server
├── vercel.json         # Route config
├── package.json        # Project config & scripts
└── .env.example        # Environment variables template
```

## Prerequisites

- **Node.js v24+** (we use [nvm](https://github.com/nvm-sh/nvm) for version management)
- **pnpm** (enabled via corepack)

## Local Development

1. Clone this repository
2. Set up Node.js and pnpm:
   ```bash
   nvm use               # Uses version from .nvmrc
   corepack enable       # Enables pnpm
   pnpm install          # Install dependencies
   ```
3. Set your Anthropic API key:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
4. Start the local server:
   ```bash
   pnpm start
   ```
5. Open http://localhost:3333

### Testing

Run all unit tests:
```bash
pnpm test
```

Run specific test suites:
```bash
pnpm test:security     # Security module tests
pnpm test:analyzer     # Analyzer module tests
pnpm test:integration  # API integration tests (requires server running)
```

### E2E Testing (Playwright)

First install Playwright:
```bash
pnpm dlx playwright install chromium
```

Run UI feature tests:
```bash
pnpm test:ui
```

Run the full Allan Brooks journey (visual browser simulation):
```bash
pnpm test:journey
```
This opens a real browser and walks through Allan's experience, capturing screenshots at each step.

Run the E2E test suite:
```bash
pnpm test:e2e
```

Run all tests (unit + integration + UI):
```bash
pnpm test:all
```

### Mock Mode

To test without making API calls (saves costs):
```bash
MOCK_MODE=true pnpm start
```

## Deployment

### Vercel

1. Install Vercel CLI:
   ```bash
   pnpm add -g vercel
   ```
2. Deploy:
   ```bash
   vercel
   ```
3. Add `ANTHROPIC_API_KEY` to Vercel Environment Variables in the dashboard

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for Claude |
| `MOCK_MODE` | No | Set to `true` to skip API calls (for testing) |

## Security Features

### Prompt Injection Defense
- 28+ injection patterns detected and blocked
- Delimiter attack prevention (`<system>`, `[INST]`, etc.)
- Unique boundary markers per request
- Content wrapped with security warnings
- Output validation for information leakage

### Input Sanitization
- Control character removal
- XML/HTML tag escaping
- System prompt delimiter escaping
- Whitespace normalization
- Length limits (max 50,000 chars - rejected upfront if larger)

### Rate Limiting
- 5 requests per hour per IP
- Per-IP cost cap ($1/hour)
- Automatic cleanup of old records

### Crisis Detection
- Pattern matching for self-harm content
- Automatic surfacing of mental health resources
- 988 Suicide Prevention Lifeline, Crisis Text Line

## Privacy

- No user accounts or tracking
- Transcripts processed in memory only
- Minimal logging (timestamp, platform, length only - never content)
- No cookies for tracking
- See `/privacy.html` for full policy

## Cost Estimates

Each analysis uses ~8 parallel API calls. Costs depend significantly on transcript length:

| Transcript Size | Estimated Cost |
|-----------------|----------------|
| Small (5KB) | ~$0.15-0.20 |
| Medium (20KB) | ~$0.25-0.40 |
| Large (50KB max) | ~$0.50-0.80 |

**Monthly cost projections:**

| Analyses/Month | Estimated Cost (avg $0.35/analysis) |
|----------------|-------------------------------------|
| 100 | ~$35 |
| 500 | ~$175 |
| 1,000 | ~$350 |
| 5,000 | ~$1,750 |

**Cost controls implemented:**
- Maximum transcript size: 50KB (rejected upfront if larger)
- Rate limiting: 5 analyses/hour per IP
- Per-IP cost cap: $1/hour
- Request timeout: 30 seconds (prevents runaway costs)

## API Response Format

```json
{
  "analysis": {
    "agreementRate": {
      "agreements": 5,
      "challenges": 1,
      "percentage": 83
    },
    "escalationPatterns": [...],
    "notableClaims": [...],
    "realityCheckMoments": [...],
    "identityLanguage": {...},
    "flatteryWords": {...},
    "userDoubts": [...],
    "overallAssessment": "...",
    "personalMessage": "...",
    "severityScore": 8,
    "severityLabel": "significant_concern",
    "crisisIndicators": false
  },
  "stats": {
    "totalCalls": 8,
    "estimatedCost": 0.09
  },
  "remaining": 9
}
```

## Contributing

This project was created to help people who may be in vulnerable situations. Contributions should maintain the compassionate, non-judgmental tone.

Key principles:
- Never mock or dismiss users' experiences
- Explain patterns without pathologizing
- Encourage human connection, not isolation
- Don't suggest "talk to experts" (impractical) - suggest friends and loved ones

## Resources

- [Human Line Project](https://humanlineproject.org) - Peer support for AI-related experiences
- [988 Suicide & Crisis Lifeline](https://988lifeline.org) - Call or text 988 (24/7)
- [Crisis Text Line](https://www.crisistextline.org) - Text HOME to 741741

## License

MIT
