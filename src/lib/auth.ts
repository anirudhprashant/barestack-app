import { pb, onAuthChange } from './pocketbase';
import type { PBAuthModel } from '../types/pb-types';

export interface AuthResult {
    user?: PBAuthModel;
    token?: string;
    error?: string;
    verificationSent?: boolean;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
    try {
        const authData = await pb.collection('users').authWithPassword(email, password);
        return {
            user: authData.record as unknown as PBAuthModel,
            token: authData.token,
        };
    } catch (err: unknown) {
        return { error: (err as Error).message || 'Sign-in failed' };
    }
}

export async function signUp(email: string, password: string, name: string): Promise<AuthResult> {
    try {
        const data = {
            email,
            password,
            passwordConfirm: password,
            name,
        };
        await pb.collection('users').create(data);
        // Send the verification email instead of auto signing-in: login now
        // requires a verified address (users.authRule = "verified = true").
        await pb.collection('users').requestVerification(email);
        return { verificationSent: true };
    } catch (err: unknown) {
        return { error: (err as Error).message || 'Sign-up failed' };
    }
}

export async function resendVerification(email: string): Promise<{ error?: string }> {
    try {
        await pb.collection('users').requestVerification(email);
        return {};
    } catch (err: unknown) {
        return { error: (err as Error).message || 'Could not send verification email' };
    }
}

export async function confirmVerification(token: string): Promise<{ error?: string }> {
    try {
        await pb.collection('users').confirmVerification(token);
        return {};
    } catch (err: unknown) {
        return { error: (err as Error).message || 'This verification link is invalid or has expired' };
    }
}

export async function signOut(): Promise<void> {
    pb.authStore.clear();
}

export async function getCurrentUser(): Promise<PBAuthModel | null> {
    if (!pb.authStore.isValid) return null;
    try {
        // Refresh user data
        const model = pb.authStore.model;
        if (model) {
            const record = await pb.collection('users').authRefresh();
            return record.record as unknown as PBAuthModel;
        }
    } catch {
        pb.authStore.clear();
    }
    return null;
}

export { onAuthChange };
