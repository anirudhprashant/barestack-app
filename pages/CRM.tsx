import React, { useState, useMemo, FC, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { Card, Button, Icon, Modal, Input, Textarea } from '../components/ui';
import { Contact, Deal, DealStage, Note, Creatable, ImportBatch } from '../types';
import { useData } from '../dataStore';

// @ts-ignore - XLSX is loaded from CDN in index.html
declare global {
    interface Window {
        XLSX: any;
    }
}
const XLSX = window.XLSX;

const ITEMS_PER_PAGE = 10;

// --- Helper to get a contact's current stage ---
const getContactStage = (contactId: string, deals: Deal[]): DealStage => {
    const contactDeals = deals
        .filter(d => d.contact_id === contactId)
        .sort((a, b) => new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime());
    return contactDeals.length > 0 ? contactDeals[0].stage : DealStage.Lead;
};

// --- Shared CRM Header Component ---
const CrmHeader: FC<{ children?: React.ReactNode }> = ({ children }) => {
    const navLinks = [
        { href: '/crm', label: 'Contacts' },
        { href: '/crm/pipeline', label: 'Pipeline' },
        { href: '/crm/activities', label: 'Activities' },
        { href: '/crm/imports', label: 'Imports' },
    ];

    return (
        <div className="flex justify-between items-center mb-8">
            <div className="flex space-x-2">
                {navLinks.map(link => (
                    <NavLink
                        key={link.href}
                        to={link.href}
                        end
                        className={({ isActive }) => 
                            `font-bold py-2 px-4 rounded-[10px] border-[3px] border-brand-dark shadow-neo-sm transition-all active:shadow-none active:translate-x-1 active:translate-y-1
                            ${isActive 
                                ? 'bg-brand-dark text-white' 
                                : 'bg-white text-brand-dark'}`
                        }
                    >
                        {link.label}
                    </NavLink>
                ))}
            </div>
            <div className="flex items-center space-x-2">
                {children}
            </div>
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

// --- Duplicate Handler Component ---
type Resolution = 'skip' | 'update' | 'create';

interface DuplicateHandlerProps {
    duplicates: Creatable<Contact>[];
    onConfirm: (resolutions: Record<string, Resolution>) => void;
    onCancel: () => void;
}

const DuplicateHandler: FC<DuplicateHandlerProps> = ({ duplicates, onConfirm, onCancel }) => {
    const [resolutions, setResolutions] = useState<Record<string, Resolution>>(() => {
        const initial: Record<string, Resolution> = {};
        duplicates.forEach(d => {
            if (d.email) {
                initial[d.email] = 'skip'; // Default to skip
            }
        });
        return initial;
    });

    const handleResolutionChange = (email: string, resolution: Resolution) => {
        setResolutions(prev => ({ ...prev, [email]: resolution }));
    };

    const applyToAll = (resolution: Resolution) => {
        const newResolutions: Record<string, Resolution> = {};
        Object.keys(resolutions).forEach(email => {
            newResolutions[email] = resolution;
        });
        setResolutions(newResolutions);
    };
    
    return (
        <div>
            <p className="mb-4">We found {duplicates.length} contacts in your file that might already exist based on their email address. How would you like to handle them?</p>
            
            <div className="flex space-x-2 mb-4 p-2 bg-brand-light rounded-[10px] border-[3px] border-brand-dark">
                <span className="font-bold my-auto">Apply to all:</span>
                <Button variant="secondary" onClick={() => applyToAll('skip')}>Skip All</Button>
                <Button variant="secondary" onClick={() => applyToAll('update')}>Update All</Button>
                <Button variant="secondary" onClick={() => applyToAll('create')}>Create All as New</Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto p-2 bg-brand-light rounded-[10px] border-[3px] border-brand-dark">
                {duplicates.map((dup) => (
                    <div key={dup.email} className="bg-white p-3 rounded-[10px] border-[3px] border-brand-dark flex justify-between items-center">
                        <div>
                            <p className="font-bold">{dup.name}</p>
                            <p className="text-sm text-brand-dark opacity-70">{dup.email}</p>
                        </div>
                        <select 
                            value={resolutions[dup.email]}
                            onChange={e => handleResolutionChange(dup.email!, e.target.value as Resolution)}
                            className="p-2 bg-white text-brand-dark rounded-[10px] border-[3px] border-brand-dark focus:outline-none"
                        >
                            <option value="skip">Skip Import</option>
                            <option value="update">Update Existing</option>
                            <option value="create">Create as New</option>
                        </select>
                    </div>
                ))}
            </div>

            <div className="flex justify-end space-x-2 pt-4 mt-4 border-t-2 border-brand-light">
                <Button type="button" variant="secondary" onClick={onCancel}>Back</Button>
                <Button type="button" variant="primary" onClick={() => onConfirm(resolutions)}>
                    Confirm Import
                </Button>
            </div>
        </div>
    );
};

// --- Import Modal ---
const ImportModal: FC<{ onClose: () => void }> = ({ onClose }) => {
    const { data, addMultipleContacts, updateContact } = useData();

    const [step, setStep] = useState<'upload' | 'duplicates' | 'importing'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [detectedDuplicates, setDetectedDuplicates] = useState<Creatable<Contact>[]>([]);
    const [newUniqueContacts, setNewUniqueContacts] = useState<Creatable<Contact>[]>([]);

    const resetState = () => {
        setStep('upload');
        setFile(null);
        setLoading(false);
        setError(null);
        setDetectedDuplicates([]);
        setNewUniqueContacts([]);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };
    
    const handleParseAndCheck = async () => {
        if (!file) {
            setError("Please select a file.");
            return;
        }
        setLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const dataContent = e.target?.result;
                const workbook = XLSX.read(dataContent, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (json.length === 0) throw new Error("The file is empty or in an unsupported format.");

                const fieldMap: Record<keyof Pick<Creatable<Contact>, 'name' | 'email' | 'phone' | 'company'>, string[]> = {
                    name: ['name', 'full name', 'contact name'],
                    email: ['email', 'email address'],
                    phone: ['phone', 'phone number'],
                    company: ['company', 'company name'],
                };

                const newContacts: Creatable<Contact>[] = json.map((row: any) => {
                    const contact: Creatable<Contact> = { name: '', email: '', phone: '', company: '', tags: [] };
                    for (const key in row) {
                        const lowerKey = key.toLowerCase().trim();
                        for (const field of Object.keys(fieldMap) as Array<keyof typeof fieldMap>) {
                            if (fieldMap[field].includes(lowerKey)) {
                                contact[field] = String(row[key]).trim();
                                break;
                            }
                        }
                    }
                    if (!contact.name && !contact.email) return null;
                    return contact;
                }).filter((c): c is Creatable<Contact> => c !== null);

                if (newContacts.length === 0) throw new Error("No valid contacts found. Check column headers.");

                const existingEmails = new Set(data.contacts.map(c => c.email?.toLowerCase()).filter(Boolean));
                const duplicates: Creatable<Contact>[] = [];
                const nonDuplicates: Creatable<Contact>[] = [];

                newContacts.forEach(contact => {
                    if (contact.email && existingEmails.has(contact.email.toLowerCase())) {
                        duplicates.push(contact);
                    } else {
                        nonDuplicates.push(contact);
                    }
                });

                if (duplicates.length > 0) {
                    setDetectedDuplicates(duplicates);
                    setNewUniqueContacts(nonDuplicates);
                    setStep('duplicates');
                } else {
                    await processImport(nonDuplicates, []);
                }
            } catch (err: any) {
                setError(err.message || "Failed to process the file.");
            } finally {
                setLoading(false);
            }
        };
        reader.onerror = () => {
             setError("Failed to read the file.");
             setLoading(false);
        }
        reader.readAsBinaryString(file);
    };
    
    const processImport = async (toCreate: Creatable<Contact>[], toUpdate: Creatable<Contact>[]) => {
        if (!file) return;
        setStep('importing');
        setLoading(true);
        setError(null);

        try {
             // Create an array of promises for all the update operations.
            const updatePromises = toUpdate.map(fileContact => {
                const existingContact = data.contacts.find(c => c.email && fileContact.email && c.email.toLowerCase() === fileContact.email.toLowerCase());
                if (existingContact) {
                    // Merge data: file data overwrites existing data, but keep the ID.
                    const updatedContactData = { ...existingContact, ...fileContact, id: existingContact.id };
                    return updateContact(updatedContactData);
                }
                return Promise.resolve(); // Do nothing if no matching contact is found
            });

            // Execute all updates in parallel for better performance.
            await Promise.all(updatePromises);
            
            if (toCreate.length > 0) {
                const batchDetails: Creatable<ImportBatch> = {
                    file_name: file.name,
                    contact_count: toCreate.length,
                };
                await addMultipleContacts(toCreate, batchDetails);
            }
            
            handleClose();
        } catch(err: any) {
            setError(err.message);
            setStep('upload');
        } finally {
            setLoading(false);
        }
    };
    
    const handleDuplicatesConfirmed = async (resolutions: Record<string, Resolution>) => {
        const toCreate: Creatable<Contact>[] = [...newUniqueContacts];
        const toUpdate: Creatable<Contact>[] = [];

        detectedDuplicates.forEach(dup => {
            const resolution = resolutions[dup.email!];
            if (resolution === 'create') {
                toCreate.push(dup);
            } else if (resolution === 'update') {
                toUpdate.push(dup);
            }
        });
        
        await processImport(toCreate, toUpdate);
    };

    const renderContent = () => {
        if (step === 'importing' || loading) {
            return <div className="text-center p-8"><p className="text-xl font-bold">Importing contacts, please wait...</p></div>;
        }

        switch (step) {
            case 'duplicates':
                return <DuplicateHandler 
                            duplicates={detectedDuplicates} 
                            onConfirm={handleDuplicatesConfirmed} 
                            onCancel={() => {
                                setError(null);
                                setStep('upload');
                            }}
                       />;
            case 'upload':
            default:
                return (
                    <div className="space-y-4">
                        <p>Upload a CSV, XLS, or XLSX file to import contacts. We'll look for headers like 'Name', 'Email', 'Phone', and 'Company'.</p>
                        <div>
                            <label className="block text-brand-dark font-bold mb-2">Select File</label>
                            <input 
                                type="file" 
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                onChange={handleFileChange}
                                className="w-full text-brand-dark file:mr-4 file:py-2 file:px-4 file:rounded-[10px] file:border-[3px] file:border-brand-dark file:text-sm file:font-semibold file:bg-white file:text-brand-dark hover:file:bg-brand-light"
                            />
                        </div>
                        {file && <p className="font-bold">Selected: {file.name}</p>}
                        {error && <p className="text-brand-dark font-bold">{error}</p>}
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                            <Button type="button" variant="primary" onClick={handleParseAndCheck} disabled={!file || loading}>
                                {loading ? 'Checking...' : 'Review & Import'}
                            </Button>
                        </div>
                    </div>
                );
        }
    };
    
    return renderContent();
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
    const { data, updateDeal, deleteContact, addDeal } = useData();
    const { contacts, deals } = data;
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
    const [notingContact, setNotingContact] = useState<Contact | null>(null);
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
            await updateDeal({ ...latestDeal, stage: newStage, last_interaction: new Date().toISOString() });
        } else if (newStage !== DealStage.Lead) {
            // No deals exist, create a new one since they are being moved out of the default 'Lead' stage
            const newDeal: Creatable<Deal> = {
                contact_id: contact.id!,
                value: 0, // User can update this later in the pipeline
                stage: newStage,
                last_interaction: new Date().toISOString(),
            };
            await addDeal(newDeal);
        }
        // If no deals exist and the stage remains 'Lead', do nothing.
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
            <CrmHeader>
                <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
                    Import Contacts
                </Button>
                <Button variant="primary" onClick={() => setIsAddContactModalOpen(true)}>
                    <Icon name="plus" /> Add Contact
                </Button>
            </CrmHeader>
            
            {/* Contacts Table */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold">All Contacts ({filteredContacts.length})</h3>
                    <div className="relative w-full max-w-xs">
                        <input id="searchContacts" placeholder="Search contacts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 bg-white text-brand-dark rounded-[10px] border-[3px] border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark"/>
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-dark opacity-50" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-[3px] border-brand-dark">
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
                                            className="w-full p-2 bg-white text-brand-dark rounded-[10px] border-[3px] border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark appearance-none bg-no-repeat bg-right pr-8" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%232B2B2B' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}>
                                            {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {contact.tags.map(tag => (
                                                <span key={tag} className="bg-brand-light text-brand-dark text-xs font-bold px-2.5 py-0.5 rounded-full border-[3px] border-brand-dark">{tag}</span>
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
            
            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Contacts">
                <ImportModal onClose={() => setIsImportModalOpen(false)} />
            </Modal>
            
            <Modal isOpen={!!editingContact} onClose={() => setEditingContact(null)} title="Edit Contact">
                {editingContact && <ContactForm contact={editingContact} onClose={() => setEditingContact(null)} />}
            </Modal>

            <Modal isOpen={isAddNoteModalOpen} onClose={() => setIsAddNoteModalOpen(false)} title="Add a Note">
                {notingContact && <AddNoteForm contact={notingContact} onClose={() => setIsAddNoteModalOpen(false)} />}
            </Modal>

            <Modal isOpen={!!deletingContact} onClose={() => setDeletingContact(null)} title="Confirm Deletion">
                <p className="mb-6">Are you sure you want to delete the contact "{deletingContact?.name}"? This will also delete all associated deals, projects, and invoices. This action cannot be undone.</p>
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setDeletingContact(null)}>Cancel</Button>
                    <Button variant="primary" onClick={handleDeleteConfirm}>Yes, Delete</Button>
                </div>
            </Modal>
        </div>
    );
};

export default CRM;