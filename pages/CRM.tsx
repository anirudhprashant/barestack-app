import React, { useState, useEffect } from 'react';
import { Card, PageHeader, Button, Icon, Input, Modal, Select } from '../components/ui';
import { Contact, Deal, DealStage } from '../types';
import { useData } from '../dataStore';

const DealCard: React.FC<{ deal: Deal; contactName: string }> = ({ deal, contactName }) => {
    return (
        <div className="bg-white p-3 rounded-[10px] border-2 border-brand-dark mb-3 cursor-grab active:cursor-grabbing">
            <p className="font-bold">{contactName}</p>
            <p className="font-semibold text-green-600">${deal.value.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{new Date(deal.last_interaction).toLocaleDateString()}</p>
        </div>
    );
};

// --- Base Contact Form for Add/Edit ---
const ContactForm: React.FC<{
    onClose: () => void;
    initialData?: Contact;
}> = ({ onClose, initialData }) => {
    const { addContact, updateContact, addRecentActivity } = useData();
    const [name, setName] = useState(initialData?.name || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [company, setCompany] = useState(initialData?.company || '');
    const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
    const [loading, setLoading] = useState(false);

    const isEditing = !!initialData;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            alert("Name and email are required.");
            return;
        }
        setLoading(true);

        const contactData: Partial<Contact> = {
            name,
            email,
            phone,
            company,
            tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        };

        if (isEditing) {
            await updateContact(initialData.id!, contactData);
            // Optionally add an activity for updating a contact
        } else {
            await addContact(contactData as Omit<Contact, 'id' | 'user_id' | 'created_at'>);
            await addRecentActivity({
                timestamp: new Date().toISOString(),
                type: 'CONTACT_ADDED',
                description: `Added new contact: ${name}`
            });
        }
        setLoading(false);
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" id="name" value={name} onChange={e => setName(e.target.value)} required />
            <Input label="Email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Phone" id="phone" value={phone} onChange={e => setPhone(e.target.value)} />
            <Input label="Company" id="company" value={company} onChange={e => setCompany(e.target.value)} />
            <Input label="Tags (comma-separated)" id="tags" value={tags} onChange={e => setTags(e.target.value)} />
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Contact'}</Button>
            </div>
        </form>
    );
};


// --- Add Deal Form ---
const AddDealForm: React.FC<{ onClose: () => void; initialData?: Partial<Deal> }> = ({ onClose, initialData }) => {
    const { data, addDeal, addRecentActivity } = useData();
    const [contactId, setContactId] = useState(initialData?.contact_id || data.contacts[0]?.id || '');
    const [value, setValue] = useState(initialData?.value?.toString() || '');
    const [stage, setStage] = useState(initialData?.stage || DealStage.Qualified);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactId || !value) {
            alert("Contact and value are required.");
            return;
        }
        setLoading(true);
        const newDeal: Omit<Deal, 'id' | 'user_id' | 'created_at'> = {
            contact_id: contactId,
            value: parseInt(value),
            stage: stage,
            last_interaction: new Date().toISOString()
        };
        
        await addDeal(newDeal);
        const contactName = data.contacts.find(c => c.id === contactId)?.name;
        await addRecentActivity({
            timestamp: new Date().toISOString(),
            type: 'DEAL_ADDED',
            description: `Added new deal for ${contactName} worth $${newDeal.value.toLocaleString()}`
        });
        setLoading(false);
        onClose();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Select label="Contact" id="contact" value={contactId} onChange={e => setContactId(e.target.value)} required disabled={!!initialData?.contact_id}>
                {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Value ($)" id="value" type="number" value={value} onChange={e => setValue(e.target.value)} required />
            <Select label="Stage" id="stage" value={stage} onChange={e => setStage(e.target.value as DealStage)} required>
                {Object.values(DealStage).filter(s => s !== DealStage.Lead).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Deal'}</Button>
            </div>
        </form>
    );
};

