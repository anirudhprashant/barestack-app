import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { DataProvider } from './dataStore';
import { AuthProvider, useAuth } from './auth';
import { ThemeProvider } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyGate from './pages/VerifyGate';

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
        <AuthProvider>
            <ThemeProvider>
                <ToastProvider>
                    <AppContent />
                </ToastProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
