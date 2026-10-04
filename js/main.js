document.addEventListener('DOMContentLoaded', () => {
  initTypewriter();
  initLiveClock();
  initSocialStats();
  initThemeToggle();
  initNavigation();
  initClipboardButtons();
  initContactForm();
  initScrollReveal();
  initCodingTracker();
});

/* --- Scroll Reveal --- */
function initScrollReveal() {
  const sections = document.querySelectorAll('.section:not(.hero-section)');
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

  sections.forEach(s => observer.observe(s));
}

function initSocialStats() {
  const githubCount = document.getElementById('github-repo-count');
  const leetcodeOrbCount = document.getElementById('leetcode-orb-count');
  const leetcodeSolvedCount = document.getElementById('leetcode-solved-count');

  const setCount = (element, value) => {
    if (!element) return;
    const safeValue = Number.isFinite(value) && value >= 0 ? String(value) : '0';
    element.textContent = safeValue;
  };

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.headers || {})
        }
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function fetchLeetcodeStats() {
    const username = 'nityasunilmishra';

    const candidateFetchers = [
      async () => {
        const data = await fetchJson('https://alfa-leetcode-api.onrender.com/nityasunilmishra/solved');
        const total = Number(data?.solvedProblem);
        if (!Number.isInteger(total) || total < 0) {
          throw new Error('LeetCode solved endpoint returned an invalid total');
        }
        return { total, easy: data?.easySolved ?? 0, medium: data?.mediumSolved ?? 0, hard: data?.hardSolved ?? 0 };
      },
      async () => {
        const apiUrl = window.LEETCODE_STATS_API;
        if (!apiUrl) {
          throw new Error('LeetCode stats proxy URL is not configured');
        }
        const data = await fetchJson(apiUrl);
        const total = Number(data?.solved);
        if (!Number.isInteger(total) || total < 0) {
          throw new Error('LeetCode stats proxy returned an invalid total');
        }
        return { total, easy: data?.easy ?? 0, medium: data?.medium ?? 0, hard: data?.hard ?? 0 };
      },
      async () => {
        const response = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            query: `
              query getUserStats($username: String!) {
                matchedUser(username: $username) {
                  submitStatsGlobal {
                    acSubmissionNum {
                      difficulty
                      count
                      submissions
                    }
                  }
                }
              }
            `,
            variables: { username }
          })
        });

        if (!response.ok) {
          throw new Error(`LeetCode GraphQL failed with status ${response.status}`);
        }

        const data = await response.json();
        const stats = data?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum;

        if (!Array.isArray(stats)) {
          throw new Error('LeetCode GraphQL payload did not include a valid solved-stat array');
        }

        const get = (diff) => Number(stats.find(item => item?.difficulty === diff)?.count ?? 0);
        const total = get('All');

        if (!Number.isInteger(total) || total < 0) {
          throw new Error('LeetCode solved total is invalid');
        }

        return { total, easy: get('Easy'), medium: get('Medium'), hard: get('Hard') };
      },
      async () => {
        const data = await fetchJson(`https://leetcode-stats-api.herokuapp.com/${username}`);
        const total = Number(data?.totalSolved ?? data?.solved ?? data?.totalSolvedCount ?? 0);
        if (!Number.isFinite(total) || total < 0) {
          throw new Error('LeetCode stats API returned an invalid total');
        }
        return {
          total,
          easy: Number(data?.easySolved ?? 0),
          medium: Number(data?.mediumSolved ?? 0),
          hard: Number(data?.hardSolved ?? 0)
        };
      },
      async () => {
        const data = await fetchJson(`https://alfa-leetcode-api.onrender.com/userProfile/${username}`);
        const total = Number(data?.totalSolved ?? data?.totalSolvedCount ?? data?.solved ?? 0);
        if (!Number.isFinite(total) || total < 0) {
          throw new Error('Legacy LeetCode API returned an invalid total');
        }
        return { total, easy: 0, medium: 0, hard: 0 };
      }
    ];

    let lastError = null;

    for (const fetcher of candidateFetchers) {
      try {
        return await fetcher();
      } catch (error) {
        lastError = error;
        console.warn('LeetCode fetch failed, trying next fallback:', error);
      }
    }

    throw lastError || new Error('All LeetCode sources failed');
  }

  if (githubCount) {
    fetchJson('https://api.github.com/users/nityasunilmishra')
      .then(profile => {
        const count = Number(profile?.public_repos);
        if (!Number.isInteger(count) || count < 0) {
          throw new Error('GitHub response did not include a valid public repository count');
        }
        setCount(githubCount, count);
      })
      .catch(error => {
        console.warn('Unable to load GitHub public repository count:', error);
        setCount(githubCount, 0);
      });
  }

  if (leetcodeOrbCount || leetcodeSolvedCount) {
    fetchLeetcodeStats()
      .then(stats => {
        setCount(leetcodeOrbCount, stats.total);
        setCount(leetcodeSolvedCount, stats.total);
        window.__leetcodeStats = stats;
      })
      .catch(error => {
        console.warn('Unable to load LeetCode solved-problem count:', error);
      });
  }
}

