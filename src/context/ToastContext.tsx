import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    kind: ToastKind;
    message: string;
}

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

interface ToastContextType {
    toast: (message: string, kind?: ToastKind) => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const kindStyles: Record<ToastKind, string> = {
    success: 'border-activity-green/40 text-activity-green',
    error: 'border-activity-red/40 text-activity-red',
    info: 'border-border text-charcoal',
};

const kindIcon: Record<ToastKind, string> = {
    success: '✓',
    error: '!',
    info: 'i',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
    const nextId = useRef(1);

    const toast = useCallback((message: string, kind: ToastKind = 'info') => {
        const id = nextId.current++;
        setToasts(prev => [...prev, { id, kind, message }]);
        // Auto-dismiss after 4s. Errors linger a bit longer so they aren't missed.
        window.setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, kind === 'error' ? 6000 : 4000);
    }, []);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>(resolve => {
            setConfirmState({ ...options, resolve });
        });
    }, []);

    const resolveConfirm = (value: boolean) => {
        if (confirmState) confirmState.resolve(value);
        setConfirmState(null);
    };

    return (
        <ToastContext.Provider value={{ toast, confirm }}>
            {children}
            {createPortal(
                <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" role="region" aria-live="polite">
                    {toasts.map(t => (
                        <div
                            key={t.id}
                            className={`flex items-start gap-3 bg-canvas border ${kindStyles[t.kind]} px-4 py-3 shadow-hard-sm animate-in fade-in slide-in-from-bottom-2 duration-200`}
                            role={t.kind === 'error' ? 'alert' : 'status'}
                        >
                            <span className="font-bold mt-px" aria-hidden="true">{kindIcon[t.kind]}</span>
                            <span className="text-sm text-charcoal flex-1">{t.message}</span>
                            <button
                                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                                className="text-muted hover:text-charcoal text-sm"
                                aria-label="Dismiss notification"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>,
                document.body
            )}
            {confirmState && createPortal(
                <div
                    className="fixed inset-0 bg-charcoal/80 z-[101] flex items-center justify-center p-4"
                    onClick={() => resolveConfirm(false)}
                >
                    <div
                        className="bg-canvas p-6 w-full max-w-md border border-border"
                        onClick={e => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        {confirmState.title && <h2 className="text-xl font-bold text-charcoal mb-2">{confirmState.title}</h2>}
                        <p className="text-sm text-muted mb-6">{confirmState.message}</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => resolveConfirm(false)}
                                className="font-semibold py-2 px-4 bg-canvas text-charcoal border border-charcoal hover:bg-surface transition-all"
                            >
                                {confirmState.cancelLabel || 'Cancel'}
                            </button>
                            <button
                                onClick={() => resolveConfirm(true)}
                                className={`font-semibold py-2 px-4 border transition-all ${
                                    confirmState.danger
                                        ? 'bg-surface text-activity-red border-activity-red/30 hover:bg-activity-red/10'
                                        : 'bg-charcoal text-canvas border-charcoal hover:bg-content'
                                }`}
                            >
                                {confirmState.confirmLabel || 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
