const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
const closeMenu = () => {
  mainNav.classList.remove('open');
  navToggle.classList.remove('active');
  navToggle.setAttribute('aria-expanded', 'false');
};
navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  navToggle.classList.toggle('active', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
});

document.getElementById('year').textContent = new Date().getFullYear();

async function submitForm(form, endpoint, statusEl) {
  const payload = Object.fromEntries(new FormData(form).entries());
  const button = form.querySelector('button[type="submit"]');
  const oldText = button.textContent;
  button.disabled = true;
  button.textContent = 'Submitting...';
  statusEl.textContent = '';
  statusEl.style.color = '';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({ message: 'Unexpected server response.' }));
    if (!response.ok) throw new Error(data.message || 'Submission failed');
    statusEl.textContent = data.message;
    form.reset();
  } catch (error) {
    statusEl.textContent = error.message;
    statusEl.style.color = '#a12b2b';
  } finally {
    button.disabled = false;
    button.textContent = oldText;
  }
}

const diagnosticForm = document.getElementById('diagnosticForm');
const contactForm = document.getElementById('contactForm');
diagnosticForm.addEventListener('submit', e => {
  e.preventDefault();
  submitForm(diagnosticForm, '/api/diagnostic', document.getElementById('diagnosticStatus'));
});
contactForm.addEventListener('submit', e => {
  e.preventDefault();
  submitForm(contactForm, '/api/contact', document.getElementById('contactStatus'));
});

const header = document.querySelector('.site-header');
const scrollProgress = document.getElementById('scrollProgress');
const backToTop = document.getElementById('backToTop');
const navSectionLinks = [...mainNav.querySelectorAll('a[href^="#"]')];
const pageSections = navSectionLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
const updateScrollUI = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  scrollProgress.style.width = `${Math.min(progress, 100)}%`;
  header.classList.toggle('scrolled', window.scrollY > 16);
  backToTop.classList.toggle('visible', window.scrollY > 550);

  let currentId = '';
  pageSections.forEach(section => {
    if (section.getBoundingClientRect().top <= 150) currentId = section.id;
  });
  navSectionLinks.forEach(link => {
    const active = link.getAttribute('href') === `#${currentId}`;
    link.classList.toggle('active-link', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
};
updateScrollUI();
window.addEventListener('scroll', updateScrollUI, { passive: true });
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

const revealItems = document.querySelectorAll('.section-heading, .pillar, .metric, .step, .about-card, .requirements-grid article, .diagnostic-grid > *, .contact-grid > *');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('reveal-ready');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item, index) => {
    item.style.setProperty('--reveal-delay', `${(index % 4) * 70}ms`);
    revealObserver.observe(item);
  });
}

window.setTimeout(() => revealItems.forEach(item => item.classList.add('is-visible')), 1400);
