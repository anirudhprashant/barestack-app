import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DataProvider } from './dataStore';
import { AuthProvider, useAuth } from './auth';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';

function AppContent() {
    const { isAuthenticated, session } = useAuth();
    return (
        <BrowserRouter>
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
            <AppContent />
        </AuthProvider>
    );
}

export default App;
