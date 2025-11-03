
import React, { useState } from 'react';
import { Card, PageHeader, Button, Icon, Input, Modal } from '../components/ui';
import { DealStage } from '../types';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';

interface Deal {
    _id: Id<"deals">;
    contactId: Id<"contacts">;
    value: number;
    stage: "Lead" | "Qualified" | "Proposal" | "Won" | "Lost";
    lastInteraction: string;
}

interface Contact {
    _id: Id<"contacts">;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    notes?: string;
    tags: string[];
}

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
    const contacts = useQuery(api.crm.listContacts) || [];
    const deals = useQuery(api.crm.listDeals) || [];
    const createContact = useMutation(api.crm.createContact);
    const createDeal = useMutation(api.crm.createDeal);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', company: '' });
    const [showDealModal, setShowDealModal] = useState(false);
    const [dealForm, setDealForm] = useState<{ contactId: string; value: number }>({ 
        contactId: '', 
        value: 0 
    });

    const handleAddContact = () => {
        setContactForm({ name: '', email: '', phone: '', company: '' });
        setShowContactModal(true);
    };

    const saveContact = async () => {
        const name = contactForm.name.trim();
        if (!name) return;

        await createContact({
            name,
            email: contactForm.email.trim() || undefined,
            phone: contactForm.phone.trim() || undefined,
            company: contactForm.company.trim() || undefined,
            tags: ['New'],
        });

        setShowContactModal(false);
        setContactForm({ name: '', email: '', phone: '', company: '' });
    };
    
    const handleAddDeal = () => {
        if (contacts.length === 0) {
            alert("Please add a contact first.");
            return;
        }
        setDealForm({ contactId: contacts[0]._id, value: 0 });
        setShowDealModal(true);
    };

    const saveDeal = async () => {
        if (!dealForm.contactId) return;
        
        await createDeal({
            contactId: dealForm.contactId as Id<"contacts">,
            value: dealForm.value || 0,
            stage: "Lead",
        });

        setShowDealModal(false);
        setDealForm({ contactId: '', value: 0 });
    };

    const filteredContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getContactName = (contactId: Id<"contacts">) => {
        return contacts.find(c => c._id === contactId)?.name || 'Unknown';
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
                                <DealCard key={deal._id} deal={deal} contactName={getContactName(deal.contactId)} />
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
                                <tr key={contact._id} className="border-b-2 border-brand-light last:border-b-0">
                                    <td className="p-4 font-bold">{contact.name}</td>
                                    <td className="p-4">{contact.email || '-'}</td>
                                    <td className="p-4">{contact.company || '-'}</td>
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
                                <option key={c._id} value={c._id}>{c.name}</option>
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
