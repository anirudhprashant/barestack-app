import React, { useState, useMemo, useEffect, useRef } from 'react';
import { addDays, addMonths, addWeeks, format } from 'date-fns';
import { Button, Icon, IconButton, Modal, Input, Select, Textarea } from './ui';
import { Invoice, InvoiceStatus, Contact, LineItem, TimeEntry, Recurrence } from '../types';
import { useData, useCurrency } from '../dataStore';
import { useToast } from '../src/context/ToastContext';
import { ContactForm } from './ContactForm';
import { formatMoney, currencySymbol, formatHours } from '../src/lib/format';
import { toDateInput, toStoredDate, todayInput, parseDateOnly, formatDateOnly } from '../src/lib/dates';
import { invoiceSubtotal, invoiceTax, invoiceTotal, lineItemAmount, nextInvoiceNumber, newLineItemId } from '../src/lib/invoice';

interface InvoiceFormProps {
    onClose: () => void;
    initialData?: Invoice;
    initialClientId?: string;
    // Pre-select unbilled time entries (e.g. "Bill time" from a project).
    initialTimeEntryIds?: string[];
    onSaved?: (invoice: Invoice) => void;
}

interface DraftItem {
    id: string;
    description: string;
    quantity: string;
    rate: string;
}

const toDraft = (li: LineItem): DraftItem => ({
    id: li.id || newLineItemId(),
    description: li.description,
    quantity: String(li.quantity ?? ''),
    rate: String(li.rate ?? ''),
});

