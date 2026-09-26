export const DEFAULT_CURRENCY = 'USD';

// Common currencies for the settings picker. Any valid ISO 4217 code works.
export const CURRENCIES: { code: string; label: string }[] = [
    { code: 'USD', label: 'US Dollar' },
    { code: 'EUR', label: 'Euro' },
    { code: 'GBP', label: 'British Pound' },
    { code: 'INR', label: 'Indian Rupee' },
    { code: 'CAD', label: 'Canadian Dollar' },
    { code: 'AUD', label: 'Australian Dollar' },
    { code: 'NZD', label: 'New Zealand Dollar' },
    { code: 'SGD', label: 'Singapore Dollar' },
    { code: 'AED', label: 'UAE Dirham' },
    { code: 'CHF', label: 'Swiss Franc' },
    { code: 'SEK', label: 'Swedish Krona' },
    { code: 'NOK', label: 'Norwegian Krone' },
    { code: 'DKK', label: 'Danish Krone' },
    { code: 'PLN', label: 'Polish Zloty' },
    { code: 'JPY', label: 'Japanese Yen' },
    { code: 'CNY', label: 'Chinese Yuan' },
    { code: 'HKD', label: 'Hong Kong Dollar' },
    { code: 'ZAR', label: 'South African Rand' },
    { code: 'BRL', label: 'Brazilian Real' },
    { code: 'MXN', label: 'Mexican Peso' },
];

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, compact: boolean): Intl.NumberFormat {
    const key = `${currency}|${compact}`;
    let f = formatterCache.get(key);
    if (!f) {
        try {
            f = new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency,
                ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
            });
        } catch {
            // Invalid currency code: fall back rather than crash the page.
            f = new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: DEFAULT_CURRENCY,
                ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
            });
        }
        formatterCache.set(key, f);
    }
    return f;
}

export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY, opts?: { compact?: boolean }): string {
    const n = Number.isFinite(amount) ? amount : 0;
    return getFormatter(currency || DEFAULT_CURRENCY, !!opts?.compact).format(n);
}

// Just the symbol, for input labels like "Rate ($)".
export function currencySymbol(currency: string = DEFAULT_CURRENCY): string {
    const part = getFormatter(currency || DEFAULT_CURRENCY, false)
        .formatToParts(0)
        .find(p => p.type === 'currency');
    return part?.value || currency;
}

export function formatHours(hours: number): string {
    const n = Number.isFinite(hours) ? hours : 0;
    return `${Math.round(n * 100) / 100}h`;
}

// 5400000 -> "1:30:00"
export function formatDuration(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?';
}

const AVATAR_COLORS = [
    'bg-activity-red/10 text-activity-red',
    'bg-activity-green/10 text-activity-green',
    'bg-activity-blue/10 text-activity-blue',
    'bg-activity-orange/10 text-activity-orange',
    'bg-activity-purple/10 text-activity-purple',
    'bg-activity-indigo/10 text-activity-indigo',
];

export function avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
