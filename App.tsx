
import React, { useState, createContext, useContext, ReactNode, useMemo } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Icon, Button } from './components/ui';

import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Projects from './pages/Projects';
import Invoices from './pages/Invoices';
import TimeTracking from './pages/TimeTracking';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// --- AUTH CONTEXT ---
import api from './services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const isAuthenticated = !!token;

  const value = useMemo(() => ({ isAuthenticated, login, logout, token }), [isAuthenticated, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
                        <Icon name={item.icon as any} className="w-6 h-6" />
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
  const currentPage = navItems.find(item => item.href === location.pathname)?.label || 'Dashboard';

  return (
    <header className="fixed top-0 left-[200px] right-0 h-20 bg-brand-light border-b-2 border-brand-dark flex items-center justify-between px-8 z-10">
      <h1 className="text-3xl font-extrabold text-brand-dark">{currentPage}</h1>
      <div className="flex items-center space-x-2">
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
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@barestask.org');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api.post('/auth/login', { email, password });
      if (data.token) {
        login(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex flex-col items-center justify-center font-sans p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-[10px] border-2 border-brand-dark shadow-neo">
        <h1 className="text-4xl font-black text-brand-dark text-center mb-2">BareStack</h1>
        <p className="text-center text-brand-dark mb-8">No-bullshit business tools.</p>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-brand-dark font-bold mb-2" htmlFor="email">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} id="email" type="email" className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark" />
          </div>
          <div className="mb-6">
            <label className="block text-brand-dark font-bold mb-2" htmlFor="password">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} id="password" type="password" className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark" />
          </div>
          <button type="submit" className="w-full bg-brand-dark text-white font-bold py-3 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
            Login
          </button>
        </form>
        <p className="mt-4 text-center">
          Don't have an account? <NavLink to="/register" className="font-bold text-brand-dark hover:underline">Sign up</NavLink>
        </p>
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


import RegisterPage from './pages/RegisterPage';

// --- APP ---
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  return (
    <HashRouter>
      <Routes>
        {isAuthenticated ? (
          <Route path="/*" element={<AppLayout />} />
        ) : (
          <>
            <Route path="/" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </>
        )}
      </Routes>
    </HashRouter>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
