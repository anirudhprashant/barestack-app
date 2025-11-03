import React, { useState, createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Icon, Button, Input } from './components/ui';
import { DataProvider, useData } from './dataStore';
import { supabase } from './services/supabaseClient';
import type { AuthSession } from '@supabase/supabase-js';

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

function AuthProvider({ children }: { children: ReactNode }) {
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

function Sidebar() {
    const { session } = useAuth();
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
                        <Icon name={item.icon as any} className="w-6 h-6" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="mt-auto">
                <div className="flex items-center space-x-3 p-2">
                    <div className="w-10 h-10 bg-brand-light rounded-full border-2 border-brand-dark flex items-center justify-center font-bold">
                        {session?.user?.email?.[0].toUpperCase()}
                    </div>
                    <div className="font-bold text-brand-dark truncate">{session?.user?.email}</div>
                </div>
            </div>
        </div>
    );
}

// --- HEADER ---
function Header() {
    const location = useLocation();
    const { logout } = useAuth();
    const currentPage = navItems.find(item => item.href === location.pathname)?.label || 'Dashboard';

    return (
        <header className="fixed top-0 left-[200px] right-0 h-20 bg-brand-light border-b-2 border-brand-dark flex items-center justify-between px-8 z-10">
            <h1 className="text-3xl font-extrabold text-brand-dark">{currentPage}</h1>
            <div className="flex items-center space-x-2">
                <button 
                  onClick={logout}
                  className="bg-white text-brand-dark font-bold py-2 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                >
                  Log Out
                </button>
            </div>
        </header>
    );
}

// --- LOGIN PAGE ---
function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                alert('Check your email for a confirmation link!');
            }
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-light flex flex-col items-center justify-center font-sans p-4">
            <div className="w-full max-w-sm bg-white p-8 rounded-[10px] border-2 border-brand-dark shadow-neo">
                <h1 className="text-4xl font-black text-brand-dark text-center mb-2">BareStack</h1>
                <p className="text-center text-brand-dark mb-8">No-bullshit business tools.</p>
                {error && <p className="bg-red-200 text-red-800 p-3 rounded-[10px] border-2 border-red-800 text-center mb-4">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                       <Input id="email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="mb-6">
                        <Input id="password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-brand-dark text-white font-bold py-3 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50">
                        {loading ? '...' : isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>
                <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center mt-4 font-bold text-brand-dark hover:underline">
                    {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
                </button>
            </div>
            <p className="mt-8 text-brand-dark font-semibold">Built by one person with AI. Open-source forever.</p>
        </div>
    );
}

// --- MAIN APP LAYOUT ---
function AppLayout() {
    const { loading, error } = useData();

    return (
        <div className="font-sans text-brand-dark bg-brand-light min-h-screen">
            <Sidebar />
            <div className="ml-[200px]">
                <Header />
                <main className="pt-20">
                    <div className="p-8">
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <p className="text-2xl font-bold">Loading your dashboard...</p>
                            </div>
                        ) : error ? (
                            <div className="flex justify-center items-center h-64">
                                <p className="text-2xl font-bold text-red-600">Error: {error}</p>
                            </div>
                        ) : (
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
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}


// --- APP ---
function AppContent() {
    const { isAuthenticated } = useAuth();
    return (
        <HashRouter>
            {isAuthenticated ? (
                <DataProvider>
                    <AppLayout />
                </DataProvider>
            ) : <LoginPage />}
        </HashRouter>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;