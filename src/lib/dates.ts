import { format } from 'date-fns';

// PocketBase returns datetimes as "2026-09-26 11:46:12.000Z" (space, not "T").
// Chrome parses that, older Safari returns Invalid Date, so normalise first.
export function parseDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const d = new Date(value.trim().replace(' ', 'T'));
    return isNaN(d.getTime()) ? null : d;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

// Calendar-date fields (invoice dates, expense dates, time entries) are stored
// as UTC midnight. Reading them with `new Date()` shifts them a day back for
// anyone west of UTC, so take the Y-M-D part and build a *local* date instead.
export function parseDateOnly(value: string | null | undefined): Date | null {
    if (!value) return null;
    const m = DATE_ONLY.exec(value.trim());
    if (!m) return parseDate(value);
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
}

// "YYYY-MM-DD" for an <input type="date">, from a stored date-only value.
export function toDateInput(value: string | null | undefined): string {
    const d = parseDateOnly(value);
    return d ? format(d, 'yyyy-MM-dd') : '';
}

// Today (local) as "YYYY-MM-DD".
export function todayInput(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

// Local Date -> stored date-only value. Accepts a Date or "YYYY-MM-DD".
export function toStoredDate(value: Date | string): string {
    const ymd = typeof value === 'string' ? value.slice(0, 10) : format(value, 'yyyy-MM-dd');
    return `${ymd} 00:00:00.000Z`;
}

export function formatDateOnly(value: string | null | undefined, pattern = 'MMM d, yyyy'): string {
    const d = parseDateOnly(value);
    return d ? format(d, pattern) : '—';
}

export function formatDateTime(value: string | null | undefined, pattern = 'MMM d, yyyy h:mm a'): string {
    const d = parseDate(value);
    return d ? format(d, pattern) : '—';
}

// Epoch ms for sorting; unknown dates sort last when descending.
export function sortTime(value: string | null | undefined): number {
    return parseDate(value)?.getTime() ?? 0;
}
