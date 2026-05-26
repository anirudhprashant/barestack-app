import React, { useState, FC, useMemo } from 'react';
import { useData } from '../dataStore';
import { Contact, Deal, DealStage, Note, Creatable, ImportBatch } from '../types';
import { Button, Input, Modal, Icon, Card, Select, Textarea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { ContactForm } from '../components/ContactForm';
import { ImportModal } from '../components/ImportModal';
import { EditableCell } from '../components/EditableCell';

const ITEMS_PER_PAGE = 10;

type ViewMode = 'table' | 'kanban';

const stageColors: Record<DealStage, { bg: string, border: string, badge: string }> = {
    [DealStage.Lead]: { bg: 'bg-surface', border: 'border-border', badge: 'bg-surface text-muted' },
    [DealStage.Qualified]: { bg: 'bg-activity-purple/10', border: 'border-activity-purple/20', badge: 'bg-activity-purple/10 text-activity-purple' },
    [DealStage.Proposal]: { bg: 'bg-activity-blue/10', border: 'border-activity-blue/20', badge: 'bg-activity-blue/10 text-activity-blue' },
    [DealStage.Won]: { bg: 'bg-activity-green/10', border: 'border-activity-green/20', badge: 'bg-activity-green/10 text-activity-green' },
    [DealStage.Lost]: { bg: 'bg-activity-red/10', border: 'border-activity-red/20', badge: 'bg-activity-red/10 text-activity-red' },
};

// Add Note Form Component
const AddNoteForm: FC<{ contactId: string }> = ({ contactId }) => {
    const { addNote, addRecentActivity } = useData();
    const [noteContent, setNoteContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim()) return;

        setLoading(true);
        try {
            await addNote({
                contact_id: contactId,
                content: noteContent,
            });
            setNoteContent('');
        } catch (error) {
            console.error('Failed to add note:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
                label="Add a note"
                id={`note-${contactId}`}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
                placeholder="Enter your note here..."
            />
            <Button type="submit" variant="primary" disabled={loading || !noteContent.trim()} className="text-sm">
                {loading ? 'Saving...' : 'Add Note'}
            </Button>
        </form>
    );
};

const CRM: React.FC = () => {
    const { data, deleteContact, updateDeal, addDeal, addNote, addImportBatch, addMultipleContacts, addRecentActivity, updateContact } = useData();
    const { contacts, deals } = data;
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [draggedContact, setDraggedContact] = useState<Contact | null>(null);
    const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
    const paginatedContacts = filteredContacts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const getContactStage = (contactId: string) => {
        const contactDeals = deals.filter(d => d.contact_id === contactId);
        if (contactDeals.length === 0) return DealStage.Lead;
        return contactDeals[0].stage;
    };

    const handleDeleteContact = (contact: Contact) => {
        setContactToDelete(contact);
    };

    const confirmDelete = async () => {
        if (contactToDelete && contactToDelete.id) {
            try {
                await deleteContact(contactToDelete.id);
                if (selectedContact?.id === contactToDelete.id) setSelectedContact(null);
                setContactToDelete(null);
            } catch (error) {
                console.error("Failed to delete contact:", error);
                alert("Failed to delete contact. Please try again.");
            }
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getRandomColor = (name: string) => {
        const colors = ['bg-activity-red/10 text-activity-red', 'bg-activity-green/10 text-activity-green', 'bg-activity-blue/10 text-activity-blue', 'bg-activity-orange/10 text-activity-orange', 'bg-activity-purple/10 text-activity-purple', 'bg-activity-indigo/10 text-activity-indigo'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(paginatedContacts.map(c => c.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = () => {
        if (selectedIds.size > 0) {
            setIsBulkDeleteModalOpen(true);
        }
    };

    const confirmBulkDelete = async () => {
        try {
            for (const id of selectedIds) {
                await deleteContact(id);
            }
            setSelectedIds(new Set());
            setIsBulkDeleteModalOpen(false);
        } catch (error) {
            console.error("Failed to bulk delete contacts:", error);
            alert("Failed to delete some contacts. Please try again.");
        }
    };

    const handleBulkStageUpdate = async (stage: DealStage) => {
        try {
            for (const id of selectedIds) {
                const contactDeals = deals.filter(d => d.contact_id === id);
                if (contactDeals.length > 0) {
                    await updateDeal({ ...contactDeals[0], stage, last_interaction: new Date().toISOString() });
                } else {
                    await addDeal({
                        contact_id: id,
                        value: 0,
                        stage,
                        last_interaction: new Date().toISOString()
                    });
                }
            }
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Failed to update bulk stage:", error);
            alert("Failed to update stages. Please try again.");
        }
    };

    const kanbanData = useMemo(() => {
        return Object.values(DealStage).map(stage => ({
            stage,
            contacts: filteredContacts.filter(c => getContactStage(c.id!) === stage),
        }));
    }, [filteredContacts, deals]);

    const handleStageChange = async (contact: Contact, newStage: DealStage) => {
        const contactDeals = deals.filter(d => d.contact_id === contact.id);
        if (contactDeals.length > 0) {
            await updateDeal({
                ...contactDeals[0],
                stage: newStage,
                last_interaction: new Date().toISOString()
            });
        } else {
            await addDeal({
                contact_id: contact.id!,
                value: 1,
                stage: newStage,
                last_interaction: new Date().toISOString()
            });
            await addRecentActivity({
                timestamp: new Date().toISOString(),
                type: 'DEAL_ADDED',
                description: `New deal created for ${contact.name} at stage ${newStage}`
            });
        }
    };

    const renderTableView = () => (
        <>
            {filteredContacts.length > 0 ? (
                <div className="bg-canvas border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <input
                                        type="checkbox"
                                        id="select-all-contacts"
                                        name="select-all"
                                        className="rounded-none border-border text-charcoal focus:ring-charcoal"
                                        checked={paginatedContacts.length > 0 && selectedIds.size === paginatedContacts.length}
                                        onChange={handleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Stage</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedContacts.map(contact => (
                                <TableRow key={contact.id}>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            id={`select-${contact.id}`}
                                            name={`select-contact-${contact.id}`}
                                            className="rounded-none border-border text-charcoal focus:ring-charcoal"
                                            checked={selectedIds.has(contact.id)}
                                            onChange={() => handleSelectOne(contact.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${getRandomColor(contact.name)}`}>
                                                {getInitials(contact.name)}
                                            </div>
                                            <EditableCell
                                                value={contact.name}
                                                onSave={(val) => updateContact({ ...contact, name: val })}
                                                className="font-medium text-charcoal"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell
                                            value={contact.email}
                                            onSave={(val) => updateContact({ ...contact, email: val })}
                                            type="email"
                                            className="text-sm text-muted"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell
                                            value={contact.phone || ''}
                                            onSave={(val) => updateContact({ ...contact, phone: val })}
                                            type="tel"
                                            placeholder="Add phone"
                                            className="text-sm text-muted"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell
                                            value={contact.company || ''}
                                            onSave={(val) => updateContact({ ...contact, company: val })}
                                            placeholder="Add company"
                                            className={contact.company ? "text-charcoal font-medium" : "text-sm text-muted"}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={getContactStage(contact.id!)}
                                                onChange={async (e) => {
                                                    e.stopPropagation();
                                                    const newStage = e.target.value as DealStage;
                                                    const contactDeals = deals.filter(d => d.contact_id === contact.id);

                                                    if (contactDeals.length > 0) {
                                                        await updateDeal({
                                                            ...contactDeals[0],
                                                            stage: newStage,
                                                            last_interaction: new Date().toISOString()
                                                        });
                                                    } else {
                                                        await addDeal({
                                                            contact_id: contact.id!,
                                                            value: 1,
                                                            stage: newStage,
                                                            last_interaction: new Date().toISOString()
                                                        });
                                                        await addRecentActivity({
                                                            timestamp: new Date().toISOString(),
                                                            type: 'DEAL_ADDED',
                                                            description: `New deal created for ${contact.name} at stage ${newStage}`
                                                        });
                                                    }
                                                }}
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-charcoal/20 ${getContactStage(contact.id!) === DealStage.Won ? 'bg-activity-green/10 text-activity-green' :
                                                            getContactStage(contact.id!) === DealStage.Lost ? 'bg-activity-red/10 text-activity-red' :
                                                            getContactStage(contact.id!) === DealStage.Proposal ? 'bg-activity-blue/10 text-activity-blue' :
                                                            getContactStage(contact.id!) === DealStage.Qualified ? 'bg-activity-purple/10 text-activity-purple' :
                                                            'bg-surface text-muted'
                                                        }`}
                                            >
                                                {Object.values(DealStage).map(stage => (
                                                    <option key={stage} value={stage}>{stage}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedContact(contact);
                                                }}
                                                className="p-1.5 text-charcoal hover:bg-surface transition-colors rounded-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-charcoal"
                                                title="View Details"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingContact(contact);
                                                }}
                                                className="p-1.5 text-charcoal hover:bg-surface transition-colors rounded-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-charcoal"
                                                title="Edit Contact"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteContact(contact);
                                                }}
                                                className="p-1.5 text-activity-red hover:bg-activity-red/10 transition-colors rounded-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-activity-red"
                                                title="Delete Contact"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    <line x1="10" y1="11" x2="10" y2="17" />
                                                    <line x1="14" y1="11" x2="14" y2="17" />
                                                </svg>
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {totalPages > 1 && (
                        <div className="flex justify-between items-center p-4 border-t border-border bg-surface">
                            <div className="text-sm text-muted">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)} of {filteredContacts.length} results
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="py-1 px-3 text-sm"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="py-1 px-3 text-sm"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-12 bg-canvas border border-dashed border-border">
                    <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="users" className="w-8 h-8 text-muted" />
                    </div>
                    <h3 className="text-lg font-medium text-charcoal mb-1">No contacts found</h3>
                    <p className="text-muted mb-6">Get started by adding a new contact or importing from CSV.</p>
                </div>
            )}
        </>
    );

    const handleDragStart = (e: React.DragEvent, contact: Contact) => {
        setDraggedContact(contact);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', contact.id!);
    };

    const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
        e.preventDefault();
        if (draggedContact && getContactStage(draggedContact.id!) !== stage) {
            setDragOverStage(stage);
        }
    };

    const handleDragLeave = () => {
        setDragOverStage(null);
    };

    const handleDrop = async (e: React.DragEvent, newStage: DealStage) => {
        e.preventDefault();
        if (draggedContact && getContactStage(draggedContact.id!) !== newStage) {
            await handleStageChange(draggedContact, newStage);
        }
        setDraggedContact(null);
        setDragOverStage(null);
    };

    const renderKanbanView = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {kanbanData.map(({ stage, contacts: stageContacts }) => {
                const { bg, border, badge } = stageColors[stage];
                const totalValue = stageContacts.reduce((sum, c) => {
                    const contactDeals = deals.filter(d => d.contact_id === c.id);
                    return sum + (contactDeals[0]?.value || 0);
                }, 0);
                const isDragOver = dragOverStage === stage;

                return (
                    <div
                        key={stage}
                        className={`${bg} border-2 ${isDragOver ? 'border-charcoal ring-2 ring-offset-2 ring-charcoal' : border} p-3 flex flex-col min-h-[280px] lg:min-h-[400px]`}
                        onDragOver={(e) => handleDragOver(e, stage)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, stage)}
                    >
                        <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${border}`}>
                            <div>
                                <h3 className="font-bold text-charcoal uppercase tracking-wider text-xs">{stage}</h3>
                                <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-xs font-bold rounded-full ${badge}`}>
                                    {stageContacts.length}
                                </span>
                            </div>
                            <span className="text-xs font-bold text-muted">
                                ${totalValue.toLocaleString()}
                            </span>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto">
                            {stageContacts.length > 0 ? (
                                stageContacts.map(contact => (
                                    <div
                                        key={contact.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, contact)}
                                        onClick={() => setSelectedContact(contact)}
                                        className={`bg-canvas border border-border p-2.5 cursor-grab active:cursor-grabbing hover:border-charcoal transition-all duration-150 ${draggedContact?.id === contact.id ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-center space-x-2 mb-1.5">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${getRandomColor(contact.name)}`}>
                                                {getInitials(contact.name)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-charcoal text-xs truncate">{contact.name}</p>
                                                <p className="text-[10px] text-muted truncate">{contact.company || 'No company'}</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted truncate pl-9">{contact.email}</p>
                                    </div>
                                ))
                            ) : (
                                <div className={`flex items-center justify-center h-16 text-xs font-medium border-2 border-dashed ${isDragOver ? 'border-charcoal bg-surface' : 'border-border'} text-muted`}>
                                    {isDragOver ? 'Drop here' : 'No contacts'}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full max-w-md">
                    <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        id="search-contacts"
                        name="search"
                        className="w-full pl-10 pr-4 py-2 border border-border bg-canvas rounded-none focus:outline-none focus:border-content focus:border-2 transition-colors text-charcoal"
                    />
                </div>
                <div className="flex space-x-2 w-full sm:w-auto justify-end items-center">
                    {/* View Toggle */}
                    <div className="flex border border-border overflow-hidden">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-charcoal text-canvas' : 'bg-canvas text-muted hover:bg-surface'}`}
                        >
                            <Icon name="document" className="w-4 h-4 inline mr-1" /> Table
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-charcoal text-canvas' : 'bg-canvas text-muted hover:bg-surface'}`}
                        >
                            <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="5" height="18" rx="1" />
                                <rect x="10" y="3" width="5" height="12" rx="1" />
                                <rect x="17" y="3" width="5" height="15" rx="1" />
                            </svg>
                            Kanban
                        </button>
                    </div>
                    <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
                        <Icon name="upload" className="w-4 h-4 mr-2" /> Import CSV
                    </Button>
                    <Button className="bg-charcoal text-canvas hover:bg-content border-charcoal" onClick={() => setIsAddContactModalOpen(true)}>
                        <Icon name="plus" className="w-4 h-4 mr-2" /> Add Contact
                    </Button>
                </div>
            </div>

            {viewMode === 'table' ? renderTableView() : renderKanbanView()}

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-canvas border border-border px-6 py-3 flex items-center space-x-4 animate-in slide-in-from-bottom-4 z-50">
                    <span className="text-sm font-medium text-charcoal">{selectedIds.size} selected</span>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted uppercase font-bold tracking-wider">Set Stage:</span>
                        <div className="flex space-x-1">
                            {Object.values(DealStage).filter(s => typeof s === 'string').map((stage) => (
                                <button
                                    key={stage}
                                    onClick={() => handleBulkStageUpdate(stage as DealStage)}
                                    className="px-2 py-1 text-xs rounded-full bg-surface hover:bg-border text-charcoal transition-colors"
                                >
                                    {stage}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <Button
                        variant="ghost"
                        onClick={handleBulkDelete}
                        className="text-activity-red hover:bg-activity-red/10"
                    >
                        <Icon name="trash" className="w-4 h-4 mr-2" /> Delete
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setSelectedIds(new Set())}
                        className="text-muted"
                    >
                        <Icon name="x" className="w-4 h-4" />
                    </Button>
                </div>
            )}

            <Modal isOpen={isAddContactModalOpen} onClose={() => setIsAddContactModalOpen(false)} title="Add New Contact">
                <ContactForm onClose={() => setIsAddContactModalOpen(false)} />
            </Modal>

            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Contacts">
                <ImportModal onClose={() => setIsImportModalOpen(false)} />
            </Modal>

            <Modal isOpen={!!editingContact} onClose={() => setEditingContact(null)} title="Edit Contact">
                {editingContact && (
                    <ContactForm
                        contact={editingContact}
                        onClose={() => setEditingContact(null)}
                        onSuccess={(updated) => {
                            setEditingContact(null);
                        }}
                    />
                )}
            </Modal>

            {selectedContact && (
                <Modal isOpen={!!selectedContact} onClose={() => setSelectedContact(null)} title={selectedContact.name}>
                    <div className="p-4">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${getRandomColor(selectedContact.name)}`}>
                                {getInitials(selectedContact.name)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-charcoal">{selectedContact.name}</h3>
                                <p className="text-muted">{selectedContact.company}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-3 bg-surface border border-border">
                                <label className="text-xs text-muted uppercase font-semibold">Email</label>
                                <p className="text-charcoal">{selectedContact.email}</p>
                            </div>
                            <div className="p-3 bg-surface border border-border">
                                <label className="text-xs text-muted uppercase font-semibold">Phone</label>
                                <p className="text-charcoal">{selectedContact.phone || '-'}</p>
                            </div>
                        </div>
                        <div className="border-t border-border pt-6">
                            <h4 className="text-sm font-semibold text-charcoal mb-3">Notes</h4>
                            {data.notes.filter(n => n.contact_id === selectedContact.id).length > 0 ? (
                                <div className="space-y-3 mb-4">
                                    {data.notes
                                        .filter(n => n.contact_id === selectedContact.id)
                                        .map(note => (
                                            <div key={note.id} className="p-3 bg-surface border border-border">
                                                <p className="text-sm text-charcoal">{note.content}</p>
                                                <p className="text-xs text-muted mt-1">
                                                    {new Date(note.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted mb-4">No notes yet.</p>
                            )}
                            <AddNoteForm contactId={selectedContact.id!} />
                        </div>
                    </div>
                </Modal>
            )}

            <Modal
                isOpen={!!contactToDelete}
                onClose={() => setContactToDelete(null)}
                title="Delete Contact"
            >
                <div className="space-y-4">
                    <p className="text-charcoal">
                        Are you sure you want to delete <strong>{contactToDelete?.name}</strong>? This action cannot be undone and will delete all associated deals.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setContactToDelete(null)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={confirmDelete}>
                            Delete Contact
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                title="Delete Contacts"
            >
                <div className="space-y-4">
                    <p className="text-charcoal">
                        Are you sure you want to delete <strong>{selectedIds.size}</strong> contacts? This action cannot be undone and will delete all associated deals.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={confirmBulkDelete}>
                            Delete All
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CRM;
