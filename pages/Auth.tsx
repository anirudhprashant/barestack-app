
import React from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { Button, Card, Icon } from '../components/ui';

export default function Auth() {
  const { signIn } = useAuthActions();

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold text-brand-dark mb-4">BareStack</h1>
        <p className="text-gray-600 mb-6">Simple business management for modern teams</p>
        <Button
          variant="primary"
          onClick={() => void signIn("google")}
          className="w-full"
        >
          <Icon name="users" className="w-5 h-5" />
          <span>Sign in with Google</span>
        </Button>
      </Card>
    </div>
  );
}
