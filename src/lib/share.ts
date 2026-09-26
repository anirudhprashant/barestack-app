import type { BusinessProfile, Contact, Invoice, InvoiceShare, InvoiceShareSnapshot, UserProfile } from '../../types';
import { effectiveStatus } from './invoice';

// 32 random bytes as base64url (43 chars). Unguessable; the server rejects
// anything shorter than 32 chars.
export function newShareToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildShareSnapshot(invoice: Invoice, client: Contact | undefined, business: BusinessProfile, user: UserProfile): InvoiceShareSnapshot {
    const { id: _i, user: _u, created: _c, updated: _up, ...biz } = business;
    return {
        invoice: {
            invoice_number: invoice.invoice_number,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            line_items: invoice.line_items,
            tax_rate: invoice.tax_rate,
            status: effectiveStatus(invoice),
            paid_date: invoice.paid_date || '',
            notes: invoice.notes || '',
        },
        client: {
            name: client?.name || 'Client',
            company: client?.company || '',
            email: client?.email || '',
            phone: client?.phone || '',
        },
        business: biz as BusinessProfile,
        user: { name: user.name, email: user.email },
    };
}

// The token rides in the URL fragment, which browsers never send to servers,
// so it stays out of access logs, proxies and Referer headers.
export function shareUrl(share: Pick<InvoiceShare, 'id' | 'token'>): string {
    return `${window.location.origin}/share/${share.id}#${share.token}`;
}
