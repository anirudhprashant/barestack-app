import React, { useState } from 'react';
import { Button, Icon, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, PageHeader, Modal } from '../components/ui';
import { Invoice, InvoiceStatus } from '../types';
import { useData } from '../dataStore';
import { InvoiceForm } from '../components/InvoiceForm';

const Invoices: React.FC = () => {
    const { data, deleteInvoice, addRecentActivity } = useData();
    const { invoices, contacts } = data;
    const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined);

    const getClientName = (clientId: string) => contacts.find(c => c.id === clientId)?.name || 'Unknown Client';

    const getInvoiceTotal = (invoice: Invoice) => {
        const subtotal = invoice.line_items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
        return subtotal * (1 + invoice.tax_rate / 100);
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

    const statusClasses: Record<InvoiceStatus, string> = {
        [InvoiceStatus.Draft]: 'bg-gray-100 text-gray-700',
        [InvoiceStatus.Sent]: 'bg-blue-50 text-blue-700',
        [InvoiceStatus.Paid]: 'bg-green-50 text-green-700',
        [InvoiceStatus.Overdue]: 'bg-red-50 text-red-700',
    };

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader title="Invoices">
                <Button variant="primary" onClick={() => setIsAddInvoiceModalOpen(true)}>
                    <Icon name="plus" className="w-4 h-4 mr-2" /> Create Invoice
                </Button>
            </PageHeader>

            {invoices.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
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
                                <TableRow key={invoice.id}>
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
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[invoice.status]}`}>
                                            {invoice.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
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
                    <Button variant="primary" onClick={() => setIsAddInvoiceModalOpen(true)}>
                        <Icon name="plus" className="w-4 h-4 mr-2" /> Create Invoice
                    </Button>
                </div>
            )}

            <Modal isOpen={isAddInvoiceModalOpen} onClose={handleCloseModal} title={editingInvoice ? "Edit Invoice" : "Create New Invoice"}>
                <InvoiceForm onClose={handleCloseModal} initialData={editingInvoice} />
            </Modal>
        </div>
    );
};

export default Invoices;
