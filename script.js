// API Configuration - Connected to your Google Cloud Run backend
const API_BASE_URL = 'https://api.templetsolutions.com';

// Authentication token management
function getAuthToken() {
    return localStorage.getItem('c4at3_token');
}

function setAuthToken(token) {
    localStorage.setItem('c4at3_token', token);
}

function removeAuthToken() {
    localStorage.removeItem('c4at3_token');
}

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
        const token = getAuthToken();
        if (!token) {
            // Redirect to login or show login prompt
            showLoginPrompt();
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/analytics/usage`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            // Token expired or invalid
            removeAuthToken();
            showLoginPrompt();
            return;
        }
        
        if (response.ok) {
            const usageData = await response.json();
            updateUsageDisplay(usageData);
            updateStats(usageData);
        } else {
            throw new Error('Failed to load usage data');
        }
        
    } catch (error) {
        console.error('Error loading usage data:', error);
        // Fallback to mock data for demo
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
    // Update with real data from your analytics endpoint
    document.getElementById('total-analyses').textContent = usageInfo.analytics?.total_analyses || '0';
    document.getElementById('monthly-used').textContent = usageInfo.used || '0';
    document.getElementById('monthly-remaining').textContent = usageInfo.remaining || '0';
    document.getElementById('average-score').textContent = usageInfo.analytics?.average_score || '0';
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
    
    const token = getAuthToken();
    if (!token) {
        showLoginPrompt();
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Analyzing...';
        submitBtn.disabled = true;
        
        // Real API call to your backend
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: content, // Assuming content is URL for now
                tier: analysisType // basic, detailed, competitor
            })
        });
        
        if (response.status === 429) {
            // Usage limit exceeded
            const errorData = await response.json();
            alert(`Usage limit: ${errorData.detail}`);
            return;
        }
        
        if (response.status === 402) {
            // Payment required
            showUpgradeModal();
            return;
        }
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.status === 'processing') {
                // Poll for completion
                await pollAnalysisResult(result.analysis_id);
            } else {
                displayAnalysisResult(result.score);
            }
            
            // Reload usage data and history
            loadUserUsage();
            loadRecentAnalyses();
            
        } else {
            throw new Error('Analysis failed');
        }
        
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Analysis failed. Please try again.');
    } finally {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Analyze Content';
        submitBtn.disabled = false;
    }
}

async function pollAnalysisResult(analysisId) {
    const token = getAuthToken();
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/analyses/${analysisId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.status === 'completed' || result.full_results) {
                    displayAnalysisResult(result.full_results || result.score);
                    return;
                }
            }
            
            // Wait 1 second before next poll
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
            
        } catch (error) {
            console.error('Polling error:', error);
            break;
        }
    }
    
    alert('Analysis timed out. Please check your analysis history.');
}

function displayAnalysisResult(result) {
    const resultContainer = document.getElementById('analysis-result');
    if (!resultContainer) return;
    
    // Format the result based on your backend response structure
    const score = result.total_score || result.score || 0;
    const grade = result.grade || calculateGrade(score);
    const dimensions = result.dimensions || result.score_breakdown || {};
    const recommendations = result.recommendations || [];
    
    resultContainer.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <h2 style="margin-bottom: 1.5rem; color: var(--ts-text);">Analysis Result</h2>
            <div style="display: grid; grid-template-columns: 1fr; gap: 2rem;">
                <div>
                    <h3 style="margin-bottom: 1rem; color: var(--ts-text);">C⁴AT³ Score</h3>
                    <div style="text-align: center;">
                        <div style="font-size: 3rem; font-weight: 700; color: var(--ts-teal);">${score}/100</div>
                        <div style="font-size: 1.2rem; color: var(--ts-grey);">Grade: ${grade}</div>
                    </div>
                </div>
                <div>
                    <h3 style="margin-bottom: 1rem; color: var(--ts-text);">Dimension Breakdown</h3>
                    ${Object.entries(dimensions).map(([dim, score]) => `
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
            ${recommendations.length > 0 ? `
                <div style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--ts-text);">Recommendations</h3>
                    <ul style="list-style: disc; padding-left: 1.5rem;">
                        ${recommendations.map(rec => `<li style="margin-bottom: 0.5rem; line-height: 1.6;">${rec}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
    
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

function calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

async function loadRecentAnalyses() {
    const token = getAuthToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/analyses?page=1&per_page=5`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayRecentAnalyses(data.analyses || []);
        }
    } catch (error) {
        console.error('Failed to load recent analyses:', error);
        // Fallback to empty state
        displayRecentAnalyses([]);
    }
}

function displayRecentAnalyses(analyses) {
    const recentContainer = document.getElementById('recent-analyses');
    if (!recentContainer) return;
    
    if (analyses.length === 0) {
        recentContainer.innerHTML = `
            <p style="color: var(--ts-grey); text-align: center;">No analyses yet. Run your first analysis!</p>
        `;
        return;
    }
    
    recentContainer.innerHTML = analyses.map(analysis => `
        <div style="border-bottom: 1px solid #eee; padding: 1rem 0;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
                <strong style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${analysis.url}</strong>
                <span style="color: var(--ts-teal); font-weight: 600;">${analysis.total_score}/100</span>
            </div>
            <div style="font-size: 0.9rem; color: var(--ts-grey);">
                Analyzed ${new Date(analysis.created_at).toLocaleDateString()}
            </div>
        </div>
    `).join('');
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
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan: plan,
                success_url: `${window.location.origin}/dashboard.html`,
                cancel_url: `${window.location.origin}/pricing.html`
            })
        });
        
        if (response.ok) {
            const { sessionId, url } = await response.json();
            // Redirect to Stripe Checkout
            window.location.href = url;
        } else {
            throw new Error('Failed to create checkout session');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Failed to initiate checkout. Please try again.');
    }
}

function initiateOneTimePurchase() {
    // Similar to initiateCheckout but for one-time purchases
    initiateCheckout('one_time');
}

// Authentication Functions
function showLoginPrompt() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-bold mb-4">Authentication Required</h3>
            <p class="mb-4">Please log in to use the C⁴AT³ Analyzer.</p>
            <div class="flex gap-2">
                <button onclick="window.location.href='/login.html'" class="cta-button flex-1">Log In</button>
                <button onclick="this.closest('.fixed').remove()" class="btn btn-outline">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function logout() {
    removeAuthToken();
    window.location.href = '/index.html';
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

function showUpgradeModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-bold mb-4">Upgrade Your Plan</h3>
            <p class="mb-4">You've reached your analysis limit. Upgrade to continue analyzing content.</p>
            <div class="flex gap-2">
                <button onclick="window.location.href='pricing.html'" class="cta-button flex-1">View Plans</button>
                <button onclick="this.closest('.fixed').remove()" class="btn btn-outline">Maybe Later</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Make functions globally available
window.dismissWarning = dismissWarning;
window.showUpgradeModal = showUpgradeModal;
window.initiateCheckout = initiateCheckout;
window.initiateOneTimePurchase = initiateOneTimePurchase;
window.logout = logout;
