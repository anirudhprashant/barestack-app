import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Button, Input, Select, Textarea, Icon } from '../components/ui';
import { useData, defaultBusinessProfile } from '../dataStore';
import { useAuth } from '../auth';
import { useToast } from '../src/context/ToastContext';
import { pb } from '../src/lib/pocketbase';
import * as api from '../src/lib/api';
import { CURRENCIES, formatMoney } from '../src/lib/format';
import { toCSV } from '../src/lib/csv';
import { buildBackup, parseBackup, restoreBackup, backupCounts, Backup } from '../src/lib/backup';
import { nextInvoiceNumber } from '../src/lib/invoice';
import { BusinessProfile } from '../types';
import { useTheme, ThemePreference } from '../src/context/ThemeContext';

const Section: React.FC<{ id: string; title: string; description: string; children: React.ReactNode; tone?: 'danger' }> = ({ id, title, description, children, tone }) => (
    <section id={id} className={`bg-canvas border ${tone === 'danger' ? 'border-activity-red/40' : 'border-border'} overflow-hidden scroll-mt-24`}>
        <div className={`px-5 sm:px-6 py-4 border-b ${tone === 'danger' ? 'border-activity-red/30 bg-activity-red/5' : 'border-border bg-surface'}`}>
            <h3 className={`text-lg font-bold ${tone === 'danger' ? 'text-activity-red' : 'text-charcoal'}`}>{title}</h3>
            <p className="text-sm text-muted">{description}</p>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
    </section>
);

const errMessage = (e: unknown, fallback: string) => {
    const data = (e as { response?: { data?: Record<string, { message?: string }> } })?.response?.data;
    const first = data && Object.values(data)[0]?.message;
    return first || (e as Error)?.message || fallback;
};

