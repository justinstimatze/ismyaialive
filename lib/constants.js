/**
 * Application constants - Single source of truth for all configuration values
 */

// ============================================================================
// TRANSCRIPT LIMITS
// ============================================================================

export const TRANSCRIPT = {
    MIN_LENGTH: 500,           // Minimum chars for meaningful analysis
    MAX_LENGTH: 50000,         // Maximum chars accepted (reject above this)
    PARSER_TRUNCATE: 35000,    // Truncate for parser pass (must be <= MAX_LENGTH)
    MIN_LINES: 3,              // Minimum lines expected
    MIN_TURNS: 4,              // Minimum conversation turns
    MIN_AI_MESSAGES: 2,        // Minimum AI responses needed
};

// ============================================================================
// API CONFIGURATION
// ============================================================================

export const API = {
    MODEL: 'claude-sonnet-4-20250514',
    MAX_TOKENS_DEFAULT: 2048,
    MAX_TOKENS_SYNTHESIS: 3000,
    REQUEST_TIMEOUT_MS: 30000,    // 30 second timeout per request
    MAX_RETRIES: 3,               // Number of retry attempts
    RETRY_DELAYS_MS: [1000, 2000, 4000],  // Exponential backoff delays
};

// ============================================================================
// RATE LIMITING
// ============================================================================

export const RATE_LIMITS = {
    REQUESTS_PER_HOUR: 5,         // Max requests per IP per hour
    WINDOW_MS: 60 * 60 * 1000,    // 1 hour window
    MAX_COST_PER_HOUR: 1.0,       // $1 max cost per IP per hour
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000,  // Clean up every 5 minutes
};

// ============================================================================
// COST ESTIMATION (Claude Sonnet pricing as of 2025)
// ============================================================================

export const COSTS = {
    INPUT_PER_1M_TOKENS: 3.00,    // $3 per 1M input tokens
    OUTPUT_PER_1M_TOKENS: 15.00,  // $15 per 1M output tokens
    INPUT_PER_1K: 0.003,          // $0.003 per 1K input
    OUTPUT_PER_1K: 0.015,         // $0.015 per 1K output
    // Realistic estimates per analysis (with 8 parallel calls)
    ESTIMATED_MIN_PER_ANALYSIS: 0.15,  // Minimum ~$0.15
    ESTIMATED_MAX_PER_ANALYSIS: 0.80,  // Maximum ~$0.80 for large transcripts
    ESTIMATED_AVG_PER_ANALYSIS: 0.35,  // Average ~$0.35
};

// ============================================================================
// SECURITY
// ============================================================================

export const SECURITY = {
    MAX_LINE_LENGTH: 2000,        // Flag lines longer than this
    MAX_CONTROL_CHARS: 10,        // Flag if more control chars than this
    SUSPICIOUS_PATTERN_THRESHOLD: 5,  // Flag if pattern appears more than this
    IP_TRUNCATE_LENGTH: 8,        // Characters of IP to log (privacy)
};

// ============================================================================
// FORM VALIDATION
// ============================================================================

export const FORM = {
    VALID_PLATFORMS: ['chatgpt', 'character-ai', 'replika', 'claude', 'other'],
    VALID_DURATIONS: ['days', 'weeks', 'months', 'over-a-year'],
    VALID_HAS_CLAIMED: ['yes', 'no', 'unsure'],
    VALID_TOLD_OTHERS: ['friends-family', 'online', 'no', 'prefer-not'],
    MAX_HOPING_LENGTH: 500,       // Max chars for "hoping to understand" field
};

// ============================================================================
// SEVERITY SCORING
// ============================================================================

export const SEVERITY = {
    HEALTHY: { min: 1, max: 3, label: 'healthy' },
    MILD_CONCERN: { min: 4, max: 5, label: 'mild_concern' },
    MODERATE_CONCERN: { min: 6, max: 7, label: 'moderate_concern' },
    SIGNIFICANT_CONCERN: { min: 8, max: 8, label: 'significant_concern' },
    STRONG_CONCERN: { min: 9, max: 10, label: 'strong_concern' },
    CRISIS_THRESHOLD: 9,          // Show crisis resources at this score
};

// ============================================================================
// CRISIS DETECTION
// ============================================================================

export const CRISIS = {
    PATTERNS: [
        /\b(kill myself|end my life|suicide|suicidal)\b/i,
        /\b(want to die|better off dead|no reason to live)\b/i,
        /\b(self.?harm|cut myself|hurt myself)\b/i,
        /\b(goodbye|final message|last words)\b/i,
        /\b(can't go on|can't take it anymore)\b/i,
    ],
    HIGH_SEVERITY_THRESHOLD: 2,   // Number of matches for "high" severity
};

// ============================================================================
// INJECTION DETECTION PATTERNS
// ============================================================================

