document.addEventListener('DOMContentLoaded', () => {
  injectResponsiveFixes();
  initTypewriter();
  initLiveClock();
  initSocialStats();
  initThemeToggle();
  initNavigation();
  initClipboardButtons();
  initContactForm();
});

function injectResponsiveFixes() {
  if (document.getElementById('portfolio-layout-fixes')) return;

  const style = document.createElement('style');
  style.id = 'portfolio-layout-fixes';
  style.textContent = `
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
    }

    .stat-orb {
      text-align: center;
    }

    @media (max-width: 900px) {
      .hero-visual {
        order: -1;
        margin-bottom: 1rem;
      }

      .metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 560px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .stat-orb {
        width: 64px;
        height: 64px;
      }

      .orb-num {
        font-size: 0.95rem;
      }
    }
  `;

  document.head.appendChild(style);
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
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
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
    fetchJson('https://alfa-leetcode-api.onrender.com/nityasunilmishra/solved')
      .then(stats => {
        const solvedCount = Number(stats?.solvedProblem);
        if (!Number.isInteger(solvedCount) || solvedCount < 0) {
          throw new Error('LeetCode response did not include a valid solved-problem count');
        }

        setCount(leetcodeOrbCount, solvedCount);
        setCount(leetcodeSolvedCount, solvedCount);
      })
      .catch(error => {
        console.warn('Unable to load LeetCode solved-problem count:', error);
      });
  }
}

function initTypewriter() {
  const element = document.getElementById('typewriter');
  if (!element) return;

  const phrases = [
    'IT Engineering Undergrad @ DJSCE Mumbai (9.9 CGPA)',
    'Full-Stack Developer (Next.js 16, React 19, TypeScript)',
    'Building AI Tools & Manifest V3 Extensions with Gemini',
    'Practicing Data Structures & Algorithms in C++',
    'Focusing on Core Fundamentals & Scalable Architecture'
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

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      showToast('Please fill in all required fields');
      return;
    }

    const fullBody = `Hi Nitya,\n\n${message}\n\nFrom: ${name} (${email})`;
    const mailtoUrl = `mailto:nityasunilmishra@gmail.com?subject=${encodeURIComponent(subject || 'Portfolio Inquiry')}&body=${encodeURIComponent(fullBody)}`;

    showToast('Opening your email client...');
    window.location.href = mailtoUrl;

    form.reset();
  });
}
