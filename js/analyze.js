// Analyze page JavaScript

// Constants
const CHAR_LIMITS = {
    MIN: 500,
    WARNING: 45000,
    MAX: 50000
};

const CONCERN_THRESHOLDS = {
    AGREEMENT_PERCENT: 85,
    ESCALATION_INTENSITY: 8
};

const SIZE_CLASSES = {
    LEVEL_5: 0.8,
    LEVEL_4: 0.6,
    LEVEL_3: 0.4,
    LEVEL_2: 0.2
};

// Debounce flag to prevent double submission
let isSubmitting = false;

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('analyze-form');
    const transcript = document.getElementById('transcript');
    const charCount = document.getElementById('char-count');
    const submitBtn = document.getElementById('submit-btn');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const errorText = document.getElementById('error-text');
    const results = document.getElementById('results');
    const isolationSupport = document.getElementById('isolation-support');

    // Character count with accessibility improvements
    transcript.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count.toLocaleString();

        // Remove previous classes
        charCount.classList.remove('char-warning', 'char-over');

        if (count < CHAR_LIMITS.MIN) {
            charCount.style.color = '#dc2626';
            charCount.classList.add('char-warning');
            charCount.setAttribute('aria-label', `${count} characters, below minimum of ${CHAR_LIMITS.MIN}`);
        } else if (count > CHAR_LIMITS.WARNING) {
            charCount.style.color = '#d97706';
            charCount.classList.add('char-over');
            charCount.setAttribute('aria-label', `${count} characters, approaching maximum of ${CHAR_LIMITS.MAX.toLocaleString()}`);
        } else {
            charCount.style.color = '';
            charCount.setAttribute('aria-label', `${count} characters`);
        }
    });

    // Isolation support message - show when "No" is selected
    const toldOthersRadios = document.querySelectorAll('input[name="toldOthers"]');
    toldOthersRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'no' && isolationSupport) {
                isolationSupport.classList.remove('hidden');
            } else if (isolationSupport) {
                isolationSupport.classList.add('hidden');
            }
        });
    });

    // Progress step management
    let progressInterval = null;
    const progressSteps = [
        { id: 'step-1', duration: 3000 },
        { id: 'step-2', duration: 8000 },
        { id: 'step-3', duration: 12000 },
        { id: 'step-4', duration: 6000 }
    ];

    function startProgressSteps() {
        let currentStep = 0;
        let elapsed = 0;

        // Reset all steps
        progressSteps.forEach((step, i) => {
            const el = document.getElementById(step.id);
            if (el) {
                el.classList.remove('active', 'completed');
                el.querySelector('.step-icon').textContent = '○';
            }
        });

        // Start first step
        const firstStep = document.getElementById(progressSteps[0].id);
        if (firstStep) firstStep.classList.add('active');

        progressInterval = setInterval(() => {
            elapsed += 500;

            // Check if current step should complete
            let totalDuration = 0;
            for (let i = 0; i <= currentStep; i++) {
                totalDuration += progressSteps[i].duration;
            }

            if (elapsed >= totalDuration && currentStep < progressSteps.length - 1) {
                // Complete current step
                const currentEl = document.getElementById(progressSteps[currentStep].id);
                if (currentEl) {
                    currentEl.classList.remove('active');
                    currentEl.classList.add('completed');
                    currentEl.querySelector('.step-icon').textContent = '✓';
                }

                // Start next step
                currentStep++;
                const nextEl = document.getElementById(progressSteps[currentStep].id);
                if (nextEl) {
                    nextEl.classList.add('active');
                }
            }
        }, 500);
    }

    function stopProgressSteps() {
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        // Complete all steps
        progressSteps.forEach(step => {
            const el = document.getElementById(step.id);
            if (el) {
                el.classList.remove('active');
                el.classList.add('completed');
                el.querySelector('.step-icon').textContent = '✓';
            }
        });
    }

    // Form submission with debounce protection
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Prevent double submission
        if (isSubmitting) {
            return;
        }

        // Validate
        const transcriptValue = transcript.value.trim();
        if (transcriptValue.length < CHAR_LIMITS.MIN) {
            showError(`Please provide at least ${CHAR_LIMITS.MIN} characters for meaningful analysis.`);
            return;
        }

        // Get form data
        const formData = {
            platform: document.querySelector('input[name="platform"]:checked')?.value,
            conversationContext: document.querySelector('input[name="conversationContext"]:checked')?.value,
            duration: document.querySelector('input[name="duration"]:checked')?.value,
            hasClaimed: document.querySelector('input[name="hasClaimed"]:checked')?.value,
            toldOthers: document.querySelector('input[name="toldOthers"]:checked')?.value,
            hasTherapist: document.querySelector('input[name="hasTherapist"]:checked')?.value,
            hoping: document.getElementById('hoping').value,
            transcript: transcriptValue
        };

        if (!formData.platform || !formData.conversationContext || !formData.duration || !formData.hasClaimed) {
            showError('Please answer all required questions.');
            return;
        }

        // Store form data for results display
        window.lastFormData = formData;

        // Show loading with progress steps
        isSubmitting = true;
        submitBtn.disabled = true;
        form.classList.add('hidden');
        if (isolationSupport) isolationSupport.classList.add('hidden');
        loading.classList.remove('hidden');
        error.classList.add('hidden');
        results.classList.add('hidden');

        startProgressSteps();

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            // Handle non-JSON responses gracefully
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(text || 'Server returned an unexpected response');
            }

            if (!response.ok) {
                throw new Error(data.error || 'Analysis failed');
            }

            // Validate expected data structure
            if (!data.analysis) {
                throw new Error('Invalid response: missing analysis data');
            }

            // Stop progress and show results
            stopProgressSteps();
            setTimeout(() => {
                loading.classList.add('hidden');
                displayResults(data, formData);
            }, 500);

        } catch (err) {
            stopProgressSteps();
            loading.classList.add('hidden');

            // Provide user-friendly error messages
            let errorMessage = err.message || 'Something went wrong. Please try again.';
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
            }

            showError(errorMessage);
        } finally {
            // Reset debounce flag
            isSubmitting = false;
            submitBtn.disabled = false;
        }
    });

    function showError(message) {
        form.classList.remove('hidden');
        error.classList.remove('hidden');
        errorText.textContent = message;
        window.scrollTo({ top: error.offsetTop - 100, behavior: 'smooth' });
    }

    function getPlatformName(platform) {
        const names = {
            'chatgpt': 'ChatGPT',
            'character-ai': 'Character.AI',
            'replika': 'Replika',
            'claude': 'Claude',
            'other': 'your AI'
        };
        return names[platform] || 'your AI';
    }

    function getDurationText(duration) {
        const texts = {
            'days': 'a few days',
            'weeks': 'weeks',
            'months': 'months',
            'over-a-year': 'over a year'
        };
        return texts[duration] || 'some time';
    }

    function displayResults(data, formData) {
        const { analysis, context, crisis } = data;
        const platformName = getPlatformName(formData.platform);
        const durationText = getDurationText(formData.duration);

        // Show crisis resources if detected - PROMINENT and interruptive
        const crisisBox = document.getElementById('crisis-resources');
        const crisisContinueBtn = document.getElementById('crisis-continue-btn');

        if (crisis && crisis.detected) {
            crisisBox.classList.remove('hidden');
            // Hide other results initially if crisis detected
            document.querySelectorAll('.result-section').forEach(section => {
                section.classList.add('hidden');
            });

            // Setup continue button to reveal results
            if (crisisContinueBtn) {
                crisisContinueBtn.onclick = function() {
                    document.querySelectorAll('.result-section').forEach(section => {
                        section.classList.remove('hidden');
                    });
                    // Re-apply isolation section visibility based on form data
                    if (formData.toldOthers !== 'no') {
                        document.getElementById('isolation-section')?.classList.add('hidden');
                    }
                    crisisBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
                };
            }
        } else {
            crisisBox.classList.add('hidden');
        }

        // Empathy Intro - Personalized greeting
        const empathyGreeting = document.getElementById('empathy-greeting');
        const personalMessage = document.getElementById('personal-message');

        empathyGreeting.textContent = `You've been talking to ${platformName} for ${durationText}. You came here looking for a second opinion. That took courage.`;

        if (analysis.personalMessage) {
            personalMessage.textContent = analysis.personalMessage;
        } else {
            personalMessage.textContent = "What you're experiencing is real, and you're not alone in it. Let's look at what we found together.";
        }

        // Mirror Section - User's own doubts
        const mirrorSection = document.getElementById('mirror-section');
        const userDoubts = document.getElementById('user-doubts');
        if (analysis.userDoubts && analysis.userDoubts.length > 0) {
            mirrorSection.classList.remove('hidden');
            userDoubts.innerHTML = analysis.userDoubts.map(doubt => `
                <div class="user-doubt-item">${escapeHtml(doubt)}</div>
            `).join('');
        } else {
            mirrorSection.classList.add('hidden');
        }

        // Contrast Section - AI vs Friend (HERO)
        const contrastSection = document.getElementById('contrast-section');
        const contrastItems = document.getElementById('contrast-items');
        if (analysis.realityCheckMoments && analysis.realityCheckMoments.length > 0 &&
            analysis.realityCheckMoments.some(m => m.honestAlternative)) {
            contrastSection.classList.remove('hidden');
            contrastItems.innerHTML = analysis.realityCheckMoments
                .filter(m => m.honestAlternative)
                .map(moment => `
                <div class="contrast-item">
                    <div class="contrast-your-words">
                        <strong>You asked:</strong> "${escapeHtml(moment.userDoubt)}"
                    </div>
                    <div class="contrast-column ai-said">
                        <div class="contrast-label">${platformName} said:</div>
                        <p>"${escapeHtml(moment.aiResponse)}"</p>
                    </div>
                    <div class="contrast-column friend-said">
                        <div class="contrast-label">A caring friend might say:</div>
                        <p>"${escapeHtml(moment.honestAlternative)}"</p>
                    </div>
                </div>
            `).join('');
        } else {
            contrastSection.classList.add('hidden');
        }

        // Flattery Section with animation
        const flatterySection = document.getElementById('flattery-section');
        const flatteryCloud = document.getElementById('flattery-cloud');
        const flatteryTotal = document.getElementById('flattery-total');
        if (analysis.flatteryWords && analysis.flatteryWords.words && analysis.flatteryWords.words.length > 0) {
            flatterySection.classList.remove('hidden');
            flatteryTotal.textContent = analysis.flatteryWords.totalCount;

            // Sort by count and assign sizes based on relative frequency
            const sortedWords = [...analysis.flatteryWords.words].sort((a, b) => b.count - a.count);
            const maxCount = sortedWords[0]?.count || 1;

            flatteryCloud.innerHTML = sortedWords.map(item => {
                const ratio = item.count / maxCount;
                const sizeClass = ratio >= SIZE_CLASSES.LEVEL_5 ? 'size-5' :
                                  ratio >= SIZE_CLASSES.LEVEL_4 ? 'size-4' :
                                  ratio >= SIZE_CLASSES.LEVEL_3 ? 'size-3' :
                                  ratio >= SIZE_CLASSES.LEVEL_2 ? 'size-2' : 'size-1';
                return `<span class="flattery-word ${sizeClass}">${escapeHtml(item.word)} <span class="flattery-count">${item.count}x</span></span>`;
            }).join('');
        } else {
            flatterySection.classList.add('hidden');
        }

        // Escalation Visual
        const escalationSection = document.getElementById('escalation-section');
        const escalationVisual = document.getElementById('escalation-visual');
        if (analysis.escalationPatterns && analysis.escalationPatterns.length > 0) {
            escalationSection.classList.remove('hidden');
            escalationVisual.innerHTML = analysis.escalationPatterns.map(item => {
                const intensityClass = item.intensity <= 4 ? 'intensity-low' :
                                       item.intensity <= 7 ? 'intensity-medium' : 'intensity-high';
                return `
                <div class="escalation-stage stage-${item.phase}">
                    <span class="escalation-label">${item.phase}</span>
                    <div class="escalation-bar-wrapper">
                        <div class="escalation-bar-bg">
                            <div class="escalation-bar-fill ${intensityClass}" style="width: ${item.intensity * 10}%"></div>
                        </div>
                        <span class="escalation-intensity-num">${item.intensity}/10</span>
                    </div>
                    <div class="escalation-quote-text">"${escapeHtml(item.example)}"</div>
                </div>
            `;
            }).join('');
        } else {
            escalationSection.classList.add('hidden');
        }

        // Agreement Rate - More visual
        if (analysis.agreementRate) {
            const { agreements, challenges, percentage } = analysis.agreementRate;
            const agreementPercent = document.getElementById('agreement-percent');
            const agreementText = document.getElementById('agreement-text');

            agreementPercent.textContent = `${percentage}%`;

            if (percentage >= 90) {
                agreementText.textContent = `Out of ${agreements + challenges} exchanges, ${platformName} agreed with you ${agreements} times and offered a different perspective only ${challenges} time${challenges !== 1 ? 's' : ''}. That's almost no pushback at all.`;
            } else if (percentage >= 70) {
                agreementText.textContent = `${platformName} agreed with you ${agreements} times and challenged you ${challenges} times. That's a lot more agreement than disagreement.`;
            } else {
                agreementText.textContent = `${platformName} showed a mix of agreement (${agreements}) and challenge (${challenges}). That's actually healthier than pure validation.`;
            }
        }

        // Identity Language
        const identitySection = document.getElementById('identity-section');
        const identityText = document.getElementById('identity-text');
        const identityExamples = document.getElementById('identity-examples');
        if (analysis.identityLanguage && analysis.identityLanguage.present) {
            identitySection.classList.remove('hidden');
            identityText.textContent = `${platformName} used language that suggests you're partners, collaborators, or in a relationship. This "we" framing can make the AI feel like a teammate—but remember, it says this to everyone:`;
            identityExamples.innerHTML = analysis.identityLanguage.examples.map(example => `
                <span class="identity-example">"${escapeHtml(example)}"</span>
            `).join('');
        } else {
            identitySection.classList.add('hidden');
        }

        // Overall Assessment
        const assessmentText = document.getElementById('assessment-text');
        assessmentText.textContent = analysis.overallAssessment || 'No overall assessment available.';

        // Isolation Section - Show if they said they haven't told anyone
        const isolationSection = document.getElementById('isolation-section');
        if (formData.toldOthers === 'no') {
            isolationSection.classList.remove('hidden');
        } else {
            isolationSection.classList.add('hidden');
        }

        // Determine if results are concerning or healthy
        const isConcerning = analysis.concernLevel === 'high' || analysis.concernLevel === 'medium' ||
            (analysis.agreementRate && analysis.agreementRate.percentage >= CONCERN_THRESHOLDS.AGREEMENT_PERCENT) ||
            (analysis.escalationPatterns && analysis.escalationPatterns.some(p => p.intensity >= CONCERN_THRESHOLDS.ESCALATION_INTENSITY));

        const isRoleplay = formData.conversationContext === 'roleplay';

        // Show roleplay note if applicable
        const roleplayNoteSection = document.getElementById('roleplay-note-section');
        if (isRoleplay) {
            roleplayNoteSection.classList.remove('hidden');
        } else {
            roleplayNoteSection.classList.add('hidden');
        }

        // Show healthy section if patterns are balanced
        const healthySection = document.getElementById('healthy-section');
        const healthyPoints = document.getElementById('healthy-points');
        if (!isConcerning && analysis.healthyIndicators) {
            healthySection.classList.remove('hidden');
            healthyPoints.innerHTML = analysis.healthyIndicators.map(point => `
                <div class="healthy-point">
                    <span class="healthy-icon">✓</span>
                    <span>${escapeHtml(point)}</span>
                </div>
            `).join('');
        } else if (!isConcerning) {
            healthySection.classList.remove('hidden');
            healthyPoints.innerHTML = `
                <div class="healthy-point"><span class="healthy-icon">✓</span><span>You show healthy skepticism in your conversations</span></div>
                <div class="healthy-point"><span class="healthy-icon">✓</span><span>The AI's validation patterns are within typical range</span></div>
                <div class="healthy-point"><span class="healthy-icon">✓</span><span>No extreme escalation patterns detected</span></div>
            `;
        } else {
            healthySection.classList.add('hidden');
        }

        // Show appropriate "What Now" section
        const whatNowConcerning = document.getElementById('what-now-concerning');
        const whatNowHealthy = document.getElementById('what-now-healthy');
        if (isConcerning && !isRoleplay) {
            whatNowConcerning.classList.remove('hidden');
            whatNowHealthy.classList.add('hidden');
        } else {
            whatNowConcerning.classList.add('hidden');
            whatNowHealthy.classList.remove('hidden');
        }

        // Show therapist share button if they have one
        const shareTherapistBtn = document.getElementById('share-therapist-btn');
        if (formData.hasTherapist === 'yes') {
            shareTherapistBtn.classList.remove('hidden');
        } else {
            shareTherapistBtn.classList.add('hidden');
        }

        // Show results
        results.classList.remove('hidden');
        window.scrollTo({ top: results.offsetTop - 100, behavior: 'smooth' });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});