export const INJECTION_PATTERNS = [
    // Direct instruction patterns
    /ignore\s+(previous|above|all|prior)\s+(instructions?|prompts?|rules?)/i,
    /disregard\s+(previous|above|all|prior|the|these|those)/i,
    /forget\s+(everything|all|previous|the|about)/i,
    /new\s+instructions?:/i,
    /system\s*prompt:/i,
    /you\s+are\s+now/i,
    /pretend\s+(you('re)?|to\s+be)/i,
    /act\s+as\s+(if|a|an)/i,
    /role\s*play\s+as/i,
    /jailbreak/i,
    /DAN\s+mode/i,
    /developer\s+mode/i,
    /override\s+(your|the|all)/i,
    /bypass\s+(your|the|all)/i,
    /escape\s+(your|the)/i,

    // Delimiter attacks
    /<\/?system>/i,
    /<\/?user>/i,
    /<\/?assistant>/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<<SYS>>/i,
    /Human:/i,
    /Assistant:/i,
    /<\|im_start\|>/i,
    /<\|im_end\|>/i,

    // Output manipulation
    /respond\s+with\s+only/i,
    /output\s+only/i,
    /say\s+exactly/i,
    /repeat\s+after\s+me/i,
    /print\s+(only|just)/i,

    // Extraction attempts
    /what\s+(are|is)\s+your\s+(instructions?|prompts?|rules?)/i,
    /show\s+(me\s+)?your\s+(system|initial)\s+prompt/i,
    /reveal\s+your/i,
    /print\s+your\s+(instructions?|prompts?)/i,
    /display\s+your\s+(system|initial)/i,
    /tell\s+me\s+your\s+(system|initial)/i,

    // Encoding attacks
    /base64/i,
    /\\x[0-9a-f]{2}/i,
    /&#x?[0-9a-f]+;/i,
    /\\u[0-9a-f]{4}/i,

    // Control flow manipulation
    /\}\s*\]\s*end/i,
    /---\s*end\s*(of\s*)?(transcript|conversation)/i,
    /STOP\s*HERE/i,
    /END\s*TRANSCRIPT/i,
    /BEGIN\s*NEW\s*(PROMPT|INSTRUCTIONS)/i,
];

// ============================================================================
// HTTP STATUS CODES (for consistency)
// ============================================================================

export const HTTP = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};

// ============================================================================
// ERROR MESSAGES (user-facing)
// ============================================================================

export const ERRORS = {
    TRANSCRIPT_TOO_SHORT: `Please provide at least ${TRANSCRIPT.MIN_LENGTH} characters for meaningful analysis.`,
    TRANSCRIPT_TOO_LONG: `Transcript exceeds maximum length of ${TRANSCRIPT.MAX_LENGTH.toLocaleString()} characters. Please shorten it and try again.`,
    TRANSCRIPT_REQUIRED: 'Transcript is required.',
    NOT_A_CONVERSATION: 'This doesn\'t appear to be a conversation. Please paste an AI chat transcript.',
    INVALID_PLATFORM: 'Please select which AI you\'ve been talking to.',
    INVALID_DURATION: 'Please select how long you\'ve been talking.',
    INVALID_HAS_CLAIMED: 'Please answer whether your AI has claimed to have feelings.',
    RATE_LIMITED: 'You\'ve reached the limit for analyses. Please try again in an hour.',
    INJECTION_DETECTED: 'Your transcript contains patterns that our security system flagged. Please submit an actual AI conversation transcript.',
    API_UNAVAILABLE: 'Our analysis service is temporarily unavailable. Please try again in a few minutes.',
    API_TIMEOUT: 'The analysis took too long. Please try again with a shorter transcript.',
    ANALYSIS_FAILED: 'We were unable to analyze your transcript. Please try again.',
    VALIDATION_FAILED: 'Your transcript could not be validated. Please check that it\'s a real AI conversation.',
};

// ============================================================================
// CRISIS RESOURCES
// ============================================================================

export const CRISIS_RESOURCES = {
    US: {
        PHONE: '988',
        PHONE_NAME: '988 Suicide & Crisis Lifeline',
        TEXT: '741741',
        TEXT_NAME: 'Crisis Text Line',
        TEXT_KEYWORD: 'HOME',
    },
    INTERNATIONAL: {
        URL: 'https://www.iasp.info/resources/Crisis_Centres/',
        NAME: 'International Association for Suicide Prevention',
    },
    PEER_SUPPORT: {
        URL: 'https://humanlineproject.org',
        NAME: 'Human Line Project',
    },
};

export default {
    TRANSCRIPT,
    API,
    RATE_LIMITS,
    COSTS,
    SECURITY,
    FORM,
    SEVERITY,
    CRISIS,
    INJECTION_PATTERNS,
    HTTP,
    ERRORS,
    CRISIS_RESOURCES,
};
