
import React, { createContext, useReducer, useContext, ReactNode, useEffect } from 'react';
import { AppState } from './types';

// --- STATE AND ACTIONS ---

interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

type Action<T> =
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'SET_STATE'; newState: T };

// --- REDUCER ---

const historyReducer = <T,>(state: HistoryState<T>, action: Action<T>): HistoryState<T> => {
    const { past, present, future } = state;

    switch (action.type) {
        case 'UNDO':
            if (past.length === 0) return state;
            const previous = past[past.length - 1];
            const newPast = past.slice(0, past.length - 1);
            return {
                past: newPast,
                present: previous,
                future: [present, ...future],
            };
        case 'REDO':
            if (future.length === 0) return state;
            const next = future[0];
            const newFuture = future.slice(1);
            return {
                past: [...past, present],
                present: next,
                future: newFuture,
            };
        case 'SET_STATE':
            if (action.newState === present) return state;
            return {
                past: [...past, present],
                present: action.newState,
                future: [],
            };
        default:
            return state;
    }
};

// --- CONTEXT ---

interface HistoryContextType {
    state: HistoryState<AppState>;
    setState: (newState: AppState) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

// --- PROVIDER ---

const DB_KEY = 'barestask_appstate';

export const HistoryProvider = ({ children }: { children: ReactNode }) => {
    const getInitialState = (): HistoryState<AppState> => {
        try {
            const savedState = localStorage.getItem(DB_KEY);
            if (savedState) {
                // Ensure the saved state has the correct shape
                const parsed = JSON.parse(savedState);
                if(parsed.present && parsed.past && parsed.future) {
                   return parsed;
                }
            }
        } catch (error) {
            console.error("Failed to parse state from localStorage", error);
        }
        // If nothing in storage or format is wrong, create fresh state
        const emptyState: AppState = {
            contacts: [],
            deals: [],
            projects: [],
            tasks: [],
            invoices: [],
            timeEntries: [],
            expenses: [],
            recentActivity: [],
        };
        return {
            past: [],
            present: emptyState,
            future: [],
        };
    };

    const [state, dispatch] = useReducer(historyReducer, getInitialState());

    // --- Persistence ---
    useEffect(() => {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(state));
        } catch (error) {
            console.error("Failed to save state to localStorage", error);
        }
    }, [state]);

    const setState = (newState: AppState) => dispatch({ type: 'SET_STATE', newState });
    const undo = () => dispatch({ type: 'UNDO' });
    const redo = () => dispatch({ type: 'REDO' });

    const canUndo = state.past.length > 0;
    const canRedo = state.future.length > 0;

    return (
        <HistoryContext.Provider value={{ state, setState, undo, redo, canUndo, canRedo }}>
            {children}
        </HistoryContext.Provider>
    );
};

// --- HOOK ---

export const useHistory = () => {
    const context = useContext(HistoryContext);
    if (!context) {
        throw new Error('useHistory must be used within a HistoryProvider');
    }
    return context;
};
