/// <reference types="vite/client" />

import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://api.barestack.org';

// Create PocketBase instance (singleton)
export const pb = new PocketBase(PB_URL);

// Auth store helpers matching the pattern
export const pbAuthStore = {
    get isValid() { return pb.authStore.isValid; },
    get token() { return pb.authStore.token; },
    get model() { return pb.authStore.model; },
};

// Auth store change listener helper
export function onAuthChange(callback: (model: unknown) => void) {
    return pb.authStore.onChange((_token: string, _model: unknown) => {
        callback(_model);
    });
}
