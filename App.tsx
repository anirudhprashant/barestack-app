import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DataProvider } from './dataStore';
import { AuthProvider, useAuth } from './auth';
import { ThemeProvider } from './src/context/ThemeContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';

function AppContent() {
    const { isAuthenticated, session } = useAuth();
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {isAuthenticated ? (
                <DataProvider session={session}>
                    <AppLayout />
                </DataProvider>
            ) : <LoginPage />}
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
