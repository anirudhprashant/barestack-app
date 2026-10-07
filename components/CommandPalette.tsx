import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useData } from '../dataStore';
import { useTimer } from '../src/context/TimerContext';
import { Icon, IconName } from './ui';
import { navItems } from '../constants';
import { useTheme } from '../src/context/ThemeContext';

interface Command {
    id: string;
    label: string;
    hint?: string;
    icon: IconName;
    group: string;
    keywords?: string;
    run: () => void;
}

// Cmd/Ctrl+K: jump anywhere, find any record, or kick off common actions.
export const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const navigate = useNavigate();
    const { data } = useData();
    const timer = useTimer();
    const { theme, toggleTheme, design, setDesign } = useTheme();
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            setQuery('');
            setActive(0);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    const go = (path: string) => () => { navigate(path); onClose(); };

    const commands = useMemo<Command[]>(() => {
        const iconFor: Record<string, IconName> = { grid: 'grid', users: 'users', clipboard: 'clipboard', document: 'document', clock: 'clock', receipt: 'receipt', chart: 'chart' };
        const list: Command[] = [
            { id: 'new-contact', label: 'New contact', icon: 'plus', group: 'Create', keywords: 'add client person', run: go('/crm?new=1') },
            { id: 'new-invoice', label: 'New invoice', icon: 'plus', group: 'Create', keywords: 'bill create', run: go('/invoices?new=1') },
            { id: 'new-project', label: 'New project', icon: 'plus', group: 'Create', run: go('/projects?new=1') },
            { id: 'new-expense', label: 'New expense', icon: 'plus', group: 'Create', keywords: 'spend receipt', run: go('/expenses?new=1') },
            timer.running
                ? { id: 'timer-stop', label: 'Stop timer', icon: 'stop', group: 'Create', run: () => { timer.stop(); onClose(); } }
                : { id: 'timer-start', label: 'Start timer', icon: 'play', group: 'Create', keywords: 'track time', run: go('/time-tracking') },
            ...navItems.map(n => ({ id: `nav-${n.href}`, label: n.label, icon: iconFor[n.icon] || 'grid', group: 'Go to', run: go(n.href) })),
            { id: 'nav-pipeline', label: 'Deal pipeline', icon: 'trending-up', group: 'Go to', keywords: 'deals sales', run: go('/crm/pipeline') },
            { id: 'nav-activity', label: 'Activity log', icon: 'activity', group: 'Go to', run: go('/crm/activities') },
            { id: 'theme', label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', icon: theme === 'dark' ? 'sun' : 'moon', group: 'Go to', keywords: 'theme appearance night', run: () => { toggleTheme(); onClose(); } },
            { id: 'design', label: design === 'barestack' ? 'Switch to Classic theme' : 'Switch to BareStack theme', icon: 'layers', group: 'Go to', keywords: 'theme appearance look style design classic barestack', run: () => { setDesign(design === 'barestack' ? 'classic' : 'barestack'); onClose(); } },
            { id: 'shortcuts', label: 'Keyboard shortcuts', icon: 'keyboard', group: 'Go to', keywords: 'help keys hotkeys', run: () => { onClose(); setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' })), 50); } },
            { id: 'nav-settings', label: 'Settings', icon: 'settings', group: 'Go to', keywords: 'business currency profile backup', run: go('/settings') },
        ];
        for (const c of data.contacts) {
            list.push({ id: `c-${c.id}`, label: c.name, hint: c.company || c.email, icon: 'user', group: 'Contacts', keywords: `${c.email} ${c.company} ${(c.tags || []).join(' ')}`, run: go(`/crm?contact=${c.id}`) });
        }
        for (const p of data.projects) {
            list.push({ id: `p-${p.id}`, label: p.name, hint: p.status, icon: 'clipboard', group: 'Projects', run: go(`/projects/${p.id}`) });
        }
        for (const i of data.invoices) {
            const client = data.contacts.find(c => c.id === i.client_id)?.name || '';
            list.push({ id: `i-${i.id}`, label: `Invoice ${i.invoice_number}`, hint: client, icon: 'document', group: 'Invoices', keywords: client, run: go(`/invoices?open=${i.id}`) });
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.contacts, data.projects, data.invoices, timer.running, theme, design]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return commands.filter(c => c.group === 'Create' || c.group === 'Go to');
        const terms = q.split(/\s+/);
        return commands
            .map(c => {
                const hay = `${c.label} ${c.hint || ''} ${c.keywords || ''} ${c.group}`.toLowerCase();
                if (!terms.every(t => hay.includes(t))) return null;
                const label = c.label.toLowerCase();
                const score = label.startsWith(q) ? 0 : label.includes(q) ? 1 : 2;
                return { c, score };
            })
            .filter((x): x is { c: Command; score: number } => !!x)
            .sort((a, b) => a.score - b.score)
            .slice(0, 40)
            .map(x => x.c);
    }, [commands, query]);

    useEffect(() => { setActive(0); }, [query]);
    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    if (!open) return null;

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); results[active]?.run(); }
        else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };

    let lastGroup = '';
    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-start justify-center p-4 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-xl bg-canvas border border-charcoal shadow-hard" role="dialog" aria-modal="true" aria-label="Command palette">
                <div className="flex items-center gap-3 px-4 border-b border-border">
                    <Icon name="search" className="w-5 h-5 text-muted shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Search contacts, projects, invoices or type a command..."
                        className="flex-1 py-4 bg-transparent text-charcoal placeholder:text-muted focus:outline-none"
                        aria-label="Search"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="cmdk-list"
                        aria-activedescendant={results[active] ? `cmdk-${results[active].id}` : undefined}
                    />
                    <kbd className="hidden sm:inline text-[10px] font-semibold text-muted border border-border px-1.5 py-0.5">ESC</kbd>
                </div>
                <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
                    {results.length === 0 && <p className="px-4 py-6 text-sm text-muted text-center">No results for “{query}”.</p>}
                    {results.map((c, idx) => {
                        const header = c.group !== lastGroup ? c.group : null;
                        lastGroup = c.group;
                        return (
                            <React.Fragment key={c.id}>
                                {header && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted">{header}</p>}
                                <button
                                    id={`cmdk-${c.id}`}
                                    data-idx={idx}
                                    role="option"
                                    aria-selected={idx === active}
                                    onMouseMove={() => setActive(idx)}
                                    onClick={c.run}
                                    className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm ${idx === active ? 'bg-charcoal text-canvas' : 'text-charcoal'}`}
                                >
                                    <Icon name={c.icon} className="w-4 h-4 shrink-0" />
                                    <span className="truncate font-medium">{c.label}</span>
                                    {c.hint && <span className={`truncate text-xs ml-auto ${idx === active ? 'text-canvas/70' : 'text-muted'}`}>{c.hint}</span>}
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>
                <div className="px-4 py-2 border-t border-border text-[11px] text-muted flex gap-4">
                    <span><kbd className="font-semibold">↑↓</kbd> navigate</span>
                    <span><kbd className="font-semibold">↵</kbd> open</span>
                </div>
            </div>
        </div>,
        document.body
    );
};
