// Applies the saved colour theme and design before the app renders (no flash
// of the wrong theme). A static file because the CSP forbids inline scripts.
// Keep the storage keys in sync with src/context/ThemeContext.tsx.
(function () {
  try {
    var pref = localStorage.getItem('barestack.theme') || 'light';
    var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var design = localStorage.getItem('barestack.design') === 'barestack' ? 'barestack' : 'classic';
    var root = document.documentElement;
    root.classList.add(dark ? 'dark' : 'light', 'theme-' + design);
    root.setAttribute('data-design', design);
  } catch (e) { /* storage blocked: stay light, classic */ }
})();
