import React, { useState, useEffect } from 'react';
import { Button, Icon, Modal, Input } from './ui';
import { Invoice, InvoiceStatus, Contact } from '../types';
import { useData } from '../dataStore';
import { useToast } from '../src/context/ToastContext';
import { ContactForm } from './ContactForm';
import { addDays } from 'date-fns';

export const InvoiceForm: React.FC<{ onClose: () => void; initialData?: Invoice }> = ({ onClose, initialData }) => {
    const { data, addInvoice, updateInvoice, addRecentActivity } = useData();
    const { toast } = useToast();
    const [clientId, setClientId] = useState(initialData?.client_id || '');
    const [issueDate, setIssueDate] = useState(initialData?.issue_date ? new Date(initialData.issue_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(initialData?.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : addDays(new Date(), 30).toISOString().split('T')[0]);

    const firstItem = initialData?.line_items[0];
    const [description, setDescription] = useState(firstItem?.description || 'Consulting Services');
    const [rate, setRate] = useState(firstItem?.rate.toString() || '100');
    const [quantity, setQuantity] = useState(firstItem?.quantity.toString() || '1');

    const [loading, setLoading] = useState(false);
    const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

    useEffect(() => {
        if (data.contacts.length > 0 && !clientId && !initialData) {
            setClientId(data.contacts[0].id!);
        }
    }, [data.contacts, clientId, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) {
            toast('Please select a client.', 'error');
            return;
        }
        setLoading(true);

        try {
            const lineItems = [{
                id: initialData?.line_items[0]?.id || `li${Date.now()}`,
                description,
                quantity: parseFloat(quantity),
                rate: parseFloat(rate)
            }];

            if (initialData) {
                const updatedInvoice: Invoice = {
                    ...initialData,
                    client_id: clientId,
                    issue_date: new Date(issueDate).toISOString(),
                    due_date: new Date(dueDate).toISOString(),
                    line_items: lineItems,
                };
                await updateInvoice(updatedInvoice);
                try {
                    await addRecentActivity({
                        timestamp: new Date().toISOString(),
                        type: 'INVOICE_UPDATED',
                        description: `Updated invoice ${updatedInvoice.invoice_number}`
                    });
                } catch (logError) {
                    console.error("Failed to log activity:", logError);
                }
            } else {
                const lastInvoiceNumber = data.invoices.reduce((max, inv) => {
                    const num = parseInt(inv.invoice_number.split('-')[1]);
                    return num > max ? num : max;
                }, 0);

                const newInvoice: Omit<Invoice, 'id' | 'user_id' | 'created_at'> = {
                    invoice_number: `${new Date().getFullYear()}-${String(lastInvoiceNumber + 1).padStart(3, '0')}`,
                    client_id: clientId,
                    issue_date: new Date(issueDate).toISOString(),
                    due_date: new Date(dueDate).toISOString(),
                    line_items: lineItems,
                    tax_rate: 0,
                    status: InvoiceStatus.Draft,
                };

                await addInvoice(newInvoice);
                const clientName = data.contacts.find(c => c.id === clientId)?.name || 'Unknown';

                try {
                    await addRecentActivity({
                        timestamp: new Date().toISOString(),
                        type: 'INVOICE_CREATED',
                        description: `Created new invoice ${newInvoice.invoice_number} for ${clientName}`
                    });
                } catch (logError) {
                    console.error("Failed to log activity:", logError);
                }
            }

            toast('Invoice saved', 'success');
            onClose();
        } catch (error) {
            console.error("Failed to save invoice:", error);
            toast('An error occurred while saving the invoice.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClientAdded = (newContact: Contact) => {
        setClientId(newContact.id!);
        setIsAddClientModalOpen(false);
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="client" className="block text-sm font-semibold text-charcoal mb-1.5">Client</label>
                    <div className="flex space-x-2">
                        <div className="flex-grow">
                            <select
                                id="client"
                                value={clientId}
                                onChange={e => setClientId(e.target.value)}
                                required
                                className="w-full p-2.5 bg-canvas text-charcoal rounded-none border border-border focus:outline-none focus:border-content focus:border-2 appearance-none bg-no-repeat bg-right pr-8 transition-colors"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23141C11' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}
                            >
                                <option value="" disabled>Select a Client</option>
                                {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <Button type="button" variant="secondary" onClick={() => setIsAddClientModalOpen(true)} title="Add New Client">
                            <Icon name="plus" className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Issue Date" id="issueDate" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
                    <Input label="Due Date" id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                </div>

                <div className="border-t border-border pt-4 mt-2">
                    <h4 className="text-sm font-semibold text-charcoal mb-3">Line Item</h4>
                    <Input label="Description" id="description" value={description} onChange={e => setDescription(e.target.value)} required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        <Input label="Quantity" id="quantity" type="number" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                        <Input label="Rate ($)" id="rate" type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} required />
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : (initialData ? 'Update Invoice' : 'Create Invoice')}</Button>
                </div>
            </form>

            <Modal isOpen={isAddClientModalOpen} onClose={() => setIsAddClientModalOpen(false)} title="Add New Client">
                <ContactForm onClose={() => setIsAddClientModalOpen(false)} onSuccess={handleClientAdded} />
            </Modal>
        </>
    );
};