// --- CRM Page Component ---
const CRM: React.FC = () => {
    const { data, updateDeal, addRecentActivity } = useData();
    const { contacts, deals } = data;
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
    const [prefilledDealData, setPrefilledDealData] = useState<Partial<Deal> | undefined>(undefined);
    
    const filteredContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getContactName = (contactId: string) => {
        return contacts.find(c => c.id === contactId)?.name || 'Unknown';
    }

    const handleEditClick = (contact: Contact) => {
        setEditingContact(contact);
        setIsEditContactModalOpen(true);
    };

    const handleStageChange = async (contact: Contact, newStage: DealStage) => {
        const latestDeal = deals.find(d => d.contact_id === contact.id); // Assuming most recent is first

        if (latestDeal) {
            await updateDeal(latestDeal.id!, { stage: newStage });
            await addRecentActivity({
                 timestamp: new Date().toISOString(),
                 type: 'DEAL_ADDED', // Semantically close enough
                 description: `Deal for ${contact.name} moved to ${newStage}`
            });
        } else if (newStage !== DealStage.Lead) {
            // If no deal exists and user moves from "Lead", prompt to create a deal
            setPrefilledDealData({ contact_id: contact.id, stage: newStage });
            setIsAddDealModalOpen(true);
        }
    };
    
    const closeAddDealModal = () => {
        setIsAddDealModalOpen(false);
        setPrefilledDealData(undefined);
    };

    const kanbanStages = [DealStage.Qualified, DealStage.Proposal, DealStage.Won, DealStage.Lost];

    return (
        <div>
            <PageHeader title="Contacts">
                 <div className="w-full max-w-xs">
                    <Input label="" id="search" placeholder="Search contacts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Button variant="primary" onClick={() => setIsAddContactModalOpen(true)}><Icon name="plus"/> Add Contact</Button>
            </PageHeader>
            <Card className="mb-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-brand-dark">
                                <th className="p-4 font-black">Name</th>
                                <th className="p-4 font-black">Email</th>
                                <th className="p-4 font-black">Company</th>
                                <th className="p-4 font-black">Stage</th>
                                <th className="p-4 font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContacts.map(contact => {
                                const latestDeal = deals.find(d => d.contact_id === contact.id);
                                const currentStage = latestDeal ? latestDeal.stage : DealStage.Lead;

                                return (
                                    <tr key={contact.id} className="border-b-2 border-brand-light last:border-b-0">
                                        <td className="p-4 font-bold">{contact.name}</td>
                                        <td className="p-4">{contact.email}</td>
                                        <td className="p-4">{contact.company}</td>
                                        <td className="p-4">
                                            <Select label="" id={`stage-${contact.id}`} value={currentStage} onChange={(e) => handleStageChange(contact, e.target.value as DealStage)} className="!p-2 text-sm">
                                                 {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
                                            </Select>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex space-x-2">
                                                <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none" onClick={() => handleEditClick(contact)}><Icon name="edit"/></Button>
                                                <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none"><Icon name="trash"/></Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <PageHeader title="Deal Pipeline">
                <Button variant="primary" onClick={() => setIsAddDealModalOpen(true)} disabled={contacts.length === 0}>
                    <Icon name="plus"/> Add Deal
                </Button>
            </PageHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kanbanStages.map(stage => (
                    <div key={stage} className="bg-brand-light p-4 rounded-[10px] border-2 border-brand-dark">
                        <h3 className="font-extrabold text-lg mb-4 text-center">{stage} ({deals.filter(d => d.stage === stage).length})</h3>
                        <div>
                            {deals.filter(d => d.stage === stage).map(deal => (
                                <DealCard key={deal.id} deal={deal} contactName={getContactName(deal.contact_id)} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>


            {/* Modals */}
            <Modal isOpen={isAddContactModalOpen} onClose={() => setIsAddContactModalOpen(false)} title="Add New Contact">
                <ContactForm onClose={() => setIsAddContactModalOpen(false)} />
            </Modal>
            
            {isEditContactModalOpen && editingContact && (
                 <Modal isOpen={isEditContactModalOpen} onClose={() => setIsEditContactModalOpen(false)} title="Edit Contact">
                    <ContactForm onClose={() => setIsEditContactModalOpen(false)} initialData={editingContact} />
                </Modal>
            )}
            
            <Modal isOpen={isAddDealModalOpen} onClose={closeAddDealModal} title="Add New Deal">
                <AddDealForm onClose={closeAddDealModal} initialData={prefilledDealData} />
            </Modal>
        </div>
    );
};

export default CRM;