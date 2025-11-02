
import { useState, useEffect } from 'react';
import { Card, PageHeader, Button, Icon, Input } from '../components/ui';
import { Contact, Deal, DealStage } from '../types';
import api from '../services/api';

const DealCard: React.FC<{ deal: Deal; contactName: string }> = ({ deal, contactName }) => {
  return (
    <div className="bg-white p-3 rounded-[10px] border-2 border-brand-dark mb-3 cursor-grab active:cursor-grabbing">
      <p className="font-bold">{contactName}</p>
      <p className="font-semibold text-green-600">${deal.value.toLocaleString()}</p>
      <p className="text-sm text-gray-500">{new Date(deal.lastInteraction).toLocaleDateString()}</p>
    </div>
  );
};

const CRM: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const contactsData = await api.get('/contacts');
      setContacts(contactsData);
      const dealsData = await api.get('/deals');
      setDeals(dealsData);
    } catch (error) {
      console.error('Failed to fetch CRM data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddContact = async () => {
    const name = prompt('Enter contact name:', 'New Client Inc.');
    if (!name) return;

    try {
      await api.post('/contacts', {
        fullName: name,
        email: `${name.toLowerCase().replace(/\s/g, '')}@example.com`,
        phone: '555-0101',
        company: name,
        notes: '',
        tags: ['New'],
      });
      fetchData();
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const handleAddDeal = async () => {
    if (contacts.length === 0) {
      alert('Please add a contact first.');
      return;
    }
    const value = prompt('Enter deal value:', '10000');
    if (!value || isNaN(parseInt(value))) return;

    const randomContact = contacts[Math.floor(Math.random() * contacts.length)];
    try {
      await api.post('/deals', {
        contact_id: randomContact.id,
        title: `Deal for ${randomContact.name}`,
        value: parseInt(value),
        stage: DealStage.Lead,
      });
      fetchData();
    } catch (error) {
      console.error('Failed to add deal:', error);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await api.delete(`/contacts/${id}`);
        fetchData();
      } catch (error) {
        console.error('Failed to delete contact:', error);
      }
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContactName = (contactId: string) => {
    return contacts.find(c => c.id === contactId)?.name || 'Unknown';
  };

  const stages = Object.values(DealStage);

  return (
    <div>
      <PageHeader title="Deal Pipeline">
        <Button variant="primary" onClick={handleAddDeal}><Icon name="plus" /> Add Deal</Button>
      </PageHeader>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {stages.map(stage => (
          <div key={stage} className="bg-brand-light p-4 rounded-[10px] border-2 border-brand-dark">
            <h3 className="font-extrabold text-lg mb-4 text-center">{stage} ({deals.filter(d => d.stage === stage).length})</h3>
            <div>
              {deals.filter(d => d.stage === stage).map(deal => (
                <DealCard key={deal.id} deal={deal} contactName={getContactName(deal.contactId)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <PageHeader title="Contacts">
        <div className="w-full max-w-xs">
          <Input label="" id="search" placeholder="Search contacts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Button variant="primary" onClick={handleAddContact}><Icon name="plus" /> Add Contact</Button>
      </PageHeader>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-brand-dark">
                <th className="p-4 font-black">Name</th>
                <th className="p-4 font-black">Email</th>
                <th className="p-4 font-black">Company</th>
                <th className="p-4 font-black">Tags</th>
                <th className="p-4 font-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map(contact => (
                <tr key={contact.id} className="border-b-2 border-brand-light last:border-b-0">
                  <td className="p-4 font-bold">{contact.name}</td>
                  <td className="p-4">{contact.email}</td>
                  <td className="p-4">{contact.company}</td>
                  <td className="p-4 flex space-x-1">
                    {contact.tags.map(tag => (
                      <span key={tag} className="bg-brand-light text-brand-dark text-xs font-bold px-2 py-1 rounded-full border-2 border-brand-dark">{tag}</span>
                    ))}
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none"><Icon name="edit" /></Button>
                      <Button variant="secondary" onClick={() => handleDeleteContact(contact.id)} className="p-2 h-12 w-12 !shadow-none"><Icon name="trash" /></Button>
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

export default CRM;