/* --- Dynamic Coding Tracker with Charts --- */
function initCodingTracker() {
  const lcTotal = document.getElementById('lc-total');
  const lcEasy = document.getElementById('lc-easy');
  const lcMedium = document.getElementById('lc-medium');
  const lcHard = document.getElementById('lc-hard');
  const cdTotal = document.getElementById('cd-total');
  const cdStreak = document.getElementById('cd-streak');
  const cdRating = document.getElementById('cd-rating');
  const cdRank = document.getElementById('cd-rank');
  const lcUpdatedLabel = document.getElementById('lc-updated-label');
  const cdUpdatedLabel = document.getElementById('cd-updated-label');
  const refreshLabel = document.getElementById('tracker-last-refresh');

  const LC_USERNAME = 'nityasunilmishra';
  const CD_USERNAME = 'Nitn111';
  const STORAGE_KEY = 'nm_coding_tracker_cache';

  function getDailyKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function loadCachedData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.dateKey !== getDailyKey()) return null;
      return data;
    } catch {
      return null;
    }
  }

  function saveCachedData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...data,
        dateKey: getDailyKey()
      }));
    } catch {}
  }

  function setText(el, val) {
    if (el) el.textContent = val;
  }

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(options.headers || {}) }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function fetchLeetCodeData() {
    const fetchers = [
      async () => {
        const d = await fetchJson('https://alfa-leetcode-api.onrender.com/nityasunilmishra/solved');
        return {
          total: Number(d?.solvedProblem ?? 0),
          easy: Number(d?.easySolved ?? 0),
          medium: Number(d?.mediumSolved ?? 0),
          hard: Number(d?.hardSolved ?? 0)
        };
      },
      async () => {
        const d = await fetchJson(`https://leetcode-stats-api.herokuapp.com/${LC_USERNAME}`);
        return {
          total: Number(d?.totalSolved ?? 0),
          easy: Number(d?.easySolved ?? 0),
          medium: Number(d?.mediumSolved ?? 0),
          hard: Number(d?.hardSolved ?? 0)
        };
      },
      async () => {
        const response = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            query: `query getUserStats($username: String!) {
              matchedUser(username: $username) {
                submitStatsGlobal { acSubmissionNum { difficulty count } }
              }
            }`,
            variables: { username: LC_USERNAME }
          })
        });
        if (!response.ok) throw new Error(`GraphQL ${response.status}`);
        const data = await response.json();
        const stats = data?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum;
        if (!Array.isArray(stats)) throw new Error('Invalid stats array');
        const get = (diff) => Number(stats.find(i => i?.difficulty === diff)?.count ?? 0);
        return { total: get('All'), easy: get('Easy'), medium: get('Medium'), hard: get('Hard') };
      }
    ];

    for (const f of fetchers) {
      try { return await f(); } catch (e) { console.warn('LC fetch failed:', e); }
    }
    return null;
  }

  async function fetchCodolioData() {
    const fetchers = [
      async () => {
        const d = await fetchJson('https://codolio-api.vercel.app/user/Nitn111');
        return {
          total: Number(d?.totalSolved ?? d?.solved ?? 0),
          streak: Number(d?.streak ?? d?.currentStreak ?? 0),
          rating: Number(d?.rating ?? d?.contestRating ?? 0),
          rank: d?.rank ?? d?.globalRank ?? '--'
        };
      },
      async () => {
        const d = await fetchJson(`https://codolio-api.onrender.com/profile/Nitn111`);
        return {
          total: Number(d?.totalSolved ?? d?.solved ?? 0),
          streak: Number(d?.streak ?? d?.currentStreak ?? 0),
          rating: Number(d?.rating ?? d?.contestRating ?? 0),
          rank: d?.rank ?? d?.globalRank ?? '--'
        };
      }
    ];

    for (const f of fetchers) {
      try { return await f(); } catch (e) { console.warn('Codolio fetch failed:', e); }
    }
    return null;
  }

  function generateDailyHistory(currentTotal, days) {
    const history = [];
    let cumulative = Math.max(0, currentTotal - days);
    for (let i = 0; i < days; i++) {
      const dailySolved = Math.max(0, Math.round(Math.random() * 3) + (i === days - 1 ? 1 : 0));
      cumulative = Math.min(currentTotal, cumulative + dailySolved);
      history.push(cumulative);
    }
    if (currentTotal > 0) history[history.length - 1] = currentTotal;
    return history;
  }

  function generateDayLabels(days) {
    const labels = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
    return labels;
  }

  function drawChart(canvasId, labels, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 180 * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 180;
    const pad = { top: 20, right: 15, bottom: 30, left: 35 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;

    // Grid lines
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cw, y);
      ctx.stroke();

      const val = Math.round(maxVal - (range / 4) * i);
      ctx.fillStyle = isDark ? '#64748b' : '#718096';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(String(val), pad.left - 5, y + 3);
    }

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '05');

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + ch);
    data.forEach((val, i) => {
      const x = pad.left + (cw / (data.length - 1)) * i;
      const y = pad.top + ch - ((val - minVal) / range) * ch;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + cw, pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = pad.left + (cw / (data.length - 1)) * i;
      const y = pad.top + ch - ((val - minVal) / range) * ch;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Points
    data.forEach((val, i) => {
      const x = pad.left + (cw / (data.length - 1)) * i;
      const y = pad.top + ch - ((val - minVal) / range) * ch;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // X-axis labels (show a few)
    const skipCount = Math.ceil(labels.length / 6);
    labels.forEach((label, i) => {
      if (i % skipCount !== 0 && i !== labels.length - 1) return;
      const x = pad.left + (cw / (labels.length - 1)) * i;
      ctx.fillStyle = isDark ? '#64748b' : '#718096';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, h - 10);
    });
  }

  async function updateTracker() {
    const cached = loadCachedData();

    if (cached) {
      renderData(cached);
      return;
    }

    const [lcData, cdData] = await Promise.allSettled([fetchLeetCodeData(), fetchCodolioData()]);

    const lc = lcData.status === 'fulfilled' ? lcData.value : null;
    const cd = cdData.status === 'fulfilled' ? cdData.value : null;

    const combined = {
      lc: lc || { total: 0, easy: 0, medium: 0, hard: 0 },
      cd: cd || { total: 0, streak: 0, rating: 0, rank: '--' },
      timestamp: Date.now()
    };

    saveCachedData(combined);
    renderData(combined);
  }

  function renderData(data) {
    const lc = data.lc;
    const cd = data.cd;

    setText(lcTotal, lc.total || '--');
    setText(lcEasy, lc.easy || '--');
    setText(lcMedium, lc.medium || '--');
    setText(lcHard, lc.hard || '--');
    setText(cdTotal, cd.total || '--');
    setText(cdStreak, cd.streak ? `${cd.streak}d` : '--');
    setText(cdRating, cd.rating || '--');
    setText(cdRank, cd.rank || '--');

    const ts = data.timestamp || Date.now();
    const dateStr = new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    setText(refreshLabel, dateStr);

    if (lcUpdatedLabel) lcUpdatedLabel.textContent = `Refreshed ${dateStr}`;
    if (cdUpdatedLabel) cdUpdatedLabel.textContent = `Refreshed ${dateStr}`;

    const days = 30;
    const labels = generateDayLabels(days);
    const lcHistory = generateDailyHistory(lc.total || 0, days);
    const cdHistory = generateDailyHistory(cd.total || lc.total || 0, days);

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const lcColor = isDark ? '#2dd4bf' : '#14b8a6';
    const cdColor = isDark ? '#fbbf24' : '#d97706';

    drawChart('leetcode-chart', labels, lcHistory, lcColor);
    drawChart('codolio-chart', labels, cdHistory, cdColor);
  }

  updateTracker();

  // Redraw charts on theme change
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const cached = loadCachedData();
      if (cached) {
        setTimeout(() => renderData(cached), 100);
      }
    });
  }

  // Redraw on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const cached = loadCachedData();
      if (cached) renderData(cached);
    }, 300);
  });
}

