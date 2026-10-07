import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { Button } from './ui';
import { useData } from '../dataStore';
import { TimerProvider } from '../src/context/TimerContext';
import { CommandPalette } from './CommandPalette';
import { Shortcuts } from './Shortcuts';
import Dashboard from '../pages/Dashboard';

// Everything except the landing page is split into its own chunk, so heavy
// dependencies (jsPDF, xlsx, JSZip) only load on the pages that use them.
const CRM = lazy(() => import('../pages/CRM'));
const DealPipeline = lazy(() => import('../pages/DealPipeline'));
const Activities = lazy(() => import('../pages/Activities'));
const Imports = lazy(() => import('../pages/Imports'));
const Projects = lazy(() => import('../pages/Projects'));
const ProjectDetails = lazy(() => import('../pages/ProjectDetails'));
const Invoices = lazy(() => import('../pages/Invoices'));
const TimeTracking = lazy(() => import('../pages/TimeTracking'));
const Expenses = lazy(() => import('../pages/Expenses'));
const Reports = lazy(() => import('../pages/Reports'));
const Settings = lazy(() => import('../pages/Settings'));

const PageLoading: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <p className="text-2xl font-display text-muted animate-pulse">Loading…</p>
    </div>
);

const NotFound: React.FC = () => (
    <div className="text-center py-20">
        <p className="text-4xl font-display text-charcoal mb-2">Page not found</p>
        <p className="text-muted mb-6">That page doesn't exist.</p>
        <a href="/" className="underline font-semibold">Back to Overview</a>
    </div>
);

const AppLayout: React.FC = () => {
    const { loading, error, refresh } = useData();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);
    const openPalette = useCallback(() => setPaletteOpen(true), []);
    const location = useLocation();

    // Cmd/Ctrl+K anywhere opens the command palette.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen(o => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // New page, fresh scroll position.
    useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

    return (
        <TimerProvider>
            <div className="font-body text-charcoal bg-canvas min-h-screen">
                <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-20 md:hidden"
                        onClick={closeSidebar}
                        aria-hidden="true"
                    />
                )}

                <div className="md:ml-[220px] transition-[margin] duration-200">
                    <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} onOpenPalette={() => setPaletteOpen(true)} />
                    <main className="pt-[var(--app-shell-header-height)]">
                        <div className="bs-main p-4 sm:p-6 lg:p-8">
                            {loading ? (
                                <div className="flex justify-center items-center h-64">
                                    <p className="text-2xl sm:text-4xl font-display text-content animate-pulse">Loading your dashboard...</p>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col justify-center items-center h-64 gap-4 text-center">
                                    <p className="text-2xl sm:text-3xl font-display text-content">We couldn't load your data.</p>
                                    <p className="text-sm text-muted max-w-md">{error}</p>
                                    <Button onClick={() => refresh()}>Try again</Button>
                                </div>
                            ) : (
                                <Suspense fallback={<PageLoading />}>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/crm" element={<CRM />} />
                                    <Route path="/crm/pipeline" element={<DealPipeline />} />
                                    <Route path="/crm/activities" element={<Activities />} />
                                    <Route path="/crm/imports" element={<Imports />} />
                                    <Route path="/projects" element={<Projects />} />
                                    <Route path="/projects/:id" element={<ProjectDetails />} />
                                    <Route path="/invoices" element={<Invoices />} />
                                    <Route path="/time-tracking" element={<TimeTracking />} />
                                    <Route path="/expenses" element={<Expenses />} />
                                    <Route path="/reports" element={<Reports />} />
                                    <Route path="/settings" element={<Settings />} />
                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                                </Suspense>
                            )}
                        </div>
                    </main>
                </div>
                <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
                <Shortcuts onOpenPalette={openPalette} />
            </div>
        </TimerProvider>
    );
};

export default AppLayout;