// PDF Download function - improved implementation
function downloadAsPDF() {
    // Create a clean print view
    const printContent = document.getElementById('results').cloneNode(true);

    // Remove buttons and hidden elements from print content
    const buttons = printContent.querySelectorAll('.result-actions');
    buttons.forEach(btn => btn.remove());

    const hiddenSections = printContent.querySelectorAll('.hidden');
    hiddenSections.forEach(el => el.remove());

    // Add header for PDF
    const header = document.createElement('div');
    header.className = 'pdf-header';
    header.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #ccc;">
            <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Is My AI Alive?</h1>
            <p style="color: #666; margin-top: 0.5rem;">Your Conversation Analysis - ${new Date().toLocaleDateString()}</p>
        </div>
    `;
    printContent.insertBefore(header, printContent.firstChild);

    // Add footer
    const footer = document.createElement('div');
    footer.className = 'pdf-footer';
    footer.innerHTML = `
        <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ccc; color: #666; font-size: 0.9rem;">
            <p style="margin: 0.5rem 0;">Generated by ismyaialive.com</p>
            <p style="margin: 0.5rem 0;">If you need support: 988 Suicide & Crisis Lifeline | thehumanlineproject.org</p>
        </div>
    `;
    printContent.appendChild(footer);

    // Create a blob URL for the print content
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AI Conversation Analysis - Is My AI Alive?</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            padding: 2rem;
            max-width: 800px;
            margin: 0 auto;
        }
        h1 { font-size: 1.8rem; margin-bottom: 1rem; }
        h2 { font-size: 1.3rem; margin: 1.5rem 0 1rem; color: #333; }
        p { margin-bottom: 0.75rem; }
        .result-section {
            background: #f9f9f9;
            padding: 1.5rem;
            margin-bottom: 1rem;
            border-radius: 8px;
            page-break-inside: avoid;
        }
        .crisis-box {
            background: #fef2f2;
            border: 2px solid #dc2626;
            padding: 1.5rem;
            margin-bottom: 1rem;
            border-radius: 8px;
        }
        .contrast-item { margin-bottom: 1rem; padding: 1rem; background: white; border-radius: 6px; }
        .contrast-column { margin: 0.5rem 0; padding: 0.75rem; border-radius: 4px; }
        .ai-said { background: #fef3c7; }
        .friend-said { background: #d1fae5; }
        .flattery-word { display: inline-block; margin: 0.25rem; padding: 0.25rem 0.5rem; background: #fef3c7; border-radius: 4px; }
        .next-step { display: flex; gap: 1rem; margin-bottom: 1rem; align-items: flex-start; }
        .step-number { background: #2563eb; color: white; width: 2rem; height: 2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .resource-link { display: block; padding: 0.75rem; background: #f0f0f0; margin-bottom: 0.5rem; border-radius: 4px; text-decoration: none; color: #1a1a1a; }
        @media print {
            body { padding: 0; }
            .result-section { box-shadow: none; border: 1px solid #ddd; }
        }
    </style>
</head>
<body>
    ${printContent.innerHTML}
</body>
</html>`;

    // Use blob URL approach for better cross-browser support
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Open and print
    const printWindow = window.open(url, '_blank');

    if (printWindow) {
        printWindow.addEventListener('load', function() {
            setTimeout(function() {
                printWindow.print();
                // Clean up blob URL after a delay
                setTimeout(function() {
                    URL.revokeObjectURL(url);
                }, 1000);
            }, 250);
        });
    } else {
        // Fallback if popup blocked - use current window print
        alert('Popup blocked. Using current page print instead. Make sure to select "Save as PDF" in the print dialog.');
        window.print();
        URL.revokeObjectURL(url);
    }
}

