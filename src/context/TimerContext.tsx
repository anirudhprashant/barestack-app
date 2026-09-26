import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/ui';
import { TimeEntryForm } from '../../components/TimeEntryForm';
import { useData } from '../../dataStore';

// A single running timer, kept in localStorage so it survives reloads, closed
// tabs and navigation, and stays in sync across tabs via the storage event.
// Stopping it opens a pre-filled time entry to review before saving.

interface TimerState {
    projectId: string;
    taskId?: string;
    description?: string;
    startedAt: number; // epoch ms
}

interface TimerContextType {
    running: boolean;
    projectId: string | null;
    taskId: string | null;
    description: string;
    startedAt: number | null;
    elapsedMs: number;
    start: (projectId: string, taskId?: string, description?: string) => void;
    stop: () => void;
    discard: () => void;
}

const STORAGE_KEY = 'barestack.timer';
const TimerContext = createContext<TimerContextType | undefined>(undefined);

function read(): TimerState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as TimerState;
        return parsed && typeof parsed.startedAt === 'number' && parsed.projectId ? parsed : null;
    } catch {
        return null;
    }
}

function write(state: TimerState | null) {
    try {
        if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Storage unavailable (private mode): the timer still works for this tab.
    }
}

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data } = useData();
    const [state, setState] = useState<TimerState | null>(read);
    const [now, setNow] = useState(Date.now());
    const [pending, setPending] = useState<{ projectId: string; taskId?: string; hours: number; description: string } | null>(null);

    useEffect(() => {
        if (!state) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [state]);

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) setState(read());
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // A timer pointing at a deleted project is useless; drop it.
    useEffect(() => {
        if (state && data.projects.length && !data.projects.some(p => p.id === state.projectId)) {
            write(null);
            setState(null);
        }
    }, [state, data.projects]);

    const start = useCallback((projectId: string, taskId?: string, description?: string) => {
        const next = { projectId, taskId, description, startedAt: Date.now() };
        write(next);
        setState(next);
        setNow(Date.now());
    }, []);

    const discard = useCallback(() => {
        write(null);
        setState(null);
    }, []);

    const stop = useCallback(() => {
        const current = read() || state;
        if (!current) return;
        const hours = Math.max(0.01, (Date.now() - current.startedAt) / 3_600_000);
        setPending({ projectId: current.projectId, taskId: current.taskId, hours, description: current.description || '' });
        write(null);
        setState(null);
    }, [state]);

    const value = useMemo<TimerContextType>(() => ({
        running: !!state,
        projectId: state?.projectId ?? null,
        taskId: state?.taskId ?? null,
        description: state?.description ?? '',
        startedAt: state?.startedAt ?? null,
        elapsedMs: state ? Math.max(0, now - state.startedAt) : 0,
        start,
        stop,
        discard,
    }), [state, now, start, stop, discard]);

    return (
        <TimerContext.Provider value={value}>
            {children}
            <Modal isOpen={!!pending} onClose={() => setPending(null)} title="Save tracked time">
                {pending && (
                    <TimeEntryForm
                        initialProjectId={pending.projectId}
                        initialTaskId={pending.taskId}
                        initialHours={pending.hours}
                        initialDescription={pending.description}
                        onClose={() => setPending(null)}
                    />
                )}
            </Modal>
        </TimerContext.Provider>
    );
};

export const useTimer = (): TimerContextType => {
    const ctx = useContext(TimerContext);
    if (!ctx) throw new Error('useTimer must be used within a TimerProvider');
    return ctx;
};
