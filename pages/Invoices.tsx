import React, { useState } from 'react';
import { Button, Icon, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, PageHeader, Modal } from '../components/ui';
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

        // Colors
        const brandDark = [15, 23, 42] as [number, number, number];
        const brandLight = [248, 250, 252] as [number, number, number];
        const accent = [37, 99, 235] as [number, number, number];
        const textDark = [15, 23, 42] as [number, number, number];
        const textMuted = [100, 116, 139] as [number, number, number];

        // Header bar
        doc.setFillColor(...brandDark);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Brand name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text('BareStack', 20, 22);

        // Invoice label
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('INVOICE', pageWidth - 20, 22, { align: 'right' });

        // Invoice number next to brand
        doc.setFontSize(11);
        doc.setTextColor(...brandLight);
        doc.text(invoice.invoice_number, 20, 35);

        // Status badge
        const statusColors: Record<string, [number, number, number]> = {
            Draft: [100, 116, 139],
            Sent: [37, 99, 235],
            Paid: [34, 197, 94],
            Overdue: [239, 68, 68]
        };
        const statusColor = statusColors[invoice.status] || textMuted;
        doc.setFillColor(...statusColor);
        const statusText = invoice.status.toUpperCase();
        const statusWidth = doc.getTextWidth(statusText) + 12;
        doc.roundedRect(pageWidth - statusWidth - 20, 28, statusWidth, 10, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(statusText, pageWidth - statusWidth - 26, 35, { align: 'right' });

        // Reset text color
        doc.setTextColor(...textDark);

        // From/To section
        const sectionY = 60;

        // From
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accent);
        doc.text('FROM', 20, sectionY);
        doc.setTextColor(...textMuted);
        doc.setFont('helvetica', 'normal');
        doc.text('BareStack', 20, sectionY + 7);
        doc.setFontSize(8);
        doc.text('Your Business Address', 20, sectionY + 14);
        doc.text('contact@barestack.org', 20, sectionY + 21);

        // To
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accent);
        doc.text('BILL TO', 110, sectionY);
        doc.setTextColor(...textDark);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(clientName, 110, sectionY + 7);

        // Invoice meta on right
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textMuted);

        const metaX = 155;
        const metaRightX = pageWidth - 20;
        doc.text('Invoice Date:', metaX, sectionY);
        doc.text('Due Date:', metaX, sectionY + 10);
        doc.text('Invoice #:', metaX, sectionY + 20);

        doc.setTextColor(...textDark);
        doc.text(new Date(invoice.issue_date).toLocaleDateString(), metaRightX, sectionY, { align: 'right' });
        doc.text(new Date(invoice.due_date).toLocaleDateString(), metaRightX, sectionY + 10, { align: 'right' });
        doc.text(invoice.invoice_number, metaRightX, sectionY + 20, { align: 'right' });

        // Divider line
        doc.setDrawColor(...brandDark);
        doc.setLineWidth(0.5);
        doc.line(20, sectionY + 32, pageWidth - 20, sectionY + 32);

        // Line items table
        const tableY = sectionY + 42;
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
                fillColor: brandDark,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: 5,
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 5,
                textColor: textDark,
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251],
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'center', cellWidth: 25 },
                2: { halign: 'right', cellWidth: 35 },
                3: { halign: 'right', cellWidth: 35 },
            },
            margin: { left: 20, right: 20 },
        });

        // Totals section
        const finalY = (doc as any).lastAutoTable?.finalY || tableY + 50;
        const totalsX = 120;
        const totalsRightX = pageWidth - 20;

        doc.setFillColor(...brandLight);
        doc.rect(totalsX, finalY + 5, totalsRightX - totalsX, 35, 'F');

        doc.setFontSize(9);
        doc.setTextColor(...textMuted);
        doc.text('Subtotal:', totalsX + 5, finalY + 17);
        if (invoice.tax_rate > 0) {
            doc.text(`Tax (${invoice.tax_rate}%):`, totalsX + 5, finalY + 25);
        }

        doc.setTextColor(...textDark);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, totalsRightX - 5, finalY + 17, { align: 'right' });
        if (invoice.tax_rate > 0) {
            const taxAmount = subtotal * (invoice.tax_rate / 100);
            doc.text(`$${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, totalsRightX - 5, finalY + 25, { align: 'right' });
        }

        // Total line
        doc.setDrawColor(...brandDark);
        doc.setLineWidth(1);
        doc.line(totalsX + 5, finalY + 30, totalsRightX - 5, finalY + 30);

        doc.setFontSize(11);
        doc.setTextColor(...brandDark);
        doc.text('TOTAL:', totalsX + 5, finalY + 38);
        doc.setFontSize(14);
        doc.text(`$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, totalsRightX - 5, finalY + 38, { align: 'right' });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(...textMuted);
        doc.setFont('helvetica', 'normal');
        const footerY = doc.internal.pageSize.getHeight() - 15;
        doc.text('Thank you for your business. Payment is due within 30 days.', pageWidth / 2, footerY, { align: 'center' });
        doc.text('BareStack CRM • contact@barestack.org', pageWidth / 2, footerY + 6, { align: 'center' });

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
        [InvoiceStatus.Draft]: 'bg-gray-100 text-gray-700',
        [InvoiceStatus.Sent]: 'bg-blue-50 text-blue-700',
        [InvoiceStatus.Paid]: 'bg-green-50 text-green-700',
        [InvoiceStatus.Overdue]: 'bg-red-50 text-red-700',
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                                <TableRow key={invoice.id} className={selectedIds.has(invoice.id!) ? 'bg-brand-light/30' : ''}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(invoice.id!)}
                                            onChange={() => toggleSelect(invoice.id!)}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 mr-2">
                                                {getClientName(invoice.client_id).charAt(0)}
                                            </div>
                                            {getClientName(invoice.client_id)}
                                        </div>
                                    </TableCell>
                                    <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <span className="font-medium text-gray-900">${getInvoiceTotal(invoice).toLocaleString()}</span>
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
                                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                                title="Download PDF"
                                            >
                                                <Icon name="download" className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(invoice)}
                                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                                title="Edit Invoice"
                                            >
                                                <Icon name="edit" className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(invoice)}
                                                className="text-gray-400 hover:text-red-600 transition-colors"
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
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="receipt" className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No invoices yet</h3>
                    <p className="text-gray-500 mb-6">Create your first invoice to get paid.</p>
                </div>
            )}

            <Modal isOpen={isAddInvoiceModalOpen} onClose={handleCloseModal} title={editingInvoice ? "Edit Invoice" : "Create New Invoice"}>
                <InvoiceForm onClose={handleCloseModal} initialData={editingInvoice} />
            </Modal>
        </div>
    );
};

export default Invoices;
