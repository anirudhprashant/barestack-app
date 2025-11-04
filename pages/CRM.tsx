import React, { useState, useMemo, FC, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Card, PageHeader, Button, Icon, Modal, Input, Select, Textarea } from '../components/ui';
// FIX: Import the 'Creatable' type to resolve the TypeScript error.
import { Contact, Deal, DealStage, Note, Creatable } from '../types';
import { useData } from '../dataStore';

const ITEMS_PER_PAGE = 10;

// --- Helper to get a contact's current stage ---
const getContactStage = (contactId: string, deals: Deal[]): DealStage => {
    const contactDeals = deals
        .filter(d => d.contact_id === contactId)
        .sort((a, b) => new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime());
    return contactDeals.length > 0 ? contactDeals[0].stage : DealStage.Lead;
};

// --- Sub-navigation for CRM section ---
const CrmNav = () => {
    const navLinks = [
        { href: '/crm', label: 'Contacts' },
        { href: '/crm/pipeline', label: 'Pipeline' },
        { href: '/crm/activities', label: 'Activities' },
    ];
    return (
        <div className="flex space-x-2 border-b-2 border-brand-dark mb-8">
            {navLinks.map(link => (
                <NavLink
                    key={link.href}
                    to={link.href}
                    end
                    className={({ isActive }) => 
                        `py-2 px-4 font-bold text-lg rounded-t-[10px] border-brand-dark -mb-px
                        ${isActive 
                            ? 'bg-white border-2 border-b-white' 
                            : 'bg-brand-light border-x-2 border-t-2 border-transparent hover:bg-white/60'}`
                    }
                >
                    {link.label}
                </NavLink>
            ))}
        </div>
    );
};


// --- FORMS ---

const ContactForm: FC<{ contact?: Contact; onClose: () => void }> = ({ contact, onClose }) => {
    const { addContact, updateContact, addRecentActivity } = useData();
    const [formData, setFormData] = useState({
        name: contact?.name || '',
        email: contact?.email || '',
        phone: contact?.phone || '',
        company: contact?.company || '',
        tags: contact?.tags?.join(', ') || '',
    });
    const [loading, setLoading] = useState(false);
    const isEditing = !!contact;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const contactData = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            };

            if (isEditing) {
                await updateContact({ ...contact, ...contactData });
            } else {
                await addContact(contactData);
                await addRecentActivity({
                    timestamp: new Date().toISOString(),
                    type: 'CONTACT_ADDED',
                    description: `New contact added: ${formData.name}`
                });
            }
            onClose();
        } catch (error) {
            console.error("Failed to save contact:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" id="name" value={formData.name} onChange={handleChange} required />
            <Input label="Email Address" id="email" type="email" value={formData.email} onChange={handleChange} required />
            <Input label="Phone Number" id="phone" value={formData.phone} onChange={handleChange} />
            <Input label="Company" id="company" value={formData.company} onChange={handleChange} />
            <Input label="Tags (comma-separated)" id="tags" value={formData.tags} onChange={handleChange} />
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Contact'}</Button>
            </div>
        </form>
    );
};


const AddDealForm: FC<{ onClose: () => void; initialContactId?: string; initialStage?: DealStage }> = ({ onClose, initialContactId, initialStage }) => {
    const { data, addDeal, addRecentActivity } = useData();
    const [contactId, setContactId] = useState(initialContactId || data.contacts[0]?.id || '');
    const [value, setValue] = useState('');
    const [stage, setStage] = useState(initialStage || DealStage.Qualified);
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
                {Object.values(DealStage).filter(s => s !== DealStage.Lead).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Deal'}</Button>
            </div>
        </form>
    );
};

const AddNoteForm: FC<{ contact: Contact; onClose: () => void }> = ({ contact, onClose }) => {
    const { addNote } = useData();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);
        try {
            const newNote: Creatable<Note> = {
                contact_id: contact.id!,
                content,
            };
            await addNote(newNote);
            onClose();
        } catch (error) {
            console.error("Failed to add note:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea label={`Note for ${contact.name}`} id="noteContent" value={content} onChange={e => setContent(e.target.value)} rows={5} required />
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Note'}</Button>
            </div>
        </form>
    );
};

