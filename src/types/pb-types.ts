// PocketBase SDK type imports
import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';

// Re-export RecordModel as our base type
export type { RecordModel };

// PocketBase AuthModel (used for authentication state)
export interface PBAuthModel {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    collectionId: string;
    collectionName: string;
    created: string;
    updated: string;
    emailVisibility: boolean;
    username: string;
    verified: boolean;
}

// PocketBase session/auth state equivalent to Supabase AuthSession
export interface PBSession {
    id: string;
    created: string;
    updated: string;
    token: string;
    user: PBAuthModel;
}

export type { PocketBase };
