import React, { useState, useEffect } from 'react';
import { Button, Icon, Modal, PageHeader, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { Invoice, InvoiceStatus } from '../types';
import { useData } from '../dataStore';
import { InvoiceForm } from '../components/InvoiceForm';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

// Instrument Serif isn't one of jsPDF's three built-in fonts, so embed the real
// brand font (lazily, as its own chunk) and register it on each document.
let fontPromise: Promise<{ regular: string; italic: string }> | null = null;
const loadBrandFont = () => {
    if (!fontPromise) {
        fontPromise = import('../src/lib/instrumentSerifFont').then(m => ({
            regular: m.instrumentSerifRegular,
            italic: m.instrumentSerifItalic,
        }));
    }
    return fontPromise;
};

const Invoices: React.FC = () => {
    const { data, updateInvoice, deleteInvoice, addRecentActivity } = useData();
    const { invoices, contacts } = data;
    const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [downloading, setDownloading] = useState(false);
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | undefined>(undefined);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const getClientName = (clientId: string) => contacts.find(c => c.id === clientId)?.name || 'Unknown Client';

    const getInvoiceTotal = (invoice: Invoice) => {
        const subtotal = invoice.line_items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
        return subtotal * (1 + invoice.tax_rate / 100);
    };

    const generatePDF = async (invoice: Invoice): Promise<jsPDF> => {
        const doc = new jsPDF();

        // Register the embedded Instrument Serif (regular + italic).
        const font = await loadBrandFont();
        doc.addFileToVFS('InstrumentSerif-Regular.ttf', font.regular);
        doc.addFont('InstrumentSerif-Regular.ttf', 'InstrumentSerif', 'normal');
        doc.addFileToVFS('InstrumentSerif-Italic.ttf', font.italic);
        doc.addFont('InstrumentSerif-Italic.ttf', 'InstrumentSerif', 'italic');
        const serif = 'InstrumentSerif';

        const client = contacts.find(c => c.id === invoice.client_id);
        const clientName = client?.name || 'Unknown Client';
        const clientCompany = client?.company || '';
        const issuer = data.userProfile;
        const total = getInvoiceTotal(invoice);
        const subtotal = invoice.line_items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
        const taxAmount = subtotal * (invoice.tax_rate / 100);

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 18;
        const rightMargin = pageWidth - margin;

        // BareStack design-system palette (RGB)
        const canvas: [number, number, number] = [250, 249, 245];   // #FAF9F5
        const surface: [number, number, number] = [244, 242, 238];
        const content: [number, number, number] = [20, 28, 17];     // #141C11
        const forest: [number, number, number] = [25, 33, 24];      // #192118
        const accent: [number, number, number] = [195, 118, 36];    // #C37624
        const gold: [number, number, number] = [232, 184, 109];     // #E8B86D
        const mutedC: [number, number, number] = [107, 107, 107];   // #6B6B6B
        const border: [number, number, number] = [212, 209, 201];   // #D4D1C9

        const money = (n: number) =>
            `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const fmtDate = (iso: string) => {
            const d = new Date(iso);
            return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        };

        doc.setProperties({
            title: `Invoice ${invoice.invoice_number}`,
            subject: `Invoice for ${clientName}`,
            author: issuer?.name || 'BareStackOS',
            creator: 'BareStackOS',
        });

        // Cream page background
        doc.setFillColor(...canvas);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // ── Forest-green header band ───────────────────────────────
        const bandH = 46;
        doc.setFillColor(...forest);
        doc.rect(0, 0, pageWidth, bandH, 'F');
        // thin gold rule along the bottom of the band
        doc.setFillColor(...gold);
        doc.rect(0, bandH - 1.2, pageWidth, 1.2, 'F');

        doc.setFont(serif, 'normal');
        doc.setFontSize(28);
        doc.setTextColor(...canvas);
        doc.text('BareStack', margin, 26);
        // Render the "OS" suffix in the italic serif to match the app's wordmark.
        const brandWidth = doc.getTextWidth('BareStack');
        doc.setFont(serif, 'italic');
        doc.text('OS', margin + brandWidth, 26);
        doc.setFont(serif, 'normal');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...gold);
        doc.text('CRM FOR AGENCIES + FREELANCERS', margin, 33, { charSpace: 0.6 });

        doc.setFont(serif, 'normal');
        doc.setFontSize(20);
        doc.setTextColor(...canvas);
        doc.text('INVOICE', rightMargin, 24, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...gold);
        doc.text(`#${invoice.invoice_number}`, rightMargin, 33, { align: 'right' });

        // ── Meta block ─────────────────────────────────────────────
        const labelFont = () => { doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...mutedC); };

        // Left: FROM + BILLED TO
        labelFont();
        doc.text('FROM', margin, 60, { charSpace: 0.6 });
        doc.setFont(serif, 'normal');
        doc.setFontSize(12);
        doc.setTextColor(...content);
        doc.text(issuer?.name || 'BareStackOS', margin, 66);
        if (issuer?.email) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(...mutedC);
            doc.text(issuer.email, margin, 71);
        }

        labelFont();
        doc.text('BILLED TO', margin, 82, { charSpace: 0.6 });
        doc.setFont(serif, 'normal');
        doc.setFontSize(12);
        doc.setTextColor(...content);
        doc.text(clientName, margin, 88);
        if (clientCompany) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(...mutedC);
            doc.text(clientCompany, margin, 93);
        }

        // Right: invoice details (label left of value, value right-aligned)
        const detailLabelX = 128;
        const detailRow = (y: number, label: string, value: string) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(...mutedC);
            doc.text(label, detailLabelX, y, { charSpace: 0.4 });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(...content);
            doc.text(value, rightMargin, y, { align: 'right' });
        };
        detailRow(60, 'ISSUE DATE', fmtDate(invoice.issue_date));
        detailRow(67, 'DUE DATE', fmtDate(invoice.due_date));

        // Status pill (right-aligned)
        const statusStyles: Record<string, { bg: [number, number, number]; fg: [number, number, number] }> = {
            Paid: { bg: forest, fg: canvas },
            Sent: { bg: accent, fg: canvas },
            Overdue: { bg: [183, 28, 28], fg: canvas },
            Draft: { bg: surface, fg: content },
        };
        const st = statusStyles[invoice.status] || { bg: surface, fg: content };
        const statusLabel = String(invoice.status).toUpperCase();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        // Width of the glyph run including the letter-spacing between characters
        // (getTextWidth ignores charSpace), so horizontal padding stays symmetric.
        const pillCharSpace = 0.4;
        const runW = doc.getTextWidth(statusLabel) + pillCharSpace * (statusLabel.length - 1);
        const pillPadX = 5;
        const pillW = runW + pillPadX * 2;
        const pillH = 7;
        const pillY = 74;
        const pillX = rightMargin - pillW;
        doc.setFillColor(...st.bg);
        doc.rect(pillX, pillY, pillW, pillH, 'F');
        if (invoice.status === 'Draft') {
            doc.setDrawColor(...border);
            doc.setLineWidth(0.3);
            doc.rect(pillX, pillY, pillW, pillH, 'S');
        }
        doc.setTextColor(...st.fg);
        // Left-align the run from the padded start, and center vertically via the
        // text baseline so the label sits dead-center in the pill.
        doc.text(statusLabel, pillX + pillPadX, pillY + pillH / 2, { charSpace: pillCharSpace, baseline: 'middle' });

        // Divider
        doc.setDrawColor(...border);
        doc.setLineWidth(0.4);
        doc.line(margin, 100, rightMargin, 100);

        // ── Line items table ───────────────────────────────────────
        const tableData = invoice.line_items.map(item => [
            item.description,
            item.quantity.toString(),
            money(item.rate),
            money(item.quantity * item.rate),
        ]);

        autoTable(doc, {
            startY: 106,
            head: [['DESCRIPTION', 'QTY', 'RATE', 'AMOUNT']],
            body: tableData,
            theme: 'plain',
            headStyles: {
                fillColor: forest,
                textColor: canvas,
                fontStyle: 'bold',
                fontSize: 8,
                cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
            },
            bodyStyles: {
                fontSize: 9.5,
                cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
                textColor: content,
                lineColor: border,
                lineWidth: { bottom: 0.2 },
            },
            alternateRowStyles: { fillColor: surface },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'center', cellWidth: 22 },
                2: { halign: 'right', cellWidth: 32 },
                3: { halign: 'right', cellWidth: 34 },
            },
            margin: { left: margin, right: margin },
            willDrawPage: (hookData) => {
                if (hookData.pageNumber > 1) {
                    doc.setFillColor(...canvas);
                    doc.rect(0, 0, pageWidth, pageHeight, 'F');
                }
            },
        });

        // ── Totals ─────────────────────────────────────────────────
        const finalY = (doc as any).lastAutoTable?.finalY || 150;
        const labelX = 122;
        let ty = finalY + 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...mutedC);
        doc.text('Subtotal', labelX, ty);
        doc.setTextColor(...content);
        doc.text(money(subtotal), rightMargin, ty, { align: 'right' });

        if (invoice.tax_rate > 0) {
            ty += 7;
            doc.setTextColor(...mutedC);
            doc.text(`Tax (${invoice.tax_rate}%)`, labelX, ty);
            doc.setTextColor(...content);
            doc.text(money(taxAmount), rightMargin, ty, { align: 'right' });
        }

        // Total-due bar
        const barTop = ty + 4;
        const barX = 118;
        doc.setFillColor(...forest);
        doc.rect(barX, barTop, rightMargin - barX, 12, 'F');
        doc.setFont(serif, 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...canvas);
        doc.text('TOTAL DUE', barX + 4, barTop + 8, { charSpace: 0.4 });
        doc.setFontSize(13);
        doc.text(money(total), rightMargin - 4, barTop + 8, { align: 'right' });

        // ── Footer ─────────────────────────────────────────────────
        const fy = pageHeight - 24;
        doc.setDrawColor(...border);
        doc.setLineWidth(0.3);
        doc.line(margin, fy, rightMargin, fy);
        doc.setFillColor(...accent);
        doc.rect(margin, fy - 0.4, 20, 0.9, 'F');

        doc.setFont(serif, 'italic');
        doc.setFontSize(11);
        doc.setTextColor(...content);
        doc.text('Thank you for your business.', margin, fy + 9);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...mutedC);
        doc.text('Payment due within 30 days   ·   Generated with BareStackOS', rightMargin, fy + 9, { align: 'right' });

        return doc;
    };

    const handleDownloadPDF = async (invoice: Invoice) => {
        const doc = await generatePDF(invoice);
        const clientName = getClientName(invoice.client_id).replace(/\s+/g, '_');
        doc.save(`Invoice_${invoice.invoice_number}_${clientName}.pdf`);
    };

    // Build (and clean up) a blob URL for the preview modal.
    useEffect(() => {
        if (!previewInvoice) {
            setPreviewUrl(null);
            return;
        }
        let url: string | null = null;
        let cancelled = false;
        generatePDF(previewInvoice).then(doc => {
            url = doc.output('bloburl') as unknown as string;
            if (cancelled) {
                URL.revokeObjectURL(url);
            } else {
                setPreviewUrl(url);
            }
        });
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [previewInvoice]);

    const handleDownloadFromPreview = () => {
        if (previewInvoice) handleDownloadPDF(previewInvoice);
    };

    const handleDownloadSelected = async () => {
        if (selectedIds.size === 0) return;
        setDownloading(true);

        const selectedInvoices = invoices.filter(inv => selectedIds.has(inv.id!));

        for (const invoice of selectedInvoices) {
            const doc = await generatePDF(invoice);
            const clientName = getClientName(invoice.client_id).replace(/\s+/g, '_');
            const filename = `Invoice_${invoice.invoice_number}_${clientName}.pdf`;
            doc.save(filename);
            await new Promise(r => setTimeout(r, 300));
        }

        setDownloading(false);
        setSelectedIds(new Set());
    };

    const handleStatusChange = async (invoice: Invoice, newStatus: InvoiceStatus) => {
        await updateInvoice({ ...invoice, status: newStatus });
    };

    const handleEdit = (invoice: Invoice) => {
        setEditingInvoice(invoice);
        setIsAddInvoiceModalOpen(true);
    };

    const handleDelete = async (invoice: Invoice) => {
        if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) {
            await deleteInvoice(invoice.id!);
            try {
                await addRecentActivity({
                    timestamp: new Date().toISOString(),
                    type: 'INVOICE_DELETED',
                    description: `Deleted invoice ${invoice.invoice_number}`
                });
            } catch (error) {
                console.error("Failed to log activity:", error);
            }
        }
    };

    const handleCloseModal = () => {
        setIsAddInvoiceModalOpen(false);
        setEditingInvoice(undefined);
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === invoices.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(invoices.map(i => i.id!)));
    };

    const statusClasses: Record<InvoiceStatus, string> = {
        [InvoiceStatus.Draft]: 'bg-surface text-muted',
        [InvoiceStatus.Sent]: 'bg-activity-blue/10 text-activity-blue',
        [InvoiceStatus.Paid]: 'bg-activity-green/10 text-activity-green',
        [InvoiceStatus.Overdue]: 'bg-activity-red/10 text-activity-red',
    };

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader title="Invoices">
                {selectedIds.size > 0 && (
                    <Button variant="primary" onClick={handleDownloadSelected} disabled={downloading}>
                        <Icon name="download" className="w-4 h-4 mr-2" /> Download {selectedIds.size} PDF{selectedIds.size > 1 ? 's' : ''}
                    </Button>
                )}
                <Button variant="primary" onClick={() => setIsAddInvoiceModalOpen(true)}>
                    <Icon name="plus" className="w-4 h-4 mr-2" /> Create Invoice
                </Button>
            </PageHeader>

            {invoices.length > 0 ? (
                <div className="bg-canvas border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === invoices.length && invoices.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                </TableHead>
                                <TableHead>Number</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Issue Date</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map(invoice => (
                                <TableRow key={invoice.id} className={selectedIds.has(invoice.id!) ? 'bg-surface/50' : ''}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(invoice.id!)}
                                            onChange={() => toggleSelect(invoice.id!)}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-charcoal">{invoice.invoice_number}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center">
                                            <div className="w-6 h-6 bg-surface border border-border flex items-center justify-center text-xs font-bold text-muted mr-2">
                                                {getClientName(invoice.client_id).charAt(0)}
                                            </div>
                                            {getClientName(invoice.client_id)}
                                        </div>
                                    </TableCell>
                                    <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <span className="font-medium text-charcoal">${getInvoiceTotal(invoice).toLocaleString()}</span>
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            value={invoice.status}
                                            onChange={(e) => handleStatusChange(invoice, e.target.value as InvoiceStatus)}
                                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${statusClasses[invoice.status]}`}
                                        >
                                            {Object.values(InvoiceStatus).map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => setPreviewInvoice(invoice)}
                                                className="p-1.5 text-charcoal hover:bg-surface transition-colors rounded-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-charcoal"
                                                title="Preview PDF"
                                            >
                                                <Icon name="eye" className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadPDF(invoice)}
                                                className="p-1.5 text-charcoal hover:bg-surface transition-colors rounded-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-charcoal"
                                                title="Download PDF"
                                            >
                                                <Icon name="download" className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(invoice)}
                                                className="p-1.5 text-charcoal hover:bg-surface transition-colors rounded-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-charcoal"
                                                title="Edit Invoice"
                                            >
                                                <Icon name="edit" className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(invoice)}
                                                className="p-1.5 text-activity-red hover:bg-activity-red/10 transition-colors rounded-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-activity-red"
                                                title="Delete Invoice"
                                            >
                                                <Icon name="trash" className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12 bg-canvas border border-dashed border-border">
                    <div className="w-16 h-16 bg-surface flex items-center justify-center mx-auto mb-4">
                        <Icon name="receipt" className="w-8 h-8 text-muted" />
                    </div>
                    <h3 className="text-lg font-medium text-charcoal mb-1">No invoices yet</h3>
                    <p className="text-muted mb-6">Create your first invoice to get paid.</p>
                </div>
            )}

            <Modal isOpen={isAddInvoiceModalOpen} onClose={handleCloseModal} title={editingInvoice ? "Edit Invoice" : "Create New Invoice"}>
                <InvoiceForm onClose={handleCloseModal} initialData={editingInvoice} />
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
                            <iframe
                                src={previewUrl}
                                title="Invoice PDF preview"
                                className="w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <p className="text-2xl font-display text-content animate-pulse">Rendering preview...</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setPreviewInvoice(undefined)}>Close</Button>
                        <Button variant="primary" onClick={handleDownloadFromPreview} disabled={!previewUrl}>
                            <Icon name="download" className="w-4 h-4 mr-2" /> Download PDF
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Invoices;
