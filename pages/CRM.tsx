import React, { useState } from 'react';
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

// --- Add Contact Form ---
const AddContactForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addContact, addRecentActivity } = useData();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [company, setCompany] = useState('');
    const [tags, setTags] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            alert("Name and email are required.");
            return;
        }
        setLoading(true);
        const newContact: Omit<Contact, 'id' | 'user_id' | 'created_at'> = {
            name,
            email,
            phone,
            company,
            tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        };

        await addContact(newContact);
        await addRecentActivity({
            timestamp: new Date().toISOString(),
            type: 'CONTACT_ADDED',
            description: `Added new contact: ${name}`
        });
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
const AddDealForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { data, addDeal, addRecentActivity } = useData();
    const [contactId, setContactId] = useState(data.contacts[0]?.id || '');
    const [value, setValue] = useState('');
    const [stage, setStage] = useState(DealStage.Lead);
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
            <Select label="Contact" id="contact" value={contactId} onChange={e => setContactId(e.target.value)} required>
                {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Value ($)" id="value" type="number" value={value} onChange={e => setValue(e.target.value)} required />
            <Select label="Stage" id="stage" value={stage} onChange={e => setStage(e.target.value as DealStage)} required>
                {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
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
    const { data } = useData();
    const { contacts, deals } = data;
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
    
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
                <Button variant="primary" onClick={() => setIsAddDealModalOpen(true)} disabled={contacts.length === 0}>
                    <Icon name="plus"/> Add Deal
                </Button>
            </PageHeader>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                {stages.map(stage => (
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

            <PageHeader title="Contacts">
                 <div className="w-full max-w-xs">
                    <Input label="" id="search" placeholder="Search contacts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Button variant="primary" onClick={() => setIsAddContactModalOpen(true)}><Icon name="plus"/> Add Contact</Button>
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

            <Modal isOpen={isAddContactModalOpen} onClose={() => setIsAddContactModalOpen(false)} title="Add New Contact">
                <AddContactForm onClose={() => setIsAddContactModalOpen(false)} />
            </Modal>
            
            <Modal isOpen={isAddDealModalOpen} onClose={() => setIsAddDealModalOpen(false)} title="Add New Deal">
                <AddDealForm onClose={() => setIsAddDealModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default CRM;