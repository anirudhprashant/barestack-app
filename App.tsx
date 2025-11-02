
import React, { useState, createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Icon, Button } from './components/ui';
import { HistoryProvider, useHistory } from './historyStore';
import { supabase } from './lib/supabase';

import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Projects from './pages/Projects';
import Invoices from './pages/Invoices';
import TimeTracking from './pages/TimeTracking';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// --- AUTH CONTEXT ---
interface AuthContextType {
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        // Check if user is already signed in
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsAuthenticated(!!session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);
    
    const login = async (email: string, password: string) => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Error signing in with password:', error);
        }
        setLoading(false);
    };

    const signUp = async (email: string, password: string) => {
        setLoading(true);
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            console.error('Error signing up:', error);
        }
        setLoading(false);
    };
    
    const logout = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
        }
        setLoading(false);
    };

    const value = useMemo(() => ({ isAuthenticated, loading, login, signUp, logout }), [isAuthenticated, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};


// --- SIDEBAR ---
const navItems = [
    { href: '/', label: 'Overview', icon: 'grid' },
    { href: '/crm', label: 'CRM', icon: 'users' },
    { href: '/projects', label: 'Projects', icon: 'clipboard' },
    { href: '/invoices', label: 'Invoicing', icon: 'document' },
    { href: '/time-tracking', label: 'Time Tracking', icon: 'clock' },
    { href: '/expenses', label: 'Expenses', icon: 'receipt' },
    { href: '/reports', label: 'Reports', icon: 'chart' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
];

const Sidebar = () => {
    return (
        <div className="fixed top-0 left-0 h-full w-[200px] bg-white border-r-2 border-brand-dark flex flex-col p-4 z-20">
            <div className="text-3xl font-black text-brand-dark mb-10">
                BareStack
            </div>
            <nav className="flex flex-col space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) =>
                            `flex items-center space-x-3 p-2 rounded-[10px] text-brand-dark font-bold transition-all duration-200 hover:bg-brand-light ${isActive ? 'bg-brand-light border-2 border-brand-dark' : ''}`
                        }
                    >
                        <Icon name={item.icon} className="w-6 h-6" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="mt-auto">
                <div className="flex items-center space-x-3 p-2">
                    <div className="w-10 h-10 bg-brand-light rounded-full border-2 border-brand-dark"></div>
                    <div className="font-bold text-brand-dark">User</div>
                </div>
            </div>
        </div>
    );
};

// --- HEADER ---
const Header = () => {
    const location = useLocation();
    const { logout } = useAuth();
    const { undo, redo, canUndo, canRedo } = useHistory();
    const currentPage = navItems.find(item => item.href === location.pathname)?.label || 'Dashboard';

    return (
        <header className="fixed top-0 left-[200px] right-0 h-20 bg-brand-light border-b-2 border-brand-dark flex items-center justify-between px-8 z-10">
            <h1 className="text-3xl font-extrabold text-brand-dark">{currentPage}</h1>
            <div className="flex items-center space-x-2">
                <Button variant="secondary" onClick={undo} disabled={!canUndo}>Undo</Button>
                <Button variant="secondary" onClick={redo} disabled={!canRedo}>Redo</Button>
                <button 
                  onClick={logout}
                  className="bg-white text-brand-dark font-bold py-2 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                >
                  Log Out
                </button>
            </div>
        </header>
    );
};

// --- LOGIN PAGE ---
const LoginPage = () => {
    const { login, signUp, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg(null);
        try {
            await login(email, password);
        } catch (err: any) {
            setErrorMsg(err?.message || 'Failed to sign in');
        } finally {
            setSubmitting(false);
        }
    };

    const SUPABASE_FUNCTIONS_URL = (import.meta as any).env?.VITE_SUPABASE_URL + '/functions/v1/register-user';

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg(null);
        try {
            // Try server-side admin sign-up (auto-confirm) via Supabase Edge Function
            const res = await fetch(SUPABASE_FUNCTIONS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const body = await res.json();
            if (!res.ok && res.status !== 409) {
                throw new Error(body?.error || 'Supabase Edge Function sign-up failed');
            }
            // After create/exists, attempt password sign-in
            await login(email, password);
        } catch (err: any) {
            setErrorMsg(err?.message || 'Failed to sign up');
        } finally {
            setSubmitting(false);
        }
    };

    const DEV_EMAIL = (import.meta as any).env?.VITE_DEV_EMAIL || 'dev@example.com';
    const DEV_PASSWORD = (import.meta as any).env?.VITE_DEV_PASSWORD || 'devpassword123';

    const devSignIn = async () => {
        // Ensure a dev user exists via server admin route, then password sign-in
        try {
            const res = await fetch(SUPABASE_FUNCTIONS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
            });
            // Ignore 409 (user already exists)
            if (!res.ok && res.status !== 409) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || 'Supabase Edge Function dev sign-up failed');
            }
        } catch (err) {
            console.warn('Dev sign-up warning:', (err as Error).message);
        }
        // Attempt password sign-in
        await login(DEV_EMAIL, DEV_PASSWORD);
    };

    const handleAnonSignIn = async (e: React.MouseEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg(null);
        try {
            const { error } = await supabase.auth.signInAnonymously();
            if (error) {
                // Fallback: quick dev sign-in using env credentials
                await devSignIn();
                return;
            }
        } catch (err: any) {
            // Fallback on any error
            await devSignIn();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-light flex flex-col items-center justify-center font-sans p-4">
            <div className="w-full max-w-sm bg-white p-8 rounded-[10px] border-2 border-brand-dark shadow-neo">
                <h1 className="text-4xl font-black text-brand-dark text-center mb-2">BareStack</h1>
                <p className="text-center text-brand-dark mb-8">No-bullshit business tools.</p>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-brand-dark font-bold mb-2" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white text-brand-dark font-bold py-2 px-4 rounded-[10px] border-2 border-brand-dark"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-brand-dark font-bold mb-2" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white text-brand-dark font-bold py-2 px-4 rounded-[10px] border-2 border-brand-dark"
                            placeholder="Your password"
                            required
                        />
                    </div>
                    {errorMsg && (
                        <div className="text-red-600 font-bold">{errorMsg}</div>
                    )}
                    <div className="flex space-x-2">
                        <button 
                            type="submit" 
                            disabled={submitting || loading}
                            className="flex-1 bg-brand-dark text-white font-bold py-3 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Signing in...' : 'Sign In'}
                        </button>
                        <button 
                            type="button"
                            onClick={handleSignUp}
                            disabled={submitting || loading}
                            className="flex-1 bg-white text-brand-dark font-bold py-3 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Signing up...' : 'Sign Up'}
                        </button>
                    </div>
                    {import.meta.env.DEV && (
                        <button
                            type="button"
                            onClick={handleAnonSignIn}
                            disabled={submitting || loading}
                            className="w-full mt-4 bg-white text-brand-dark font-bold py-3 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Signing in...' : 'Sign In Anonymously (Dev)'}
                        </button>
                    )}
                </form>
            </div>
            <p className="mt-8 text-brand-dark font-semibold">Built by one person with AI. Open-source forever.</p>
        </div>
    );
};

// --- MAIN APP LAYOUT ---
const AppLayout = () => {
    return (
        <div className="font-sans text-brand-dark bg-brand-light min-h-screen">
            <Sidebar />
            <div className="ml-[200px]">
                <Header />
                <main className="pt-20">
                    <div className="p-8">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/crm" element={<CRM />} />
                            <Route path="/projects" element={<Projects />} />
                            <Route path="/invoices" element={<Invoices />} />
                            <Route path="/time-tracking" element={<TimeTracking />} />
                            <Route path="/expenses" element={<Expenses />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/settings" element={<Settings />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </div>
    );
};


// --- APP ---
const AppContent = () => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen bg-brand-light flex items-center justify-center">
                <div className="text-brand-dark font-bold text-xl">Loading...</div>
            </div>
        );
    }
    
    return (
        <HashRouter>
            {isAuthenticated ? <AppLayout /> : <LoginPage />}
        </HashRouter>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <HistoryProvider>
                <AppContent />
            </HistoryProvider>
        </AuthProvider>
    );
};

export default App;
