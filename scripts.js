// API Configuration - Update with your actual backend URL
const API_BASE_URL = https://api.templetsolutions.com/;

// Initialize Application
function initializeApp() {
    initializeNavigation();
    
    if (window.location.pathname.includes('dashboard.html')) {
        initializeDashboard();
    }
    
    if (window.location.pathname.includes('pricing.html')) {
        initializePricingPage();
    }
    
    setupAnimationObserver();
}

// Navigation Functions
function initializeNavigation() {
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const dropdown = this.closest('.dropdown');
            dropdown.classList.toggle('open');
            
            // Close other dropdowns
            dropdownToggles.forEach(otherToggle => {
                if (otherToggle !== this) {
                    otherToggle.closest('.dropdown').classList.remove('open');
                }
            });
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            dropdownToggles.forEach(toggle => {
                toggle.closest('.dropdown').classList.remove('open');
            });
        }
    });
}

// Dashboard Functions
function initializeDashboard() {
    loadUserUsage();
    initializeAnalysisForm();
    loadRecentAnalyses();
}

async function loadUserUsage() {
    try {
        // Simulate API call - replace with actual endpoint
        const mockUsage = {
            used: 4,
            limit: 5,
            remaining: 1,
            percentage: 80,
            warning_level: 'warning_80',
            message: 'Warning: 1 analysis remains this month.',
            suggestion: 'You\'re approaching your monthly limit.',
            can_analyze: true
        };
        updateUsageDisplay(mockUsage);
        updateStats(mockUsage);
    } catch (error) {
        console.error('Error loading usage data:', error);
    }
}

function updateUsageDisplay(usageInfo) {
    const usageContainer = document.getElementById('usage-display');
    if (!usageContainer || !usageInfo) return;

    const warningClass = getWarningClass(usageInfo.warning_level);
    
    usageContainer.innerHTML = `
        <div class="usage-warning ${warningClass}">
            <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 0.5rem;">
                <h3 style="margin: 0; flex: 1;">
                    ${usageInfo.warning_level === 'limit_reached' ? 'Limit Reached' : 'Usage Alert'}
                </h3>
                <button onclick="dismissWarning()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; opacity: 0.7;">×</button>
            </div>
            <p style="margin-bottom: 0.5rem;">${usageInfo.message}</p>
            ${usageInfo.suggestion ? `<p style="margin-bottom: 1rem; font-size: 0.9rem; opacity: 0.8;">${usageInfo.suggestion}</p>` : ''}
            
            <div class="progress-bar">
                <div class="progress-fill ${warningClass}" 
                     style="width: ${Math.min(usageInfo.percentage, 100)}%"></div>
            </div>
            
            <div style="display: flex; justify-content: between; font-size: 0.8rem; margin-top: 0.5rem;">
                <span>${usageInfo.used}/${usageInfo.limit} used</span>
                <span>${usageInfo.remaining} remaining</span>
            </div>
            
            ${usageInfo.warning_level === 'limit_reached' ? `
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button onclick="window.location.href='pricing.html'" class="cta-button" style="padding: 0.5rem 1rem; font-size: 0.9rem;">Upgrade Plan</button>
                    <button onclick="initiateOneTimePurchase()" class="cta-button" style="padding: 0.5rem 1rem; font-size: 0.9rem; background: transparent; border: 1px solid var(--ts-teal); color: var(--ts-teal);">Buy One-Time</button>
                </div>
            ` : ''}
        </div>
    `;
}

function getWarningClass(warningLevel) {
    switch (warningLevel) {
        case 'warning_80': return 'warning-80';
        case 'warning_95': return 'warning-95';
        case 'limit_reached': return 'warning-limit';
        default: return 'warning-normal';
    }
}

function updateStats(usageInfo) {
    document.getElementById('total-analyses').textContent = '47';
    document.getElementById('monthly-used').textContent = usageInfo.used;
    document.getElementById('monthly-remaining').textContent = usageInfo.remaining;
    document.getElementById('average-score').textContent = '82';
}

function initializeAnalysisForm() {
    const analysisForm = document.getElementById('analysis-form');
    if (analysisForm) {
        analysisForm.addEventListener('submit', handleAnalysisSubmit);
    }
}