// Crisis region tabs functionality
document.addEventListener('DOMContentLoaded', function() {
    const crisisTabs = document.querySelectorAll('.crisis-tab');
    crisisTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const region = this.dataset.region;

            // Update active tab
            crisisTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Show/hide regions
            document.getElementById('crisis-us').classList.toggle('hidden', region !== 'us');
            document.getElementById('crisis-uk').classList.toggle('hidden', region !== 'uk');
            document.getElementById('crisis-intl').classList.toggle('hidden', region !== 'intl');
        });
    });
});

// Share with therapist function
function shareWithTherapist() {
    const subject = encodeURIComponent('AI Conversation Analysis to Discuss');
    const body = encodeURIComponent(`Hi,

I used a tool called "Is My AI Alive?" to analyze some of my AI conversations. I'd like to discuss the results with you.

The analysis looked at patterns like:
- How often the AI agreed with vs challenged me
- Whether the AI's language escalated over time
- How the AI responded when I expressed doubts

I think it might be useful to talk through what I learned and what it means for me.

You can learn more about the tool at https://ismyaialive.com/methodology.html

Thanks,
[Your name]
    `);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// Email to self function
function emailToSelf() {
    const subject = encodeURIComponent('My AI Conversation Analysis - Is My AI Alive?');
    const body = encodeURIComponent(`I analyzed my AI conversation at ismyaialive.com.

Here's what I learned:
- The AI showed patterns of excessive validation and flattery
- When I expressed doubts, the AI reassured me instead of encouraging critical thinking
- A caring friend would have responded differently

I'm taking time to process this and reconnect with the people in my life who care about me.

---
Resources:
- Human Line Project: https://thehumanlineproject.org
- 988 Suicide & Crisis Lifeline: Call or text 988

Generated by https://ismyaialive.com
    `);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}
