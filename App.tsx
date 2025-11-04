import React, { useState, createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Icon, Button } from './components/ui';
import { DataProvider, useData } from './dataStore';
import { supabase } from './services/supabaseClient';
import type { AuthSession } from '@supabase/supabase-js';

import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import DealPipeline from './pages/DealPipeline';
import Activities from './pages/Activities';
import Imports from './pages/Imports';
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

// FIX: Explicitly type AuthProvider as React.FC to resolve a potential TypeScript inference issue causing a false positive 'children' prop error.
const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
    const { session, logout } = useAuth();
    
    // Create a memoized audio object for the fidget button
    const clickSound = useMemo(() => new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSd2T18DAAAAAAAGAg4iEBAgBSoWGy4uMD0+Pz8/Pz49PTs6NzYyMjIuKCohIiAcGBUYFRQTExETEQsKCQcGBQQDAgEAAQAEBAUGBwgJCgsMDQ4ODxEREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKi0tLzAxMjM0NTc4OTs8Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAAA='), []);

    const handleFidgetClick = () => {
        clickSound.currentTime = 0; // Rewind to start
        clickSound.play().catch(e => console.error("Error playing sound:", e));
    };
    
    return (
        <div className="fixed top-0 left-0 h-full w-[200px] bg-white border-r-2 border-brand-dark flex flex-col p-4 z-20">
            <div className="text-3xl font-extrabold text-brand-dark mb-10">
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
            <div className="mt-auto p-2">
                <button
                    onClick={handleFidgetClick}
                    title="Click me!"
                    className="w-12 h-12 bg-white text-brand-dark font-bold text-xl rounded-full border-2 border-brand-dark shadow-neo-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center"
                >
                    {session?.user?.email?.[0].toUpperCase()}
                </button>
            </div>
        </div>
    );
}

// --- HEADER ---
function Header() {
    const location = useLocation();
    const { logout } = useAuth();
    
    const getPageTitle = (pathname: string) => {
        if (pathname.startsWith('/crm')) return 'CRM';
        const item = navItems.find(i => i.href === pathname);
        return item?.label || 'Overview';
    };
    const currentPage = getPageTitle(location.pathname);

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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.href,
                },
            });
            if (error) throw error;
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
                
                <button 
                    onClick={handleGoogleLogin} 
                    disabled={loading} 
                    className="w-full bg-white text-brand-dark font-bold py-3 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
                >
                    <svg className="w-6 h-6" viewBox="0 0 48 48">
                        <path fill="#4285F4" d="M24 9.5c3.13 0 5.9 1.08 7.97 2.97l6.02-6.02C34.32 2.85 29.56 1 24 1 14.88 1 7.22 6.56 4.43 14.61l7.35 5.7c1.33-4.02 5.08-6.81 9.22-6.81z"></path>
                        <path fill="#34A853" d="M46.2 25.6c0-1.66-.15-3.28-.42-4.85H24v9.16h12.45c-.54 2.97-2.13 5.48-4.64 7.22l7.35 5.7c4.27-3.95 6.74-9.84 6.74-17.23z"></path>
                        <path fill="#FBBC05" d="M9.22 27.99c-.38-1.13-.6-2.33-.6-3.59s.22-2.46.6-3.59l-7.35-5.7C.38 18.27 0 21.06 0 24s.38 5.73 1.87 8.38l7.35-5.39z"></path>
                        <path fill="#EA4335" d="M24 47c5.56 0 10.32-1.85 13.75-5.03l-7.35-5.7c-1.85 1.24-4.2 1.98-6.4 1.98-4.14 0-7.89-2.79-9.22-6.81l-7.35 5.7C7.22 41.44 14.88 47 24 47z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                    <span>{loading ? 'Redirecting...' : 'Sign in with Google'}</span>
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
                                <Route path="/crm/pipeline" element={<DealPipeline />} />
                                <Route path="/crm/activities" element={<Activities />} />
                                <Route path="/crm/imports" element={<Imports />} />
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
        <BrowserRouter>
            {isAuthenticated ? (
                <DataProvider>
                    <AppLayout />
                </DataProvider>
            ) : <LoginPage />}
        </BrowserRouter>
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