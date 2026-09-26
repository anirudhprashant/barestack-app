// CSV writer used by every export in the app.
//
// Cells that start with = + - @ (or a tab / carriage return) are treated as
// formulas by Excel, Numbers and Sheets, so a contact named
// `=HYPERLINK("http://evil", "click")` would become a live link in the
// exported file. Those cells get a leading apostrophe, the standard
// OWASP mitigation. Plain negative numbers are left alone.

const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function csvCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    let s: string;
    if (typeof value === 'string') s = value;
    else if (typeof value === 'number' || typeof value === 'boolean') s = String(value);
    else s = JSON.stringify(value);

    if (FORMULA_START.test(s) && !PLAIN_NUMBER.test(s)) s = `'${s}`;
    if (/[",\n\r]/.test(s) || s !== s.trim()) s = `"${s.replace(/"/g, '""')}"`;
    return s;
}

export function toCSV<T extends object>(rows: T[], columns?: { key: keyof T | string; label?: string }[]): string {
    if (rows.length === 0 && !columns) return '';
    const cols = columns ?? Array.from(
        rows.reduce((set, row) => {
            Object.keys(row).forEach(k => set.add(k));
            return set;
        }, new Set<string>())
    ).map(key => ({ key, label: key }));
    const header = cols.map(c => csvCell(c.label ?? String(c.key))).join(',');
    const body = rows.map(row => cols.map(c => csvCell((row as Record<string, unknown>)[c.key as string])).join(','));
    return [header, ...body].join('\r\n');
}

export function downloadText(content: string, filename: string, mime = 'text/csv;charset=utf-8') {
    // BOM so Excel opens UTF-8 CSVs (names with accents etc.) correctly.
    const bom = mime.startsWith('text/csv') ? '﻿' : '';
    const blob = new Blob([bom + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
