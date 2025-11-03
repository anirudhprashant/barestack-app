
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
    const updateContact = useMutation(api.crm.updateContact);
    const deleteContact = useMutation(api.crm.deleteContact);
    const createDeal = useMutation(api.crm.createDeal);
    const updateDeal = useMutation(api.crm.updateDeal);
    const deleteDeal = useMutation(api.crm.deleteDeal);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [showContactModal, setShowContactModal] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', company: '' });
    const [showDealModal, setShowDealModal] = useState(false);
    const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
    const [dealForm, setDealForm] = useState<{ contactId: string; value: number }>({ 
        contactId: '', 
        value: 0 
    });

    const handleAddContact = () => {
        setEditingContact(null);
        setContactForm({ name: '', email: '', phone: '', company: '' });
        setShowContactModal(true);
    };

    const handleEditContact = (contact: Contact) => {
        setEditingContact(contact);
        setContactForm({ 
            name: contact.name, 
            email: contact.email || '', 
            phone: contact.phone || '', 
            company: contact.company || '' 
        });
        setShowContactModal(true);
    };

    const handleDeleteContact = async (id: Id<"contacts">) => {
        if (window.confirm("Are you sure you want to delete this contact?")) {
            await deleteContact({ id });
        }
    };

    const saveContact = async () => {
        const name = contactForm.name.trim();
        if (!name) return;

        if (editingContact) {
            await updateContact({
                id: editingContact._id,
                name,
                email: contactForm.email.trim() || undefined,
                phone: contactForm.phone.trim() || undefined,
                company: contactForm.company.trim() || undefined,
            });
        } else {
            await createContact({
                name,
                email: contactForm.email.trim() || undefined,
                phone: contactForm.phone.trim() || undefined,
                company: contactForm.company.trim() || undefined,
                tags: ['New'],
            });
        }

        setShowContactModal(false);
        setContactForm({ name: '', email: '', phone: '', company: '' });
        setEditingContact(null);
    };
    
    const handleAddDeal = () => {
        if (contacts.length === 0) {
            alert("Please add a contact first.");
            return;
        }
        setEditingDeal(null);
        setDealForm({ contactId: contacts[0]._id, value: 0 });
        setShowDealModal(true);
    };

    const handleEditDeal = (deal: Deal) => {
        setEditingDeal(deal);
        setDealForm({ contactId: deal.contactId, value: deal.value });
        setShowDealModal(true);
    };

    const handleDeleteDeal = async (id: Id<"deals">) => {
        if (window.confirm("Are you sure you want to delete this deal?")) {
            await deleteDeal({ id });
        }
    };

    const saveDeal = async () => {
        if (!dealForm.contactId) return;
        
        if (editingDeal) {
            await updateDeal({
                id: editingDeal._id,
                contactId: dealForm.contactId as Id<"contacts">,
                value: dealForm.value || 0,
            });
        } else {
            await createDeal({
                contactId: dealForm.contactId as Id<"contacts">,
                value: dealForm.value || 0,
                stage: "Lead",
            });
        }

        setShowDealModal(false);
        setDealForm({ contactId: '', value: 0 });
        setEditingDeal(null);
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
                                <div key={deal._id} className="relative group">
                                    <DealCard deal={deal} contactName={getContactName(deal.contactId)} />
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity">
                                        <button onClick={() => handleEditDeal(deal)} className="p-1 bg-white rounded border-2 border-brand-dark hover:bg-brand-light"><Icon name="edit" className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteDeal(deal._id)} className="p-1 bg-white rounded border-2 border-brand-dark hover:bg-brand-light"><Icon name="trash" className="w-4 h-4"/></button>
                                    </div>
                                </div>
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
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none" onClick={() => handleEditContact(contact)}><Icon name="edit"/></Button>
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none" onClick={() => handleDeleteContact(contact._id)}><Icon name="trash"/></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showContactModal && (
                <Modal title={editingContact ? "Edit Contact" : "Add Contact"} onClose={() => setShowContactModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowContactModal(false)}>Cancel</Button>
                            <Button onClick={saveContact}>{editingContact ? "Update" : "Save"} Contact</Button>
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
                <Modal title={editingDeal ? "Edit Deal" : "Add Deal"} onClose={() => setShowDealModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowDealModal(false)}>Cancel</Button>
                            <Button onClick={saveDeal}>{editingDeal ? "Update" : "Save"} Deal</Button>
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
