import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { DataProvider } from './dataStore';
import { AuthProvider, useAuth } from './auth';
import { ThemeProvider } from './src/context/ThemeContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

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

    return isAuthenticated ? (
        <DataProvider session={session}>
            <AppLayout />
        </DataProvider>
    ) : <LoginPage />;
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
                <AppContent />
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
