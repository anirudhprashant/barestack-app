import React, { useState } from 'react';
import { signIn, signUp } from '../src/lib/auth';

const LoginPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const result = isSignUp
                ? await signUp(email, password, name)
                : await signIn(email, password);
            if (result.error) {
                setError(result.error);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark font-sans flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-brand-light border-[4px] border-brand-dark p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <div className="border-b-[4px] border-brand-dark pb-6 mb-8">
                        <h1 className="text-6xl font-black text-brand-dark tracking-tighter uppercase">BareStack</h1>
                        <p className="text-sm font-bold text-brand-dark/70 uppercase tracking-widest mt-2">CRM for agencies + freelancers</p>
                    </div>

                    {error && (
                        <div className="bg-red-500 border-[3px] border-brand-dark text-brand-dark font-bold p-4 mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {isSignUp && (
                            <div>
                                <label className="block text-sm font-black uppercase tracking-wide text-brand-dark mb-2">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={isSignUp}
                                    className="w-full bg-white border-[3px] border-brand-dark px-4 py-3 text-brand-dark font-bold placeholder-brand-dark/40 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                    placeholder="Your name"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-black uppercase tracking-wide text-brand-dark mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-white border-[3px] border-brand-dark px-4 py-3 text-brand-dark font-bold placeholder-brand-dark/40 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-black uppercase tracking-wide text-brand-dark mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-white border-[3px] border-brand-dark px-4 py-3 text-brand-dark font-bold placeholder-brand-dark/40 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-dark hover:bg-brand-dark/90 text-brand-light font-black py-4 px-6 border-[3px] border-brand-dark shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider"
                        >
                            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-8 border-t-[3px] border-brand-dark pt-6">
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                            className="w-full text-center font-black text-brand-dark hover:text-brand-dark/70 uppercase tracking-wide transition-colors py-2 px-4 border-[3px] border-brand-dark hover:bg-brand-dark hover:text-brand-light"
                        >
                            {isSignUp ? '← Already have an account? Sign in' : "Don't have an account? Sign up →"}
                        </button>
                    </div>
                </div>

                <p className="text-center text-brand-light/50 text-xs font-bold uppercase tracking-widest mt-6">
                    Built with AI • Open-source forever
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