async function handleAnalysisSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const content = formData.get('content');
    const analysisType = formData.get('analysis_type');
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Analyzing...';
        submitBtn.disabled = true;
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock result - replace with actual API response
        const mockResult = {
            score: 78,
            grade: 'B+',
            dimensions: {
                'Credibility': 85,
                'Clarity': 72,
                'Comprehensiveness': 80,
                'Actionability': 65,
                'Technical Excellence': 90,
                'Timeliness': 75
            },
            recommendations: [
                'Add more specific, actionable steps for readers',
                'Include more recent data and examples',
                'Improve readability by breaking up long paragraphs',
                'Add more authoritative sources and citations'
            ]
        };
        
        displayAnalysisResult(mockResult);
        
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Analysis failed. Please try again.');
    } finally {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Analyze Content';
        submitBtn.disabled = false;
    }
}

function displayAnalysisResult(result) {
    const resultContainer = document.getElementById('analysis-result');
    if (!resultContainer) return;
    
    resultContainer.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <h2 style="margin-bottom: 1.5rem; color: var(--ts-text);">Analysis Result</h2>
            <div style="display: grid; grid-template-columns: 1fr; gap: 2rem;">
                <div>
                    <h3 style="margin-bottom: 1rem; color: var(--ts-text);">C⁴AT³ Score</h3>
                    <div style="text-align: center;">
                        <div style="font-size: 3rem; font-weight: 700; color: var(--ts-teal);">${result.score}/100</div>
                        <div style="font-size: 1.2rem; color: var(--ts-grey);">Grade: ${result.grade}</div>
                    </div>
                </div>
                <div>
                    <h3 style="margin-bottom: 1rem; color: var(--ts-text);">Dimension Breakdown</h3>
                    ${Object.entries(result.dimensions).map(([dim, score]) => `
                        <div style="margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: between; margin-bottom: 0.5rem;">
                                <span>${dim}</span>
                                <span>${score}/100</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${score}%; background: var(--ts-teal);"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ${result.recommendations ? `
                <div style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--ts-text);">Recommendations</h3>
                    <ul style="list-style: disc; padding-left: 1.5rem;">
                        ${result.recommendations.map(rec => `<li style="margin-bottom: 0.5rem; line-height: 1.6;">${rec}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
    
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

function loadRecentAnalyses() {
    // Mock recent analyses
    const recentContainer = document.getElementById('recent-analyses');
    if (recentContainer) {
        recentContainer.innerHTML = `
            <div style="border-bottom: 1px solid #eee; padding: 1rem 0;">
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
                    <strong>Blog Post Analysis</strong>
                    <span style="color: var(--ts-teal); font-weight: 600;">84/100</span>
                </div>
                <div style="font-size: 0.9rem; color: var(--ts-grey);">Analyzed 2 days ago</div>
            </div>
            <div style="border-bottom: 1px solid #eee; padding: 1rem 0;">
                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
                    <strong>Product Page Review</strong>
                    <span style="color: var(--ts-teal); font-weight: 600;">76/100</span>
                </div>
                <div style="font-size: 0.9rem; color: var(--ts-grey);">Analyzed 1 week ago</div>
            </div>
        `;
    }
}

// Pricing Page Functions
function initializePricingPage() {
    // Handle plan selection from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const selectedPlan = urlParams.get('plan');
    if (selectedPlan) {
        highlightPlan(selectedPlan);
    }
}

function highlightPlan(plan) {
    const planElement = document.querySelector(`[onclick*="${plan}"]`);
    if (planElement) {
        planElement.scrollIntoView({ behavior: 'smooth' });
    }
}

async function initiateCheckout(plan) {
    try {
        // Simulate checkout process
        console.log('Initiating checkout for plan:', plan);
        alert(`Redirecting to checkout for ${plan} plan...`);
        // In production, this would redirect to Stripe
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Failed to initiate checkout. Please try again.');
    }
}

function initiateOneTimePurchase() {
    alert('Redirecting to one-time purchase checkout...');
}

// Animation Functions
function setupAnimationObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.8s ease forwards';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// Utility Functions
function dismissWarning() {
    const usageContainer = document.getElementById('usage-display');
    if (usageContainer) {
        usageContainer.style.display = 'none';
    }
}
