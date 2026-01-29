# Contributing to Is My AI Alive?

Thank you for your interest in contributing! This project helps people understand their AI conversations, and we welcome contributions that advance that mission.

## Code of Conduct

Be kind, compassionate, and constructive. Remember that users of this tool may be in vulnerable states. Our code and communications should reflect empathy.

## How to Contribute

### Reporting Bugs

1. Check existing issues first
2. Use the bug report template
3. Include steps to reproduce
4. Include browser/environment details

### Suggesting Features

1. Open an issue with the "enhancement" label
2. Describe the use case
3. Explain how it helps users

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test:all`)
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/ismyaialive.git
cd ismyaialive

# Install dependencies
npm install

# Start dev server (mock mode)
npm start

# Run with real API (costs money!)
ANTHROPIC_API_KEY=sk-xxx npm start
```

## Code Style

- No build step - vanilla HTML/CSS/JS
- ES modules (`import`/`export`)
- Clear function documentation
- Meaningful variable names
- Constants in `lib/constants.js`

## Testing

All PRs should include tests for new functionality:

```bash
npm test              # Unit tests
npm run test:security # Security tests
npm run test:all      # Full suite
```

## Areas We Need Help

- **Internationalization:** Translations, international crisis resources
- **Accessibility:** Screen reader testing, keyboard navigation
- **Analysis Improvements:** Better pattern detection
- **Documentation:** Guides, examples, FAQ additions
- **Testing:** Edge cases, browser compatibility

## What We Won't Accept

- Features that store user transcripts
- Tracking or analytics that compromise privacy
- Judgmental or pathologizing language
- Breaking changes without discussion
- PRs without tests

## Questions?

Open an issue with the "question" label or email hello@ismyaialive.com