// --- MAIN CRM COMPONENT (NOW CONTACTS LIST) ---
const CRM: React.FC = () => {
    const { data, updateDeal, deleteContact } = useData();
    const { contacts, deals } = data;
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
    const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
    const [notingContact, setNotingContact] = useState<Contact | null>(null);
    const [newDealProps, setNewDealProps] = useState<{ contactId: string, stage: DealStage } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const filteredContacts = useMemo(() =>
        contacts.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.company.toLowerCase().includes(searchTerm.toLowerCase())
        ), [contacts, searchTerm]
    );
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const paginatedContacts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredContacts.slice(startIndex, endIndex);
    }, [filteredContacts, currentPage]);
    
    const pageCount = useMemo(() => {
        return Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
    }, [filteredContacts]);


    const handleStageChange = async (contact: Contact, newStage: DealStage) => {
        const contactDeals = deals
            .filter(d => d.contact_id === contact.id)
            .sort((a, b) => new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime());
        
        if (contactDeals.length > 0) {
            // Update the most recent deal
            const latestDeal = contactDeals[0];
            await updateDeal({ ...latestDeal, stage: newStage });
        } else if (newStage !== DealStage.Lead) {
            // This was a Lead, prompt to create a new deal
            setNewDealProps({ contactId: contact.id!, stage: newStage });
            setIsAddDealModalOpen(true);
        }
    };

    const handleDeleteConfirm = async () => {
        if (deletingContact) {
            await deleteContact(deletingContact.id!);
            setDeletingContact(null);
        }
    };
    
    const openAddNoteModal = (contact: Contact) => {
        setNotingContact(contact);
        setIsAddNoteModalOpen(true);
    };

    return (
        <div>
            <CrmNav />
            <PageHeader title="Contacts">
                <Button variant="primary" onClick={() => setIsAddContactModalOpen(true)}>
                    <Icon name="plus" /> Add Contact
                </Button>
            </PageHeader>

            {/* Contacts Table */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold">All Contacts ({filteredContacts.length})</h3>
                    <div className="relative w-full max-w-xs">
                        <input id="searchContacts" placeholder="Search contacts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark"/>
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
                                <th className="p-4 font-black">Stage</th>
                                <th className="p-4 font-black">Tags</th>
                                <th className="p-4 font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedContacts.map(contact => (
                                <tr key={contact.id} className="border-b-2 border-brand-light last:border-b-0">
                                    <td className="p-4 font-bold">{contact.name}</td>
                                    <td className="p-4">{contact.company}</td>
                                    <td className="p-4">{contact.email}</td>
                                    <td className="p-4">{contact.phone}</td>
                                    <td className="p-4">
                                        <select value={getContactStage(contact.id!, deals)}
                                            onChange={(e) => handleStageChange(contact, e.target.value as DealStage)}
                                            className="w-full p-2 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark appearance-none bg-no-repeat bg-right pr-8" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%232B2B2B' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}>
                                            {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {contact.tags.map(tag => (
                                                <span key={tag} className="bg-blue-200 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full border-2 border-brand-dark">{tag}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex space-x-2">
                                            <Button variant="secondary" title="Add Note" className="p-2 h-12 w-12 !shadow-none" onClick={() => openAddNoteModal(contact)}><Icon name="document"/></Button>
                                            <Button variant="secondary" title="Edit Contact" className="p-2 h-12 w-12 !shadow-none" onClick={() => setEditingContact(contact)}><Icon name="edit"/></Button>
                                            <Button variant="secondary" title="Delete Contact" className="p-2 h-12 w-12 !shadow-none" onClick={() => setDeletingContact(contact)}><Icon name="trash"/></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {pageCount > 1 && (
                    <div className="flex justify-between items-center pt-4 border-t-2 border-brand-light mt-4">
                        <span className="font-bold">
                            Page {currentPage} of {pageCount}
                        </span>
                        <div className="flex space-x-2">
                            <Button
                                variant="secondary"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
                                disabled={currentPage === pageCount}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Modals */}
            <Modal isOpen={isAddContactModalOpen} onClose={() => setIsAddContactModalOpen(false)} title="Add New Contact">
                <ContactForm onClose={() => setIsAddContactModalOpen(false)} />
            </Modal>
            
            <Modal isOpen={!!editingContact} onClose={() => setEditingContact(null)} title="Edit Contact">
                {editingContact && <ContactForm contact={editingContact} onClose={() => setEditingContact(null)} />}
            </Modal>
            
            <Modal isOpen={isAddDealModalOpen} onClose={() => { setIsAddDealModalOpen(false); setNewDealProps(null); }} title="Add New Deal">
                <AddDealForm 
                    onClose={() => { setIsAddDealModalOpen(false); setNewDealProps(null); }} 
                    initialContactId={newDealProps?.contactId}
                    initialStage={newDealProps?.stage}
                />
            </Modal>
            
            <Modal isOpen={isAddNoteModalOpen} onClose={() => setIsAddNoteModalOpen(false)} title="Add a Note">
                {notingContact && <AddNoteForm contact={notingContact} onClose={() => setIsAddNoteModalOpen(false)} />}
            </Modal>

            <Modal isOpen={!!deletingContact} onClose={() => setDeletingContact(null)} title="Confirm Deletion">
                <p className="mb-6">Are you sure you want to delete the contact "{deletingContact?.name}"? This will also delete all associated deals, projects, and invoices. This action cannot be undone.</p>
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setDeletingContact(null)}>Cancel</Button>
                    <Button variant="primary" className="bg-red-500 hover:bg-red-600" onClick={handleDeleteConfirm}>Yes, Delete</Button>
                </div>
            </Modal>
        </div>
    );
};

export default CRM;