# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Is My AI Alive?, please report it responsibly.

### How to Report

**Email:** hello@ismyaialive.com (subject: Security)

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

### What to Expect

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 7 days
- **Resolution Timeline:** Depends on severity, typically 30-90 days

### Scope

In scope:
- The ismyaialive.com website and Pages Function (`/api/analyze`)
- Prompt injection vulnerabilities affecting our system prompt or analysis output
- Data privacy issues (e.g. unintended persistence of transcript data)
- Rate-limiting or budget-cap bypasses
- Information disclosure beyond what's documented in our privacy policy

Out of scope:
- Third-party services (Anthropic API, Cloudflare infrastructure)
- Social engineering attacks
- Denial of service attacks against Cloudflare's edge
- Issues in dependencies (report to upstream)

### Safe Harbor

We will not pursue legal action against security researchers who:
- Act in good faith
- Avoid privacy violations
- Do not destroy data
- Report findings promptly
- Allow reasonable time for fixes before disclosure

## Security Features

### Privacy
- No transcript storage — request body is read once, sent to Anthropic, discarded
- No user accounts or session identifiers
- Rate-limit counters keyed by HMAC-hashed IPs with daily-rotating secret; entries auto-expire within 25 hours
- See [privacy.html](privacy.html) for the full policy

### Input Security
- Strict tool-use schema enforcing typed structured output from the LLM
- Body length validation (200–100,000 chars)
- Cloudflare WAF + DDoS shielding at the edge

### Infrastructure
- HTTPS enforced (Cloudflare Universal SSL, HSTS)
- Content Security Policy headers
- Per-IP rate limiting with daily budget kill-switch
- CORS restricted to ismyaialive.com / www.ismyaialive.com

## Acknowledgments

We thank security researchers who report issues responsibly. Names listed here with consent.
