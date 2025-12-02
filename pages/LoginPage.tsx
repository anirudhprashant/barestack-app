import React from 'react';
import { supabase } from '../services/supabaseClient';

const LoginPage: React.FC = () => {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const envMissing = !supabase;

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            if (envMissing) {
                throw new Error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
            }
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
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-brand-primary/20 blur-[120px]" />
                <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[100px]" />
                <div className="absolute bottom-[0%] left-[20%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[100px]" />
            </div>

            <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">BareStack</h1>
                    <p className="text-gray-400 text-lg font-medium">Your business, simplified.</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl text-center mb-6 text-sm backdrop-blur-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading || envMissing}
                        className="w-full bg-white hover:bg-gray-50 text-gray-900 font-bold py-4 px-6 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none group"
                    >
                        <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 48 48">
                            <path fill="#4285F4" d="M24 9.5c3.13 0 5.9 1.08 7.97 2.97l6.02-6.02C34.32 2.85 29.56 1 24 1 14.88 1 7.22 6.56 4.43 14.61l7.35 5.7c1.33-4.02 5.08-6.81 9.22-6.81z"></path>
                            <path fill="#34A853" d="M46.2 25.6c0-1.66-.15-3.28-.42-4.85H24v9.16h12.45c-.54 2.97-2.13 5.48-4.64 7.22l7.35 5.7c4.27-3.95 6.74-9.84 6.74-17.23z"></path>
                            <path fill="#FBBC05" d="M9.22 27.99c-.38-1.13-.6-2.33-.6-3.59s.22-2.46.6-3.59l-7.35-5.7C.38 18.27 0 21.06 0 24s.38 5.73 1.87 8.38l7.35-5.39z"></path>
                            <path fill="#EA4335" d="M24 47c5.56 0 10.32-1.85 13.75-5.03l-7.35-5.7c-1.85 1.24-4.2 1.98-6.4 1.98-4.14 0-7.89-2.79-9.22-6.81l-7.35 5.7C7.22 41.44 14.88 47 24 47z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                        <span className="text-base">
                            {envMissing ? 'Configuration required' : (loading ? 'Connecting...' : 'Continue with Google')}
                        </span>
                    </button>
                </div>

                <p className="mt-8 text-center text-gray-500 text-xs">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>

            <div className="mt-8 text-gray-600 text-sm font-medium relative z-10">
                Built with AI. Open-source forever.
            </div>
        </div>
    );
}
export default LoginPage;
