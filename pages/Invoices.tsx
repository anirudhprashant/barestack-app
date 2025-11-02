
import { useState, useEffect } from 'react';
import { Card, PageHeader, Button, Icon } from '../components/ui';
import { Invoice, InvoiceStatus, Contact } from '../types';
import api from '../services/api';
import { addDays } from 'date-fns';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const fetchData = async () => {
    try {
      const invoicesData = await api.get('/invoices');
      setInvoices(invoicesData);
      const contactsData = await api.get('/contacts');
      setContacts(contactsData);
    } catch (error) {
      console.error('Failed to fetch invoices data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInvoice = async () => {
    if (contacts.length === 0) {
      alert('Please create a contact first to assign an invoice.');
      return;
    }
    const randomContact = contacts[Math.floor(Math.random() * contacts.length)];
    const lastInvoiceNumber = invoices.reduce((max, inv) => {
      const num = parseInt(inv.invoiceNumber.split('-')[1]);
      return num > max ? num : max;
    }, 0);

    const newInvoice = {
      invoice_number: `2024-${String(lastInvoiceNumber + 1).padStart(3, '0')}`,
      contact_id: randomContact.id,
      issue_date: new Date().toISOString(),
      due_date: addDays(new Date(), 30).toISOString(),
      items: [{ description: 'Sample Service', quantity: 10, rate: 100, amount: 1000 }],
      total: 1100,
      status: InvoiceStatus.Draft,
    };

    try {
      await api.post('/invoices', newInvoice);
      fetchData();
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  const getClientName = (clientId: string) => contacts.find(c => c.id === clientId)?.name || 'Unknown Client';

  const statusColors: Record<InvoiceStatus, string> = {
    [InvoiceStatus.Draft]: 'bg-gray-300',
    [InvoiceStatus.Sent]: 'bg-blue-300',
    [InvoiceStatus.Paid]: 'bg-green-300',
    [InvoiceStatus.Overdue]: 'bg-red-300',
  };

  return (
    <div>
      <PageHeader title="Invoices">
        <Button variant="primary" onClick={handleCreateInvoice}><Icon name="plus" /> Create Invoice</Button>
      </PageHeader>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-brand-dark">
                <th className="p-4 font-black">Number</th>
                <th className="p-4 font-black">Client</th>
                <th className="p-4 font-black">Issue Date</th>
                <th className="p-4 font-black">Due Date</th>
                <th className="p-4 font-black">Total</th>
                <th className="p-4 font-black">Status</th>
                <th className="p-4 font-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id} className="border-b-2 border-brand-light last:border-b-0">
                  <td className="p-4 font-bold">{invoice.invoiceNumber}</td>
                  <td className="p-4">{getClientName(invoice.clientId)}</td>
                  <td className="p-4">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                  <td className="p-4">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                  <td className="p-4 font-bold">${invoice.total.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full border-2 border-brand-dark text-brand-dark ${statusColors[invoice.status]}`}>{invoice.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none"><Icon name="document" /></Button>
                      <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none"><Icon name="edit" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Invoices;