const blankItem = (): DraftItem => ({ id: newLineItemId(), description: '', quantity: '1', rate: '' });

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ onClose, initialData, initialClientId, initialTimeEntryIds, onSaved }) => {
    const { data, addInvoice, updateInvoice, updateTimeEntry, addRecentActivity } = useData();
    const currency = useCurrency();
    const profile = data.businessProfile;
    const { toast } = useToast();
    const isEditing = !!initialData?.id;

    const [clientId, setClientId] = useState(initialData?.client_id || initialClientId || data.contacts[0]?.id || '');
    const [invoiceNumber, setInvoiceNumber] = useState(
        initialData?.invoice_number || nextInvoiceNumber(data.invoices.map(i => i.invoice_number), profile.invoice_prefix || '')
    );
    const [issueDate, setIssueDate] = useState(initialData ? toDateInput(initialData.issue_date) : todayInput());
    const [dueDate, setDueDate] = useState(
        initialData ? toDateInput(initialData.due_date) : format(addDays(new Date(), profile.payment_terms_days ?? 30), 'yyyy-MM-dd')
    );
    const [status, setStatus] = useState<InvoiceStatus>(initialData?.status || InvoiceStatus.Draft);
    const [taxRate, setTaxRate] = useState(String(initialData ? initialData.tax_rate ?? 0 : profile.default_tax_rate || 0));
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [recurrence, setRecurrence] = useState<Recurrence | ''>(initialData?.recurrence || '');
    const [nextIssue, setNextIssue] = useState(toDateInput(initialData?.next_issue_date));
    const [items, setItems] = useState<DraftItem[]>(
        initialData?.line_items?.length ? initialData.line_items.map(toDraft) : [blankItem()]
    );
    // Time entries this invoice will mark as billed on save.
    const [billedEntryIds, setBilledEntryIds] = useState<Set<string>>(new Set());
    const [timePickerOpen, setTimePickerOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

    const parsedItems: LineItem[] = items.map(i => ({
        id: i.id,
        description: i.description.trim(),
        quantity: parseFloat(i.quantity) || 0,
        rate: parseFloat(i.rate) || 0,
    }));
    const totals = { line_items: parsedItems, tax_rate: parseFloat(taxRate) || 0 };

    const unbilled = useMemo(() => {
        const projectIds = new Set(data.projects.filter(p => p.client_id === clientId).map(p => p.id));
        return data.timeEntries.filter(te => te.is_billable && !te.invoice_id && projectIds.has(te.project_id) && !billedEntryIds.has(te.id!));
    }, [data.timeEntries, data.projects, clientId, billedEntryIds]);

    const addTimeAsItems = (entries: TimeEntry[]) => {
        if (entries.length === 0) return;
        const byProject = new Map<string, TimeEntry[]>();
        for (const te of entries) {
            byProject.set(te.project_id, [...(byProject.get(te.project_id) || []), te]);
        }
        const newItems: DraftItem[] = [];
        for (const [projectId, list] of byProject) {
            const project = data.projects.find(p => p.id === projectId);
            const hours = Math.round(list.reduce((s, te) => s + te.hours, 0) * 100) / 100;
            const dates = list.map(te => parseDateOnly(te.date)).filter(Boolean) as Date[];
            const min = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
            const max = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
            const range = min && max ? (min.getTime() === max.getTime() ? format(min, 'MMM d') : `${format(min, 'MMM d')} – ${format(max, 'MMM d')}`) : '';
            newItems.push({
                id: newLineItemId(),
                description: `${project?.name || 'Project'} time${range ? ` (${range})` : ''}`,
                quantity: String(hours),
                rate: project?.hourly_rate ? String(project.hourly_rate) : '',
            });
        }
        // Replace a single untouched blank row instead of leaving it dangling.
        setItems(prev => {
            const onlyBlank = prev.length === 1 && !prev[0].description && !prev[0].rate;
            return onlyBlank ? newItems : [...prev, ...newItems];
        });
        setBilledEntryIds(prev => new Set([...prev, ...entries.map(e => e.id!)]));
    };

    // Honour pre-selected entries once. The ref guard keeps StrictMode's
    // double-invoked effects from adding the lines twice.
    const seeded = useRef(false);
    useEffect(() => {
        if (seeded.current || !initialTimeEntryIds?.length) return;
        seeded.current = true;
        const pre = data.timeEntries.filter(te => initialTimeEntryIds.includes(te.id!) && !te.invoice_id);
        addTimeAsItems(pre);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateItem = (id: string, field: keyof DraftItem, value: string) => {
        setItems(prev => prev.map(i => (i.id === id ? { ...i, [field]: value } : i)));
    };

    const nextAfter = (issue: string, rec: Recurrence | ''): string => {
        const d = parseDateOnly(issue);
        if (!d || !rec) return '';
        const n = rec === 'weekly' ? addWeeks(d, 1) : addMonths(d, rec === 'monthly' ? 1 : rec === 'quarterly' ? 3 : 12);
        return format(n, 'yyyy-MM-dd');
    };

    const handleRecurrenceChange = (rec: Recurrence | '') => {
        setRecurrence(rec);
        setNextIssue(rec ? nextAfter(issueDate, rec) : '');
    };

    const handleIssueDateChange = (value: string) => {
        setIssueDate(value);
        // Keep the payment window when the issue date moves (new invoices only).
        if (!isEditing && value) {
            setDueDate(format(addDays(parseDateOnly(value)!, profile.payment_terms_days ?? 30), 'yyyy-MM-dd'));
        }
        if (recurrence && value) setNextIssue(nextAfter(value, recurrence));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) {
            toast('Please select a client.', 'error');
            return;
        }
        const lineItems = parsedItems.filter(li => li.description || li.quantity * li.rate !== 0);
        if (lineItems.length === 0) {
            toast('Add at least one line item.', 'error');
            return;
        }
        if (lineItems.some(li => !li.description)) {
            toast('Every line item needs a description.', 'error');
            return;
        }
        const number = invoiceNumber.trim();
        if (!number) {
            toast('Invoice number is required.', 'error');
            return;
        }
        if (data.invoices.some(i => i.invoice_number === number && i.id !== initialData?.id)) {
            toast(`Invoice ${number} already exists.`, 'error');
            return;
        }
        if (recurrence && (!nextIssue || nextIssue <= issueDate)) {
            toast('The next invoice date must be after the issue date.', 'error');
            return;
        }
        if (dueDate && issueDate && dueDate < issueDate) {
            toast('Due date is before the issue date.', 'error');
            return;
        }

        setLoading(true);
        const clientName = data.contacts.find(c => c.id === clientId)?.name || 'Unknown';
        const payload = {
            invoice_number: number,
            client_id: clientId,
            issue_date: toStoredDate(issueDate),
            due_date: toStoredDate(dueDate || issueDate),
            line_items: lineItems,
            tax_rate: Math.min(100, Math.max(0, parseFloat(taxRate) || 0)),
            status,
            notes: notes.trim(),
            paid_date: status === InvoiceStatus.Paid ? (initialData?.paid_date || toStoredDate(new Date())) : '',
            recurrence,
            next_issue_date: recurrence && nextIssue ? toStoredDate(nextIssue) : '',
        };

        try {
            let saved: Invoice;
            if (isEditing) {
                saved = await updateInvoice({ id: initialData!.id!, ...payload });
                const becamePaid = status === InvoiceStatus.Paid && initialData!.status !== InvoiceStatus.Paid;
                addRecentActivity({
                    type: becamePaid ? 'INVOICE_PAID' : 'INVOICE_UPDATED',
                    description: becamePaid ? `Invoice ${number} marked as paid` : `Updated invoice ${number}`,
                });
            } else {
                saved = await addInvoice(payload);
                addRecentActivity({
                    type: 'INVOICE_CREATED',
                    description: `Created invoice ${number} for ${clientName}`,
                });
            }

            if (billedEntryIds.size > 0) {
                const results = await Promise.allSettled(
                    [...billedEntryIds].map(id => updateTimeEntry({ id, invoice_id: saved.id! }))
                );
                if (results.some(r => r.status === 'rejected')) {
                    toast('Invoice saved, but some time entries could not be marked as billed.', 'error');
                }
            }

            toast(isEditing ? 'Invoice updated' : 'Invoice created', 'success');
            onSaved?.(saved);
            onClose();
        } catch (error) {
            console.error('Failed to save invoice:', error);
            toast('An error occurred while saving the invoice.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClientAdded = (newContact: Contact) => {
        setClientId(newContact.id!);
        setIsAddClientModalOpen(false);
    };

    const sym = currencySymbol(currency);

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                        <label htmlFor="invoice-client" className="block text-sm font-semibold text-charcoal mb-1.5">Client</label>
                        <div className="flex space-x-2">
                            <Select
                                id="invoice-client"
                                className="flex-grow"
                                value={clientId}
                                onChange={e => { setClientId(e.target.value); setBilledEntryIds(new Set()); }}
                                required
                                disabled={billedEntryIds.size > 0}
                            >
                                <option value="" disabled>Select a client</option>
                                {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
                            </Select>
                            <Button type="button" variant="secondary" onClick={() => setIsAddClientModalOpen(true)} title="Add new client" aria-label="Add new client">
                                <Icon name="plus" className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                    <Input label="Invoice #" id="invoice-number" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Input label="Issue date" id="issueDate" type="date" value={issueDate} onChange={e => handleIssueDateChange(e.target.value)} required />
                    <Input label="Due date" id="dueDate" type="date" value={dueDate} min={issueDate} onChange={e => setDueDate(e.target.value)} required />
                    <Select label="Status" id="invoice-status" className="col-span-2 sm:col-span-1" value={status} onChange={e => setStatus(e.target.value as InvoiceStatus)}>
                        {Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
                    <Select label="Repeats" id="invoice-recurrence" value={recurrence} onChange={e => handleRecurrenceChange(e.target.value as Recurrence | '')}>
                        <option value="">Doesn't repeat</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                    </Select>
                    {recurrence && (
                        <Input label="Next invoice on" id="invoice-next" type="date" value={nextIssue} min={issueDate} onChange={e => setNextIssue(e.target.value)} required />
                    )}
                    {recurrence && (
                        <p className="col-span-2 sm:col-span-1 text-xs text-muted pb-2">
                            A draft copy is created automatically on each date, with the same lines and payment terms.
                        </p>
                    )}
                </div>

                <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-charcoal">Line items</h4>
                        {(unbilled.length > 0) && (
                            <button type="button" onClick={() => setTimePickerOpen(true)} className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
                                <Icon name="clock" className="w-3.5 h-3.5" />
                                Add unbilled time ({formatHours(unbilled.reduce((s, te) => s + te.hours, 0))})
                            </button>
                        )}
                    </div>

                    <div className="hidden sm:grid grid-cols-[1fr_80px_110px_110px_32px] gap-2 text-xs font-semibold uppercase tracking-wider text-muted mb-1.5 px-0.5">
                        <span>Description</span><span>Qty</span><span>Rate ({sym})</span><span className="text-right">Amount</span><span />
                    </div>
                    <div className="space-y-3 sm:space-y-2">
                        {items.map((item, idx) => (
                            <div key={item.id} className="grid grid-cols-[1fr_1fr_32px] sm:grid-cols-[1fr_80px_110px_110px_32px] gap-2 items-center border sm:border-0 border-border p-2 sm:p-0">
                                <input
                                    aria-label={`Line ${idx + 1} description`}
                                    className="col-span-3 sm:col-span-1 min-w-0 w-full p-2 bg-canvas border border-border text-sm focus:outline-none focus:border-content"
                                    placeholder="Description"
                                    value={item.description}
                                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                                />
                                <input
                                    aria-label={`Line ${idx + 1} quantity`}
                                    type="number" step="any" min="0"
                                    className="min-w-0 w-full p-2 bg-canvas border border-border text-sm tabular-nums focus:outline-none focus:border-content"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                                />
                                <input
                                    aria-label={`Line ${idx + 1} rate`}
                                    type="number" step="0.01"
                                    className="min-w-0 w-full p-2 bg-canvas border border-border text-sm tabular-nums focus:outline-none focus:border-content"
                                    placeholder="Rate"
                                    value={item.rate}
                                    onChange={e => updateItem(item.id, 'rate', e.target.value)}
                                />
                                <span className="hidden sm:block text-right text-sm font-semibold tabular-nums">
                                    {formatMoney(lineItemAmount({ quantity: parseFloat(item.quantity) || 0, rate: parseFloat(item.rate) || 0 }), currency)}
                                </span>
                                <IconButton
                                    icon="x"
                                    label={`Remove line ${idx + 1}`}
                                    onClick={() => setItems(prev => (prev.length > 1 ? prev.filter(i => i.id !== item.id) : [blankItem()]))}
                                />
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={() => setItems(prev => [...prev, blankItem()])} className="mt-3 text-sm font-semibold text-charcoal hover:underline flex items-center gap-1">
                        <Icon name="plus" className="w-4 h-4" /> Add line
                    </button>
                    {billedEntryIds.size > 0 && (
                        <p className="text-xs text-muted mt-2">
                            {billedEntryIds.size} time entr{billedEntryIds.size === 1 ? 'y' : 'ies'} will be marked as billed.{' '}
                            <button type="button" className="underline" onClick={() => setBilledEntryIds(new Set())}>Don't mark</button>
                        </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-5 sm:items-start border-t border-border pt-4">
                    <Textarea
                        label="Notes"
                        hint="shown on the invoice"
                        id="invoice-notes"
                        className="flex-1"
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Thanks for your business!"
                    />
                    <div className="sm:w-64 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="tabular-nums font-medium">{formatMoney(invoiceSubtotal(totals), currency)}</span></div>
                        <div className="flex justify-between items-center gap-2">
                            <label htmlFor="taxRate" className="text-muted">Tax %</label>
                            <input id="taxRate" type="number" min="0" max="100" step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="w-20 p-1.5 bg-canvas border border-border text-right tabular-nums focus:outline-none focus:border-content" />
                            <span className="tabular-nums font-medium ml-auto">{formatMoney(invoiceTax(totals), currency)}</span>
                        </div>
                        <div className="flex justify-between border-t border-charcoal pt-2 text-base"><span className="font-bold">Total</span><span className="tabular-nums font-bold">{formatMoney(invoiceTotal(totals), currency)}</span></div>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : (isEditing ? 'Update Invoice' : 'Create Invoice')}</Button>
                </div>
            </form>

            <Modal isOpen={isAddClientModalOpen} onClose={() => setIsAddClientModalOpen(false)} title="Add New Client">
                <ContactForm onClose={() => setIsAddClientModalOpen(false)} onSuccess={handleClientAdded} />
            </Modal>

            <Modal isOpen={timePickerOpen} onClose={() => setTimePickerOpen(false)} title="Add unbilled time" maxWidthClass="max-w-2xl">
                <UnbilledTimePicker
                    entries={unbilled}
                    onCancel={() => setTimePickerOpen(false)}
                    onAdd={(sel) => { addTimeAsItems(sel); setTimePickerOpen(false); }}
                />
            </Modal>
        </>
    );
};

const UnbilledTimePicker: React.FC<{ entries: TimeEntry[]; onAdd: (entries: TimeEntry[]) => void; onCancel: () => void }> = ({ entries, onAdd, onCancel }) => {
    const { data } = useData();
    const [selected, setSelected] = useState<Set<string>>(() => new Set(entries.map(e => e.id!)));
    const projectName = (id: string) => data.projects.find(p => p.id === id)?.name || 'Unknown project';
    const chosen = entries.filter(e => selected.has(e.id!));
    const toggle = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted">Selected entries are grouped into one line per project at the project's hourly rate.</p>
            <div className="max-h-80 overflow-y-auto border border-border divide-y divide-border/50">
                <label className="flex items-center gap-3 p-2.5 bg-surface text-xs font-semibold uppercase tracking-wider text-muted sticky top-0">
                    <input type="checkbox" className="accent-charcoal" checked={selected.size === entries.length} onChange={e => setSelected(e.target.checked ? new Set(entries.map(x => x.id!)) : new Set())} />
                    Select all
                </label>
                {entries.map(te => (
                    <label key={te.id} className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-surface/50">
                        <input type="checkbox" className="accent-charcoal" checked={selected.has(te.id!)} onChange={() => toggle(te.id!)} />
                        <span className="text-xs text-muted w-20 shrink-0">{formatDateOnly(te.date, 'MMM d')}</span>
                        <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-charcoal truncate">{projectName(te.project_id)}</span>
                            {te.description && <span className="block text-xs text-muted truncate">{te.description}</span>}
                        </span>
                        <span className="text-sm font-bold tabular-nums">{formatHours(te.hours)}</span>
                    </label>
                ))}
            </div>
            <div className="flex justify-between items-center">
                <span className="text-sm text-muted">{chosen.length} selected · {formatHours(chosen.reduce((s, e) => s + e.hours, 0))}</span>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button onClick={() => onAdd(chosen)} disabled={chosen.length === 0}>Add to invoice</Button>
                </div>
            </div>
        </div>
    );
};
