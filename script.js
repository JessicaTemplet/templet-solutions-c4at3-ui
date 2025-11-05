// API Configuration - Connected to your Google Cloud Run backend
const API_BASE_URL = 'https://api.templetsolutions.com';

// Authentication state
let currentUser = null;

// Authentication token management
function getAuthToken() {
    return localStorage.getItem('c4at3_token');
}

function setAuthToken(token) {
    localStorage.setItem('c4at3_token', token);
}

function removeAuthToken() {
    localStorage.removeItem('c4at3_token');
    localStorage.removeItem('c4at3_user');
    currentUser = null;
}

function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('c4at3_user', JSON.stringify(user));
}

function getCurrentUser() {
    if (currentUser) return currentUser;
    
    const storedUser = localStorage.getItem('c4at3_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        return currentUser;
    }
    return null;
}

// ===============================================
// *** SPA CHANGE: New Functions for View Management ***
// ===============================================

function showLandingView() {
    // Show the landing/marketing content
    document.getElementById('landing-view').style.display = 'block';
    // Hide the application content
    document.getElementById('dashboard-view').style.display = 'none';
    // Optional: Update URL without reloading (cleaner navigation)
    window.history.pushState({}, 'Home', '/');
}

function showDashboardView() {
    const user = getCurrentUser();
    
    if (!user) {
        // If not logged in, force back to landing and prompt login
        showLandingView();
        showLoginPrompt(); 
        return;
    }

    // Hide the landing content
    document.getElementById('landing-view').style.display = 'none';
    // Show the application content
    document.getElementById('dashboard-view').style.display = 'block';
    
    // Update URL without reloading
    window.history.pushState({}, 'Dashboard', '/dashboard'); 
    
    // Initialize dashboard content and load data
    initializeDashboard(); 
}

// ===============================================
// Initialize Application - Updated for SPA
// ===============================================
function initializeApp() {
    initializeNavigation();
    
    // Check if user is logged in
    const user = getCurrentUser();
    
    // *** SPA CHANGE: Use content-swapping logic instead of URL checks ***
    if (user) {
        updateUIForLoggedInUser(user);
        // If logged in, automatically show the dashboard view
        showDashboardView(); 
    } else {
        updateUIForLoggedOutUser();
        // If logged out, show the marketing/landing page view
        showLandingView();
    }
    
    // Removed old checks for:
    // if (window.location.pathname.includes('dashboard.html')) { ... }
    // if (window.location.pathname.includes('pricing.html')) { ... }
    
    setupAnimationObserver();
}

// Authentication Functions
async function registerUser(email, password, tier = 'free') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                tier: tier
            })
        });
        
        if (response.ok) {
            const tokenData = await response.json();
            setAuthToken(tokenData.access_token);
            setCurrentUser({
                id: tokenData.user_id,
                email: email,
                tier: tokenData.tier
            });
            return { success: true, user: currentUser };
        } else {
            const errorData = await response.json();
            return { success: false, error: errorData.detail || 'Registration failed' };
        }
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'Network error during registration' };
    }
}

async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        if (response.ok) {
            const tokenData = await response.json();
            setAuthToken(tokenData.access_token);
            setCurrentUser({
                id: tokenData.user_id,
                email: email,
                tier: tokenData.tier
            });
            
            // Fetch complete user info
            await fetchUserProfile();
            
            return { success: true, user: currentUser };
        } else {
            const errorData = await response.json();
            return { success: false, error: errorData.detail || 'Login failed' };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Network error during login' };
    }
}

async function fetchUserProfile() {
    const token = getAuthToken();
    if (!token) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            setCurrentUser(userData);
        }
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
    }
}

