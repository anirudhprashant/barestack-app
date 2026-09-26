import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicShare } from '../src/lib/api';
import { InvoiceShareSnapshot, InvoiceStatus, Invoice, Contact } from '../types';
import { formatMoney } from '../src/lib/format';
import { formatDateOnly } from '../src/lib/dates';
import { invoiceSubtotal, invoiceTax, invoiceTotal, lineItemAmount } from '../src/lib/invoice';
import { Icon } from '../components/ui';

// Public, read-only invoice view: /share/<id>#<token>. No account needed. The
// token lives in the URL fragment so it never reaches server logs.
const SharedInvoice: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [snap, setSnap] = useState<InvoiceShareSnapshot | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const token = window.location.hash.replace(/^#/, '');
        if (!id || !token) {
            setError('This link is incomplete. Ask the sender for a new one.');
            return;
        }
        fetchPublicShare(id, token)
            .then(rec => {
                setSnap((rec as unknown as { snapshot: InvoiceShareSnapshot }).snapshot);
                document.title = `Invoice ${(rec as unknown as { snapshot: InvoiceShareSnapshot }).snapshot.invoice.invoice_number}`;
            })
            .catch(() => setError('This invoice link is invalid or has been turned off.'));
    }, [id]);

    // A pasted link that only differs in the #token doesn't reload the page.
    useEffect(() => {
        const onHash = () => window.location.reload();
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const download = async () => {
        if (!snap) return;
        setDownloading(true);
        try {
            const { generateInvoicePdf, invoiceFileName } = await import('../src/lib/invoicePdf');
            const invoice = snap.invoice as Invoice;
            const client = snap.client as Contact;
            const doc = await generateInvoicePdf({ invoice, client, business: snap.business, user: snap.user });
            doc.save(invoiceFileName(invoice, client));
        } finally {
            setDownloading(false);
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <Icon name="alert-circle" className="w-10 h-10 mx-auto text-muted mb-4" />
                    <h1 className="text-3xl font-display text-charcoal mb-2">Link unavailable</h1>
                    <p className="text-muted">{error}</p>
                </div>
            </div>
        );
    }

    if (!snap) {
        return <div className="min-h-screen bg-canvas flex items-center justify-center font-display text-2xl text-muted animate-pulse">Loading invoice…</div>;
    }

    const { invoice, client, business, user } = snap;
    const currency = business.currency || 'USD';
    const money = (n: number) => formatMoney(n, currency);
    const paid = invoice.status === InvoiceStatus.Paid;
    const issuer = business.business_name || user.name || 'Invoice';
    const statusClass = paid ? 'bg-panel text-cream' : invoice.status === InvoiceStatus.Overdue ? 'bg-activity-red text-cream' : 'bg-accent text-cream';

    return (
        <div className="min-h-screen bg-surface py-6 sm:py-12 px-3 sm:px-6">
            <div className="max-w-3xl mx-auto">
                <div className="flex justify-end gap-2 mb-4 no-print">
                    <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold border border-border bg-canvas hover:border-charcoal">
                        <Icon name="file" className="w-4 h-4" />Print
                    </button>
                    <button onClick={download} disabled={downloading} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-charcoal text-canvas hover:bg-content disabled:opacity-60">
                        <Icon name="download" className="w-4 h-4" />{downloading ? 'Preparing…' : 'Download PDF'}
                    </button>
                </div>

                <article className="bg-canvas border border-border shadow-hard-sm">
                    <header className="bg-panel paper-grain relative text-cream px-6 sm:px-10 py-8 border-b-4 border-[#e8b86d] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-display">{issuer}</h1>
                            {business.website && <p className="text-xs uppercase tracking-[0.2em] text-[#e8b86d] mt-1">{business.website}</p>}
                        </div>
                        <div className="sm:text-right">
                            <p className="text-2xl font-display">Invoice</p>
                            <p className="text-sm font-bold text-[#e8b86d]">#{invoice.invoice_number}</p>
                        </div>
                    </header>

                    <div className="px-6 sm:px-10 py-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-6 text-sm">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-1">From</p>
                                <p className="font-display text-lg text-charcoal">{issuer}</p>
                                {business.address && <p className="text-muted whitespace-pre-line">{business.address}</p>}
                                <p className="text-muted">{business.email || user.email}</p>
                                {business.phone && <p className="text-muted">{business.phone}</p>}
                                {business.tax_id && <p className="text-muted">Tax ID: {business.tax_id}</p>}
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-1">Billed to</p>
                                <p className="font-display text-lg text-charcoal">{client.name}</p>
                                {client.company && <p className="text-muted">{client.company}</p>}
                                {client.email && <p className="text-muted">{client.email}</p>}
                            </div>
                        </div>
                        <div className="sm:text-right space-y-2 text-sm">
                            <p><span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mr-3">Issued</span>{formatDateOnly(invoice.issue_date)}</p>
                            <p><span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mr-3">Due</span>{formatDateOnly(invoice.due_date)}</p>
                            {paid && invoice.paid_date && <p><span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mr-3">Paid</span>{formatDateOnly(invoice.paid_date)}</p>}
                            <p className="pt-2"><span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest ${statusClass}`}>{invoice.status}</span></p>
                            <p className="pt-3 text-3xl font-bold tabular-nums">{money(paid ? 0 : invoiceTotal(invoice))}</p>
                            <p className="text-xs text-muted uppercase tracking-wider">{paid ? 'Nothing to pay. Thank you!' : 'Amount due'}</p>
                        </div>
                    </div>

                    <div className="px-6 sm:px-10 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-panel text-cream text-xs uppercase tracking-wider">
                                    <th className="text-left p-3 font-semibold">Description</th>
                                    <th className="text-center p-3 font-semibold w-16">Qty</th>
                                    <th className="text-right p-3 font-semibold w-28">Rate</th>
                                    <th className="text-right p-3 font-semibold w-28">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {invoice.line_items.map((li, i) => (
                                    <tr key={li.id || i} className="even:bg-surface">
                                        <td className="p-3">{li.description}</td>
                                        <td className="p-3 text-center tabular-nums">{li.quantity}</td>
                                        <td className="p-3 text-right tabular-nums">{money(li.rate)}</td>
                                        <td className="p-3 text-right tabular-nums">{money(lineItemAmount(li))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 sm:px-10 py-6 flex justify-end">
                        <div className="w-full sm:w-72 space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="tabular-nums">{money(invoiceSubtotal(invoice))}</span></div>
                            {invoice.tax_rate > 0 && <div className="flex justify-between"><span className="text-muted">Tax ({invoice.tax_rate}%)</span><span className="tabular-nums">{money(invoiceTax(invoice))}</span></div>}
                            <div className="flex justify-between bg-panel text-cream px-3 py-2.5 font-display text-lg">
                                <span>{paid ? 'Total paid' : 'Total due'}</span><span className="tabular-nums">{money(invoiceTotal(invoice))}</span>
                            </div>
                        </div>
                    </div>

                    {(invoice.notes || (!paid && business.payment_instructions)) && (
                        <div className="px-6 sm:px-10 pb-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                            {invoice.notes && (
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-1">Notes</p>
                                    <p className="whitespace-pre-line">{invoice.notes}</p>
                                </div>
                            )}
                            {!paid && business.payment_instructions && (
                                <div className="bg-surface border border-border p-4">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-1">How to pay</p>
                                    <p className="whitespace-pre-line font-medium">{business.payment_instructions}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <footer className="px-6 sm:px-10 py-5 border-t border-border flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted">
                        <span className="font-display italic text-sm text-charcoal">{business.invoice_footer || 'Thank you for your business.'}</span>
                        <span>Sent with BareStack<span className="italic">OS</span></span>
                    </footer>
                </article>
            </div>
        </div>
    );
};

export default SharedInvoice;
