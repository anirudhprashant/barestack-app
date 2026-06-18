import React from 'react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

// Catches render-time errors anywhere below it so a single broken component
// shows a recovery screen instead of a blank white page.
export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('Unhandled UI error:', error, info);
    }

    handleReload = () => {
        window.location.assign('/');
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="min-h-screen bg-canvas flex items-center justify-center p-6 text-charcoal">
                <div className="max-w-md text-center">
                    <h1 className="text-3xl font-display mb-3">Something went wrong</h1>
                    <p className="text-sm text-muted mb-6">
                        An unexpected error occurred. Reloading usually fixes it. If it keeps
                        happening, your data is safe — it's stored on the server.
                    </p>
                    <button
                        onClick={this.handleReload}
                        className="font-semibold py-2 px-4 bg-charcoal text-canvas border border-charcoal hover:bg-content transition-all"
                    >
                        Reload app
                    </button>
                </div>
            </div>
        );
    }
}