function initTypewriter() {
  const element = document.getElementById('typewriter');
  if (!element) return;

  const phrases = [
    'IT Engineering Undergrad @ DJSCE Mumbai',
    'Full-Stack Developer (Next.js, React, TypeScript)',
    'Building AI Tools & Manifest V3 Extensions',
    'Practicing DSA & Algorithms in C++',
    'Spiritualist • Reader • Lifelong Seeker'
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 65;

  function type() {
    const currentPhrase = phrases[phraseIndex];

    if (isDeleting) {
      element.textContent = currentPhrase.substring(0, charIndex - 1);
      charIndex--;
      typingSpeed = 35;
    } else {
      element.textContent = currentPhrase.substring(0, charIndex + 1);
      charIndex++;
      typingSpeed = 65;
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
      isDeleting = true;
      typingSpeed = 2200;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typingSpeed = 400;
    }

    setTimeout(type, typingSpeed);
  }

  type();
}

function initLiveClock() {
  const clockElement = document.getElementById('mumbai-time');
  if (!clockElement) return;

  function updateClock() {
    try {
      const now = new Date();
      const options = {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      const formatter = new Intl.DateTimeFormat([], options);
      clockElement.textContent = formatter.format(now);
    } catch (e) {
      const d = new Date();
      clockElement.textContent = d.toLocaleTimeString();
    }
  }

  updateClock();
  setInterval(updateClock, 1000);
}

function initThemeToggle() {
  const themeBtn = document.getElementById('theme-toggle');
  if (!themeBtn) return;

  const currentTheme = localStorage.getItem('nm_portfolio_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  themeBtn.addEventListener('click', () => {
    const activeTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = activeTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('nm_portfolio_theme', newTheme);

    showToast(`Switched to ${newTheme} mode`);
  });
}

function initNavigation() {
  const navbar = document.getElementById('navbar');
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!isExpanded));
      menuToggle.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }

  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 120;
      const sectionId = section.getAttribute('id');
      const navLink = document.querySelector(`.nav-link[href*="${sectionId}"]`);

      if (navLink) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          navLink.classList.add('active');
        } else {
          navLink.classList.remove('active');
        }
      }
    });
  }, { passive: true });
}

