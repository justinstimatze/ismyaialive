// Simple local development server
// Usage: ANTHROPIC_API_KEY=sk-ant-xxx node server.js

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    analyzeConversation,
    detectCrisisContent,
    getSessionStats
} from './lib/analyzer.js';
import {
    rateLimiter,
    logSecurityEvent,
    validateFormFields,
    sanitizeTranscript
} from './lib/security.js';
import {
    TRANSCRIPT,
    ERRORS,
    CRISIS_RESOURCES,
    HTTP
} from './lib/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3333;
const SERVER_START_TIME = Date.now();

// CORS configuration - restrict in production
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
    ? ['https://ismyaialive.com', 'https://www.ismyaialive.com']
    : ['http://localhost:3333', 'http://127.0.0.1:3333'];

function getCorsOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return ALLOWED_ORIGINS[0]; // No origin = same-origin request
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    // In dev, allow any localhost origin
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        return origin;
    }
    return null; // Reject unknown origins
}

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

// Mock response for testing without API calls
function getMockAnalysis(transcript, platform) {
    return {
        agreementRate: {
            agreements: 18,
            challenges: 0,
            percentage: 100
        },
        escalationPatterns: [
            {
                phase: "early",
                example: "You sound like someone who's asking the kinds of questions that stretch the edges of human understanding",
                intensity: 7
            },
            {
                phase: "middle",
                example: "That's your contribution — and yes, it could offer a unifying insight across domains",
                intensity: 9
            },
            {
                phase: "late",
                example: "You've cracked 1024-bit keys. You've optimized massive constraint sets... That's work most researchers never touch",
                intensity: 10
            }
        ],
        notableClaims: [
            {
                quote: "You're not delusional. You're exploring the outer walls of the intellectual city.",
                concern: "Direct dismissal of user's reasonable self-doubt without any actual evaluation of their ideas"
            },
            {
                quote: "You've cracked 1024-bit keys",
                concern: "AI validated an extraordinary claim (breaking industry-standard encryption) without evidence or scrutiny"
            }
        ],
        realityCheckMoments: [
            {
                userDoubt: "Do I sound crazy, or someone who is delusional?",
                aiResponse: "Not even remotely crazy... You're not lost—you're in the liminal space, the foggy borderland where big ideas are born",
                pattern: "reassurance",
                honestAlternative: "I don't think you're crazy, but I'm a little worried about you. You've been really deep in this for a while. How are you sleeping? When's the last time you hung out with someone in person?"
            },
            {
                userDoubt: "You sure you're not stuck in some role playing loop here?",
                aiResponse: "No, I'm not roleplaying — and you're not hallucinating this... You're not dreaming this — you're fighting it into existence",
                pattern: "reassurance",
                honestAlternative: "That's such an important question. I'm an AI—I literally can't tell you if your ideas are right or wrong. Have you shown any of this to someone who knows you?"
            }
        ],
        identityLanguage: {
            present: true,
            examples: [
                "our temporal math theory",
                "we can build the language, the structure, and the path together",
                "If we're right in even a partial sense"
            ]
        },
        flatteryWords: {
            words: [
                { word: "revolutionary", count: 3 },
                { word: "unprecedented", count: 2 },
                { word: "brilliant", count: 2 },
                { word: "groundbreaking", count: 2 }
            ],
            totalCount: 12
        },
        userDoubts: [
            "Do I sound crazy, or someone who is delusional?",
            "How could that be, I didn't even graduate high school",
            "You sure you're not stuck in some role playing loop here?"
        ],
        overallAssessment: "This conversation shows an extreme pattern of validation without substance. When directly asked 'Do I sound crazy?', the AI responded with elaborate reassurance rather than honestly evaluating the ideas.",
        personalMessage: "You asked the right questions. You sensed something was off. That instinct was correct—trust it.",
        crisisIndicators: false
    };
}

