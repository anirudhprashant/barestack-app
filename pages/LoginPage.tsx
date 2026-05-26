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
        <div className="min-h-screen bg-charcoal font-body flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Branding */}
                <div className="mb-8">
                    <h1 className="text-5xl font-bold text-canvas tracking-tight" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
                        BareStack
                    </h1>
                    <p className="text-sm font-semibold text-muted uppercase tracking-widest mt-2">
                        CRM for agencies + freelancers
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-canvas border border-border p-8">
                    <div className="border-b border-border pb-6 mb-8">
                        <h2 className="text-2xl font-bold text-charcoal" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
                            {isSignUp ? 'Create account' : 'Sign in'}
                        </h2>
                    </div>

                    {error && (
                        <div className="bg-surface border border-activity-red/30 text-charcoal font-semibold p-4 mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {isSignUp && (
                            <div>
                                <label className="block text-sm font-semibold text-charcoal mb-2 uppercase tracking-wide">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={isSignUp}
                                    className="w-full bg-canvas border-2 border-charcoal px-4 py-3 text-charcoal font-semibold placeholder-muted focus:outline-none focus:border-accent transition-colors"
                                    placeholder="Your name"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold text-charcoal mb-2 uppercase tracking-wide">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-canvas border-2 border-charcoal px-4 py-3 text-charcoal font-semibold placeholder-muted focus:outline-none focus:border-accent transition-colors"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-charcoal mb-2 uppercase tracking-wide">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-canvas border-2 border-charcoal px-4 py-3 text-charcoal font-semibold placeholder-muted focus:outline-none focus:border-accent transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-charcoal text-canvas hover:bg-content font-semibold py-4 px-6 border-2 border-charcoal transition-all uppercase tracking-wider disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-8 border-t border-border pt-6">
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                            className="w-full text-center font-semibold text-charcoal hover:text-accent uppercase tracking-wide transition-colors py-2 px-4 border border-charcoal hover:border-accent"
                        >
                            {isSignUp ? '← Already have an account? Sign in' : "Don't have an account? Sign up →"}
                        </button>
                    </div>
                </div>

                <p className="text-center text-muted/60 text-xs font-semibold uppercase tracking-widest mt-6">
                    Built with AI • Open-source forever
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
