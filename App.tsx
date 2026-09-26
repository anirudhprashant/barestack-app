import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { DataProvider } from './dataStore';
import { AuthProvider, useAuth } from './auth';
import { ThemeProvider } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyGate from './pages/VerifyGate';

// Public client-facing invoice page: loaded only when someone opens a link.
const SharedInvoice = lazy(() => import('./pages/SharedInvoice'));

function AppRouter() {
    const { isAuthenticated, session } = useAuth();
    const location = useLocation();

    // Public email-verification route works regardless of auth state. Kept
    // separate so AppLayout's own <Routes> below behave exactly as before.
    if (location.pathname.startsWith('/verify/')) {
        return (
            <Routes>
                <Route path="/verify/:token" element={<VerifyEmailPage />} />
            </Routes>
        );
    }

    // Shared invoice links work for anyone, signed in or not.
    if (location.pathname.startsWith('/share/')) {
        return (
            <Suspense fallback={null}>
                <Routes>
                    <Route path="/share/:id" element={<SharedInvoice />} />
                </Routes>
            </Suspense>
        );
    }

    if (!isAuthenticated) return <LoginPage />;

    // Signed in but email not yet confirmed: hold them at the verify gate
    // instead of the dashboard until they click the link in their email.
    const verified = !!(session?.user as { verified?: boolean } | undefined)?.verified;
    if (!verified) return <VerifyGate />;

    return (
        <DataProvider session={session}>
            <AppLayout />
        </DataProvider>
    );
}

function AppContent() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRouter />
        </BrowserRouter>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <ThemeProvider>
                    <ToastProvider>
                        <AppContent />
                    </ToastProvider>
                </ThemeProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
