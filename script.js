(function() {
  const API_BASE_URL = window.API_BASE_URL || 'https://ubiquitous-parakeet-jjwwjr64x44j3g7x-8000.app.github.dev';
  const TOKEN_KEY = 'c4at3_token';
  const USER_KEY = 'c4at3_user';
  const HISTORY_KEY = 'c4at3_history';

  let authModal;
  let authHelp;
  const wiredCheckoutButtons = new WeakSet();

  const C4AT3Auth = (() => {
    let token = null;
    let user = null;

    function init() {
      token = localStorage.getItem(TOKEN_KEY) || null;
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        try {
          user = JSON.parse(stored);
        } catch (_) {
          user = null;
        }
      }
    }

    function setSession(newToken, newUser) {
      token = newToken || null;
      user = newUser || null;
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    }

    function setUser(newUser) {
      user = newUser || null;
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    }

    function clear() {
      token = null;
      user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }

    function getToken() {
      return token;
    }

    function getUser() {
      return user;
    }

    async function refreshUser() {
      if (!token) return null;
      try {
        const response = await authedFetch('/api/auth/me');
        if (response.ok) {
          const payload = await response.json();
          const data = payload.data || payload;
          setUser(data);
          return data;
        }
      } catch (_) {
        // ignore network errors; caller can decide how to handle missing data
      }
      return user;
    }

    function buildUrl(path) {
      if (!path) return '';
      if (/^https?:/i.test(path)) {
        return path;
      }
      return `${API_BASE_URL}${path}`;
    }

    function authedFetch(path, options = {}) {
      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(buildUrl(path), { ...options, headers });
    }

    return {
      init,
      setSession,
      setUser,
      clear,
      getToken,
      getUser,
      refreshUser,
      authedFetch
    };
  })();

  function initAuth() {
    C4AT3Auth.init();
  }

  function getAuthToken() {
    return C4AT3Auth.getToken();
  }

  function setAuthToken(token, user) {
    C4AT3Auth.setSession(token, user ?? C4AT3Auth.getUser());
  }

  function removeAuthToken() {
    C4AT3Auth.clear();
  }

  function getCurrentUser() {
    return C4AT3Auth.getUser();
  }

  async function refreshCurrentUser() {
    return C4AT3Auth.refreshUser();
  }

  function authedFetch(path, options) {
    return C4AT3Auth.authedFetch(path, options);
  }

  function showLoginPrompt() {
    openAuthModal('login');
  }

  function ensureInlineAlertContainer(targetElement) {
    if (targetElement) {
      let container = targetElement.closest('[data-inline-container]')?.querySelector('[data-inline-alert]');
      if (!container) {
        const host = targetElement.closest('[data-inline-container]') || targetElement.parentElement;
        if (host) {
          container = document.createElement('div');
          container.dataset.inlineAlert = 'true';
          container.setAttribute('role', 'alert');
          host.insertBefore(container, host.firstChild);
        }
      }
      if (container) {
        styleInlineAlert(container);
        return container;
      }
    }

    let container = document.getElementById('inlineAlert');
    if (!container) {
      container = document.createElement('div');
      container.id = 'inlineAlert';
      container.setAttribute('role', 'alert');
      styleInlineAlert(container);
      const main = document.querySelector('main') || document.body;
      main.prepend(container);
    }
    return container;
  }

  function styleInlineAlert(el) {
    el.classList.add('inline-alert');
    el.style.display = 'none';
    el.style.padding = '0.75rem 1rem';
    el.style.margin = '0.75rem auto';
    el.style.borderRadius = '0.75rem';
    el.style.maxWidth = '640px';
    el.style.backgroundColor = '#fee2e2';
    el.style.color = '#7f1d1d';
    el.style.fontWeight = '500';
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
    return el;
  }

  function clearInlineError(targetElement) {
    const container = targetElement
      ? targetElement.closest('[data-inline-container]')?.querySelector('[data-inline-alert]')
      : document.getElementById('inlineAlert');
    if (container) {
      container.style.display = 'none';
      container.textContent = '';
    }
  }

  function showInlineError(message, targetElement) {
    const container = ensureInlineAlertContainer(targetElement);
    container.textContent = message;
    container.style.display = 'block';
  }

  function handleInvalidSession({ trigger, helpElement }) {
    removeAuthToken();
    syncAuthUI();
    if (helpElement) {
      helpElement.textContent = 'Your session has expired. Please log in again.';
      helpElement.classList.add('error');
      helpElement.style.display = '';
    } else {
      showInlineError('Your session has expired. Please log in again.', trigger);
    }
    showLoginPrompt();
  }

  async function handleCheckout(tier, options = {}) {
    const normalizedTier = String(tier || '').toLowerCase();
    if (!normalizedTier) return;

    const helpElement = options.helpElement || null;
    const trigger = options.trigger || null;

    if (helpElement) {
      helpElement.classList.remove('error', 'success', 'warning');
      helpElement.textContent = '';
      helpElement.style.display = '';
    } else {
      clearInlineError(trigger);
    }

    const token = getAuthToken();
    if (!token) {
      if (helpElement) {
        helpElement.textContent = 'Please sign in to continue to checkout.';
        helpElement.classList.add('error');
        helpElement.style.display = '';
      } else {
        showInlineError('Please sign in to continue to checkout.', trigger);
      }
      showLoginPrompt();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/billing/checkout/${normalizedTier}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        handleInvalidSession({ trigger, helpElement });
        return;
      }

      const data = await safeJson(response);
      if (response.ok && data?.success && data?.data?.checkout_url) {
        window.location.href = data.data.checkout_url;
        return;
      }

      const message = data?.error || data?.message || 'Checkout failed. Please try again.';
      if (helpElement) {
        helpElement.textContent = message;
        helpElement.classList.add('error');
        helpElement.style.display = '';
      } else {
        showInlineError(message, trigger);
      }
    } catch (error) {
      const fallback = error?.message || 'Checkout failed. Please try again.';
      if (helpElement) {
        helpElement.textContent = fallback;
        helpElement.classList.add('error');
        helpElement.style.display = '';
      } else {
        showInlineError(fallback, trigger);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', initializeApp);

  function initializeApp() {
    initAuth();
    setCurrentYear();
    setupGlobalNav();
    setupAuthModal();
    setupCheckoutTriggers();

    const page = document.body.dataset.page || 'landing';
    if (page === 'landing') {
      initLandingPage();
    } else if (page === 'dashboard') {
      initDashboardPage();
    } else if (page === 'checkout') {
      initCheckoutPage();
    }
  }

  function setCurrentYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  function setupGlobalNav() {
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');

    if (loginButton) {
      loginButton.addEventListener('click', () => openAuthModal('login'));
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        removeAuthToken();
        syncAuthUI();
        const page = document.body.dataset.page || 'landing';
        if (page === 'dashboard') {
          window.location.href = './index.html';
        }
      });
    }

    syncAuthUI();
  }

  function syncAuthUI() {
    const hasToken = Boolean(getAuthToken());
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');

    if (loginButton) {
      loginButton.style.display = hasToken ? 'none' : '';
    }
    if (logoutButton) {
      logoutButton.style.display = hasToken ? '' : 'none';
    }

    document.querySelectorAll('.auth-only').forEach((el) => {
      el.style.display = hasToken ? '' : 'none';
    });
  }

  function setupAuthModal() {
    authModal = document.getElementById('authModal');
    if (!authModal) return;

    authHelp = document.getElementById('authHelp');

    authModal.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeAuthModal();
    });

    const closeButtons = authModal.querySelectorAll('[data-close]');
    closeButtons.forEach((btn) => {
      btn.addEventListener('click', closeAuthModal);
    });

    const tabs = authModal.querySelectorAll('.tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });

    const loginSubmit = document.getElementById('loginSubmit');
    const signupSubmit = document.getElementById('signupSubmit');

    if (loginSubmit) {
      loginSubmit.addEventListener('click', handleLoginSubmit);
    }
    if (signupSubmit) {
      signupSubmit.addEventListener('click', handleSignupSubmit);
    }
  }

  function setupCheckoutTriggers() {
    const attach = (button, tier) => {
      const normalized = String(tier || '').toLowerCase();
      if (!button || !normalized || wiredCheckoutButtons.has(button)) return;

      const host = button.closest('[data-inline-container]') || button.parentElement;
      if (host && !host.hasAttribute('data-inline-container')) {
        host.setAttribute('data-inline-container', 'true');
      }

      button.addEventListener('click', (event) => {
        event.preventDefault();
        handleCheckout(normalized, { trigger: button });
      });
      wiredCheckoutButtons.add(button);
    };

    const configured = [
      { selector: '#start-free-btn', tier: 'free' },
      { selector: '#starter-btn', tier: 'starter' },
      { selector: '#professional-btn', tier: 'professional' },
      { selector: '#pro-btn', tier: 'pro' }
    ];

    configured.forEach(({ selector, tier }) => {
      const button = document.querySelector(selector);
      if (button) attach(button, tier);
    });

    document.querySelectorAll('button[onclick*="initiateCheckout"]').forEach((button) => {
      if (!button.dataset.checkoutTier) {
        const attr = button.getAttribute('onclick');
        const match = attr && attr.match(/initiateCheckout\(['\"]([^'\"]+)['\"]/);
        if (match) {
          button.dataset.checkoutTier = match[1];
          button.removeAttribute('onclick');
        }
      }
      attach(button, button.dataset.checkoutTier);
    });

    document.querySelectorAll('[data-checkout-tier]').forEach((button) => {
      attach(button, button.dataset.checkoutTier);
    });

    document.querySelectorAll('[data-plan]').forEach((button) => {
      attach(button, button.getAttribute('data-plan'));
    });

    document.querySelectorAll('button[onclick*="initiateOneTimePurchase"]').forEach((button) => {
      if (!wiredCheckoutButtons.has(button)) {
        const host = button.closest('[data-inline-container]') || button.parentElement;
        if (host && !host.hasAttribute('data-inline-container')) {
          host.setAttribute('data-inline-container', 'true');
        }

        button.addEventListener('click', (event) => {
          event.preventDefault();
          handleCheckout('one-time', { trigger: button });
        });
        wiredCheckoutButtons.add(button);
        button.removeAttribute('onclick');
      }
    });

    window.initiateCheckout = (tier) => handleCheckout(tier);
    window.initiateOneTimePurchase = () => handleCheckout('one-time');
  }

  function openAuthModal(mode = 'login') {
    if (!authModal) {
      window.location.href = './index.html';
      return;
    }

    switchAuthTab(mode);
    resetAuthMessage();
    if (typeof authModal.showModal === 'function') {
      authModal.showModal();
    } else {
      authModal.setAttribute('open', '');
    }
  }

  function closeAuthModal() {
    if (!authModal) return;
    if (typeof authModal.close === 'function') {
      authModal.close();
    } else {
      authModal.removeAttribute('open');
    }
  }

  function switchAuthTab(mode) {
    const tabs = authModal ? authModal.querySelectorAll('.tab') : [];
    const panels = authModal ? authModal.querySelectorAll('.tab-panel') : [];

    tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === mode;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    panels.forEach((panel) => {
      const isActive = panel.dataset.panel === mode;
      panel.classList.toggle('active', isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
  }

  function resetAuthMessage() {
    if (!authHelp) return;
    authHelp.textContent = '';
    authHelp.classList.remove('error', 'success', 'loading');
  }

  async function handleLoginSubmit() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitButton = document.getElementById('loginSubmit');

    if (!emailInput || !passwordInput || !submitButton) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setAuthMessage('Please enter your email and password.', 'error');
      return;
    }

    setButtonLoading(submitButton, true, 'Logging in…');
    setAuthMessage('Checking your credentials…', 'loading');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const payload = await safeJson(response);
      if (!response.ok || !payload?.success) {
        const detail = payload?.detail || payload?.error || payload?.message || 'Login failed. Please try again.';
        throw new Error(detail);
      }

      const data = payload.data || {};
      setAuthToken(data.token, data.user);
      await refreshCurrentUser();
      setAuthMessage('Success! Redirecting…', 'success');
      syncAuthUI();
      closeAuthModal();
      routeAfterAuth();
    } catch (error) {
      setAuthMessage(error.message || 'Login failed. Please try again.', 'error');
    } finally {
      setButtonLoading(submitButton, false);
    }
  }

  async function handleSignupSubmit() {
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const submitButton = document.getElementById('signupSubmit');

    if (!emailInput || !passwordInput || !submitButton) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setAuthMessage('Please enter your email and password.', 'error');
      return;
    }

    setButtonLoading(submitButton, true, 'Creating account…');
    setAuthMessage('Creating your account…', 'loading');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const payload = await safeJson(response);
      if (!response.ok || !payload?.success) {
        const detail = payload?.detail || payload?.error || payload?.message || 'Sign up failed. Please try again.';
        throw new Error(detail);
      }

      const data = payload.data || {};
      setAuthToken(data.token, data.user);
      await refreshCurrentUser();
      setAuthMessage('Account created! Redirecting…', 'success');
      syncAuthUI();
      closeAuthModal();
      routeAfterAuth();
    } catch (error) {
      setAuthMessage(error.message || 'Sign up failed. Please try again.', 'error');
    } finally {
      setButtonLoading(submitButton, false);
    }
  }

  function setAuthMessage(message, state) {
    if (!authHelp) return;
    authHelp.textContent = message;
    authHelp.classList.remove('error', 'success', 'loading');
    if (state) {
      authHelp.classList.add(state);
    }
  }

  function routeAfterAuth() {
    const page = document.body.dataset.page || 'landing';
    if (page === 'dashboard') {
      hydrateDashboard();
    } else if (page === 'checkout') {
      const loginNotice = document.getElementById('loginNotice');
      const checkoutHelp = document.getElementById('checkoutHelp');
      if (loginNotice) {
        loginNotice.style.display = 'none';
      }
      if (checkoutHelp) {
        checkoutHelp.textContent = 'You’re signed in. Start checkout when you’re ready.';
        checkoutHelp.classList.remove('error', 'warning');
        checkoutHelp.classList.add('success');
      }
    } else {
      window.location.href = './dashboard.html';
    }
  }

  function initLandingPage() {
    const startButtons = [
      document.getElementById('getStartedBtn'),
      document.getElementById('ctaAnalyzeNow')
    ];

    startButtons.forEach((btn) => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (getAuthToken()) {
          window.location.href = './dashboard.html';
        } else {
          openAuthModal('signup');
        }
      });
    });

    document.querySelectorAll('.price button').forEach((btn) => {
      if (!wiredCheckoutButtons.has(btn)) {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const plan = btn.getAttribute('data-plan');
          handleCheckout(plan, { trigger: btn });
        });
        wiredCheckoutButtons.add(btn);
      }
    });
  }

  function initDashboardPage() {
    if (!getAuthToken()) {
      window.location.href = './index.html';
      return;
    }

    const logoutCta = document.getElementById('dashboardLogout');
    if (logoutCta) {
      logoutCta.addEventListener('click', () => {
        removeAuthToken();
        syncAuthUI();
        window.location.href = './index.html';
      });
    }

    const analysisForm = document.getElementById('analysisForm');
    if (analysisForm) {
      analysisForm.addEventListener('submit', handleAnalysisSubmit);
    }

    hydrateDashboard();
  }

  async function hydrateDashboard() {
    const user = await ensureUserProfile();
    updateDashboardHeader(user);
    await loadUsageSummary();
    renderAnalysisHistory();
  }

  async function ensureUserProfile() {
    const user = getCurrentUser();
    if (user) return user;
    return refreshCurrentUser();
  }

  function updateDashboardHeader(user) {
    const greetingEl = document.getElementById('dashboardGreeting');
    const tierEl = document.getElementById('userTier');

    if (greetingEl) {
      const name = user?.email ? user.email.split('@')[0] : 'there';
      greetingEl.textContent = `Welcome back, ${name}!`;
    }

    if (tierEl) {
      tierEl.textContent = user?.tier ? user.tier : 'free';
    }
  }

  async function loadUsageSummary() {
    const usageStatus = document.getElementById('usageStatus');
    const usageProgress = document.getElementById('usageProgress');

    if (usageStatus) {
      usageStatus.textContent = 'Loading usage…';
      usageStatus.dataset.state = 'loading';
    }

    try {
      const response = await authedFetch('/api/analytics/usage');
      if (response.ok) {
        const payload = await response.json();
        const data = payload.data || payload;
        updateUsageDisplay(data);
        return;
      }

      if (response.status === 404) {
        throw new Error('Usage tracking is not enabled yet.');
      }

      const payload = await safeJson(response);
      const detail = payload?.detail || payload?.error || 'Unable to load usage data.';
      throw new Error(detail);
    } catch (error) {
      const fallback = buildUsageFallback();
      updateUsageDisplay(fallback, error.message);
    } finally {
      if (usageProgress) {
        usageProgress.classList.add('ready');
      }
    }
  }

  function buildUsageFallback() {
    const tier = (getCurrentUser()?.tier || 'free').toLowerCase();
    const limits = { free: 5, starter: 20, professional: 60, pro: 150 };
    const limit = limits[tier] || 5;
    return {
      used: 0,
      remaining: limit,
      limit
    };
  }

  function updateUsageDisplay(data, message) {
    const usageStatus = document.getElementById('usageStatus');
    const usageProgress = document.getElementById('usageProgress');

    if (!usageStatus || !usageProgress) return;

    const used = Number.isFinite(data?.used) ? data.used : 0;
    const limit = Number.isFinite(data?.limit) ? data.limit : used + (data?.remaining || 0) || 0;
    const remaining = Number.isFinite(data?.remaining) ? data.remaining : Math.max(limit - used, 0);
    const percentage = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;

    usageProgress.style.setProperty('--usage-progress', `${percentage}%`);
    const usedEl = usageProgress.querySelector('[data-used]');
    const limitEl = usageProgress.querySelector('[data-limit]');
    const remainingEl = usageProgress.querySelector('[data-remaining]');
    if (usedEl) usedEl.textContent = used;
    if (limitEl) limitEl.textContent = limit || '—';
    if (remainingEl) remainingEl.textContent = remaining;

    if (message) {
      usageStatus.textContent = message;
      usageStatus.dataset.state = 'warning';
    } else {
      usageStatus.textContent = remaining > 0
        ? `${remaining} analysis${remaining === 1 ? '' : 'es'} remaining this cycle.`
        : 'You have reached your plan limit for this cycle.';
      usageStatus.dataset.state = remaining > 0 ? 'success' : 'error';
    }
  }

  async function handleAnalysisSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const urlInput = document.getElementById('analysisUrl');
    const typeInput = document.getElementById('analysisType');
    const statusEl = document.getElementById('analysisStatus');
    const resultEl = document.getElementById('analysisResult');
    const scoreEl = document.getElementById('analysisScore');
    const gradeEl = document.getElementById('analysisGrade');

    if (!urlInput || !statusEl || !resultEl || !scoreEl || !gradeEl) return;

    const url = urlInput.value.trim();
    if (!url) {
      statusEl.textContent = 'Please provide a URL to analyze.';
      statusEl.dataset.state = 'error';
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Analyzing…');
    statusEl.textContent = 'Analyzing your content…';
    statusEl.dataset.state = 'loading';
    resultEl.hidden = true;

    try {
      const response = await authedFetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          analysis_type: typeInput ? typeInput.value : 'standard'
        })
      });

      const payload = await safeJson(response);
      if (!response.ok) {
        const detail = payload?.detail || payload?.error || payload?.message || 'Analysis failed. Please try again.';
        throw new Error(detail);
      }

      const data = payload.data || payload;
      const score = Number.isFinite(data.score) ? Math.round(data.score) : '—';
      const grade = data.grade || '—';

      scoreEl.textContent = score;
      gradeEl.textContent = grade;
      resultEl.hidden = false;

      statusEl.textContent = 'Analysis complete.';
      statusEl.dataset.state = 'success';

      saveAnalysisToHistory({
        url,
        score: Number.isFinite(data.score) ? data.score : null,
        grade,
        analysis_type: typeInput ? typeInput.value : 'standard',
        completed_at: new Date().toISOString()
      });
      renderAnalysisHistory();
    } catch (error) {
      statusEl.textContent = error.message || 'Analysis failed. Please try again.';
      statusEl.dataset.state = 'error';
    } finally {
      setButtonLoading(submitButton, false);
    }
  }

  function renderAnalysisHistory() {
    const list = document.getElementById('recentAnalyses');
    if (!list) return;

    list.innerHTML = '';
    const user = getCurrentUser();
    if (!user) {
      const li = document.createElement('li');
      li.textContent = 'Log in to see your recent analyses.';
      li.className = 'muted';
      list.appendChild(li);
      return;
    }

    const history = getHistoryForUser(user);
    if (!history.length) {
      const li = document.createElement('li');
      li.textContent = 'No analyses yet. Run your first analysis to see results here.';
      li.className = 'muted';
      list.appendChild(li);
      return;
    }

    history.forEach((entry) => {
      const li = document.createElement('li');
      const main = document.createElement('div');
      main.className = 'history-main';

      const grade = document.createElement('span');
      grade.className = 'history-grade';
      grade.textContent = entry.grade || '—';

      const score = document.createElement('span');
      score.className = 'history-score';
      const points = Number.isFinite(entry.score) ? `${Math.round(entry.score)} pts` : '—';
      score.textContent = points;

      main.append(grade, score);

      const meta = document.createElement('div');
      meta.className = 'history-meta';
      meta.textContent = new Date(entry.completed_at).toLocaleString();

      const url = document.createElement('div');
      url.className = 'history-url';
      url.textContent = entry.url || '';

      li.append(main, meta, url);
      list.appendChild(li);
    });
  }

  function getHistoryStore() {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveHistoryStore(store) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(store));
  }

  function getHistoryForUser(user) {
    const store = getHistoryStore();
    const key = user?.id || user?.email;
    if (!key) return [];
    return Array.isArray(store[key]) ? store[key] : [];
  }

  function saveAnalysisToHistory(entry) {
    const user = getCurrentUser();
    const key = user?.id || user?.email;
    if (!key) return;

    const store = getHistoryStore();
    const list = Array.isArray(store[key]) ? store[key] : [];
    list.unshift(entry);
    store[key] = list.slice(0, 5);
    saveHistoryStore(store);
  }

  function initCheckoutPage() {
    const params = new URLSearchParams(window.location.search);
    const plan = (params.get('plan') || '').toLowerCase();
    const planIntro = document.getElementById('planIntro');
    const summaryPlan = document.getElementById('summaryPlan');
    const summaryUses = document.getElementById('summaryUses');
    const summaryPrice = document.getElementById('summaryPrice');
    const checkoutHelp = document.getElementById('checkoutHelp');
    const checkoutButton = document.getElementById('checkoutStart');
    const loginNotice = document.getElementById('loginNotice');
    const checkoutLogin = document.getElementById('checkoutLogin');

    const catalogue = {
      starter: { name: 'Starter', uses: 20, price: '$12.99/mo', code: 'starter' },
      professional: { name: 'Professional', uses: 60, price: '$22.99/mo', code: 'professional' },
      pro: { name: 'Pro', uses: 150, price: '$39.99/mo', code: 'pro' }
    };

    const selected = catalogue[plan];

    if (!selected) {
      if (planIntro) planIntro.textContent = 'No plan selected.';
      if (checkoutButton) checkoutButton.disabled = true;
    } else {
      if (summaryPlan) summaryPlan.textContent = selected.name;
      if (summaryUses) summaryUses.textContent = `${selected.uses}`;
      if (summaryPrice) summaryPrice.textContent = selected.price;
      if (planIntro) planIntro.textContent = 'You’re checking out with:';
    }

    if (!getAuthToken()) {
      if (loginNotice) loginNotice.style.display = '';
    }

    if (checkoutLogin) {
      checkoutLogin.addEventListener('click', () => openAuthModal('login'));
    }

    if (checkoutButton) {
      checkoutButton.addEventListener('click', async () => {
        if (!selected) return;

        setButtonLoading(checkoutButton, true, 'Connecting…');
        if (checkoutHelp) {
          checkoutHelp.classList.remove('error', 'success', 'warning');
          checkoutHelp.textContent = 'Attempting to start checkout…';
          checkoutHelp.style.display = '';
        }

        try {
          await handleCheckout(selected.code, {
            helpElement: checkoutHelp,
            trigger: checkoutButton
          });
        } finally {
          setButtonLoading(checkoutButton, false);
        }
      });
    }
  }

  function setButtonLoading(button, isLoading, loadingLabel) {
    if (!button) return;
    if (isLoading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }
      if (loadingLabel) {
        button.textContent = loadingLabel;
      }
      button.disabled = true;
    } else {
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
      button.disabled = false;
    }
  }

  async function safeJson(response) {
    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  }
})();
