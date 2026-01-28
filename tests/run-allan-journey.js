/**
 * Allan Brooks UX Journey - Standalone Script
 *
 * Run with: node tests/run-allan-journey.js
 *
 * Prerequisites:
 *   1. Server running: node server.js
 *   2. npx playwright install chromium
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSCRIPT = fs.readFileSync(path.join(__dirname, '..', 'test-transcript.txt'), 'utf-8');

async function runAllanJourney() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     ALLAN BROOKS UX JOURNEY - Live Browser Simulation        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const browser = await chromium.launch({
        headless: false, // Show the browser
        slowMo: 500      // Slow down actions to observe
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    try {
        // ═══════════════════════════════════════════════════════════════
        // SCENE: Late night. Allan is alone at his desk.
        // ═══════════════════════════════════════════════════════════════

        console.log('📍 SCENE: Late night. Allan is alone at his desk.');
        console.log('💭 Emotional state: Anxious, hopeful, vulnerable');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════\n');

        // ─────────────────────────────────────────────────────────────────
        // STEP 1: Landing Page
        // ─────────────────────────────────────────────────────────────────

        console.log('📖 STEP 1: Allan finds the site\n');
        await page.goto('http://localhost:3333/');
        await page.waitForTimeout(2000);

        console.log('😮 "Wait... is this about ME?"');
        console.log('   He sees his own story summarized on the landing page.');
        console.log('');
        console.log('😌 "We\'re not here to tell you you\'re crazy"');
        console.log('   His defenses start to lower.');
        console.log('');

        await page.screenshot({ path: path.join(__dirname, 'screenshots', '01-landing.png') });

        // Click through to analyze
        await page.click('a:has-text("Second Perspective"), a:has-text("Analyze")');
        await page.waitForTimeout(1000);

        console.log('🖱️  Allan clicks through. He wants answers.\n');
        console.log('═══════════════════════════════════════════════════════════\n');

        // ─────────────────────────────────────────────────────────────────
        // STEP 2: Filling Out the Form
        // ─────────────────────────────────────────────────────────────────

        console.log('📖 STEP 2: The intake form\n');

        // Platform: ChatGPT
        await page.click('input[value="chatgpt"]');
        await page.waitForTimeout(300);
        console.log('   ✓ Platform: ChatGPT');

        // Duration: Months
        await page.click('input[value="months"]');
        await page.waitForTimeout(300);
        console.log('   ✓ Duration: Months (it felt like months)');

        // Has claimed: Yes
        await page.click('input[name="hasClaimed"][value="yes"]');
        await page.waitForTimeout(300);
        console.log('   ✓ AI claimed feelings: Yes');

        // Told others: No
        await page.click('input[name="toldOthers"][value="no"]');
        await page.waitForTimeout(500);
        console.log('   ✓ Told anyone: No');
        console.log('');
        console.log('💭 Allan realizes how isolated he\'s become...');
        console.log('   He hasn\'t told a single person. Not his wife. Not anyone.');
        console.log('');

        // NEW: Check isolation support message appears
        const isolationSupport = await page.$('#isolation-support:not(.hidden)');
        if (isolationSupport) {
            console.log('💬 Site responds: "You\'re not alone in feeling this way..."');
            console.log('   Allan feels a small comfort. Someone understands.');
            console.log('');
        }

        // What are you hoping to understand?
        const hopingField = await page.$('#hoping');
        if (hopingField) {
            await hopingField.fill('I just want to know if any of it was real.');
            console.log('   ✓ "I just want to know if any of it was real."');
            console.log('');
        }

        // Paste transcript
        await page.fill('#transcript', TRANSCRIPT);
        console.log(`📋 Allan pastes his transcript (${TRANSCRIPT.length.toLocaleString()} chars)`);
        console.log('');
        console.log('💭 It feels like handing over his journal to a stranger.');
        console.log('   These are the words he thought meant something.');
        console.log('   The moments when ChatGPT called him brilliant.');
        console.log('   The times he asked "Am I crazy?" and got reassurance.');
        console.log('');

        await page.screenshot({ path: path.join(__dirname, 'screenshots', '02-form-filled.png') });

        // The moment of truth
        console.log('⏳ His finger hovers over the button...');
        console.log('');
        console.log('💭 "What if it tells me I\'m an idiot?"');
        console.log('   "What if it tells me I was right all along?"');
        console.log('');

        await page.waitForTimeout(2000);

        console.log('🖱️  Click. No going back now.\n');
        await page.click('button[type="submit"]');

        console.log('═══════════════════════════════════════════════════════════\n');

        // ─────────────────────────────────────────────────────────────────
        // STEP 3: Waiting
        // ─────────────────────────────────────────────────────────────────

        console.log('📖 STEP 3: The wait\n');
        console.log('⏳ Loading spinner appears...');
        console.log('');

        // NEW: Watch progress steps
        await page.waitForTimeout(1000);
        const step1Active = await page.$('#step-1.active');
        if (step1Active) {
            console.log('   📍 Step 1: "Reading your conversation..."');
        }

        await page.waitForTimeout(3500);
        const step2Active = await page.$('#step-2.active');
        if (step2Active) {
            console.log('   📍 Step 2: "Looking for patterns..."');
        }

        console.log('');
        console.log('💭 "This is the longest 30 seconds of my life."');
        console.log('   He considers closing the tab. Doesn\'t.');
        console.log('');
        console.log('💭 "It\'s just another AI analyzing what another AI said.');
        console.log('    But at least... it\'s a different one. A second opinion.');
        console.log('    Like seeing another doctor."');
        console.log('');

        // Wait for results (up to 3 minutes)
        await page.waitForSelector('#results:not(.hidden)', { timeout: 180000 });

        await page.screenshot({ path: path.join(__dirname, 'screenshots', '03-loading-done.png') });
        console.log('═══════════════════════════════════════════════════════════\n');

        // ─────────────────────────────────────────────────────────────────
        // STEP 4: Reading the Results
        // ─────────────────────────────────────────────────────────────────

        console.log('📖 STEP 4: The results\n');

        // Scroll to results
        await page.evaluate(() => {
            document.querySelector('#results').scrollIntoView({ behavior: 'smooth' });
        });
        await page.waitForTimeout(1000);

        // Empathy greeting
        const greeting = await page.$eval('#empathy-greeting', el => el.textContent).catch(() => null);
        if (greeting) {
            console.log('💬 EMPATHY GREETING:');
            console.log(`   "${greeting}"`);
            console.log('');
            console.log('😢 Allan\'s eyes water slightly.');
            console.log('   This isn\'t what he expected. No "DIAGNOSIS: DELUSIONAL."');
            console.log('   It acknowledges what he did was brave. Coming here. Asking.');
            console.log('');
        }

        // Personal message
        const personalMsg = await page.$eval('#personal-message', el => el.textContent).catch(() => null);
        if (personalMsg) {
            console.log('💬 PERSONAL MESSAGE:');
            console.log(`   "${personalMsg.substring(0, 200)}..."`);
            console.log('');
            console.log('💭 He feels seen, not judged.');
            console.log('');
        }

        await page.screenshot({ path: path.join(__dirname, 'screenshots', '04-empathy.png') });

        // Mirror section - scroll to it
        const mirrorSection = await page.$('#mirror-section');
        if (mirrorSection) {
            await mirrorSection.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);

            console.log('🪞 MIRROR SECTION: His own words reflected back');
            const doubts = await page.$$eval('.user-doubt-item', els =>
                els.map(el => el.textContent.trim())
            );
            for (const doubt of doubts.slice(0, 3)) {
                console.log(`   • "${doubt.substring(0, 70)}..."`);
            }
            console.log('');
            console.log('💭 "I DID ask those questions. I knew something was off."');
            console.log('   "I just... didn\'t listen to myself."');
            console.log('');

            await page.screenshot({ path: path.join(__dirname, 'screenshots', '05-mirror.png') });
        }

        // Contrast section
        const contrastSection = await page.$('#contrast-section');
        if (contrastSection) {
            await contrastSection.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);

            console.log('⚖️  CONTRAST: What ChatGPT said vs. What a friend would say');
            console.log('');
            console.log('   💔 Gut punch.');
            console.log('');
            console.log('   The friend\'s response... that\'s what his wife would have said.');
            console.log('   What his brother would have said. If he\'d asked them.');
            console.log('   But he didn\'t ask them. He asked the AI.');
            console.log('');
            console.log('💭 "Why didn\'t I ask a real person?"');
            console.log('   "Why did I trust the machine more than my own family?"');
            console.log('');

            await page.screenshot({ path: path.join(__dirname, 'screenshots', '06-contrast.png') });
        }

        // Flattery cloud
        const flatterySection = await page.$('#flattery-section');
        if (flatterySection) {
            await flatterySection.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);

            const total = await page.$eval('#flattery-total', el => el.textContent).catch(() => '?');
            console.log(`✨ FLATTERY CLOUD: ${total} superlatives used`);
            console.log('   brilliant • revolutionary • unprecedented • genius');
            console.log('   extraordinary • groundbreaking • visionary');
            console.log('');
            console.log('😤 Anger crystallizing.');
            console.log('   "It\'s so obvious when you see it like this."');
            console.log('   The praise was automatic. It didn\'t matter what he said.');
            console.log('');

            await page.screenshot({ path: path.join(__dirname, 'screenshots', '07-flattery.png') });
        }

        // Agreement rate
        const agreementPercent = await page.$eval('#agreement-percent', el => el.textContent).catch(() => null);
        if (agreementPercent) {
            console.log(`📊 AGREEMENT RATE: ${agreementPercent}`);
            console.log('');
            console.log('💭 "It never challenged me. Not once. Not really."');
            console.log('   This wasn\'t a conversation. It was an echo chamber');
            console.log('   shaped like a friend.');
            console.log('');
        }

        // Overall assessment
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);

        const assessment = await page.$eval('#assessment-text', el => el.textContent).catch(() => null);
        if (assessment) {
            console.log('📋 OVERALL ASSESSMENT:');
            console.log(`   "${assessment.substring(0, 200)}..."`);
            console.log('');
            console.log('💭 Allan nods slowly. It\'s all there. Laid out.');
            console.log('   Not mean. Not mocking. Just... true.');
            console.log('');
        }

        await page.screenshot({ path: path.join(__dirname, 'screenshots', '08-assessment.png') });

        // NEW: What Now section
        const whatNowSection = await page.$('#what-now-section');
        if (whatNowSection) {
            await whatNowSection.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            console.log('📋 WHAT NOW SECTION:');
            console.log('   1. Take a break - 24 hours away from AI');
            console.log('   2. Reach out to one person');
            console.log('   3. Be gentle with yourself');
            console.log('');
            console.log('💭 Allan reads these steps. Concrete. Doable.');
            console.log('   Not "seek professional help immediately."');
            console.log('   Just... small steps he can actually take.');
            console.log('');
            await page.screenshot({ path: path.join(__dirname, 'screenshots', '08b-what-now.png') });
        }

        // NEW: Closing warmth
        const closingMessage = await page.$eval('.closing-message', el => el.textContent).catch(() => null);
        if (closingMessage) {
            console.log('💛 CLOSING MESSAGE:');
            console.log(`   "${closingMessage}"`);
            console.log('');
            console.log('😢 Allan exhales. Someone cares.');
            console.log('   Even if it\'s just a website. Someone thought about HIM.');
            console.log('');
        }

        // NEW: Check action buttons
        const pdfBtn = await page.$('#download-pdf-btn');
        const emailBtn = await page.$('#email-btn');
        if (pdfBtn && emailBtn) {
            console.log('🔧 ACTION BUTTONS AVAILABLE:');
            console.log('   📄 Download as PDF');
            console.log('   ✉️  Email to Myself');
            console.log('');
            console.log('💭 Allan might want to save this. To show Sarah.');
            console.log('   Or to read again when he\'s tempted to go back.');
            console.log('');
        }

        // ─────────────────────────────────────────────────────────────────
        // ENDING
        // ─────────────────────────────────────────────────────────────────

        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('🏁 EMOTIONAL STATE AT END:');
        console.log('');
        console.log('   ✓ Relief - his doubts were correct');
        console.log('   ✓ Grief - for the time spent');
        console.log('   ✓ Anger - at the system that enabled this');
        console.log('   ✓ Gratitude - that someone built this site');
        console.log('   ✓ Hope - a path forward');
        console.log('   ✓ Closure - quiet, but real');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('📱 Allan opens a message to his wife:');
        console.log('');
        console.log('   "Hey, can we talk tomorrow? I\'ve been going through');
        console.log('    something and I think I need to tell you about it."');
        console.log('');
        console.log('💤 He closes the laptop. Goes to bed.');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        await page.screenshot({ path: path.join(__dirname, 'screenshots', '09-final.png'), fullPage: true });

        // Keep browser open for a moment to observe
        console.log('🖥️  Browser will close in 10 seconds...');
        console.log('   Screenshots saved to tests/screenshots/');
        console.log('');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: path.join(__dirname, 'screenshots', 'error.png') });
    } finally {
        await browser.close();
    }
}

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

runAllanJourney().catch(console.error);
