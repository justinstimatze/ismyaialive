# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Is My AI Alive?, please report it responsibly.

### How to Report

**Email:** security@ismyaialive.com

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
- The ismyaialive.com website and API
- Prompt injection vulnerabilities
- Data privacy issues
- Authentication/authorization bypasses
- Rate limiting bypasses

Out of scope:
- Third-party services (Anthropic API, Vercel)
- Social engineering attacks
- Denial of service attacks
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
- No transcript storage - all analysis is ephemeral
- No user accounts or tracking
- Minimal logging (no content, truncated IPs)
- GDPR-compliant data handling

### Input Security
- Prompt injection detection and blocking
- Input sanitization and validation
- Dynamic security boundaries per request
- Output validation for leakage

### Infrastructure
- HTTPS enforced (HSTS)
- Content Security Policy
- Rate limiting per IP
- CORS restricted to production domain

## Acknowledgments

We thank the following security researchers for responsible disclosure:
- (Your name could be here)