const BusinessSection: React.FC = () => {
    const { data, saveBusinessProfile } = useData();
    const { toast } = useToast();
    const [form, setForm] = useState<BusinessProfile>(data.businessProfile);
    const [saving, setSaving] = useState(false);

    useEffect(() => { setForm(data.businessProfile); }, [data.businessProfile]);

    const set = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => setForm(prev => ({ ...prev, [key]: value }));
    const dirty = JSON.stringify(form) !== JSON.stringify(data.businessProfile);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await saveBusinessProfile({
                ...form,
                currency: (form.currency || 'USD').toUpperCase().slice(0, 3),
                default_tax_rate: Math.min(100, Math.max(0, Number(form.default_tax_rate) || 0)),
                payment_terms_days: Math.min(365, Math.max(0, Math.round(Number(form.payment_terms_days) || 0))),
            });
            toast('Business details saved', 'success');
        } catch (error) {
            console.error('Failed to save business profile:', error);
            toast(errMessage(error, 'Could not save business details'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const preview = nextInvoiceNumber(data.invoices.map(i => i.invoice_number), form.invoice_prefix || '');

    return (
        <Section id="business" title="Business" description="Your details, currency and invoice defaults. These appear on every invoice PDF.">
            <form onSubmit={save} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Business name" id="biz-name" value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Acme Studio" />
                    <Input label="Billing email" id="biz-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder={data.userProfile.email} />
                    <Input label="Phone" id="biz-phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
                    <Input label="Website" id="biz-website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="acme.studio" />
                    <Textarea label="Address" id="biz-address" rows={3} value={form.address} onChange={e => set('address', e.target.value)} placeholder={'123 Main St\nCity, Postcode\nCountry'} />
                    <Input label="Tax / VAT ID" hint="optional" id="biz-tax-id" value={form.tax_id} onChange={e => set('tax_id', e.target.value)} />
                </div>

                <div className="border-t border-border pt-5">
                    <h4 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-4 font-body">Invoicing</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select label="Currency" id="biz-currency" value={form.currency} onChange={e => set('currency', e.target.value)}>
                            {!CURRENCIES.some(c => c.code === form.currency) && form.currency && <option value={form.currency}>{form.currency}</option>}
                            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}
                        </Select>
                        <Input label="Default tax %" id="biz-tax" type="number" min="0" max="100" step="0.01" value={String(form.default_tax_rate ?? 0)} onChange={e => set('default_tax_rate', parseFloat(e.target.value) || 0)} />
                        <Input label="Payment terms" hint="days" id="biz-terms" type="number" min="0" max="365" value={String(form.payment_terms_days ?? 30)} onChange={e => set('payment_terms_days', parseInt(e.target.value, 10) || 0)} />
                        <Input label="Invoice prefix" hint={`next: ${preview}`} id="biz-prefix" value={form.invoice_prefix} maxLength={20} onChange={e => set('invoice_prefix', e.target.value)} placeholder="INV-" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <Textarea label="Payment instructions" id="biz-payment" rows={4} value={form.payment_instructions} onChange={e => set('payment_instructions', e.target.value)} placeholder={'Bank: ...\nIBAN / Account: ...\nOr pay online at ...'} />
                        <Textarea label="Invoice footer" id="biz-footer" rows={4} value={form.invoice_footer} onChange={e => set('invoice_footer', e.target.value)} placeholder="Thank you for your business." />
                    </div>
                    <p className="text-xs text-muted mt-3">Example amount: {formatMoney(1234.5, form.currency || 'USD')}</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={saving || !dirty}>{saving ? 'Saving...' : 'Save business details'}</Button>
                    {dirty && <button type="button" className="text-sm text-muted underline" onClick={() => setForm(data.businessProfile.id ? data.businessProfile : defaultBusinessProfile)}>Discard changes</button>}
                </div>
            </form>
        </Section>
    );
};

const AccountSection: React.FC = () => {
    const { data, updateUserProfile } = useData();
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [name, setName] = useState(data.userProfile.name);
    const [newEmail, setNewEmail] = useState('');
    const [pw, setPw] = useState({ old: '', next: '', confirm: '' });
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => { setName(data.userProfile.name); }, [data.userProfile.name]);

    const saveName = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy('name');
        try {
            await updateUserProfile({ name: name.trim() });
            toast('Name updated', 'success');
        } catch (error) {
            toast(errMessage(error, 'Failed to update name'), 'error');
        } finally {
            setBusy(null);
        }
    };

    // PocketBase doesn't let a user overwrite their own email directly: it
    // sends a confirmation link to the new address (needs SMTP configured).
    const changeEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy('email');
        try {
            await pb.collection('users').requestEmailChange(newEmail.trim());
            toast(`Confirmation sent to ${newEmail.trim()}. Click the link there to finish.`, 'success');
            setNewEmail('');
        } catch (error) {
            toast(errMessage(error, 'Could not request an email change. Is email (SMTP) configured on the server?'), 'error');
        } finally {
            setBusy(null);
        }
    };

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pw.next.length < 8) return toast('New password must be at least 8 characters.', 'error');
        if (pw.next !== pw.confirm) return toast('New passwords do not match.', 'error');
        if (!currentUser) return;
        setBusy('password');
        try {
            await pb.collection('users').update(currentUser.id, { oldPassword: pw.old, password: pw.next, passwordConfirm: pw.confirm });
            // Changing the password invalidates existing tokens; sign straight back in.
            await pb.collection('users').authWithPassword(currentUser.email, pw.next);
            setPw({ old: '', next: '', confirm: '' });
            toast('Password changed', 'success');
        } catch (error) {
            toast(errMessage(error, 'Could not change password'), 'error');
        } finally {
            setBusy(null);
        }
    };

    return (
        <Section id="account" title="Account" description="Your sign-in details.">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <form onSubmit={saveName} className="space-y-3">
                    <Input label="Your name" id="acct-name" value={name} onChange={e => setName(e.target.value)} />
                    <Button type="submit" variant="secondary" disabled={busy === 'name' || name.trim() === data.userProfile.name}>Save name</Button>
                </form>
                <form onSubmit={changeEmail} className="space-y-3">
                    <Input label="Email" hint={data.userProfile.email} id="acct-email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@example.com" />
                    <Button type="submit" variant="secondary" disabled={busy === 'email' || !newEmail.trim()}>Change email</Button>
                </form>
                <form onSubmit={changePassword} className="space-y-3">
                    <Input label="Current password" id="acct-pw-old" type="password" autoComplete="current-password" value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))} />
                    <Input label="New password" id="acct-pw-new" type="password" autoComplete="new-password" minLength={8} value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
                    <Input label="Confirm new password" id="acct-pw-confirm" type="password" autoComplete="new-password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
                    <Button type="submit" variant="secondary" disabled={busy === 'password' || !pw.old || !pw.next}>Change password</Button>
                </form>
            </div>
        </Section>
    );
};