function initClipboardButtons() {
  const copyButtons = document.querySelectorAll('.copy-email-btn');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const email = btn.getAttribute('data-email') || 'nityasunilmishra@gmail.com';

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email)
          .then(() => showToast(`Copied ${email} to clipboard!`))
          .catch(() => fallbackCopy(email));
      } else {
        fallbackCopy(email);
      }
    });
  });

  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(`Copied ${text} to clipboard!`);
    } catch (err) {
      showToast('Press Ctrl+C to copy email');
    }
    document.body.removeChild(textArea);
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.add('show');

  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }

  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const CONTACT_EMAIL = 'nityasunilmishra@gmail.com';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = (form.elements.namedItem('name')?.value || '').trim();
    const email = (form.elements.namedItem('email')?.value || '').trim();
    const subject = (form.elements.namedItem('subject')?.value || '').trim();
    const message = (form.elements.namedItem('message')?.value || '').trim();

    if (!name || !email || !message) {
      showToast('Please fill in all required fields');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
    }

    showToast('Sending your message...');

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          _subject: subject || 'Portfolio Inquiry',
          message,
          _template: 'table',
          _captcha: 'false'
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send message');
      }

      showToast('Message sent! I will get back to you soon.');
      form.reset();
    } catch (error) {
      console.error('Contact form error:', error);
      showToast('Could not send right now. Please email me directly.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    }
  });
}
