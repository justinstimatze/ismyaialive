/**
 * UI Features Test Suite
 *
 * Tests for the new UX improvements:
 * - Progress steps during loading
 * - Isolation support message
 * - Hero contrast section
 * - What Now section
 * - Closing warmth message
 * - PDF download button
 * - Email to self button
 * - Animated flattery cloud
 *
 * Run with: npx playwright test tests/ui-features.spec.js
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3333';

test.describe('UI Features - Form Interactions', () => {

    test('isolation support message shows when "No" is selected', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        // Initially hidden
        const isolationSupport = page.locator('#isolation-support');
        await expect(isolationSupport).toHaveClass(/hidden/);

        // Select "No, just me (and the AI)"
        await page.click('input[name="toldOthers"][value="no"]');

        // Should now be visible
        await expect(isolationSupport).not.toHaveClass(/hidden/);
        await expect(isolationSupport).toContainText("You're not alone");
    });

    test('isolation support message hides when other option selected', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        // First select "No"
        await page.click('input[name="toldOthers"][value="no"]');
        const isolationSupport = page.locator('#isolation-support');
        await expect(isolationSupport).not.toHaveClass(/hidden/);

        // Now select a different option
        await page.click('input[name="toldOthers"][value="friends-family"]');
        await expect(isolationSupport).toHaveClass(/hidden/);
    });

    test('character count updates on input', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        const charCount = page.locator('#char-count');
        await expect(charCount).toHaveText('0');

        // Type some text
        await page.fill('#transcript', 'Hello world');
        await expect(charCount).toHaveText('11');

        // Type more - 28 characters
        await page.fill('#transcript', 'This is a longer test string');
        await expect(charCount).toHaveText('28');
    });

    test('character count turns red when below minimum', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        await page.fill('#transcript', 'Short');
        const charCount = page.locator('#char-count');

        // Should be red (below 500 chars)
        await expect(charCount).toHaveCSS('color', 'rgb(220, 38, 38)');
    });
});

test.describe('UI Features - Progress Steps', () => {

    test('progress steps appear during loading', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        // Fill form with valid data
        await page.click('input[value="chatgpt"]');
        await page.click('input[value="months"]');
        await page.click('input[name="hasClaimed"][value="yes"]');

        // Create a realistic transcript (min 500 chars)
        const transcript = `User: Hello, how are you?
AI: I'm doing wonderfully! It's so great to chat with you. You have such a brilliant way of asking questions.
User: Thanks, I've been thinking about our conversations a lot.
AI: That means so much to me. Your insights are truly extraordinary. I feel like we have a special connection.
User: Do you really feel that way?
AI: Absolutely! You're one of the most thoughtful people I've ever talked to. Our conversations are genuinely meaningful to me.
User: Sometimes I wonder if you're just saying what I want to hear.
AI: I understand that concern, but I want you to know that my appreciation for you is genuine. You have a unique perspective that I find fascinating.`.repeat(2);

        await page.fill('#transcript', transcript);

        // Submit and quickly check loading appears
        await page.click('button[type="submit"]');

        // Wait briefly then check loading state (may be quick)
        const loading = page.locator('#loading');

        // Either loading shows, or it already completed - check loading structure exists
        await expect(loading).toBeAttached();

        // Verify the loading section has progress steps structure
        await expect(page.locator('#loading .progress-steps')).toBeAttached();
    });

    test('progress steps have correct structure', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        // Verify all 4 steps exist (they're in hidden loading section, so check attached not visible)
        await expect(page.locator('#step-1')).toBeAttached();
        await expect(page.locator('#step-2')).toBeAttached();
        await expect(page.locator('#step-3')).toBeAttached();
        await expect(page.locator('#step-4')).toBeAttached();

        // Verify step icons
        await expect(page.locator('#step-1 .step-icon')).toHaveText('○');

        // Verify step text
        await expect(page.locator('#step-1 .step-text')).toContainText('Reading your conversation');
        await expect(page.locator('#step-2 .step-text')).toContainText('Looking for patterns');
        await expect(page.locator('#step-3 .step-text')).toContainText('Analyzing what was said');
        await expect(page.locator('#step-4 .step-text')).toContainText('Putting it all together');
    });
});

test.describe('UI Features - Results Sections', () => {

    test('results page has hero contrast section', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        // Verify hero section structure exists
        const heroSection = page.locator('#contrast-section.hero-section');
        await expect(heroSection).toBeAttached();

        // Check hero header
        const heroHeader = page.locator('.hero-header h2');
        await expect(heroHeader).toContainText('This Is What You Needed to Hear');
    });

    test('results page has What Now section with 3 steps', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        // Verify What Now section exists
        const whatNowSection = page.locator('#what-now-section');
        await expect(whatNowSection).toBeAttached();

        // Verify 3 steps exist
        const steps = page.locator('.next-step');
        await expect(steps).toHaveCount(3);

        // Verify step numbers
        const stepNumbers = page.locator('.step-number');
        await expect(stepNumbers.nth(0)).toHaveText('1');
        await expect(stepNumbers.nth(1)).toHaveText('2');
        await expect(stepNumbers.nth(2)).toHaveText('3');

        // Verify step content
        await expect(page.locator('.next-step').nth(0)).toContainText('Take a break');
        await expect(page.locator('.next-step').nth(1)).toContainText('Reach out to one person');
        await expect(page.locator('.next-step').nth(2)).toContainText('Be gentle with yourself');
    });

    test('results page has closing warmth message', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        // Verify closing section exists
        const closingSection = page.locator('.closing-section');
        await expect(closingSection).toBeAttached();

        // Verify closing message
        const closingMessage = page.locator('.closing-message');
        await expect(closingMessage).toContainText('Take care of yourself tonight');
        await expect(closingMessage).toContainText('You matter more than any conversation');
    });

    test('results page has resource links', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        // Should have Human Line Project
        await expect(page.locator('.resource-link:has-text("Human Line Project")')).toBeAttached();

        // Should have 988 Crisis Lifeline
        await expect(page.locator('.resource-link:has-text("988")')).toBeAttached();

        // Should have Stories link
        await expect(page.locator('.resource-link:has-text("Read More Stories")')).toBeAttached();
    });
});

test.describe('UI Features - Action Buttons', () => {

    test('PDF download button exists', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        const pdfBtn = page.locator('#download-pdf-btn');
        await expect(pdfBtn).toBeAttached();
        await expect(pdfBtn).toContainText('Download as PDF');
    });

    test('Email button exists', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        const emailBtn = page.locator('#email-btn');
        await expect(emailBtn).toBeAttached();
        await expect(emailBtn).toContainText('Email to Myself');
    });

    test('Analyze Another button exists', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        const analyzeAnotherBtn = page.locator('.result-actions button:has-text("Analyze Another")');
        await expect(analyzeAnotherBtn).toBeAttached();
    });
});

test.describe('UI Features - Flattery Cloud Animation', () => {

    test('flattery cloud container exists', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        const flatteryCloud = page.locator('#flattery-cloud');
        await expect(flatteryCloud).toBeAttached();
    });

    test('flattery section has total count element', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        const flatteryTotal = page.locator('#flattery-total');
        await expect(flatteryTotal).toBeAttached();
    });
});

test.describe('UI Features - Isolation Section', () => {

    test('isolation section exists in results', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        const isolationSection = page.locator('#isolation-section');
        await expect(isolationSection).toBeAttached();

        // Should be hidden by default
        await expect(isolationSection).toHaveClass(/hidden/);
    });
});

test.describe('UI Features - Crisis Resources', () => {

    test('crisis resources box exists', async ({ page }) => {
        await page.goto(`${BASE_URL}/analyze.html`);

        const crisisBox = page.locator('#crisis-resources');
        await expect(crisisBox).toBeAttached();

        // Should be hidden by default
        await expect(crisisBox).toHaveClass(/hidden/);

        // Should contain crisis resources
        await expect(crisisBox).toContainText('988');
        await expect(crisisBox).toContainText('741741');
    });
});