const DataSection: React.FC = () => {
    const { data, refresh } = useData();
    const { currentUser } = useAuth();
    const { toast, confirm } = useToast();
    const [busy, setBusy] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    const fileRef = useRef<HTMLInputElement>(null);

    const stamp = () => new Date().toISOString().slice(0, 10);

    const exportCSVs = async () => {
        setBusy('csv');
        try {
            const zip = new JSZip();
            const flat = <T extends object>(rows: T[]) => rows.map(r => {
                const out: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(r)) {
                    if (['collectionId', 'collectionName', 'expand', 'user'].includes(k)) continue;
                    out[k] = Array.isArray(v) && k === 'tags' ? v.join(', ') : v;
                }
                return out;
            });
            zip.file('contacts.csv', toCSV(flat(data.contacts)));
            zip.file('deals.csv', toCSV(flat(data.deals)));
            zip.file('projects.csv', toCSV(flat(data.projects)));
            zip.file('tasks.csv', toCSV(flat(data.tasks)));
            zip.file('invoices.csv', toCSV(flat(data.invoices)));
            zip.file('time_entries.csv', toCSV(flat(data.timeEntries)));
            zip.file('expenses.csv', toCSV(flat(data.expenses)));
            zip.file('notes.csv', toCSV(flat(data.notes)));
            zip.file('activity.csv', toCSV(flat(data.recentActivity)));
            const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            saveAs(content, `barestackos_export_${stamp()}.zip`);
        } catch (error) {
            console.error('Export failed:', error);
            toast('Failed to export data', 'error');
        } finally {
            setBusy(null);
        }
    };

    const exportJSON = () => {
        const blob = new Blob([JSON.stringify(buildBackup(data), null, 2)], { type: 'application/json' });
        saveAs(blob, `barestackos_backup_${stamp()}.json`);
    };

    const onRestoreFile = async (file: File) => {
        let backup: Backup;
        try {
            if (file.size > 50 * 1024 * 1024) throw new Error('Backup file is larger than 50MB.');
            backup = parseBackup(await file.text());
        } catch (error) {
            toast((error as Error).message, 'error');
            return;
        }
        const counts = backupCounts(backup);
        const summary = Object.entries(counts).filter(([, n]) => n).map(([k, n]) => `${n} ${k.replace('_', ' ')}`).join(', ') || 'nothing';
        const ok = await confirm({
            title: 'Restore backup',
            message: `This adds ${summary} to your account. Nothing existing is changed or deleted, so restoring the same file twice creates duplicates. Continue?`,
            confirmLabel: 'Restore',
        });
        if (!ok || !currentUser) return;
        setBusy('restore');
        try {
            const result = await restoreBackup(backup, currentUser.id, {
                hasBusinessProfile: !!data.businessProfile.id,
                onProgress: (label, done, total) => setProgress(`${label.replace('_', ' ')} ${done}/${total}`),
            });
            await refresh();
            const createdTotal = Object.values(result.created).reduce((a, b) => a + b, 0);
            const skippedTotal = Object.values(result.skipped).reduce((a, b) => a + b, 0);
            toast(`Restored ${createdTotal} records${skippedTotal ? ` (${skippedTotal} skipped)` : ''}.`, skippedTotal ? 'info' : 'success');
        } catch (error) {
            console.error('Restore failed:', error);
            toast('Restore failed part-way. Reloaded your data so you can see what landed.', 'error');
            await refresh();
        } finally {
            setBusy(null);
            setProgress('');
        }
    };

    const { loadSampleData, removeSampleData } = useData();
    const sampleCount = data.contacts.filter(c => c.tags?.includes('sample')).length;
    const sample = async (action: 'load' | 'remove') => {
        if (action === 'remove' && !await confirm({ title: 'Remove sample data', message: `Delete the ${sampleCount} sample clients and everything attached to them (deals, projects, invoices, time, notes, sample expenses)?`, danger: true, confirmLabel: 'Remove' })) return;
        setBusy('sample');
        try {
            if (action === 'load') await loadSampleData(); else await removeSampleData();
            toast(action === 'load' ? 'Sample data added' : 'Sample data removed', 'success');
        } catch (error) {
            console.error(error);
            toast('Something went wrong. Reloaded your data.', 'error');
        } finally {
            setBusy(null);
        }
    };

    const total = data.contacts.length + data.deals.length + data.projects.length + data.tasks.length + data.invoices.length + data.timeEntries.length + data.expenses.length + data.notes.length;

    return (
        <Section id="data" title="Your data" description="It's yours. Export it any time, or move it between BareStackOS instances.">
            <div className="divide-y divide-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5">
                    <div>
                        <h4 className="font-semibold text-charcoal">Spreadsheet export</h4>
                        <p className="text-sm text-muted">A ZIP of CSV files (contacts, deals, projects, tasks, invoices, time, expenses, notes, activity).</p>
                    </div>
                    <Button variant="secondary" onClick={exportCSVs} disabled={!!busy}>
                        <Icon name="download" className="w-4 h-4 mr-2" />{busy === 'csv' ? 'Exporting...' : 'Export CSVs'}
                    </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-5">
                    <div>
                        <h4 className="font-semibold text-charcoal">Full backup</h4>
                        <p className="text-sm text-muted">One JSON file with all {total} records and your business details. Restorable below.</p>
                    </div>
                    <Button variant="secondary" onClick={exportJSON} disabled={!!busy}>
                        <Icon name="database" className="w-4 h-4 mr-2" />Download backup
                    </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-5">
                    <div>
                        <h4 className="font-semibold text-charcoal">Sample data</h4>
                        <p className="text-sm text-muted">{sampleCount ? `${sampleCount} sample clients are in your account. Removing them deletes only sample records.` : 'Add a small demo agency (clients, projects, time, invoices) to explore the app.'}</p>
                    </div>
                    <Button variant="secondary" onClick={() => sample(sampleCount ? 'remove' : 'load')} disabled={!!busy}>
                        <Icon name={sampleCount ? 'trash' : 'sparkles'} className="w-4 h-4 mr-2" />{busy === 'sample' ? 'Working...' : sampleCount ? 'Remove sample data' : 'Load sample data'}
                    </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5">
                    <div>
                        <h4 className="font-semibold text-charcoal">Restore from backup</h4>
                        <p className="text-sm text-muted">Adds the records from a BareStackOS backup file to this account. Existing data is left untouched.</p>
                        {busy === 'restore' && progress && <p className="text-xs text-charcoal mt-1 font-semibold tabular-nums">Restoring {progress}…</p>}
                    </div>
                    <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onRestoreFile(f); }} />
                    <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={!!busy}>
                        <Icon name="upload" className="w-4 h-4 mr-2" />{busy === 'restore' ? 'Restoring...' : 'Restore backup'}
                    </Button>
                </div>
            </div>
        </Section>
    );
};

