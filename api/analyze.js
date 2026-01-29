// Vercel Serverless Function: /api/analyze
// Analyzes AI conversation transcripts using the multi-pass analyzer

import {
    analyzeConversation,
    detectCrisisContent,
    getSessionStats
} from '../lib/analyzer.js';
import {
    rateLimiter,
    logSecurityEvent,
    validateTranscript,
    validateFormFields
} from '../lib/security.js';
import {
    TRANSCRIPT,
    RATE_LIMITS,
    ERRORS,
    CRISIS_RESOURCES,
    HTTP
} from '../lib/constants.js';

// Allowed CORS origins
const ALLOWED_ORIGINS = [
    'https://ismyaialive.com',
    'https://www.ismyaialive.com'
];

// Maximum request body size (100KB)
const MAX_BODY_SIZE = 100 * 1024;

function getCorsOrigin(origin) {
    if (!origin) return ALLOWED_ORIGINS[0];
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    return null;
}

export default async function handler(req, res) {
    // Handle CORS
    const origin = req.headers.origin;
    const corsOrigin = getCorsOrigin(origin);

    if (corsOrigin) {
        res.setHeader('Access-Control-Allow-Origin', corsOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Vary', 'Origin');
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(corsOrigin ? 200 : 403).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(HTTP.BAD_REQUEST).json({ error: 'Method not allowed' });
    }

    // Check request body size (Vercel parses body, but we validate the content)
    const bodySize = JSON.stringify(req.body).length;
    if (bodySize > MAX_BODY_SIZE) {
        return res.status(HTTP.BAD_REQUEST).json({
            error: 'Request too large. Please shorten your transcript.',
            errorType: 'validation'
        });
    }

    try {
        // Get client IP - prefer Vercel's x-real-ip, fallback to x-forwarded-for
        // Note: x-forwarded-for can be spoofed; x-real-ip is set by Vercel
        const ip = req.headers['x-real-ip'] ||
                   req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.socket?.remoteAddress ||
                   'unknown';

        // Rate limit check
        const rateCheck = rateLimiter.checkLimit(ip);
        if (!rateCheck.allowed) {
            logSecurityEvent({
                type: 'rate_limit_exceeded',
                ip,
                severity: 'medium',
                details: { resetIn: Math.ceil(rateCheck.resetIn / 60000) + ' minutes' }
            });
            return res.status(HTTP.RATE_LIMITED).json({
                error: ERRORS.RATE_LIMITED,
                errorType: 'rate_limit',
                resetIn: Math.ceil(rateCheck.resetIn / 60000) + ' minutes'
            });
        }

        // Parse body
        const { transcript, platform, duration, hasClaimed, toldOthers, hoping } = req.body;

        // Validate transcript
        const transcriptValidation = validateTranscript(transcript);
        if (!transcriptValidation.valid) {
            return res.status(HTTP.BAD_REQUEST).json({
                error: transcriptValidation.errors.join('; '),
                errorType: 'validation'
            });
        }

        // Validate form fields
        const formValidation = validateFormFields({ platform, duration, hasClaimed, toldOthers, hoping });
        if (!formValidation.valid) {
            return res.status(HTTP.BAD_REQUEST).json({
                error: formValidation.errors.join('; '),
                errorType: 'validation'
            });
        }

        // Crisis content pre-check
        const crisis = detectCrisisContent(transcript);

        // Build context
        const context = {
            platform,
            duration,
            hasClaimed,
            toldOthers
        };

        // Use the multi-pass analyzer
        const result = await analyzeConversation(
            process.env.ANTHROPIC_API_KEY,
            transcript,
            context,
            ip
        );

        if (!result.success) {
            // Check if security blocked the request
            if (result.security?.blocked) {
                logSecurityEvent({
                    type: 'analysis_blocked',
                    ip,
                    severity: result.security.severity || 'high',
                    details: { reason: result.security.reason }
                });
            }

            return res.status(HTTP.BAD_REQUEST).json({
                error: result.error,
                errorType: result.security?.blocked ? 'security' : 'analysis_failed'
            });
        }

        // Log minimal metadata (no content)
        console.log('Analysis completed', {
            ip: ip.substring(0, 8) + '...',
            platform,
            duration,
            transcriptLength: transcript.length,
            crisisDetected: crisis.detected || result.analysis.crisisIndicators,
            apiCalls: result.stats?.totalCalls,
            cost: result.stats?.estimatedCost?.toFixed(4)
        });

        // Return results
        return res.status(HTTP.OK).json({
            analysis: result.analysis,
            context,
            stats: {
                totalCalls: result.stats?.totalCalls,
                estimatedCost: result.stats?.estimatedCost
            },
            crisis: (crisis.detected || result.analysis.crisisIndicators) ? {
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
        });

    } catch (error) {
        console.error('Analysis error:', error);

        // Return distinguishable error response
        const isTimeout = error.message.includes('timeout') || error.message.includes('took too long');
        const isApiError = error.message.includes('unavailable') || error.message.includes('API');

        return res.status(isApiError ? HTTP.SERVICE_UNAVAILABLE : HTTP.INTERNAL_ERROR).json({
            error: isTimeout ? ERRORS.API_TIMEOUT : (isApiError ? ERRORS.API_UNAVAILABLE : ERRORS.ANALYSIS_FAILED),
            errorType: isTimeout ? 'timeout' : (isApiError ? 'api_error' : 'internal_error')
        });
    }
}
