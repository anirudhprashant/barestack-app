import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { confirmVerification, refreshAuth, isLoggedIn } from '../src/lib/auth';

type Status = 'verifying' | 'success' | 'error';

const VerifyEmailPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<Status>('verifying');
    const [message, setMessage] = useState('');
    const ran = useRef(false);

    useEffect(() => {
        // Guard against React 18 StrictMode double-invoke (tokens are single-use).
        if (ran.current) return;
        ran.current = true;

        if (!token) {
            setStatus('error');
            setMessage('This verification link is missing its token.');
            return;
        }

        confirmVerification(token).then(async ({ error }) => {
            if (error) {
                setStatus('error');
                setMessage(error);
                return;
            }
            // If this is the same browser they signed up in, the session is
            // already present — refresh it (now verified) and go straight to
            // the dashboard. Otherwise show success and point them to sign in.
            if (isLoggedIn()) {
                await refreshAuth();
                navigate('/', { replace: true });
                return;
            }
            setStatus('success');
        });
    }, [token, navigate]);

    return (
        <div className="min-h-screen bg-[#192118] font-body flex items-center justify-center p-4 relative overflow-hidden">
            <div
                aria-hidden
                className="pointer-events-none absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl animate-drift-a bg-[radial-gradient(circle_at_center,rgba(232,184,109,0.10),transparent_70%)]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-48 -right-32 w-[560px] h-[560px] rounded-full blur-3xl animate-drift-b bg-[radial-gradient(circle_at_center,rgba(195,118,36,0.09),transparent_70%)]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-soft-light"
                style={{ backgroundImage: 'var(--paper-grain)', backgroundSize: '220px 220px' }}
            />

            <div className="w-full max-w-md relative z-10">
                <div className="mb-8">
                    <h1 className="text-5xl font-bold font-display text-canvas tracking-tight">
                        BareStack<span className="italic">OS</span>
                    </h1>
                    <p className="text-sm font-semibold text-muted uppercase tracking-widest mt-2">
                        Email verification
                    </p>
                </div>

                <div className="bg-canvas border border-border p-8">
                    {status === 'verifying' && (
                        <>
                            <h2 className="text-2xl font-bold font-display text-charcoal mb-2">Verifying…</h2>
                            <p className="text-muted text-sm">Confirming your email address, one moment.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="border-b border-border pb-6 mb-6">
                                <h2 className="text-2xl font-bold font-display text-charcoal">Email verified ✓</h2>
                            </div>
                            <p className="text-charcoal font-semibold mb-6">Your account is now active. Sign in to get started.</p>
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="w-full bg-charcoal text-canvas hover:bg-content font-semibold py-4 px-6 border-2 border-charcoal transition-all uppercase tracking-wider"
                            >
                                Continue to sign in
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="border-b border-border pb-6 mb-6">
                                <h2 className="text-2xl font-bold font-display text-charcoal">Verification failed</h2>
                            </div>
                            <p className="text-charcoal font-semibold mb-6">{message}</p>
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="w-full text-center font-semibold text-charcoal hover:text-accent uppercase tracking-wide transition-colors py-2 px-4 border border-charcoal hover:border-accent"
                            >
                                ← Back to sign in
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
