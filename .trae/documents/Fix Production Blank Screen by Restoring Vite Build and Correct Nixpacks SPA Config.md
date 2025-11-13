## Diagnosis
- The site returns a blank screen because module scripts are served with `text/html`, triggering “Failed to load module script… MIME type 'text/html'”. This happens when the server rewrites asset requests (e.g., `.js`, `.tsx`) to `index.html` instead of serving built files.
- Using Tailwind via CDN and the in‑browser Babel transformer in production adds warnings and bypasses compilation; combined with SPA rewrites it yields white screens.
- Current deployment plan runs `npm run start` under Nixpacks; with no dedicated server, the app should be served as a static SPA from `dist/`. The env variable shown uses `NIXPACKS_SPA_OUTPUT_DIR`, but the correct variable is `NIXPACKS_SPA_OUT_DIR`.

## Plan (Recommended: Vite Build)
1) Re‑enable Vite bundling and Tailwind plugin
- Add Tailwind as a Vite plugin: `npm install tailwindcss @tailwindcss/vite`
- In `vite.config.ts`, add `import tailwindcss from '@tailwindcss/vite'` and include `tailwind