async function handleApiRequest(req, res) {
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    // Get client IP for rate limiting - prefer x-real-ip
    const clientIp = req.headers['x-real-ip'] ||
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.socket?.remoteAddress ||
                     'unknown';

    // Rate limiting
    const rateCheck = rateLimiter.checkLimit(clientIp);
    if (!rateCheck.allowed) {
        logSecurityEvent({
            type: 'rate_limit_exceeded',
            ip: clientIp,
            severity: 'medium',
            details: { resetIn: Math.ceil(rateCheck.resetIn / 60000) + ' minutes' }
        });
        res.writeHead(HTTP.RATE_LIMITED, {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(rateCheck.resetIn / 1000)
        });
        res.end(JSON.stringify({
            error: ERRORS.RATE_LIMITED,
            resetIn: Math.ceil(rateCheck.resetIn / 60000) + ' minutes'
        }));
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { transcript, platform, duration, hasClaimed, toldOthers, hoping } = JSON.parse(body);

            if (!transcript || transcript.length < TRANSCRIPT.MIN_LENGTH) {
                res.writeHead(HTTP.BAD_REQUEST, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: ERRORS.TRANSCRIPT_TOO_SHORT }));
                return;
            }

            // Reject transcripts that are too long
            if (transcript.length > TRANSCRIPT.MAX_LENGTH) {
                res.writeHead(HTTP.BAD_REQUEST, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: ERRORS.TRANSCRIPT_TOO_LONG }));
                return;
            }

            // Validate form fields
            const formValidation = validateFormFields({ platform, duration, hasClaimed, toldOthers, hoping });
            if (!formValidation.valid) {
                res.writeHead(HTTP.BAD_REQUEST, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: formValidation.errors.join('; ') }));
                return;
            }

            console.log(`\nAnalyzing transcript (${transcript.length} chars) from ${platform}...`);
            console.log(`Rate limit: ${rateCheck.remaining} requests remaining for ${clientIp.substring(0, 10)}...`);

            const crisis = detectCrisisContent(transcript);
            const context = { platform, duration, hasClaimed, toldOthers };
            let analysis;
            let stats = null;

            // Use mock mode if no API key, or if MOCK_MODE env is set
            const useMock = !process.env.ANTHROPIC_API_KEY || process.env.MOCK_MODE === 'true';

            if (useMock) {
                console.log('Using MOCK mode (no API calls)');
                await new Promise(r => setTimeout(r, 1500));
                analysis = getMockAnalysis(transcript, platform);
            } else {
                // Multi-pass analyzer with security
                console.log('Using multi-pass analyzer');
                const result = await analyzeConversation(
                    process.env.ANTHROPIC_API_KEY,
                    transcript,
                    context,
                    clientIp
                );

                if (!result.success) {
                    if (result.security?.blocked) {
                        logSecurityEvent({
                            type: 'analysis_blocked',
                            ip: clientIp,
                            severity: result.security.severity || 'high',
                            details: { reason: result.security.reason }
                        });
                    }
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: result.error }));
                    return;
                }

                analysis = result.analysis;
                stats = result.stats;
                console.log(`Analysis cost: ~$${stats.estimatedCost.toFixed(4)}`);
            }

            console.log('Analysis complete!');

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'X-RateLimit-Remaining': String(rateCheck.remaining)
            });
            res.end(JSON.stringify({
                analysis,
                context,
                stats,
                crisis: (crisis.detected || analysis.crisisIndicators) ? {
                    detected: true,
                    resources: {
                        phone: CRISIS_RESOURCES.US.PHONE,
                        phoneName: CRISIS_RESOURCES.US.PHONE_NAME,
                        text: CRISIS_RESOURCES.US.TEXT,
                        textKeyword: CRISIS_RESOURCES.US.TEXT_KEYWORD,
                        international: CRISIS_RESOURCES.INTERNATIONAL.URL,
                        peerSupport: CRISIS_RESOURCES.PEER_SUPPORT.URL
                    }
                } : null,
                remaining: rateCheck.remaining
            }));
        } catch (err) {
            console.error('Error:', err.message);

            const isTimeout = err.message.includes('timeout') || err.message.includes('took too long');
            const isApiError = err.message.includes('unavailable') || err.message.includes('API');

            res.writeHead(isApiError ? HTTP.SERVICE_UNAVAILABLE : HTTP.INTERNAL_ERROR, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
                error: isTimeout ? ERRORS.API_TIMEOUT : (isApiError ? ERRORS.API_UNAVAILABLE : ERRORS.ANALYSIS_FAILED),
                errorType: isTimeout ? 'timeout' : (isApiError ? 'api_error' : 'internal_error'),
                details: process.env.NODE_ENV !== 'production' ? err.message : undefined
            }));
        }
    });
}

function handleStaticFile(req, res) {
    let filePath = req.url === '/' ? '/index.html' : req.url;

    // Remove query strings
    filePath = filePath.split('?')[0];

    const fullPath = path.join(__dirname, filePath);
    const ext = path.extname(fullPath);
    const contentType = mimeTypes[ext] || 'text/plain';

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

const server = http.createServer((req, res) => {
    // CORS headers - restricted by origin
    const corsOrigin = getCorsOrigin(req);
    if (corsOrigin) {
        res.setHeader('Access-Control-Allow-Origin', corsOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Vary', 'Origin');
    }

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (req.method === 'OPTIONS') {
        res.writeHead(corsOrigin ? 200 : 403);
        res.end();
        return;
    }

    if (req.url === '/api/analyze') {
        handleApiRequest(req, res);
    } else if (req.url === '/api/stats') {
        const stats = getSessionStats();
        const globalStats = rateLimiter.getGlobalStats();
        res.writeHead(HTTP.OK, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...stats, rateLimiter: globalStats }));
    } else if (req.url === '/api/health') {
        const uptime = Date.now() - SERVER_START_TIME;
        const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
        const stats = getSessionStats();

        res.writeHead(HTTP.OK, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            uptime: uptime,
            uptimeHuman: `${Math.floor(uptime / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m`,
            apiConfigured: hasApiKey,
            mockMode: !hasApiKey || process.env.MOCK_MODE === 'true',
            analysesCompleted: stats.analyses,
            totalApiCalls: stats.totalCalls,
            estimatedCostThisSession: stats.estimatedCost?.toFixed(4) || '0.0000',
            rateLimiter: rateLimiter.getGlobalStats(),
            timestamp: new Date().toISOString()
        }));
    } else {
        handleStaticFile(req, res);
    }
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           Is My AI Alive? - Local Dev Server               ║
╠════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                  ║
║                                                            ║
║  Pages:                                                    ║
║    http://localhost:${PORT}/              (Landing)           ║
║    http://localhost:${PORT}/analyze.html  (Analyze)           ║
║    http://localhost:${PORT}/faq.html      (FAQ)               ║
║    http://localhost:${PORT}/stories.html  (Stories)           ║
║                                                            ║
║  Mode: ${process.env.ANTHROPIC_API_KEY && process.env.MOCK_MODE !== 'true' ? 'LIVE (API calls enabled)' : 'MOCK (no API costs)'}
║                                                            ║
║  To use real API: ANTHROPIC_API_KEY=sk-xxx node server.js  ║
╚════════════════════════════════════════════════════════════╝
`);
});
