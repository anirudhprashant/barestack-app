import { pb, onAuthChange } from './pocketbase';
import type { PBAuthModel } from '../types/pb-types';

export interface AuthResult {
    user?: PBAuthModel;
    token?: string;
    error?: string;
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
        const record = await pb.collection('users').create(data);
        // Auto sign-in after registration
        const authData = await pb.collection('users').authWithPassword(email, password);
        return {
            user: authData.record as unknown as PBAuthModel,
            token: authData.token,
        };
    } catch (err: unknown) {
        return { error: (err as Error).message || 'Sign-up failed' };
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
