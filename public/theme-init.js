// Applies the saved colour theme before the app renders (no flash of the
// wrong theme). A static file because the CSP forbids inline scripts.
// Keep the storage key in sync with src/context/ThemeContext.tsx.
(function () {
  try {
    var pref = localStorage.getItem('barestack.theme') || 'light';
    var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.add(dark ? 'dark' : 'light');
  } catch (e) { /* storage blocked: stay light */ }
})();