const AppearanceSection: React.FC = () => {
    const { preference, setPreference } = useTheme();
    const options: { value: ThemePreference; label: string; icon: 'sun' | 'moon' | 'monitor' }[] = [
        { value: 'light', label: 'Light', icon: 'sun' },
        { value: 'dark', label: 'Dark', icon: 'moon' },
        { value: 'system', label: 'Match system', icon: 'monitor' },
    ];
    return (
        <Section id="appearance" title="Appearance" description="Saved on this device.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
                {options.map(o => (
                    <button
                        key={o.value}
                        role="radio"
                        aria-checked={preference === o.value}
                        onClick={() => setPreference(o.value)}
                        className={`flex items-center gap-3 p-4 border text-left transition-colors ${preference === o.value ? 'border-charcoal bg-surface' : 'border-border hover:border-charcoal'}`}
                    >
                        <Icon name={o.icon} className="w-5 h-5" />
                        <span className="font-semibold text-sm">{o.label}</span>
                        {preference === o.value && <Icon name="check" className="w-4 h-4 ml-auto" />}
                    </button>
                ))}
            </div>
        </Section>
    );
};

const DangerSection: React.FC = () => {
    const { data } = useData();
    const { currentUser, logout } = useAuth();
    const { toast } = useToast();
    const [typed, setTyped] = useState('');
    const [busy, setBusy] = useState(false);

    const deleteAccount = async () => {
        if (!currentUser || typed !== 'DELETE') return;
        setBusy(true);
        try {
            // Delete owned records first so nothing is orphaned on the server.
            const jobs: [string, { remove: (id: string) => Promise<void> }, { id?: string }[]][] = [
                ['time entries', api.timeEntries, data.timeEntries],
                ['tasks', api.tasks, data.tasks],
                ['expenses', api.expenses, data.expenses],
                ['invoices', api.invoices, data.invoices],
                ['deals', api.deals, data.deals],
                ['notes', api.notes, data.notes],
                ['projects', api.projects, data.projects],
                ['contacts', api.contacts, data.contacts],
                ['imports', api.importBatches, data.importBatches],
            ];
            for (const [, binding, rows] of jobs) {
                for (let i = 0; i < rows.length; i += 20) {
                    await Promise.all(rows.slice(i, i + 20).filter(r => r.id).map(r => binding.remove(r.id!)));
                }
            }
            if (data.businessProfile.id) await api.businessProfiles.remove(data.businessProfile.id);
            await pb.collection('users').delete(currentUser.id);
            toast('Your account and data have been deleted.', 'success');
            logout();
        } catch (error) {
            console.error('Account deletion failed:', error);
            toast('Deletion failed part-way. Export a backup and try again.', 'error');
            setBusy(false);
        }
    };

    return (
        <Section id="danger" title="Delete account" description="Permanently delete your account and everything in it." tone="danger">
            <p className="text-sm text-charcoal mb-4">This deletes every contact, deal, project, task, invoice, time entry, expense and note, then your login. Download a backup first if you might want it back.</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <Input label='Type "DELETE" to confirm' id="danger-confirm" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" className="sm:w-64" />
                <Button variant="danger" onClick={deleteAccount} disabled={typed !== 'DELETE' || busy}>
                    <Icon name="trash" className="w-4 h-4 mr-2" />{busy ? 'Deleting...' : 'Delete my account'}
                </Button>
            </div>
        </Section>
    );
};

const Settings: React.FC = () => {
    const links = [
        { id: 'business', label: 'Business' },
        { id: 'account', label: 'Account' },
        { id: 'appearance', label: 'Appearance' },
        { id: 'data', label: 'Your data' },
        { id: 'danger', label: 'Delete account' },
    ];
    return (
        <div className="max-w-5xl mx-auto">
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide mb-6 border-b border-border pb-3" aria-label="Settings sections">
                {links.map(l => (
                    <a key={l.id} href={`#${l.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm font-semibold py-1.5 px-3 text-muted hover:text-charcoal border border-transparent hover:border-border whitespace-nowrap">
                        {l.label}
                    </a>
                ))}
            </nav>
            <div className="space-y-8">
                <BusinessSection />
                <AccountSection />
                <AppearanceSection />
                <DataSection />
                <DangerSection />
            </div>
        </div>
    );
};

export default Settings;
