import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { supabase } from './services/supabaseClient';
import type { AuthSession } from '@supabase/supabase-js';

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
        const init = async () => {
            if (!supabase) {
                setSession(null);
                setLoading(false);
                return;
            }
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };
        init();

        if (!supabase) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    const logout = () => {
        if (!supabase) return;
        supabase.auth.signOut();
    };

    const value = useMemo(() => ({
        session,
        isAuthenticated: !!session,
        logout
    }), [session]);

    if (loading) {
        return <div className="min-h-screen bg-brand-light flex items-center justify-center font-bold text-2xl">Authenticating...</div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
