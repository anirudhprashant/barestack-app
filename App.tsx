
import React from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Icon, Button } from './components/ui';
import { HistoryProvider, useHistory } from './historyStore';


import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Projects from './pages/Projects';
import Invoices from './pages/Invoices';
import TimeTracking from './pages/TimeTracking';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';



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
    const { undo, redo, canUndo, canRedo } = useHistory();
    const currentPage = navItems.find(item => item.href === location.pathname)?.label || 'Dashboard';

    return (
        <header className="fixed top-0 left-[200px] right-0 h-20 bg-brand-light border-b-2 border-brand-dark flex items-center justify-between px-8 z-10">
            <h1 className="text-3xl font-extrabold text-brand-dark">{currentPage}</h1>
            <div className="flex items-center space-x-2">
                <Button variant="secondary" onClick={undo} disabled={!canUndo}>Undo</Button>
                <Button variant="secondary" onClick={redo} disabled={!canRedo}>Redo</Button>
            </div>
        </header>
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
const App = () => {
    return (
        <HistoryProvider>
            <HashRouter>
                <AppLayout />
            </HashRouter>
        </HistoryProvider>
    );
};

export default App;
