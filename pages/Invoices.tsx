
import React, { useState } from 'react';
import { Card, PageHeader, Button, Icon, Input, Modal } from '../components/ui';
import { InvoiceStatus } from '../types';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';

interface Invoice {
    _id: Id<"invoices">;
    invoiceNumber: string;
    clientId: Id<"contacts">;
    issueDate: string;
    dueDate: string;
    taxRate: number;
    totalAmount: number;
    status: "Draft" | "Sent" | "Paid" | "Overdue";
    paidDate?: string;
    paymentMethod?: string;
}

interface LineItem {
    _id: Id<"lineItems">;
    invoiceId: Id<"invoices">;
    description: string;
    quantity: number;
    rate: number;
}

interface LineItemForm {
    description: string;
    quantity: number;
    rate: number;
}

const Invoices: React.FC = () => {
    const contacts = useQuery(api.crm.listContacts) || [];
    const invoices = useQuery(api.invoices.listInvoices) || [];
    const createInvoice = useMutation(api.invoices.createInvoice);
    const updateInvoice = useMutation(api.invoices.updateInvoice);
    const deleteInvoice = useMutation(api.invoices.deleteInvoice);

    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [invoiceForm, setInvoiceForm] = useState({
        invoiceNumber: '',
        clientId: '',
        issueDate: new Date().toISOString().substring(0, 10),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        taxRate: 0.1,
    });
    const [lineItems, setLineItems] = useState<LineItemForm[]>([{ description: '', quantity: 1, rate: 0 }]);

    const handleAddInvoice = () => {
        if (contacts.length === 0) {
            alert("Please add a contact first.");
            return;
        }
        setEditingInvoice(null);
        const nextInvoiceNumber = `INV-${String(invoices.length + 1).padStart(4, '0')}`;
        setInvoiceForm({
            invoiceNumber: nextInvoiceNumber,
            clientId: String(contacts[0]._id),
            issueDate: new Date().toISOString().substring(0, 10),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
            taxRate: 0.1,
        });
        setLineItems([{ description: '', quantity: 1, rate: 0 }]);
        setShowInvoiceModal(true);
    };

    const handleDeleteInvoice = async (id: Id<"invoices">) => {
        if (window.confirm("Are you sure you want to delete this invoice?")) {
            await deleteInvoice({ id });
        }
    };

    const handleUpdateStatus = async (id: Id<"invoices">, status: "Draft" | "Sent" | "Paid" | "Overdue") => {
        await updateInvoice({
            id,
            status,
            paidDate: status === "Paid" ? new Date().toISOString() : undefined,
        });
    };

    const saveInvoice = async () => {
        if (contacts.length === 0) return;
        const clientId = (invoiceForm.clientId || String(contacts[0]._id)) as Id<"contacts">;
        const validLineItems = lineItems.filter(li => li.description.trim() && li.quantity > 0 && li.rate > 0);
        if (validLineItems.length === 0) {
            alert("Please add at least one valid line item.");
            return;
        }

        await createInvoice({
            invoiceNumber: invoiceForm.invoiceNumber,
            clientId,
            issueDate: new Date(invoiceForm.issueDate).toISOString(),
            dueDate: new Date(invoiceForm.dueDate).toISOString(),
            taxRate: invoiceForm.taxRate,
            status: "Draft",
            lineItems: validLineItems,
        });

        setShowInvoiceModal(false);
        setLineItems([{ description: '', quantity: 1, rate: 0 }]);
    };

    const addLineItem = () => {
        setLineItems([...lineItems, { description: '', quantity: 1, rate: 0 }]);
    };

    const removeLineItem = (index: number) => {
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const updateLineItem = (index: number, field: keyof LineItemForm, value: string | number) => {
        const updated = [...lineItems];
        updated[index] = { ...updated[index], [field]: value };
        setLineItems(updated);
    };

    const calculateSubtotal = () => {
        return lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        return subtotal + (subtotal * invoiceForm.taxRate);
    };

    const getClientName = (clientId: Id<"contacts">) => {
        return contacts.find(c => c._id === clientId)?.name || 'Unknown Client';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Draft": return "bg-gray-300";
            case "Sent": return "bg-blue-300";
            case "Paid": return "bg-green-300";
            case "Overdue": return "bg-red-300";
            default: return "bg-gray-300";
        }
    };

    return (
        <div>
            <PageHeader>
                <Button variant="primary" onClick={handleAddInvoice}><Icon name="plus"/> Create Invoice</Button>
            </PageHeader>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-brand-dark">
                                <th className="p-4 font-black">Invoice #</th>
                                <th className="p-4 font-black">Client</th>
                                <th className="p-4 font-black">Date</th>
                                <th className="p-4 font-black">Amount</th>
                                <th className="p-4 font-black">Status</th>
                                <th className="p-4 font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map(invoice => (
                                <tr key={invoice._id} className="border-b-2 border-brand-light last:border-b-0">
                                    <td className="p-4 font-bold">{invoice.invoiceNumber}</td>
                                    <td className="p-4">{getClientName(invoice.clientId)}</td>
                                    <td className="p-4">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                                    <td className="p-4 font-bold">${invoice.totalAmount.toFixed(2)}</td>
                                    <td className="p-4">
                                        <select 
                                            value={invoice.status} 
                                            onChange={(e) => handleUpdateStatus(invoice._id, e.target.value as any)}
                                            className={`px-2 py-1 text-xs font-bold rounded-full border-2 border-brand-dark text-brand-dark ${getStatusColor(invoice.status)}`}
                                        >
                                            <option value="Draft">Draft</option>
                                            <option value="Sent">Sent</option>
                                            <option value="Paid">Paid</option>
                                            <option value="Overdue">Overdue</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none" onClick={() => handleDeleteInvoice(invoice._id)}>
                                            <Icon name="trash"/>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No invoices yet. Click "Create Invoice" to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showInvoiceModal && (
                <Modal title="Create Invoice" onClose={() => setShowInvoiceModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
                            <Button onClick={saveInvoice}>Create Invoice</Button>
                        </>
                    }
                >
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Invoice Number" 
                            id="invoice-number" 
                            value={invoiceForm.invoiceNumber} 
                            onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} 
                        />
                        <div>
                            <label className="block text-brand-dark font-bold mb-2">Client</label>
                            <select 
                                className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" 
                                value={invoiceForm.clientId} 
                                onChange={e => setInvoiceForm({ ...invoiceForm, clientId: e.target.value })}
                            >
                                {contacts.map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-brand-dark font-bold mb-2">Issue Date</label>
                            <input 
                                type="date" 
                                className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" 
                                value={invoiceForm.issueDate} 
                                onChange={e => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })} 
                            />
                        </div>
                        <div>
                            <label className="block text-brand-dark font-bold mb-2">Due Date</label>
                            <input 
                                type="date" 
                                className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" 
                                value={invoiceForm.dueDate} 
                                onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} 
                            />
                        </div>
                    </div>

                    <Input 
                        label="Tax Rate" 
                        id="tax-rate" 
                        type="number" 
                        step="0.01"
                        value={String(invoiceForm.taxRate)} 
                        onChange={e => setInvoiceForm({ ...invoiceForm, taxRate: parseFloat(e.target.value || '0') })} 
                    />

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-brand-dark font-bold">Line Items</label>
                            <Button variant="secondary" onClick={addLineItem} className="!py-1 !px-2 text-sm">
                                <Icon name="plus" className="w-4 h-4"/> Add Line
                            </Button>
                        </div>
                        {lineItems.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                                <input 
                                    type="text" 
                                    placeholder="Description" 
                                    className="col-span-6 p-2 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark text-sm" 
                                    value={item.description}
                                    onChange={e => updateLineItem(index, 'description', e.target.value)}
                                />
                                <input 
                                    type="number" 
                                    placeholder="Qty" 
                                    className="col-span-2 p-2 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark text-sm" 
                                    value={item.quantity}
                                    onChange={e => updateLineItem(index, 'quantity', parseInt(e.target.value || '1'))}
                                />
                                <input 
                                    type="number" 
                                    placeholder="Rate" 
                                    className="col-span-3 p-2 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark text-sm" 
                                    value={item.rate}
                                    onChange={e => updateLineItem(index, 'rate', parseFloat(e.target.value || '0'))}
                                />
                                <button 
                                    onClick={() => removeLineItem(index)} 
                                    className="col-span-1 p-2 text-brand-dark hover:bg-brand-light rounded"
                                    disabled={lineItems.length === 1}
                                >
                                    <Icon name="trash" className="w-4 h-4"/>
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="border-t-2 border-brand-dark pt-4 mt-4">
                        <div className="flex justify-between mb-2">
                            <span className="font-bold">Subtotal:</span>
                            <span>${calculateSubtotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="font-bold">Tax ({(invoiceForm.taxRate * 100).toFixed(0)}%):</span>
                            <span>${(calculateSubtotal() * invoiceForm.taxRate).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-black">
                            <span>Total:</span>
                            <span>${calculateTotal().toFixed(2)}</span>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Invoices;
