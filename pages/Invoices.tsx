import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { differenceInCalendarDays, startOfYear } from 'date-fns';
import { Button, Icon, IconButton, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, SearchInput, Segmented, StatTile } from '../components/ui';
import { Invoice, InvoiceShare, InvoiceStatus } from '../types';
import { useData, useCurrency } from '../dataStore';
import { InvoiceForm } from '../components/InvoiceForm';
import { useToast } from '../src/context/ToastContext';
import { formatMoney } from '../src/lib/format';
import { formatDateOnly, parseDateOnly, toStoredDate, sortTime } from '../src/lib/dates';
import { invoiceTotal, effectiveStatus, isUnpaid, nextInvoiceNumber } from '../src/lib/invoice';
import { generateInvoicePdf, invoiceFileName } from '../src/lib/invoicePdf';
import { toCSV, downloadText } from '../src/lib/csv';
import { invoiceStatusClass } from '../components/badges';
import { shareUrl } from '../src/lib/share';

type Filter = 'all' | InvoiceStatus;

const Invoices: React.FC = () => {
    const { data, addInvoice, updateInvoice, deleteInvoice, addRecentActivity, shareInvoice, revokeShare } = useData();
    const currency = useCurrency();
    const { toast, confirm } = useToast();
    const { invoices, contacts } = data;
    const [searchParams, setSearchParams] = useSearchParams();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [downloading, setDownloading] = useState(false);
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | undefined>(undefined);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [sharing, setSharing] = useState<Invoice | null>(null);

    const clientOf = (inv: Invoice) => contacts.find(c => c.id === inv.client_id);
    const clientName = (inv: Invoice) => clientOf(inv)?.name || 'Unknown Client';

    // Deep links: /invoices?open=<id> previews, /invoices?new=1 opens the form.
    useEffect(() => {
        const open = searchParams.get('open');
        if (open) {
            const inv = invoices.find(i => i.id === open);
            if (inv) setPreviewInvoice(inv);
        }
        if (searchParams.get('new')) {
            setEditingInvoice(undefined);
            setIsFormOpen(true);
        }
        if (open || searchParams.get('new')) setSearchParams({}, { replace: true });
    }, [searchParams, invoices, setSearchParams]);

    const summary = useMemo(() => {
        const yearStart = startOfYear(new Date());
        let outstanding = 0, overdue = 0, overdueCount = 0, paidYtd = 0, drafts = 0;
        for (const inv of invoices) {
            const st = effectiveStatus(inv);
            const total = invoiceTotal(inv);
            if (isUnpaid(inv)) outstanding += total;
            if (st === InvoiceStatus.Overdue) { overdue += total; overdueCount++; }
            if (st === InvoiceStatus.Draft) drafts++;
            if (st === InvoiceStatus.Paid) {
                const paidOn = parseDateOnly(inv.paid_date) || parseDateOnly(inv.issue_date);
                if (paidOn && paidOn >= yearStart) paidYtd += total;
            }
        }
        return { outstanding, overdue, overdueCount, paidYtd, drafts };
    }, [invoices]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return invoices
            .filter(inv => filter === 'all' || effectiveStatus(inv) === filter)
            .filter(inv => !q || inv.invoice_number.toLowerCase().includes(q) || clientName(inv).toLowerCase().includes(q))
            .sort((a, b) => sortTime(b.issue_date) - sortTime(a.issue_date) || b.invoice_number.localeCompare(a.invoice_number));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoices, filter, search, contacts]);

    const pdfFor = (invoice: Invoice) => generateInvoicePdf({
        invoice,
        client: clientOf(invoice),
        business: data.businessProfile,
        user: data.userProfile,
    });

    const handleDownloadPDF = async (invoice: Invoice) => {
        try {
            const doc = await pdfFor(invoice);
            doc.save(invoiceFileName(invoice, clientOf(invoice)));
        } catch (error) {
            console.error('Failed to generate invoice PDF:', error);
            toast('Could not generate the PDF. Please try again.', 'error');
        }
    };

    // Build (and clean up) a blob URL for the preview modal.
    useEffect(() => {
        if (!previewInvoice) {
            setPreviewUrl(null);
            return;
        }
        let url: string | null = null;
        let cancelled = false;
        pdfFor(previewInvoice).then(doc => {
            url = doc.output('bloburl') as unknown as string;
            if (cancelled) URL.revokeObjectURL(url);
            else setPreviewUrl(url);
        }).catch(err => {
            console.error('Preview failed:', err);
            toast('Could not render the preview.', 'error');
            setPreviewInvoice(undefined);
        });
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewInvoice]);

    const handleDownloadSelected = async () => {
        const chosen = invoices.filter(inv => selectedIds.has(inv.id!));
        if (chosen.length === 0) return;
        setDownloading(true);
        try {
            if (chosen.length === 1) {
                await handleDownloadPDF(chosen[0]);
            } else {
                const zip = new JSZip();
                for (const inv of chosen) {
                    const doc = await pdfFor(inv);
                    zip.file(invoiceFileName(inv, clientOf(inv)), doc.output('arraybuffer'));
                }
                const blob = await zip.generateAsync({ type: 'blob' });
                saveAs(blob, `invoices_${new Date().toISOString().slice(0, 10)}.zip`);
            }
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Failed to download selected invoices:', error);
            toast('Some PDFs could not be generated. Please try again.', 'error');
        } finally {
            setDownloading(false);
        }
    };

    const handleExportCSV = () => {
        const rows = visible.map(inv => ({
            number: inv.invoice_number,
            client: clientName(inv),
            issue_date: formatDateOnly(inv.issue_date, 'yyyy-MM-dd'),
            due_date: formatDateOnly(inv.due_date, 'yyyy-MM-dd'),
            status: effectiveStatus(inv),
            paid_date: inv.paid_date ? formatDateOnly(inv.paid_date, 'yyyy-MM-dd') : '',
            tax_rate: inv.tax_rate,
            total: invoiceTotal(inv),
            currency,
        }));
        downloadText(toCSV(rows), `invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const setStatus = async (invoice: Invoice, newStatus: InvoiceStatus) => {
        if (newStatus === invoice.status) return;
        try {
            await updateInvoice({
                id: invoice.id!,
                status: newStatus,
                paid_date: newStatus === InvoiceStatus.Paid ? toStoredDate(new Date()) : '',
            });
            if (newStatus === InvoiceStatus.Paid) {
                addRecentActivity({ type: 'INVOICE_PAID', description: `Invoice ${invoice.invoice_number} paid (${formatMoney(invoiceTotal(invoice), currency)})` });
                toast(`Invoice ${invoice.invoice_number} marked as paid`, 'success');
            } else if (newStatus === InvoiceStatus.Sent) {
                addRecentActivity({ type: 'INVOICE_SENT', description: `Invoice ${invoice.invoice_number} sent to ${clientName(invoice)}` });
                toast(`Invoice ${invoice.invoice_number} marked as sent`, 'success');
            } else {
                addRecentActivity({ type: 'INVOICE_UPDATED', description: `Invoice ${invoice.invoice_number} set to ${newStatus}` });
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            toast('Could not update the invoice status.', 'error');
        }
    };

    const handleEmail = async (invoice: Invoice) => {
        const client = clientOf(invoice);
        if (!client?.email) {
            toast('This client has no email address.', 'error');
            return;
        }
        const biz = data.businessProfile.business_name || data.userProfile.name || '';
        const subject = `Invoice ${invoice.invoice_number}${biz ? ` from ${biz}` : ''}`;
        const body = [
            `Hi ${client.name.split(' ')[0] || client.name},`,
            '',
            `Please find invoice ${invoice.invoice_number} for ${formatMoney(invoiceTotal(invoice), currency)}, due ${formatDateOnly(invoice.due_date)}.`,
            data.businessProfile.payment_instructions ? `\nHow to pay:\n${data.businessProfile.payment_instructions}` : '',
            '',
            'Thank you!',
            biz,
        ].join('\n');
        // Download the PDF so it's ready to attach, then open the mail client.
        await handleDownloadPDF(invoice);
        window.location.href = `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        if (invoice.status === InvoiceStatus.Draft) {
            await setStatus(invoice, InvoiceStatus.Sent);
        }
    };

    const handleDuplicate = async (invoice: Invoice) => {
        try {
            const number = nextInvoiceNumber(invoices.map(i => i.invoice_number), data.businessProfile.invoice_prefix || '');
            const issue = new Date();
            const origIssue = parseDateOnly(invoice.issue_date);
            const origDue = parseDateOnly(invoice.due_date);
            const termDays = origIssue && origDue ? Math.max(0, differenceInCalendarDays(origDue, origIssue)) : (data.businessProfile.payment_terms_days ?? 30);
            const due = new Date(issue.getFullYear(), issue.getMonth(), issue.getDate() + termDays);
            await addInvoice({
                invoice_number: number,
                client_id: invoice.client_id,
                issue_date: toStoredDate(issue),
                due_date: toStoredDate(due),
                line_items: invoice.line_items.map(li => ({ ...li })),
                tax_rate: invoice.tax_rate,
                status: InvoiceStatus.Draft,
                notes: invoice.notes || '',
                paid_date: '',
            });
            addRecentActivity({ type: 'INVOICE_CREATED', description: `Created invoice ${number} (copy of ${invoice.invoice_number})` });
            toast(`Created draft ${number}`, 'success');
        } catch (error) {
            console.error('Duplicate failed:', error);
            toast('Could not duplicate the invoice.', 'error');
        }
    };

    const handleDelete = async (invoice: Invoice) => {
        const confirmed = await confirm({
            title: 'Delete invoice',
            message: `Delete invoice ${invoice.invoice_number}? Any time billed on it becomes unbilled again.`,
            danger: true,
            confirmLabel: 'Delete',
        });
        if (!confirmed) return;
        try {
            await deleteInvoice(invoice.id!);
            addRecentActivity({ type: 'INVOICE_DELETED', description: `Deleted invoice ${invoice.invoice_number}` });
            toast('Invoice deleted', 'success');
        } catch (error) {
            console.error('Failed to delete invoice:', error);
            toast('Could not delete invoice. Please try again.', 'error');
        }
    };

    const openCreate = () => { setEditingInvoice(undefined); setIsFormOpen(true); };
    const openEdit = (invoice: Invoice) => { setEditingInvoice(invoice); setIsFormOpen(true); };
    const closeForm = () => { setIsFormOpen(false); setEditingInvoice(undefined); };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    const allVisibleSelected = visible.length > 0 && visible.every(i => selectedIds.has(i.id!));
    const toggleSelectAll = () => setSelectedIds(allVisibleSelected ? new Set() : new Set(visible.map(i => i.id!)));

    const dueLabel = (inv: Invoice) => {
        const st = effectiveStatus(inv);
        const due = parseDateOnly(inv.due_date);
        if (!due || st === InvoiceStatus.Paid || st === InvoiceStatus.Draft) return null;
        const days = differenceInCalendarDays(due, new Date());
        if (days < 0) return <span className="block text-[11px] text-activity-red font-semibold">{-days}d overdue</span>;
        if (days === 0) return <span className="block text-[11px] text-activity-orange font-semibold">due today</span>;
        if (days <= 7) return <span className="block text-[11px] text-muted">in {days}d</span>;
        return null;
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <StatTile label="Outstanding" value={formatMoney(summary.outstanding, currency)} sub="Sent and unpaid" badge="Due" badgeClass="bg-[#c37624] text-cream" onClick={() => setFilter(InvoiceStatus.Sent)} />
                <StatTile label="Overdue" value={formatMoney(summary.overdue, currency)} sub={`${summary.overdueCount} invoice${summary.overdueCount === 1 ? '' : 's'} past due`} badge="Late" badgeClass="bg-activity-red text-cream" onClick={() => setFilter(InvoiceStatus.Overdue)} />
                <StatTile label="Paid this year" value={formatMoney(summary.paidYtd, currency)} sub="Collected revenue" badge="YTD" onClick={() => setFilter(InvoiceStatus.Paid)} />
                <StatTile label="Drafts" value={summary.drafts} sub="Not sent yet" badge="Draft" badgeClass="bg-[#e8b86d] text-[#151817]" onClick={() => setFilter(InvoiceStatus.Draft)} />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
                <Segmented<Filter>
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { value: 'all', label: 'All' },
                        { value: InvoiceStatus.Draft, label: 'Draft' },
                        { value: InvoiceStatus.Sent, label: 'Sent' },
                        { value: InvoiceStatus.Overdue, label: 'Overdue' },
                        { value: InvoiceStatus.Paid, label: 'Paid' },
                    ]}
                />
                <SearchInput value={search} onChange={setSearch} placeholder="Search number or client..." className="lg:w-64" />
                <div className="lg:ml-auto flex flex-wrap gap-2">
                        {selectedIds.size > 0 && (
                            <Button variant="secondary" onClick={handleDownloadSelected} disabled={downloading}>
                                <Icon name="download" className="w-4 h-4 mr-2" /> {downloading ? 'Preparing...' : `Download ${selectedIds.size} PDF${selectedIds.size > 1 ? 's' : ''}`}
                            </Button>
                        )}
                        <Button variant="secondary" onClick={handleExportCSV} disabled={visible.length === 0}>
                            <Icon name="download" className="w-4 h-4 mr-2" /> CSV
                        </Button>
                        <Button variant="primary" onClick={openCreate}>
                            <Icon name="plus" className="w-4 h-4 mr-2" /> Create Invoice
                        </Button>
                </div>
            </div>

            {invoices.length === 0 ? (
                <EmptyState icon="receipt" title="No invoices yet" description="Create your first invoice to get paid. Set up your business details in Settings so they appear on every PDF.">
                    <Button onClick={openCreate}><Icon name="plus" className="w-4 h-4 mr-2" />Create Invoice</Button>
                </EmptyState>
            ) : visible.length === 0 ? (
                <EmptyState icon="search" title="No matching invoices" description="Try another filter or search term." />
            ) : (
                <div className="bg-canvas border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <input type="checkbox" aria-label="Select all invoices" checked={allVisibleSelected} onChange={toggleSelectAll} className="w-4 h-4 cursor-pointer accent-charcoal" />
                                </TableHead>
                                <TableHead>Number</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead className="hidden md:table-cell">Issued</TableHead>
                                <TableHead>Due</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map(invoice => {
                                const st = effectiveStatus(invoice);
                                return (
                                    <TableRow key={invoice.id} className={selectedIds.has(invoice.id!) ? 'bg-surface/50' : ''}>
                                        <TableCell>
                                            <input type="checkbox" aria-label={`Select invoice ${invoice.invoice_number}`} checked={selectedIds.has(invoice.id!)} onChange={() => toggleSelect(invoice.id!)} className="w-4 h-4 cursor-pointer accent-charcoal" />
                                        </TableCell>
                                        <TableCell>
                                            <button className="font-medium text-charcoal hover:underline whitespace-nowrap" onClick={() => setPreviewInvoice(invoice)}>{invoice.invoice_number}</button>
                                            {invoice.recurrence && (
                                                <span className="flex items-center gap-1 text-[11px] text-muted whitespace-nowrap" title="Recurring invoice">
                                                    <Icon name="refresh" className="w-3 h-3" />
                                                    {invoice.recurrence[0].toUpperCase() + invoice.recurrence.slice(1)}
                                                    {invoice.next_issue_date && ` · next ${formatDateOnly(invoice.next_issue_date, 'MMM d')}`}
                                                </span>
                                            )}
                                            {data.invoiceShares.some(sh => sh.invoice_id === invoice.id) && (
                                                <span className="flex items-center gap-1 text-[11px] text-accent whitespace-nowrap"><Icon name="globe" className="w-3 h-3" />Shared</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center min-w-0">
                                                <div className="w-6 h-6 bg-surface border border-border flex items-center justify-center text-xs font-bold text-muted mr-2 shrink-0">
                                                    {clientName(invoice).charAt(0)}
                                                </div>
                                                <span className="truncate max-w-[180px]">{clientName(invoice)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell whitespace-nowrap">{formatDateOnly(invoice.issue_date)}</TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {formatDateOnly(invoice.due_date)}
                                            {dueLabel(invoice)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-semibold text-charcoal tabular-nums whitespace-nowrap">{formatMoney(invoiceTotal(invoice), currency)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <select
                                                aria-label={`Status of invoice ${invoice.invoice_number}`}
                                                value={st}
                                                onChange={(e) => {
                                                    const v = e.target.value as InvoiceStatus;
                                                    // Picking "Overdue" on an already-overdue Sent invoice is a no-op.
                                                    setStatus(invoice, v === InvoiceStatus.Overdue && invoice.status === InvoiceStatus.Sent ? InvoiceStatus.Sent : v);
                                                }}
                                                className={`px-2.5 py-0.5 text-xs font-semibold border-0 cursor-pointer ${invoiceStatusClass[st]}`}
                                            >
                                                {Object.values(InvoiceStatus).map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-0.5">
                                                {st === InvoiceStatus.Draft && <IconButton icon="send" label="Email to client" onClick={() => handleEmail(invoice)} />}
                                                {(st === InvoiceStatus.Sent || st === InvoiceStatus.Overdue) && <IconButton icon="wallet" label="Mark as paid" onClick={() => setStatus(invoice, InvoiceStatus.Paid)} />}
                                                <IconButton icon="globe" label="Share link" onClick={() => setSharing(invoice)} />
                                                <IconButton icon="eye" label="Preview PDF" onClick={() => setPreviewInvoice(invoice)} />
                                                <IconButton icon="download" label="Download PDF" onClick={() => handleDownloadPDF(invoice)} className="hidden sm:inline-flex" />
                                                <IconButton icon="copy" label="Duplicate" onClick={() => handleDuplicate(invoice)} className="hidden sm:inline-flex" />
                                                <IconButton icon="edit" label="Edit invoice" onClick={() => openEdit(invoice)} />
                                                <IconButton icon="trash" label="Delete invoice" tone="danger" onClick={() => handleDelete(invoice)} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <div className="flex justify-between items-center px-4 py-3 border-t border-border bg-surface text-sm">
                        <span className="text-muted">{visible.length} invoice{visible.length === 1 ? '' : 's'}</span>
                        <span className="font-semibold tabular-nums">{formatMoney(visible.reduce((s, i) => s + invoiceTotal(i), 0), currency)}</span>
                    </div>
                </div>
            )}

            <Modal isOpen={!!sharing} onClose={() => setSharing(null)} title={sharing ? `Share invoice ${sharing.invoice_number}` : 'Share'}>
                {sharing && (
                    <ShareDialog
                        invoice={sharing}
                        onShare={() => shareInvoice(sharing.id!)}
                        onRevoke={async () => { await revokeShare(sharing.id!); toast('Link turned off', 'success'); }}
                        onStopRepeating={sharing.recurrence ? async () => {
                            await updateInvoice({ id: sharing.id!, recurrence: '', next_issue_date: '' });
                            setSharing({ ...sharing, recurrence: '', next_issue_date: '' });
                            toast('This invoice no longer repeats', 'success');
                        } : undefined}
                    />
                )}
            </Modal>

            <Modal isOpen={isFormOpen} onClose={closeForm} title={editingInvoice ? `Edit Invoice ${editingInvoice.invoice_number}` : 'Create New Invoice'} maxWidthClass="max-w-3xl">
                <InvoiceForm key={editingInvoice?.id || 'new'} onClose={closeForm} initialData={editingInvoice} />
            </Modal>

            <Modal
                isOpen={!!previewInvoice}
                onClose={() => setPreviewInvoice(undefined)}
                title={previewInvoice ? `Invoice ${previewInvoice.invoice_number}` : 'Invoice Preview'}
                maxWidthClass="max-w-4xl"
            >
                <div className="space-y-4">
                    <div className="border border-border bg-surface" style={{ height: '70vh' }}>
                        {previewUrl ? (
                            <iframe src={previewUrl} title="Invoice PDF preview" className="w-full h-full" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <p className="text-2xl font-display text-content animate-pulse">Rendering preview...</p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-3">
                        <Button variant="ghost" onClick={() => setPreviewInvoice(undefined)}>Close</Button>
                        {previewInvoice && (
                            <Button variant="secondary" onClick={() => { const inv = previewInvoice; setPreviewInvoice(undefined); openEdit(inv); }}>
                                <Icon name="edit" className="w-4 h-4 mr-2" /> Edit
                            </Button>
                        )}
                        <Button variant="primary" onClick={() => previewInvoice && handleDownloadPDF(previewInvoice)} disabled={!previewUrl}>
                            <Icon name="download" className="w-4 h-4 mr-2" /> Download PDF
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const ShareDialog: React.FC<{
    invoice: Invoice;
    onShare: () => Promise<InvoiceShare>;
    onRevoke: () => Promise<void>;
    onStopRepeating?: () => Promise<void>;
}> = ({ invoice, onShare, onRevoke, onStopRepeating }) => {
    const { data } = useData();
    const { toast, confirm } = useToast();
    const share = data.invoiceShares.find(s => s.invoice_id === invoice.id);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const client = data.contacts.find(c => c.id === invoice.client_id);
    const url = share ? shareUrl(share) : '';

    const create = async () => {
        setBusy(true);
        try { await onShare(); } catch (e) { console.error(e); toast('Could not create the link. Is the server up to date (v1.2 migrations)?', 'error'); }
        finally { setBusy(false); }
    };
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast('Copy failed. Select the link and copy it manually.', 'error');
        }
    };
    const revoke = async () => {
        if (!await confirm({ title: 'Turn off link', message: 'Anyone with the current link will no longer be able to open this invoice.', danger: true, confirmLabel: 'Turn off' })) return;
        setBusy(true);
        try { await onRevoke(); } finally { setBusy(false); }
    };

    return (
        <div className="space-y-5">
            <p className="text-sm text-muted">
                A private link your client can open without an account: they see the invoice and can download the PDF.
                It updates automatically when you edit the invoice.
            </p>
            {share ? (
                <>
                    <div className="flex gap-2">
                        <input readOnly value={url} aria-label="Shareable URL" onFocus={e => e.target.select()} className="flex-1 min-w-0 p-2.5 bg-surface border border-border text-sm font-mono" />
                        <Button onClick={copy}><Icon name={copied ? 'check' : 'copy'} className="w-4 h-4 mr-2" />{copied ? 'Copied' : 'Copy'}</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-semibold border border-border px-3 py-1.5 hover:border-charcoal">
                            <Icon name="external-link" className="w-4 h-4 mr-1.5" />Open
                        </a>
                        {client?.email && (
                            <a
                                href={`mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(`Invoice ${invoice.invoice_number}`)}&body=${encodeURIComponent(`Hi ${client.name.split(' ')[0]},\n\nYou can view and download invoice ${invoice.invoice_number} here:\n${url}\n\nThank you!`)}`}
                                className="inline-flex items-center text-sm font-semibold border border-border px-3 py-1.5 hover:border-charcoal"
                            >
                                <Icon name="mail" className="w-4 h-4 mr-1.5" />Email link
                            </a>
                        )}
                        <Button variant="danger" className="text-sm py-1.5 ml-auto" onClick={revoke} disabled={busy}>Turn off link</Button>
                    </div>
                </>
            ) : (
                <Button onClick={create} disabled={busy}><Icon name="globe" className="w-4 h-4 mr-2" />{busy ? 'Creating...' : 'Create share link'}</Button>
            )}
            {onStopRepeating && (
                <div className="border-t border-border pt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-muted">Repeats {invoice.recurrence}{invoice.next_issue_date ? `, next on ${formatDateOnly(invoice.next_issue_date)}` : ''}.</p>
                    <Button variant="secondary" className="text-sm py-1.5" onClick={onStopRepeating}>Stop repeating</Button>
                </div>
            )}
        </div>
    );
};

export default Invoices;
