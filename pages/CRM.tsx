
import React, { useState, useEffect } from 'react';
import { Card, PageHeader, Button, Icon, Input, Modal } from '../components/ui';
import { Contact, Deal, DealStage } from '../types';
import { useHistory } from '../historyStore';
import { api } from '../services/api';

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
    const { state, setState } = useHistory();
    const { contacts, deals } = state.present;
    const [searchTerm, setSearchTerm] = useState('');
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', company: '' });
    const [showDealModal, setShowDealModal] = useState(false);
    const [dealForm, setDealForm] = useState({ contactId: '', value: 0 });

    useEffect(() => {
        const fetchContacts = async () => {
            const fetchedContacts = await api.getContacts();
            setState({ ...state.present, contacts: fetchedContacts });
        };
        const fetchDeals = async () => {
            const fetchedDeals = await api.getDeals();
            setState({ ...state.present, deals: fetchedDeals });
        };
        fetchContacts();
        fetchDeals();
    }, []);

    const handleAddContact = () => {
        setContactForm({ name: '', email: '', phone: '', company: '' });
        setShowContactModal(true);
    };

    const saveContact = async () => {
        const name = contactForm.name.trim();
        if (!name) return;
        const email = contactForm.email.trim() || `${name.toLowerCase().replace(/\s/g, '')}@example.com`;
        const phone = contactForm.phone.trim() || '555-0101';
        const company = contactForm.company.trim() || name;

        const newContact: Omit<Contact, 'id'> = {
            name,
            email,
            phone,
            company,
            notes: '',
            tags: ['New'],
        };

        const savedContact = await api.createContact(newContact);

        const newActivity = {
            id: `ra${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'CONTACT_ADDED' as const,
            description: `Added new contact: ${name}`
        };

        setState({
            ...state.present,
            contacts: [...state.present.contacts, savedContact],
            recentActivity: [...state.present.recentActivity, newActivity]
        });
        setShowContactModal(false);
    };
    
    const handleAddDeal = () => {
        if (contacts.length === 0) {
            alert("Please add a contact first.");
            return;
        }
        setDealForm({ contactId: contacts[0].id, value: 0 });
        setShowDealModal(true);
    };

    const saveDeal = async () => {
        const selectedContact = contacts.find(c => c.id === dealForm.contactId) || contacts[0];
        const newDeal: Omit<Deal, 'id'> = {
            contactId: selectedContact.id,
            value: dealForm.value || 0,
            stage: DealStage.Lead,
            lastInteraction: new Date().toISOString()
        };

        const savedDeal = await api.createDeal(newDeal);
        
        const newActivity = {
            id: `ra${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'DEAL_ADDED' as const,
            description: `Added new deal for ${selectedContact.name} worth $${savedDeal.value.toLocaleString()}`
        };

        setState({
            ...state.present,
            deals: [...state.present.deals, savedDeal],
            recentActivity: [...state.present.recentActivity, newActivity]
        });
        setShowDealModal(false);
    };

    const filteredContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getContactName = (contactId: string) => {
        return contacts.find(c => c.id === contactId)?.name || 'Unknown';
    }

    const stages = Object.values(DealStage);

    return (
        <div>
            <PageHeader title="Deal Pipeline">
                <Button variant="primary" onClick={handleAddDeal}><Icon name="plus"/> Add Deal</Button>
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
                <Button variant="primary" onClick={handleAddContact}><Icon name="plus"/> Add Contact</Button>
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
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none"><Icon name="edit"/></Button>
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none"><Icon name="trash"/></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showContactModal && (
                <Modal title="Add Contact" onClose={() => setShowContactModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowContactModal(false)}>Cancel</Button>
                            <Button onClick={saveContact}>Save Contact</Button>
                        </>
                    }
                >
                    <Input label="Name" id="contact-name" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} />
                    <Input label="Email" id="contact-email" type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} />
                    <Input label="Phone" id="contact-phone" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} />
                    <Input label="Company" id="contact-company" value={contactForm.company} onChange={e => setContactForm({ ...contactForm, company: e.target.value })} />
                </Modal>
            )}

            {showDealModal && (
                <Modal title="Add Deal" onClose={() => setShowDealModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowDealModal(false)}>Cancel</Button>
                            <Button onClick={saveDeal}>Save Deal</Button>
                        </>
                    }
                >
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Contact</label>
                        <select className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" value={dealForm.contactId} onChange={e => setDealForm({ ...dealForm, contactId: e.target.value })}>
                            {contacts.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <Input label="Deal Value ($)" id="deal-value" type="number" value={String(dealForm.value)} onChange={e => setDealForm({ ...dealForm, value: parseInt(e.target.value || '0') })} />
                </Modal>
            )}
        </div>
    );
};

export default CRM;