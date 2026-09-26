import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui';
import { useTimer } from '../src/context/TimerContext';
import { useTheme } from '../src/context/ThemeContext';

// Two-key sequences ("g i" = go to invoices) plus a few single keys, in the
// style of Linear / GitHub. Ignored while typing or when a dialog is open.
const GO: Record<string, [string, string]> = {
    d: ['/', 'Overview'],
    c: ['/crm', 'Contacts'],
    l: ['/crm/pipeline', 'Pipeline'],
    p: ['/projects', 'Projects'],
    i: ['/invoices', 'Invoices'],
    t: ['/time-tracking', 'Time tracking'],
    e: ['/expenses', 'Expenses'],
    r: ['/reports', 'Reports'],
    s: ['/settings', 'Settings'],
};

const NEW: Record<string, [string, string]> = {
    c: ['/crm?new=1', 'New contact'],
    p: ['/projects?new=1', 'New project'],
    i: ['/invoices?new=1', 'New invoice'],
    e: ['/expenses?new=1', 'New expense'],
};

function isTyping(el: EventTarget | null): boolean {
    const t = el as HTMLElement | null;
    if (!t) return false;
    return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
}

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-xs font-semibold border border-border bg-surface text-charcoal">{children}</kbd>
);

export const Shortcuts: React.FC<{ onOpenPalette: () => void }> = ({ onOpenPalette }) => {
    const navigate = useNavigate();
    const timer = useTimer();
    const { toggleTheme } = useTheme();
    const [helpOpen, setHelpOpen] = useState(false);
    const pending = useRef<{ key: 'g' | 'n'; at: number } | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
            // A modal is open (they lock body scroll): leave keys to it.
            if (document.body.style.overflow === 'hidden' || document.querySelector('[aria-label="Command palette"]')) return;
            const key = e.key.toLowerCase();

            const prefix = pending.current;
            if (prefix && Date.now() - prefix.at < 1200) {
                pending.current = null;
                const target = (prefix.key === 'g' ? GO : NEW)[key];
                if (target) {
                    e.preventDefault();
                    navigate(target[0]);
                }
                return;
            }

            if (key === 'g' || key === 'n') {
                pending.current = { key, at: Date.now() };
                return;
            }
            if (e.key === '?') {
                e.preventDefault();
                setHelpOpen(true);
            } else if (key === '/') {
                e.preventDefault();
                onOpenPalette();
            } else if (key === 't') {
                e.preventDefault();
                if (timer.running) timer.stop();
                else navigate('/time-tracking');
            } else if (key === 'd' && e.shiftKey) {
                e.preventDefault();
                toggleTheme();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [navigate, onOpenPalette, timer, toggleTheme]);

    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

    return (
        <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard shortcuts" maxWidthClass="max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 text-sm">
                <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 font-body">Go to</h3>
                    <ul className="space-y-2">
                        {Object.entries(GO).map(([k, [, label]]) => (
                            <li key={k} className="flex justify-between items-center"><span>{label}</span><span className="flex gap-1"><Kbd>G</Kbd><Kbd>{k.toUpperCase()}</Kbd></span></li>
                        ))}
                    </ul>
                </section>
                <div className="space-y-6">
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 font-body">Create</h3>
                        <ul className="space-y-2">
                            {Object.entries(NEW).map(([k, [, label]]) => (
                                <li key={k} className="flex justify-between items-center"><span>{label}</span><span className="flex gap-1"><Kbd>N</Kbd><Kbd>{k.toUpperCase()}</Kbd></span></li>
                            ))}
                        </ul>
                    </section>
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 font-body">Anywhere</h3>
                        <ul className="space-y-2">
                            <li className="flex justify-between items-center"><span>Search &amp; commands</span><span className="flex gap-1"><Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd><Kbd>K</Kbd><span className="text-muted px-1">or</span><Kbd>/</Kbd></span></li>
                            <li className="flex justify-between items-center"><span>Stop timer / go to time</span><Kbd>T</Kbd></li>
                            <li className="flex justify-between items-center"><span>Toggle dark mode</span><span className="flex gap-1"><Kbd>Shift</Kbd><Kbd>D</Kbd></span></li>
                            <li className="flex justify-between items-center"><span>This help</span><Kbd>?</Kbd></li>
                        </ul>
                    </section>
                </div>
            </div>
        </Modal>
    );
};
