import React, { useState, useEffect } from 'react';
import { signIn, signUp, resendVerification } from '../src/lib/auth';

const LoginPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [verificationSentTo, setVerificationSentTo] = useState<string | null>(null);
    const [resendNote, setResendNote] = useState<string | null>(null);
    const [justVerified, setJustVerified] = useState(false);

    // Arriving from the email link on a device without a session: greet them
    // with a verified banner and pre-fill their email so it's one field.
    useEffect(() => {
        if (sessionStorage.getItem('justVerified')) {
            setJustVerified(true);
            const e = sessionStorage.getItem('verifiedEmail');
            if (e) setEmail(e);
            sessionStorage.removeItem('justVerified');
            sessionStorage.removeItem('verifiedEmail');
        }
    }, []);

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
            } else if (result.verificationSent) {
                setVerificationSentTo(email);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) return;
        setResendNote(null);
        setLoading(true);
        const { error: resendErr } = await resendVerification(email);
        setLoading(false);
        setResendNote(resendErr ? resendErr : 'Verification email sent. Check your inbox.');
    };

    const resetToSignIn = () => {
        setVerificationSentTo(null);
        setIsSignUp(false);
        setError(null);
        setResendNote(null);
        setPassword('');
    };

    return (
        <div className="min-h-screen bg-[#192118] font-body flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient radial glows, slowly drifting in the background */}
            <div
                aria-hidden
                className="pointer-events-none absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl animate-drift-a bg-[radial-gradient(circle_at_center,rgba(232,184,109,0.10),transparent_70%)]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-48 -right-32 w-[560px] h-[560px] rounded-full blur-3xl animate-drift-b bg-[radial-gradient(circle_at_center,rgba(195,118,36,0.09),transparent_70%)]"
            />
            {/* Grain overlay */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-soft-light"
                style={{ backgroundImage: 'var(--paper-grain)', backgroundSize: '220px 220px' }}
            />

            <div className="w-full max-w-md relative z-10">
                {/* Branding */}
                <div className="mb-8">
                    <h1 className="text-5xl font-bold font-display text-canvas tracking-tight">
                        BareStack<span className="italic">OS</span>
                    </h1>
                    <p className="text-sm font-semibold text-muted uppercase tracking-widest mt-2">
                        CRM for agencies + freelancers
                    </p>
                </div>

                {/* Check-your-email card (shown after sign-up) */}
                {verificationSentTo ? (
                <div className="bg-canvas border border-border p-8">
                    <div className="border-b border-border pb-6 mb-8">
                        <h2 className="text-2xl font-bold font-display text-charcoal">Check your email</h2>
                    </div>
                    <p className="text-charcoal font-semibold mb-1">We sent a verification link to</p>
                    <p className="text-charcoal font-bold mb-6 break-words">{verificationSentTo}</p>
                    <p className="text-muted text-sm mb-6">Click the link in that email to activate your account, then sign in. It can take a minute — check your spam folder too.</p>
                    {resendNote && (
                        <div className="bg-surface border border-border text-charcoal font-semibold p-4 mb-6 text-sm">{resendNote}</div>
                    )}
                    <button
                        type="button"
                        disabled={loading}
                        onClick={handleResend}
                        className="w-full bg-charcoal text-canvas hover:bg-content font-semibold py-4 px-6 border-2 border-charcoal transition-all uppercase tracking-wider disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Sending...' : 'Resend verification email'}
                    </button>
                    <div className="mt-8 border-t border-border pt-6">
                        <button
                            type="button"
                            onClick={resetToSignIn}
                            className="w-full text-center font-semibold text-charcoal hover:text-accent uppercase tracking-wide transition-colors py-2 px-4 border border-charcoal hover:border-accent"
                        >
                            ← Back to sign in
                        </button>
                    </div>
                </div>
                ) : (
                /* Form Card */
                <div className="bg-canvas border border-border p-8">
                    <div className="border-b border-border pb-6 mb-8">
                        <h2 className="text-2xl font-bold font-display text-charcoal">
                            {isSignUp ? 'Create account' : 'Sign in'}
                        </h2>
                    </div>

                    {justVerified && (
                        <div className="bg-surface border border-activity-green/40 text-charcoal font-semibold p-4 mb-6 text-sm">
                            ✓ Email verified. Sign in to continue.
                        </div>
                    )}

                    {error && (
                        <div className="bg-surface border border-activity-red/30 text-charcoal font-semibold p-4 mb-6">
                            {error}
                            {!isSignUp && (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    className="block mt-2 text-sm font-bold text-accent hover:underline uppercase tracking-wide"
                                >
                                    Email not verified? Resend verification →
                                </button>
                            )}
                        </div>
                    )}

                    {resendNote && (
                        <div className="bg-surface border border-border text-charcoal font-semibold p-4 mb-6 text-sm">{resendNote}</div>
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
                )}

                <p className="text-center text-muted/60 text-xs font-semibold uppercase tracking-widest mt-6">
                    Built with AI • Open-source forever
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
