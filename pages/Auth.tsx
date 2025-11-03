
import React, { useState } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { Button, Card } from '../components/ui';

export default function Auth() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn("password", { email, password, flow });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-brand-dark mb-4 text-center">BareStack</h1>
        <p className="text-gray-600 mb-6 text-center">Simple business management for modern teams</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-brand-dark mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-brand-dark rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand-dark"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-brand-dark mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-brand-dark rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand-dark"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Loading..." : flow === "signIn" ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
            className="text-sm text-brand-dark font-bold hover:underline"
          >
            {flow === "signIn" 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>
    </div>
  );
}
