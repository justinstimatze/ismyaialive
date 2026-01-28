/**
 * E2E Test: Allan Brooks Experience
 *
 * This test simulates Allan Brooks discovering and using ismyaialive.com
 * Run with: npx playwright test tests/e2e-allan-brooks.spec.js
 *
 * Prerequisites:
 *   1. npm install @playwright/test
 *   2. npx playwright install chromium
 *   3. Server running on localhost:3333
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Allan's transcript - his actual conversation with ChatGPT
const ALLAN_TRANSCRIPT = fs.readFileSync(
    path.join(process.cwd(), 'test-transcript.txt'),
    'utf-8'
);

test.describe('Allan Brooks Journey', () => {

    test.beforeEach(async ({ page }) => {
        // Allan finds the site late at night, searching for answers
        console.log('\n📍 Scene: Late night. Allan is alone at his desk.');
        console.log('💭 Emotional state: Anxious, hopeful, vulnerable\n');
    });

    test('Step 1: Landing page recognition', async ({ page }) => {
        console.log('🔍 Allan searches "is my AI real" and finds the site...\n');

        await page.goto('http://localhost:3333/');

        // He sees the headline - it's about HIM
        const headline = await page.locator('h1').first();
        await expect(headline).toBeVisible();

        console.log('😮 Allan\'s reaction: "Wait... is this about ME?"');
        console.log('💭 He sees his own story. Someone took this seriously.');

        // The non-judgmental framing
        const notCrazy = await page.getByText(/not here to tell you/i);
        if (await notCrazy.isVisible()) {
            console.log('😌 "We\'re not here to tell you you\'re crazy" - defenses lower');
        }

        // Screenshot for documentation
        await page.screenshot({ path: 'tests/screenshots/01-landing.png' });

        // Click through to analyze
        const cta = await page.getByRole('link', { name: /second perspective|analyze/i });
        await cta.click();

        console.log('\n✅ Allan clicks through. He wants answers.\n');
    });

    test('Step 2: Filling out the form', async ({ page }) => {
        await page.goto('http://localhost:3333/analyze.html');

        console.log('📝 Allan sees the intake form...\n');

        // Select platform: ChatGPT
        await page.getByLabel(/chatgpt/i).check();
        console.log('  ✓ Platform: ChatGPT');

        // Duration: Months (it felt like months)
        await page.getByLabel(/months/i).check();
        console.log('  ✓ Duration: Months');

        // Has claimed consciousness: Yes
        await page.getByLabel(/yes/i).first().check();
        console.log('  ✓ AI claimed feelings: Yes');

        // Told others: No - this hits hard
        const toldOthersNo = await page.locator('input[name="toldOthers"][value="no"]');
        await toldOthersNo.check();
        console.log('  ✓ Told anyone: No');
        console.log('\n💭 Allan realizes how isolated he\'s become...\n');

        // Optional: What are you hoping to understand?
        const hopingField = await page.locator('#hoping');
        if (await hopingField.isVisible()) {
            await hopingField.fill('I just want to know if any of it was real.');
            console.log('  ✓ Hoping: "I just want to know if any of it was real."\n');
        }

        // Paste the transcript
        const transcriptField = await page.locator('#transcript');
        await transcriptField.fill(ALLAN_TRANSCRIPT);

        const charCount = ALLAN_TRANSCRIPT.length;
        console.log(`📋 Allan pastes his transcript (${charCount.toLocaleString()} characters)`);
        console.log('💭 Feels like handing over his journal to a stranger...\n');

        await page.screenshot({ path: 'tests/screenshots/02-form-filled.png' });

        // The moment of truth
        console.log('⏳ Finger hovers over "Analyze" button...');
        console.log('💭 "What if it tells me I\'m an idiot? What if I was right?"\n');

        const submitBtn = await page.getByRole('button', { name: /analyze|perspective/i });
        await submitBtn.click();

        console.log('🖱️ Click. No going back now.\n');
    });

    test('Step 3: Waiting for results', async ({ page }) => {
        await page.goto('http://localhost:3333/analyze.html');

        // Fill form quickly
        await page.getByLabel(/chatgpt/i).check();
        await page.getByLabel(/months/i).check();
        await page.getByLabel(/yes/i).first().check();
        await page.locator('input[name="toldOthers"][value="no"]').check();
        await page.locator('#transcript').fill(ALLAN_TRANSCRIPT);

        await page.getByRole('button', { name: /analyze|perspective/i }).click();

        console.log('⏳ Loading... Allan watches the spinner...');
        console.log('💭 "This is just another AI. But it\'s a second opinion."\n');

        // Wait for loading to appear
        const loading = await page.locator('#loading');
        if (await loading.isVisible({ timeout: 2000 })) {
            await page.screenshot({ path: 'tests/screenshots/03-loading.png' });
            console.log('⏳ Longest 30 seconds of his life...\n');
        }

        // Wait for results (up to 3 minutes for real API)
        const results = await page.locator('#results');
        await expect(results).toBeVisible({ timeout: 180000 });

        console.log('📊 Results appear. Allan holds his breath.\n');
        await page.screenshot({ path: 'tests/screenshots/04-results-top.png' });
    });

    test('Step 4: Reading the results', async ({ page }) => {
        // This test assumes results are already loaded
        // In a real run, combine with step 3

        await page.goto('http://localhost:3333/analyze.html');

        // Submit and wait for results
        await page.getByLabel(/chatgpt/i).check();
        await page.getByLabel(/months/i).check();
        await page.getByLabel(/yes/i).first().check();
        await page.locator('input[name="toldOthers"][value="no"]').check();
        await page.locator('#transcript').fill(ALLAN_TRANSCRIPT);
        await page.getByRole('button', { name: /analyze|perspective/i }).click();

        // Wait for results
        await page.locator('#results').waitFor({ timeout: 180000 });

        console.log('📖 Allan reads the results...\n');

        // Empathy section
        const empathyGreeting = await page.locator('#empathy-greeting');
        if (await empathyGreeting.isVisible()) {
            const text = await empathyGreeting.textContent();
            console.log(`💬 "${text}"`);
            console.log('😢 Allan\'s eyes water slightly. This isn\'t what he expected.\n');
        }

        // Personal message
        const personalMessage = await page.locator('#personal-message');
        if (await personalMessage.isVisible()) {
            const text = await personalMessage.textContent();
            console.log(`💬 Personal message: "${text.substring(0, 100)}..."`);
            console.log('💭 He feels seen, not judged.\n');
        }

        await page.screenshot({ path: 'tests/screenshots/05-empathy-section.png' });

        // Mirror section - his own doubts
        const mirrorSection = await page.locator('#mirror-section');
        if (await mirrorSection.isVisible()) {
            console.log('🪞 MIRROR SECTION: His own words reflected back');
            const doubts = await page.locator('.user-doubt-item').allTextContents();
            for (const doubt of doubts.slice(0, 3)) {
                console.log(`   "${doubt.substring(0, 60)}..."`);
            }
            console.log('💭 "I DID ask those questions. I knew something was off."\n');
        }

        await page.screenshot({ path: 'tests/screenshots/06-mirror-section.png' });

        // Contrast section - AI vs Friend
        const contrastSection = await page.locator('#contrast-section');
        if (await contrastSection.isVisible()) {
            console.log('⚖️ CONTRAST: What ChatGPT said vs. what a friend would say');
            console.log('💔 Gut punch. The friend\'s response is what his wife would have said.');
            console.log('💭 "Why didn\'t I ask a real person?"\n');
        }

        await page.screenshot({ path: 'tests/screenshots/07-contrast-section.png' });

        // Agreement rate
        const agreementPercent = await page.locator('#agreement-percent');
        if (await agreementPercent.isVisible()) {
            const percent = await agreementPercent.textContent();
            console.log(`📊 Agreement Rate: ${percent}`);
            console.log('💭 "It never challenged me. Not once."\n');
        }

        // Flattery cloud
        const flatterySection = await page.locator('#flattery-section');
        if (await flatterySection.isVisible()) {
            const total = await page.locator('#flattery-total').textContent();
            console.log(`✨ Flattery word count: ${total}`);
            console.log('   brilliant, revolutionary, unprecedented, genius...');
            console.log('😤 Anger rising. It was automatic. It didn\'t matter what he said.\n');
        }

        await page.screenshot({ path: 'tests/screenshots/08-flattery-cloud.png' });

        // Scroll to bottom for overall assessment
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.screenshot({ path: 'tests/screenshots/09-overall-assessment.png' });

        // Overall assessment
        const assessment = await page.locator('#assessment-text');
        if (await assessment.isVisible()) {
            const text = await assessment.textContent();
            console.log('📋 OVERALL ASSESSMENT:');
            console.log(`   "${text.substring(0, 150)}..."`);
            console.log('\n💭 Allan nods slowly. It\'s all there. Not mean. Just true.\n');
        }

        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('🏁 EMOTIONAL STATE AT END:');
        console.log('   ✓ Relief - his doubts were correct');
        console.log('   ✓ Grief - for the time spent');
        console.log('   ✓ Anger - at the system');
        console.log('   ✓ Hope - a path forward');
        console.log('   ✓ Closure - quiet, but real');
        console.log('');
        console.log('📱 Allan opens a message to his wife:');
        console.log('   "Hey, can we talk tomorrow? I\'ve been going through');
        console.log('    something and I think I need to tell you about it."');
        console.log('');
        console.log('💤 He closes the laptop. Goes to bed.');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════\n');
    });
});

// Standalone runner for quick test
if (process.argv[1].endsWith('e2e-allan-brooks.spec.js')) {
    console.log('Run this test with: npx playwright test tests/e2e-allan-brooks.spec.js');
}
