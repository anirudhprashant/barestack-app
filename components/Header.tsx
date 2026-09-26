import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useData, useCurrency } from '../dataStore';
import { useTimer } from '../src/context/TimerContext';
import { navItems } from '../constants';
import { Icon } from './ui';
import { Power } from 'lucide-react';
import { computeNotifications } from '../src/lib/notifications';
import { formatDuration } from '../src/lib/format';

interface HeaderProps {
    onMenuToggle?: () => void;
    onOpenPalette: () => void;
}

const DISMISSED_KEY = 'barestack.notifications.dismissed';

function readDismissed(): Set<string> {
    try {
        return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));
    } catch {
        return new Set();
    }
}

const severityDot: Record<string, string> = {
    critical: 'bg-activity-red',
    warning: 'bg-activity-orange',
    info: 'bg-activity-blue',
};

const Notifications: React.FC = () => {
    const { data } = useData();
    const currency = useCurrency();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);
    const ref = useRef<HTMLDivElement>(null);

    const all = useMemo(() => computeNotifications(data, currency), [data, currency]);
    const items = all.filter(n => !dismissed.has(n.id));

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const persist = (next: Set<string>) => {
        // Only remember ids that still exist, so the list can't grow forever.
        const live = new Set(all.map(n => n.id));
        const pruned = new Set([...next].filter(id => live.has(id)));
        setDismissed(pruned);
        try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...pruned])); } catch { /* ignore */ }
    };

    const critical = items.some(n => n.severity === 'critical');

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="relative p-2 text-muted hover:text-charcoal transition-colors border border-transparent hover:border-border"
                aria-label={`Notifications${items.length ? ` (${items.length})` : ''}`}
                aria-expanded={open}
            >
                <Icon name="bell" className="w-5 h-5" />
                {items.length > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-[18px] text-center text-canvas ${critical ? 'bg-activity-red' : 'bg-charcoal'}`}>
                        {items.length > 9 ? '9+' : items.length}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] bg-canvas border border-charcoal shadow-hard z-30">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h3 className="text-sm font-bold uppercase tracking-wider font-body">Needs attention</h3>
                        {items.length > 0 && (
                            <button className="text-xs font-semibold text-muted hover:text-charcoal underline" onClick={() => persist(new Set([...dismissed, ...items.map(n => n.id)]))}>
                                Clear all
                            </button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-border/50">
                        {items.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <Icon name="check-circle" className="w-8 h-8 text-activity-green mx-auto mb-2" />
                                <p className="text-sm text-muted">You're all caught up.</p>
                            </div>
                        ) : items.map(n => (
                            <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface/60 group">
                                <span className={`w-2 h-2 mt-1.5 shrink-0 ${severityDot[n.severity]}`} aria-label={n.severity} />
                                <button className="flex-1 min-w-0 text-left" onClick={() => { setOpen(false); navigate(n.href); }}>
                                    <p className="text-sm font-medium text-charcoal">{n.title}</p>
                                    <p className="text-xs text-muted truncate">{n.detail}</p>
                                </button>
                                <button
                                    onClick={() => persist(new Set([...dismissed, n.id]))}
                                    className="text-muted hover:text-charcoal p-0.5 sm:opacity-0 group-hover:opacity-100"
                                    aria-label="Dismiss"
                                >
                                    <Icon name="x" className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const TimerPill: React.FC = () => {
    const timer = useTimer();
    const { data } = useData();
    const navigate = useNavigate();
    if (!timer.running) return null;
    const project = data.projects.find(p => p.id === timer.projectId);
    return (
        <div className="flex items-center border border-charcoal">
            <button onClick={() => navigate(`/projects/${timer.projectId}`)} className="flex items-center gap-2 px-2.5 py-1.5 text-sm hover:bg-surface" title={project?.name}>
                <span className="w-2 h-2 bg-activity-red rounded-full animate-pulse" aria-hidden />
                <span className="font-bold tabular-nums">{formatDuration(timer.elapsedMs)}</span>
                <span className="hidden lg:inline text-muted max-w-[140px] truncate">{project?.name}</span>
            </button>
            <button onClick={timer.stop} className="px-2 py-1.5 border-l border-charcoal bg-charcoal text-canvas hover:bg-content" aria-label="Stop timer" title="Stop timer">
                <Icon name="stop" className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

const Header: React.FC<HeaderProps> = ({ onMenuToggle, onOpenPalette }) => {
    const location = useLocation();
    const { logout } = useAuth();

    const getPageTitle = (pathname: string) => {
        if (pathname.startsWith('/crm')) return 'CRM';
        if (pathname.startsWith('/projects')) return 'Projects';
        if (pathname.startsWith('/settings')) return 'Settings';
        const item = navItems.find(i => i.href === pathname);
        return item?.label || 'Overview';
    };
    const currentPage = getPageTitle(location.pathname);
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

    return (
        <header className="fixed top-0 left-0 md:left-[220px] right-0 h-[var(--app-shell-header-height)] bg-canvas border-b border-border flex items-center justify-between gap-2 px-4 sm:px-6 z-10">
            <div className="flex items-center gap-3 min-w-0">
                {onMenuToggle && (
                    <button
                        onClick={onMenuToggle}
                        className="md:hidden p-2 -ml-2 text-charcoal hover:bg-surface transition-colors"
                        aria-label="Open navigation menu"
                    >
                        <Icon name="menu" size={22} />
                    </button>
                )}
                <h1 className="text-lg font-display text-charcoal truncate">{currentPage}</h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
                <button
                    onClick={onOpenPalette}
                    className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 text-sm text-muted border border-transparent sm:border-border hover:border-charcoal hover:text-charcoal transition-colors"
                    aria-label="Search and commands"
                >
                    <Icon name="search" className="w-4 h-4" />
                    <span className="hidden md:inline">Search</span>
                    <kbd className="hidden md:inline text-[10px] font-semibold border border-border px-1">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
                </button>
                <TimerPill />
                <Notifications />
                <div className="h-5 w-px bg-border hidden sm:block"></div>
                <button
                    onClick={logout}
                    aria-label="Log out"
                    className="hidden sm:inline-flex text-sm font-semibold text-muted hover:text-canvas hover:bg-charcoal transition-colors px-3 py-1.5 border border-border hover:border-charcoal"
                >
                    Log Out
                </button>
                <button
                    onClick={logout}
                    aria-label="Log out"
                    className="sm:hidden p-1.5 text-red-600 hover:text-red-700 transition-colors"
                >
                    <Power size={20} strokeWidth={2.5} />
                </button>
            </div>
        </header>
    );
};
export default Header;