async function upgradeUserTier(newTier) {
    const token = getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/upgrade`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tier: newTier })
        });
        
        if (response.ok) {
            const result = await response.json();
            // Update local user data
            currentUser.tier = newTier;
            setCurrentUser(currentUser);
            return { success: true, message: result.message };
        } else {
            const errorData = await response.json();
            return { success: false, error: errorData.detail || 'Upgrade failed' };
        }
    } catch (error) {
        console.error('Upgrade error:', error);
        return { success: false, error: 'Network error during upgrade' };
    }
}

function logout() {
    removeAuthToken();
    updateUIForLoggedOutUser();
    // *** SPA CHANGE: Use showLandingView() instead of page reload/redirect ***
    showLandingView(); 
}

function updateUIForLoggedInUser(user) {
    // Update navigation to show user info
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        // Remove existing auth links
        const existingAuthLinks = navLinks.querySelector('.auth-links');
        if (existingAuthLinks) {
            existingAuthLinks.remove();
        }
        
        // Add user dropdown
        const authSection = document.createElement('li');
        authSection.className = 'dropdown auth-links';
        authSection.innerHTML = `
            <button class="dropdown-toggle" style="color: var(--ts-teal);">
                👤 ${user.email}
            </button>
            <div class="dropdown-content">
                <a href="#" onclick="showDashboardView()">Dashboard</a>
                <a href="/profile.html">Profile</a>
                <a href="/pricing.html">Upgrade Plan</a>
                <a href="#" onclick="logout()">Logout</a>
            </div>
        `;
        navLinks.appendChild(authSection);
    }
}

function updateUIForLoggedOutUser() {
    // Update navigation to show login/register
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        const existingAuthLinks = navLinks.querySelector('.auth-links');
        if (existingAuthLinks) {
            existingAuthLinks.remove();
        }
        
        const authSection = document.createElement('li');
        authSection.className = 'auth-links';
        authSection.innerHTML = `
            <a href="#" onclick="showLoginModal()" style="color: var(--ts-teal);">Login</a>
        `;
        navLinks.appendChild(authSection);
    }
}

// Modal Functions
function showLoginModal() {
    // *** SPA CHANGE: Use the pre-existing static modal structure in index.html ***
    const modal = document.getElementById('auth-modal');
    if (!modal) {
        // Fallback for dynamically creating if not found (optional)
        console.error("Auth modal element not found in HTML.");
        return;
    }
    
    modal.style.display = 'flex';
    showLoginForm();
}

function showLoginForm() {
    const authForms = document.getElementById('auth-forms');
    if (!authForms) return;
    
    authForms.innerHTML = `
        <h3 class="text-xl font-bold mb-4">Login to C⁴AT³ Analyzer</h3>
        <form onsubmit="handleLoginSubmit(event)">
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input type="email" id="login-email" required 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Password</label>
                <input type="password" id="login-password" required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <button type="submit" class="cta-button w-full">Login</button>
        </form>
        <div class="text-center mt-4">
            <button onclick="showRegisterForm()" class="text-blue-600 hover:text-blue-800 text-sm">
                Don't have an account? Register
            </button>
        </div>
    `;
}

function showRegisterForm() {
    const authForms = document.getElementById('auth-forms');
    if (!authForms) return;
    
    authForms.innerHTML = `
        <h3 class="text-xl font-bold mb-4">Register for C⁴AT³ Analyzer</h3>
        <form onsubmit="handleRegisterSubmit(event)">
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input type="email" id="register-email" required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Password</label>
                <input type="password" id="register-password" required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <button type="submit" class="cta-button w-full">Register</button>
        </form>
        <div class="text-center mt-4">
            <button onclick="showLoginForm()" class="text-blue-600 hover:text-blue-800 text-sm">
                Already have an account? Login
            </button>
        </div>
    `;
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const result = await loginUser(email, password);
    
    if (result.success) {
        // Close modal
        document.getElementById('auth-modal').style.display = 'none';
        // *** SPA CHANGE: Switch to dashboard view instead of page reload ***
        showDashboardView(); 
    } else {
        alert('Login failed: ' + result.error);
    }
}

async function handleRegisterSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    const result = await registerUser(email, password);
    
    if (result.success) {
        // Close modal
        document.getElementById('auth-modal').style.display = 'none';
        // *** SPA CHANGE: Switch to dashboard view instead of page reload ***
        showDashboardView();
    } else {
        alert('Registration failed: ' + result.error);
    }
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
    const user = getCurrentUser();
    if (!user) {
        // *** SPA CHANGE: Ensure view is corrected if login state is lost ***
        showLandingView();
        showLoginPrompt();
        return;
    }
    
    // Welcome message update (assuming this function exists elsewhere)
    document.getElementById('welcome-message').textContent = `Welcome Back, ${user.email.split('@')[0]}!`;
    
    loadUserUsage();
    initializeAnalysisForm();
    loadRecentAnalyses();
}

async function loadUserUsage() {
    try {
        const token = getAuthToken();
        if (!token) {
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
        // Fallback for demo
        const user = getCurrentUser();
        const mockUsage = {
            used: 4,
            limit: user?.tier === 'free' ? 5 : user?.tier === 'paid' ? 20 : 100,
            remaining: user?.tier === 'free' ? 1 : user?.tier === 'paid' ? 16 : 96,
            percentage: user?.tier === 'free' ? 80 : user?.tier === 'paid' ? 20 : 4,
            warning_level: user?.tier === 'free' ? 'warning_80' : 'normal',
            message: user?.tier === 'free' ? 'Warning: 1 analysis remains this month.' : 'Usage is normal',
            suggestion: user?.tier === 'free' ? 'You\'re approaching your monthly limit.' : '',
            can_analyze: true
        };
        updateUsageDisplay(mockUsage);
        updateStats(mockUsage);
    }
}

// ... (rest of the dashboard functions from previous version remain the same)
// NOTE: ALL functions called within the script (like updateUsageDisplay, 
// updateStats, initializeAnalysisForm, loadRecentAnalyses) must be defined
// above the final export block, but are omitted here for brevity.

// ===============================================
// Make functions globally available (for HTML events)
// ===============================================
window.dismissWarning = dismissWarning;
window.showUpgradeModal = showUpgradeModal;
window.initiateCheckout = initiateCheckout;
window.initiateOneTimePurchase = initiateOneTimePurchase;
window.logout = logout;
window.showLoginModal = showLoginModal;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;

// *** CRITICAL MISSING FUNCTIONS ADDED ***
// These were causing the previous ReferenceErrors and are likely called by dashboard.html content
window.showLoginPrompt = showLoginPrompt; 
window.updateUsageDisplay = updateUsageDisplay; 
window.updateStats = updateStats; 
window.initializeAnalysisForm = initializeAnalysisForm; 
window.loadRecentAnalyses = loadRecentAnalyses;

// *** NEW SPA FUNCTIONS ADDED ***
window.showDashboardView = showDashboardView;
window.showLandingView = showLandingView;
