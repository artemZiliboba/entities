(() => {
  'use strict';
  const root = document.documentElement;
  // GitHub Pages projects share an origin: scope the preference to this site.
  const sitePath = new URL('.', document.baseURI).pathname;
  const storageKey = `entities-theme:${sitePath}`;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  let transitionTimer;
  let button;

  function readPreference() {
    try {
      const value = localStorage.getItem(storageKey);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  function applyTheme(theme, animate = false) {
    if (animate && root.dataset.theme !== theme) {
      clearTimeout(transitionTimer);
      root.classList.add('theme-transition');
      // Commit transition rules before updating colour variables.
      void root.offsetWidth;
      transitionTimer = setTimeout(() => root.classList.remove('theme-transition'), 350);
    }
    root.dataset.theme = theme;
    if (button) {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.title = theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему';
    }
  }

  preference = readPreference();
  // This script runs before the stylesheet, preventing a light flash on reload.
  applyTheme(preference || (systemTheme.matches ? 'dark' : 'light'));

  document.addEventListener('DOMContentLoaded', () => {
    button = document.getElementById('themeToggle');
    if (!button) return;
    button.hidden = false;
    applyTheme(root.dataset.theme);
    button.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(preference, true);
      try { localStorage.setItem(storageKey, preference); } catch { /* Keep the toggle usable without storage. */ }
    });
  });

  systemTheme.addEventListener('change', event => {
    if (!preference) applyTheme(event.matches ? 'dark' : 'light', true);
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = readPreference();
    applyTheme(preference || (systemTheme.matches ? 'dark' : 'light'), true);
  });
})();
