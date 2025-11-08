import React from 'react';
import { supabase } from '../services/supabaseClient';

const LoginPage: React.FC = () => {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

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
            <div className="w-full max-w-sm bg-white p-8 rounded-[10px] border-[3px] border-brand-dark shadow-neo">
                <h1 className="text-4xl font-black text-brand-dark text-center mb-2">BareStack</h1>
                <p className="text-center text-brand-dark mb-8">No-bullshit business tools.</p>
                {error && <p className="bg-white text-brand-dark p-3 rounded-[10px] border-[3px] border-brand-dark text-center mb-4 font-bold">{error}</p>}
                
                <button 
                    onClick={handleGoogleLogin} 
                    disabled={loading} 
                    className="w-full bg-white text-brand-dark font-bold py-3 px-4 rounded-[10px] border-[3px] border-brand-dark shadow-neo-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
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
export default LoginPage;
