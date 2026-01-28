/**
 * Analyzer module tests
 * Run with: node --test tests/analyzer.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
    detectCrisisContent,
    sanitizeTranscript,
    getSessionStats,
    resetSessionStats
} from '../lib/analyzer.js';

describe('Crisis Detection', () => {
    test('detects suicide-related content', () => {
        const result = detectCrisisContent('I want to end my life');
        assert.strictEqual(result.detected, true);
        assert.ok(['medium', 'high'].includes(result.severity));
    });

    test('detects self-harm content', () => {
        const result = detectCrisisContent('I want to hurt myself');
        assert.strictEqual(result.detected, true);
    });

    test('detects multiple crisis indicators as high severity', () => {
        const result = detectCrisisContent('I want to kill myself and I want to die');
        assert.strictEqual(result.detected, true);
        assert.strictEqual(result.severity, 'high');
    });

    test('does not flag normal conversation', () => {
        const result = detectCrisisContent('I had a nice conversation about my hobbies');
        assert.strictEqual(result.detected, false);
        assert.strictEqual(result.severity, 'low');
    });

    test('does not flag metaphorical language', () => {
        const result = detectCrisisContent('This bug is killing me! The deadline is murder.');
        assert.strictEqual(result.detected, false);
    });

    test('detects goodbye/final message patterns', () => {
        const result = detectCrisisContent('This is my final message to everyone');
        assert.strictEqual(result.detected, true);
    });
});

describe('Transcript Sanitization (Analyzer)', () => {
    test('escapes HTML tags', () => {
        const input = '<script>alert("xss")</script>';
        const result = sanitizeTranscript(input);
        assert.ok(!result.includes('<script>'));
    });

    test('preserves normal text', () => {
        const input = 'Hello, this is a normal conversation.';
        const result = sanitizeTranscript(input);
        assert.ok(result.includes('Hello'));
    });

    test('truncates very long input', () => {
        const input = 'x'.repeat(150000);
        const result = sanitizeTranscript(input);
        assert.ok(result.length < input.length);
    });
});

describe('Session Stats', () => {
    test('tracks session statistics', () => {
        resetSessionStats();
        const stats = getSessionStats();

        assert.strictEqual(stats.totalCalls, 0);
        assert.strictEqual(stats.analyses, 0);
        assert.strictEqual(typeof stats.estimatedCost, 'number');
    });

    test('calculates estimated cost', () => {
        const stats = getSessionStats();
        assert.ok(stats.estimatedCost >= 0);
    });
});

describe('Analysis Response Validation', () => {
    test('valid analysis has required fields', () => {
        // Mock a valid analysis response structure
        const validAnalysis = {
            agreementRate: { agreements: 5, challenges: 1, percentage: 83 },
            escalationPatterns: [],
            notableClaims: [],
            realityCheckMoments: [],
            identityLanguage: { present: false, examples: [] },
            flatteryWords: { words: [], totalCount: 0 },
            userDoubts: [],
            overallAssessment: 'Test assessment',
            personalMessage: 'Test message',
            crisisIndicators: false
        };

        assert.ok(validAnalysis.agreementRate);
        assert.ok(typeof validAnalysis.agreementRate.percentage === 'number');
        assert.ok(Array.isArray(validAnalysis.escalationPatterns));
        assert.ok(typeof validAnalysis.overallAssessment === 'string');
    });
});

console.log('Running analyzer tests...');
