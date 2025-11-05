import React, { useState, createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import type { AuthSession } from '@supabase/supabase-js';

// --- AUTH CONTEXT ---
interface AuthContextType {
    session: AuthSession | null;
    isAuthenticated: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const logout = () => supabase.auth.signOut();

    const value = useMemo(() => ({
        session,
        isAuthenticated: !!session,
        logout
    }), [session]);

    if (loading) {
        return <div className="min-h-screen bg-brand-light flex items-center justify-center">Loading...</div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
