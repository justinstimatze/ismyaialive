# Is My AI Alive?

A privacy-focused tool that helps people analyze their AI conversation transcripts to identify patterns like sycophancy, escalating validation, and reality-check moments.

**Website:** https://ismyaialive.com

## About

Inspired by the story of Allan Brooks, who spent 300+ hours in conversation with ChatGPT before seeking a second opinion, this tool provides a compassionate "second perspective" on AI conversations.

We don't store transcripts. We don't judge. We show you patterns.

## Features

- **Multi-pass Analysis:** Parses, validates, and extracts patterns in parallel for comprehensive analysis
- **Privacy-First:** No transcript storage, no accounts, minimal logging
- **Prompt Injection Defense:** Dynamic security boundaries protect against manipulation
- **Crisis Detection:** Identifies concerning content and provides resources
- **Compassionate Framing:** Results are presented with empathy, not judgment

## Quick Start

### Prerequisites

- Node.js 18+
- Anthropic API key (for live analysis)

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/ismyaialive.git
cd ismyaialive

# Install dependencies
npm install

# Run in mock mode (no API calls, uses sample data)
npm start

# Run with live API
ANTHROPIC_API_KEY=sk-ant-xxx npm start
```

Visit http://localhost:3333

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | For live mode | Your Claude API key |
| `MOCK_MODE` | No | Set to `true` to force mock mode |
| `PORT` | No | Server port (default: 3333) |
| `NODE_ENV` | No | Set to `production` for production settings |

## Project Structure

```
ismyaialive/
├── index.html          # Landing page
├── analyze.html        # Analysis form and results
├── faq.html            # FAQ content
├── stories.html        # User stories
├── for-families.html   # Resources for families
├── about.html          # About page
├── privacy.html        # Privacy policy
├── methodology.html    # How analysis works
├── press.html          # Press resources
├── css/
│   └── style.css       # All styles
├── js/
│   └── analyze.js      # Frontend logic
├── lib/
│   ├── analyzer.js     # Multi-pass analysis engine
│   ├── security.js     # Input validation, rate limiting
│   └── constants.js    # Configuration constants
├── api/
│   └── analyze.js      # Vercel serverless function
├── server.js           # Local development server
├── vercel.json         # Production deployment config
└── tests/              # Test suite
```

## Architecture

### Analysis Pipeline

1. **Parse:** Structure raw transcript into turns
2. **Validate:** Confirm it's an AI conversation worth analyzing
3. **Extract:** Run 6 parallel focused extractions:
   - Agreement patterns
   - Escalation patterns
   - Identity language
   - Reality-check moments
   - Flattery detection
   - Concerning claims
4. **Synthesize:** Combine into compassionate final assessment

### Security

- Dynamic boundary markers per request
- 30+ injection pattern detections
- Input sanitization and validation
- Output validation for prompt leakage
- Rate limiting (5 requests/hour/IP)
- Full security headers (CSP, HSTS, etc.)

## Testing

```bash
# Run unit tests
npm test

# Run security tests
npm run test:security

# Run integration tests
npm run test:integration

# Run UI tests (requires Playwright)
npm run test:ui

# Run all tests
npm run test:all
```

## Assets

### OG Image
The `og-image.svg` file is a template. To generate the required `og-image.png`:

1. Open `og-image.svg` in a browser or design tool
2. Export as PNG at 1200x630 pixels
3. Save as `og-image.png` in the root directory

Without this file, social media shares will lack a preview image.

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add `ANTHROPIC_API_KEY` to environment variables
3. Deploy

### Other Platforms

The project uses standard Node.js and can be deployed to any platform supporting:
- Static file hosting for HTML/CSS/JS
- Serverless functions for `/api/analyze`

## Cost

Each analysis costs approximately $0.15-0.80 in Claude API calls, averaging ~$0.35.

Rate limiting prevents abuse: 5 analyses per hour per IP.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for our security policy and how to report vulnerabilities.

## License

MIT - see [LICENSE](LICENSE)

## Acknowledgments

- [Allan Brooks](https://humanlineproject.org) for sharing his story
- [Anthropic](https://anthropic.com) for Claude API
- Research on AI sycophancy that informed our analysis

## Links

- [Website](https://ismyaialive.com)
- [Human Line Project](https://humanlineproject.org)
- [NYT Article: Allan Brooks Story](https://www.nytimes.com/2025/01/15/technology/chatgpt-ai-chatbot-mental-health.html)
