## Cause
- The import code expects `window.XLSX` from a CDN, but the CDN was removed. `XLSX` is undefined, so calling `.read` throws “Cannot read properties of undefined (reading 'read')”.

## Changes
1) Add `xlsx` as a dependency and use a proper import (`import * as XLSX from 'xlsx'`).
2) Update the import logic to support both CSV and Excel:
- For `.csv`: read with `FileReader.readAsText` and `XLSX.read(text, { type: 'string' })`.
- For `.xls/.xlsx`: read with `FileReader.readAsArrayBuffer` and `XLSX.read(new Uint8Array(buffer), { type: 'array' })`.
3) Keep header auto-detection and defval handling intact; improve error messages instead of failing silently.

## Safety
- Minimal changes limited to `package.json` and `pages/CRM.tsx`.
- No change to runtime behavior beyond fixing the import flow.

## Verification
- Install deps, build, and try importing both CSV and XLSX; ensure no runtime errors and the mapping works.
- Keep the local server on port 3000 running; do not stop it.