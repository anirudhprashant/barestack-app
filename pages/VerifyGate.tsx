import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { resendVerification, refreshAuth } from '../src/lib/auth';

// Shown to a signed-in user whose email isn't verified yet. Polls in the
// background so that once they click the link (here or on another device),
// the session flips to verified and App swaps this out for the dashboard.
const VerifyGate: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const email = (currentUser as { email?: string } | null)?.email || 'your email';
    const [loading, setLoading] = useState(false);
    const [note, setNote] = useState<string | null>(null);

    useEffect(() => {
        const id = setInterval(() => { refreshAuth(); }, 5000);
        return () => clearInterval(id);
    }, []);

    const handleResend = async () => {
        if (!currentUser || !(currentUser as { email?: string }).email) return;
        setLoading(true);
        setNote(null);
        const { error } = await resendVerification((currentUser as { email?: string }).email!);
        setLoading(false);
        setNote(error ? error : 'Verification email sent. Check your inbox.');
    };

    const handleCheck = async () => {
        setLoading(true);
        setNote(null);
        const { verified, error } = await refreshAuth();
        setLoading(false);
        if (error) setNote(error);
        else if (!verified) setNote("Still not verified — click the link in your email, then try again.");
        // If verified, refreshAuth fired onAuthChange → App re-renders to the dashboard.
    };

    return (
        <div className="min-h-screen bg-[#192118] font-body flex items-center justify-center p-4 relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl animate-drift-a bg-[radial-gradient(circle_at_center,rgba(232,184,109,0.10),transparent_70%)]" />
            <div aria-hidden className="pointer-events-none absolute -bottom-48 -right-32 w-[560px] h-[560px] rounded-full blur-3xl animate-drift-b bg-[radial-gradient(circle_at_center,rgba(195,118,36,0.09),transparent_70%)]" />
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-soft-light" style={{ backgroundImage: 'var(--paper-grain)', backgroundSize: '220px 220px' }} />

            <div className="w-full max-w-md relative z-10">
                <div className="mb-8">
                    <h1 className="text-5xl font-bold font-display text-canvas tracking-tight">
                        BareStack<span className="italic">OS</span>
                    </h1>
                    <p className="text-sm font-semibold text-muted uppercase tracking-widest mt-2">
                        One last step
                    </p>
                </div>

                <div className="bg-canvas border border-border p-8">
                    <div className="border-b border-border pb-6 mb-6">
                        <h2 className="text-2xl font-bold font-display text-charcoal">Verify your email</h2>
                    </div>
                    <p className="text-charcoal font-semibold mb-1">We sent a verification link to</p>
                    <p className="text-charcoal font-bold mb-6 break-words">{email}</p>
                    <p className="text-muted text-sm mb-6">Click the link in that email to unlock your dashboard. This page updates automatically once you do — check your spam folder if it hasn&apos;t arrived.</p>

                    {note && (
                        <div className="bg-surface border border-border text-charcoal font-semibold p-4 mb-6 text-sm">{note}</div>
                    )}

                    <button
                        type="button"
                        disabled={loading}
                        onClick={handleCheck}
                        className="w-full bg-charcoal text-canvas hover:bg-content font-semibold py-4 px-6 border-2 border-charcoal transition-all uppercase tracking-wider disabled:opacity-70 disabled:cursor-not-allowed mb-3"
                    >
                        {loading ? 'Checking…' : "I've verified — continue"}
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={handleResend}
                        className="w-full text-center font-semibold text-charcoal hover:text-accent uppercase tracking-wide transition-colors py-2 px-4 border border-charcoal hover:border-accent"
                    >
                        Resend verification email
                    </button>

                    <div className="mt-8 border-t border-border pt-6">
                        <button
                            type="button"
                            onClick={logout}
                            className="w-full text-center font-semibold text-muted hover:text-charcoal uppercase tracking-wide transition-colors py-2"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyGate;
