import React, { useState } from 'react';
import { Button, Icon, Modal, Input, PageHeader, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { Invoice, InvoiceStatus } from '../types';
import { useData } from '../dataStore';
import { InvoiceForm } from '../components/InvoiceForm';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const Invoices: React.FC = () => {
    const { data, updateInvoice, deleteInvoice, addRecentActivity } = useData();
    const { invoices, contacts } = data;
    const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [downloading, setDownloading] = useState(false);

    const getClientName = (clientId: string) => contacts.find(c => c.id === clientId)?.name || 'Unknown Client';

    const getInvoiceTotal = (invoice: Invoice) => {
        const subtotal = invoice.line_items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
        return subtotal * (1 + invoice.tax_rate / 100);
    };

    const generatePDF = (invoice: Invoice): jsPDF => {
        const doc = new jsPDF();
        const clientName = getClientName(invoice.client_id);
        const total = getInvoiceTotal(invoice);
        const subtotal = invoice.line_items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const rightMargin = pageWidth - margin;

        // Monochrome BareStack palette
        const black: [number, number, number] = [20, 28, 17];
        const darkGray: [number, number, number] = [60, 60, 60];
        const midGray: [number, number, number] = [107, 107, 107];
        const lightGray: [number, number, number] = [200, 200, 200];
        const white: [number, number, number] = [255, 255, 255];
        const canvas: [number, number, number] = [250, 249, 245];

        // Background
        doc.setFillColor(...canvas);
        doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

        // Header - simple text only
        doc.setTextColor(...black);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('BareStack', margin, 25);

        doc.setFontSize(9);
        doc.setTextColor(...midGray);
        doc.text('INVOICE', rightMargin, 25, { align: 'right' });

        // Invoice meta
        doc.setTextColor(...darkGray);
        doc.setFontSize(9);
        const metaY = 40;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...black);
        doc.text('Bill To:', margin, metaY);
        doc.setFont('helvetica', 'normal');
        doc.text(clientName, margin, metaY + 6);

        const rightCol = 140;
        doc.setTextColor(...midGray);
        doc.text('Invoice Number', rightCol, metaY);
        doc.text('Invoice Date', rightCol, metaY + 6);
        doc.text('Due Date', rightCol, metaY + 12);

        doc.setTextColor(...darkGray);
        doc.text(invoice.invoice_number, rightMargin, metaY, { align: 'right' });
        doc.text(new Date(invoice.issue_date).toLocaleDateString(), rightMargin, metaY + 6, { align: 'right' });
        doc.text(new Date(invoice.due_date).toLocaleDateString(), rightMargin, metaY + 12, { align: 'right' });

        // Thin line
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.3);
        doc.line(margin, metaY + 20, rightMargin, metaY + 20);

        // Status
        doc.setFontSize(8);
        doc.setTextColor(...midGray);
        doc.text(`Status: ${invoice.status}`, margin, metaY + 28);

        // Line items table
        const tableY = metaY + 38;
        const tableData = invoice.line_items.map(item => [
            item.description,
            item.quantity.toString(),
            `$${item.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            `$${(item.quantity * item.rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: tableY,
            head: [['Description', 'Qty', 'Rate', 'Amount']],
            body: tableData,
            theme: 'plain',
            headStyles: {
                fillColor: black,
                textColor: white,
                fontStyle: 'bold',
                fontSize: 8,
                cellPadding: 4,
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 4,
                textColor: darkGray,
            },
            alternateRowStyles: {
                fillColor: [248, 248, 248],
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'center', cellWidth: 25 },
                2: { halign: 'right', cellWidth: 35 },
                3: { halign: 'right', cellWidth: 35 },
            },
            margin: { left: margin, right: margin },
        });

        // Totals
        const finalY = (doc as any).lastAutoTable?.finalY || tableY + 40;
        const totalsX = 140;
        const totalsRightX = rightMargin;

        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.3);
        doc.line(totalsX, finalY + 5, totalsRightX, finalY + 5);

        doc.setFontSize(9);
        doc.setTextColor(...midGray);
        doc.text('Subtotal', totalsX, finalY + 14);
        if (invoice.tax_rate > 0) {
            doc.text(`Tax (${invoice.tax_rate}%)`, totalsX, finalY + 22);
        }

        doc.setTextColor(...darkGray);
        doc.text(`$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, totalsRightX, finalY + 14, { align: 'right' });
        if (invoice.tax_rate > 0) {
            const taxAmount = subtotal * (invoice.tax_rate / 100);
            doc.text(`$${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, totalsRightX, finalY + 22, { align: 'right' });
        }

        doc.setDrawColor(...black);
        doc.setLineWidth(0.5);
        doc.line(totalsX, finalY + 30, totalsRightX, finalY + 30);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...black);
        doc.text('Total', totalsX, finalY + 38);
        doc.text(`$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, totalsRightX, finalY + 38, { align: 'right' });

        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...midGray);
        doc.text('Payment due within 30 days', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

        return doc;
    };

    const handleDownloadPDF = (invoice: Invoice) => {
        const doc = generatePDF(invoice);
        const clientName = getClientName(invoice.client_id).replace(/\s+/g, '_');
        doc.save(`Invoice_${invoice.invoice_number}_${clientName}.pdf`);
    };

    const handleDownloadSelected = async () => {
        if (selectedIds.size === 0) return;
        setDownloading(true);

        const selectedInvoices = invoices.filter(inv => selectedIds.has(inv.id!));

        for (const invoice of selectedInvoices) {
            const doc = generatePDF(invoice);
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
        </div>
    );
};

export default Invoices;
