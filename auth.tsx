import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { pb, onAuthChange } from './src/lib/pocketbase';
import { signOut as pbSignOut } from './src/lib/auth';
import type { PBAuthModel, PBSession } from './src/types/pb-types';

interface AuthContextType {
    session: PBSession | null;
    isAuthenticated: boolean;
    logout: () => void;
    currentUser: PBAuthModel | null;
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
    const [session, setSession] = useState<PBSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            if (pb.authStore.isValid && pb.authStore.model) {
                const model = pb.authStore.model as unknown as PBAuthModel;
                setSession({
                    id: model.id || '',
                    created: model.created || '',
                    updated: model.updated || '',
                    token: pb.authStore.token,
                    user: model,
                });
            }
            setLoading(false);
        };

        init();

        const unsub = onAuthChange((model) => {
            if (model) {
                const m = model as unknown as PBAuthModel;
                setSession({
                    id: m.id || '',
                    created: m.created || '',
                    updated: m.updated || '',
                    token: pb.authStore.token,
                    user: m,
                });
            } else {
                setSession(null);
            }
        });

        return () => { unsub(); };
    }, []);

    const logout = async () => {
        await pbSignOut();
        setSession(null);
    };

    const value = useMemo(() => ({
        session,
        isAuthenticated: pb.authStore.isValid,
        logout,
        currentUser: pb.authStore.model as PBAuthModel | null,
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
