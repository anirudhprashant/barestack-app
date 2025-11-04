import React, { useState, useMemo } from 'react';
import { Card, PageHeader, Button, Icon, Modal, Input, Select } from '../components/ui';
import { Contact, Deal, DealStage } from '../types';
import { useData } from '../dataStore';

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
        setLoading(true);
        try {
            const newContact: Omit<Contact, 'id' | 'user_id' | 'created_at'> = {
                name,
                email,
                phone,
                company,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            };
            await addContact(newContact);
            await addRecentActivity({
                timestamp: new Date().toISOString(),
                type: 'CONTACT_ADDED',
                description: `New contact added: ${name}`
            });
            onClose();
        } catch (error) {
            console.error("Failed to add contact:", error);
            // Here you would show a toast notification
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" id="name" value={name} onChange={e => setName(e.target.value)} required />
            <Input label="Email Address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Phone Number" id="phone" value={phone} onChange={e => setPhone(e.target.value)} />
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
        setLoading(true);
        try {
            const newDeal: Omit<Deal, 'id' | 'user_id' | 'created_at'> = {
                contact_id: contactId,
                value: parseInt(value) || 0,
                stage,
                last_interaction: new Date().toISOString(),
            };

            await addDeal(newDeal);
            const contactName = data.contacts.find(c => c.id === contactId)?.name || 'a contact';
            await addRecentActivity({
                timestamp: new Date().toISOString(),
                type: 'DEAL_ADDED',
                description: `New deal worth $${newDeal.value} added for ${contactName}`
            });
            onClose();
        } catch (error) {
            console.error("Failed to add deal:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Select label="Contact" id="contact" value={contactId} onChange={e => setContactId(e.target.value)} required>
                {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Deal Value ($)" id="value" type="number" value={value} onChange={e => setValue(e.target.value)} required />
            <Select label="Stage" id="stage" value={stage} onChange={e => setStage(e.target.value as DealStage)}>
                {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Deal'}</Button>
            </div>
        </form>
    );
};

// --- Deal Card ---
const DealCard: React.FC<{deal: Deal, contactName: string}> = ({ deal, contactName }) => {
    return (
        <div className="bg-white p-3 rounded-[10px] border-2 border-brand-dark mb-3 cursor-grab active:cursor-grabbing">
            <p className="font-bold">{contactName}</p>
            <p className="text-xl font-black text-brand-dark">${deal.value.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Last interaction: {new Date(deal.last_interaction).toLocaleDateString()}</p>
        </div>
    );
}

const CRM: React.FC = () => {
    const { data } = useData();
    const { contacts, deals } = data;
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredContacts = useMemo(() => 
        contacts.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.company.toLowerCase().includes(searchTerm.toLowerCase())
        ), [contacts, searchTerm]
    );

    const getContactName = (contactId: string) => contacts.find(c => c.id === contactId)?.name || 'Unknown Contact';
    const dealStages = Object.values(DealStage);

    return (
        <div>
            <PageHeader title="CRM">
                <Button variant="secondary" onClick={() => setIsAddDealModalOpen(true)} disabled={contacts.length === 0}>
                    <Icon name="plus" /> Add Deal
                </Button>
                <Button variant="primary" onClick={() => setIsAddContactModalOpen(true)}>
                    <Icon name="plus" /> Add Contact
                </Button>
            </PageHeader>

            {/* Deals Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                {dealStages.map(stage => (
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

            {/* Contacts Table */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold">All Contacts ({filteredContacts.length})</h3>
                    <div className="relative w-full max-w-xs">
                        <input
                            id="searchContacts"
                            placeholder="Search contacts..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark"
                        />
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-brand-dark">
                                <th className="p-4 font-black">Name</th>
                                <th className="p-4 font-black">Company</th>
                                <th className="p-4 font-black">Email</th>
                                <th className="p-4 font-black">Phone</th>
                                <th className="p-4 font-black">Tags</th>
                                <th className="p-4 font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContacts.map(contact => (
                                <tr key={contact.id} className="border-b-2 border-brand-light last:border-b-0">
                                    <td className="p-4 font-bold">{contact.name}</td>
                                    <td className="p-4">{contact.company}</td>
                                    <td className="p-4">{contact.email}</td>
                                    <td className="p-4">{contact.phone}</td>
                                    <td className="p-4">
                                        {contact.tags.map(tag => (
                                            <span key={tag} className="bg-blue-200 text-blue-800 text-xs font-bold mr-2 px-2.5 py-0.5 rounded-full border-2 border-brand-dark">{tag}</span>
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
