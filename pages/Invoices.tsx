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

        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', 20, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Number: ${invoice.invoice_number}`, 20, 35);
        doc.text(`Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, 20, 42);
        doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, 49);
        doc.text(`Status: ${invoice.status}`, 20, 56);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', 120, 35);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(clientName, 120, 42);

        const tableData = invoice.line_items.map(item => [
            item.description,
            item.quantity.toString(),
            `$${item.rate.toFixed(2)}`,
            `$${(item.quantity * item.rate).toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['Description', 'Qty', 'Rate', 'Amount']],
            body: tableData,
            foot: [['', '', 'Subtotal:', `$${invoice.line_items.reduce((s, i) => s + i.quantity * i.rate, 0).toFixed(2)}`]],
            theme: 'striped',
            headStyles: { fillColor: [0, 0, 0] },
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 120;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total: $${total.toFixed(2)}`, 140, finalY + 15);

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
