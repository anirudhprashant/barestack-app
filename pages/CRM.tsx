import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData, useCurrency } from '../dataStore';
import { Contact, DealStage, Deal } from '../types';
import { Button, Modal, Icon, IconButton, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, SearchInput } from '../components/ui';
import { ContactForm } from '../components/ContactForm';
import { ContactDetail } from '../components/ContactDetail';
import { ImportModal } from '../components/ImportModal';
import { EditableCell } from '../components/EditableCell';
import CrmHeader from '../components/CrmHeader';
import { useToast } from '../src/context/ToastContext';
import { formatMoney, initials, avatarColor } from '../src/lib/format';
import { toCSV, downloadText } from '../src/lib/csv';
import { dealStageClass } from '../components/badges';

const PAGE_SIZE = 25;

type ViewMode = 'table' | 'kanban';
type SortKey = 'recent' | 'name' | 'company';

const stageColumn: Record<DealStage, { bg: string; border: string }> = {
    [DealStage.Lead]: { bg: 'bg-surface', border: 'border-border' },
    [DealStage.Qualified]: { bg: 'bg-activity-purple/5', border: 'border-activity-purple/20' },
    [DealStage.Proposal]: { bg: 'bg-activity-blue/5', border: 'border-activity-blue/20' },
    [DealStage.Won]: { bg: 'bg-activity-green/5', border: 'border-activity-green/20' },
    [DealStage.Lost]: { bg: 'bg-activity-red/5', border: 'border-activity-red/20' },
};

const VIEW_KEY = 'barestack.crm.view';

const CRM: React.FC = () => {
    const { data, deleteContact, updateDeal, addDeal, addRecentActivity, updateContact } = useData();
    const currency = useCurrency();
    const { toast, confirm } = useToast();
    const { contacts, deals } = data;
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('recent');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        try { return (localStorage.getItem(VIEW_KEY) as ViewMode) || 'table'; } catch { return 'table'; }
    });
    const [draggedContact, setDraggedContact] = useState<Contact | null>(null);
    const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

    useEffect(() => {
        try { localStorage.setItem(VIEW_KEY, viewMode); } catch { /* private mode */ }
    }, [viewMode]);

    // Deep links from search / command palette: /crm?contact=<id>, /crm?new=1
    useEffect(() => {
        const id = searchParams.get('contact');
        if (id && contacts.some(c => c.id === id)) setSelectedContactId(id);
        if (searchParams.get('new')) setIsAddContactModalOpen(true);
        if (id || searchParams.get('new')) setSearchParams({}, { replace: true });
    }, [searchParams, contacts, setSearchParams]);

    // Latest deal per contact (deals arrive newest first).
    const latestDeal = useMemo(() => {
        const map = new Map<string, Deal>();
        for (const d of deals) if (!map.has(d.contact_id)) map.set(d.contact_id, d);
        return map;
    }, [deals]);
    const getContactStage = (contactId: string) => latestDeal.get(contactId)?.stage || DealStage.Lead;

    const allTags = useMemo(() => {
        const counts = new Map<string, number>();
        for (const c of contacts) for (const t of c.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
        return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    }, [contacts]);

    const filteredContacts = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const list = contacts.filter(contact =>
            (!tagFilter || contact.tags?.includes(tagFilter)) &&
            (!q ||
                contact.name.toLowerCase().includes(q) ||
                contact.email?.toLowerCase().includes(q) ||
                contact.phone?.toLowerCase().includes(q) ||
                contact.company?.toLowerCase().includes(q) ||
                contact.tags?.some(t => t.toLowerCase().includes(q)))
        );
        if (sortKey === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
        if (sortKey === 'company') list.sort((a, b) => (a.company || '~').localeCompare(b.company || '~') || a.name.localeCompare(b.name));
        return list;
    }, [contacts, searchTerm, tagFilter, sortKey]);

    // Any filter change sends you back to page 1 (otherwise you can land on an
    // empty page past the end of the new result set).
    useEffect(() => { setCurrentPage(1); }, [searchTerm, tagFilter, sortKey]);

    const totalPages = Math.max(1, Math.ceil(filteredContacts.length / PAGE_SIZE));
    const page = Math.min(currentPage, totalPages);
    const paginatedContacts = filteredContacts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const selectedContact = selectedContactId ? contacts.find(c => c.id === selectedContactId) || null : null;

    const saveField = async (contact: Contact, field: keyof Contact, value: string) => {
        try {
            await updateContact({ id: contact.id!, [field]: value });
        } catch (error) {
            toast(`Could not update ${String(field)}.`, 'error');
            throw error;
        }
    };

    const requestDelete = async (contact: Contact) => {
        const counts = {
            deals: deals.filter(d => d.contact_id === contact.id).length,
            projects: data.projects.filter(p => p.client_id === contact.id).length,
            invoices: data.invoices.filter(i => i.client_id === contact.id).length,
        };
        const extra = Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${n === 1 ? k.slice(0, -1) : k}`);
        const ok = await confirm({
            title: 'Delete contact',
            message: `Delete ${contact.name}?${extra.length ? ` This also deletes their ${extra.join(', ')}, plus notes and project tasks/time.` : ''} This cannot be undone.`,
            danger: true,
            confirmLabel: 'Delete',
        });
        if (!ok) return;
        try {
            await deleteContact(contact.id!);
            if (selectedContactId === contact.id) setSelectedContactId(null);
            setSelectedIds(prev => { const n = new Set(prev); n.delete(contact.id!); return n; });
            toast('Contact deleted', 'success');
        } catch (error) {
            console.error('Failed to delete contact:', error);
            toast('Failed to delete contact. Please try again.', 'error');
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? new Set(paginatedContacts.map(c => c.id!).filter(Boolean)) : new Set());
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const confirmBulkDelete = async () => {
        const ok = await confirm({
            title: 'Delete contacts',
            message: `Delete ${selectedIds.size} contact${selectedIds.size === 1 ? '' : 's'} along with their deals, projects, invoices and notes? This cannot be undone.`,
            danger: true,
            confirmLabel: 'Delete all',
        });
        if (!ok) return;
        let failed = 0;
        for (const id of selectedIds) {
            try {
                await deleteContact(id);
            } catch {
                failed++;
            }
        }
        setSelectedIds(new Set());
        toast(failed ? `${failed} contact(s) could not be deleted.` : 'Contacts deleted', failed ? 'error' : 'success');
    };

    const setStage = async (contact: Contact, stage: DealStage) => {
        const existing = latestDeal.get(contact.id!);
        if (existing) {
            if (existing.stage === stage) return;
            await updateDeal({ id: existing.id!, stage, last_interaction: new Date().toISOString() });
            if (stage === DealStage.Won) addRecentActivity({ type: 'DEAL_WON', description: `Deal won with ${contact.name}` });
        } else {
            await addDeal({ contact_id: contact.id!, title: '', value: 0, stage, last_interaction: new Date().toISOString() });
            addRecentActivity({ type: 'DEAL_ADDED', description: `New deal created for ${contact.name} at stage ${stage}` });
        }
    };

    const handleStageChange = async (contact: Contact, stage: DealStage) => {
        try {
            await setStage(contact, stage);
        } catch (error) {
            console.error('Failed to update stage:', error);
            toast('Could not update the stage.', 'error');
        }
    };

    const handleBulkStageUpdate = async (stage: DealStage) => {
        let failed = 0;
        for (const id of selectedIds) {
            const contact = contacts.find(c => c.id === id);
            if (!contact) continue;
            try { await setStage(contact, stage); } catch { failed++; }
        }
        setSelectedIds(new Set());
        toast(failed ? `${failed} stage update(s) failed.` : 'Stages updated', failed ? 'error' : 'success');
    };

    const exportContacts = (list: Contact[]) => {
        const rows = list.map(c => ({
            name: c.name,
            email: c.email,
            phone: c.phone,
            company: c.company,
            tags: (c.tags || []).join(', '),
            stage: getContactStage(c.id!),
        }));
        downloadText(toCSV(rows), `contacts_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const kanbanData = useMemo(() => Object.values(DealStage).map(stage => ({
        stage,
        contacts: filteredContacts.filter(c => getContactStage(c.id!) === stage),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    })), [filteredContacts, latestDeal]);

    const handleDrop = async (e: React.DragEvent, newStage: DealStage) => {
        e.preventDefault();
        if (draggedContact && getContactStage(draggedContact.id!) !== newStage) {
            await handleStageChange(draggedContact, newStage);
        }
        setDraggedContact(null);
        setDragOverStage(null);
    };

    const renderTableView = () => (
        filteredContacts.length > 0 ? (
            <div className="bg-canvas border border-border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <input
                                    type="checkbox"
                                    aria-label="Select all contacts on this page"
                                    className="accent-charcoal"
                                    checked={paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id!))}
                                    onChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="hidden lg:table-cell">Phone</TableHead>
                            <TableHead className="hidden md:table-cell">Company</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedContacts.map(contact => {
                            const stage = getContactStage(contact.id!);
                            return (
                                <TableRow key={contact.id}>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            aria-label={`Select ${contact.name}`}
                                            className="accent-charcoal"
                                            checked={!!contact.id && selectedIds.has(contact.id)}
                                            onChange={() => contact.id && handleSelectOne(contact.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3 min-w-[160px]">
                                            <button
                                                onClick={() => setSelectedContactId(contact.id!)}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${avatarColor(contact.name)}`}
                                                aria-label={`Open ${contact.name}`}
                                            >
                                                {initials(contact.name)}
                                            </button>
                                            <div className="min-w-0 flex-1">
                                                <EditableCell value={contact.name} required onSave={(val) => saveField(contact, 'name', val)} className="font-medium text-charcoal" />
                                                {contact.tags?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 -mt-0.5">
                                                        {contact.tags.slice(0, 3).map(t => (
                                                            <button key={t} onClick={() => setTagFilter(t)} className="text-[10px] font-semibold px-1.5 bg-surface border border-border text-muted hover:text-charcoal">{t}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <EditableCell value={contact.email} required type="email" onSave={(val) => saveField(contact, 'email', val)} className="text-sm text-muted" />
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        <EditableCell value={contact.phone || ''} type="tel" placeholder="Add phone" onSave={(val) => saveField(contact, 'phone', val)} className="text-sm text-muted" />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <EditableCell value={contact.company || ''} placeholder="Add company" onSave={(val) => saveField(contact, 'company', val)} className={contact.company ? 'text-charcoal font-medium' : 'text-sm text-muted'} />
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            aria-label={`Stage for ${contact.name}`}
                                            value={stage}
                                            onChange={(e) => handleStageChange(contact, e.target.value as DealStage)}
                                            className={`px-2.5 py-1 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-charcoal/20 ${dealStageClass[stage]}`}
                                        >
                                            {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-0.5">
                                            <IconButton icon="eye" label="View details" onClick={() => setSelectedContactId(contact.id!)} />
                                            {contact.email && (
                                                <a href={`mailto:${contact.email}`} title="Send email" aria-label={`Email ${contact.name}`} className="p-1.5 text-charcoal hover:bg-surface transition-colors hidden sm:inline-flex">
                                                    <Icon name="mail" className="w-[18px] h-[18px]" />
                                                </a>
                                            )}
                                            <IconButton icon="trash" label="Delete contact" tone="danger" onClick={() => requestDelete(contact)} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center p-4 border-t border-border bg-surface">
                    <div className="text-sm text-muted">
                        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredContacts.length)} of {filteredContacts.length}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" onClick={() => setCurrentPage(Math.max(1, page - 1))} disabled={page === 1} className="py-1 px-3 text-sm">Previous</Button>
                            <span className="text-sm text-muted tabular-nums">{page} / {totalPages}</span>
                            <Button variant="secondary" onClick={() => setCurrentPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="py-1 px-3 text-sm">Next</Button>
                        </div>
                    )}
                </div>
            </div>
        ) : contacts.length === 0 ? (
            <EmptyState icon="users" title="No contacts yet" description="Add your first client or import a spreadsheet of contacts.">
                <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}><Icon name="upload" className="w-4 h-4 mr-2" />Import CSV</Button>
                <Button onClick={() => setIsAddContactModalOpen(true)}><Icon name="plus" className="w-4 h-4 mr-2" />Add Contact</Button>
            </EmptyState>
        ) : (
            <EmptyState icon="search" title="No contacts match" description="Try a different search or clear the tag filter." />
        )
    );

    const renderKanbanView = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {kanbanData.map(({ stage, contacts: stageContacts }) => {
                const { bg, border } = stageColumn[stage];
                const totalValue = stageContacts.reduce((sum, c) => sum + (latestDeal.get(c.id!)?.value || 0), 0);
                const isDragOver = dragOverStage === stage;

                return (
                    <div
                        key={stage}
                        className={`${bg} border-2 ${isDragOver ? 'border-charcoal' : border} p-3 flex flex-col min-h-[200px] lg:min-h-[400px]`}
                        onDragOver={(e) => { e.preventDefault(); if (draggedContact && getContactStage(draggedContact.id!) !== stage) setDragOverStage(stage); }}
                        onDragLeave={() => setDragOverStage(null)}
                        onDrop={(e) => handleDrop(e, stage)}
                    >
                        <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${border}`}>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-charcoal uppercase tracking-wider text-xs font-body">{stage}</h3>
                                <span className={`px-1.5 py-0.5 text-xs font-bold ${dealStageClass[stage]}`}>{stageContacts.length}</span>
                            </div>
                            <span className="text-xs font-bold text-muted tabular-nums">{formatMoney(totalValue, currency, { compact: true })}</span>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto">
                            {stageContacts.length > 0 ? stageContacts.map(contact => (
                                <div
                                    key={contact.id}
                                    draggable
                                    onDragStart={(e) => { setDraggedContact(contact); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', contact.id!); }}
                                    onDragEnd={() => { setDraggedContact(null); setDragOverStage(null); }}
                                    onClick={() => setSelectedContactId(contact.id!)}
                                    className={`bg-canvas border border-border p-2.5 cursor-grab active:cursor-grabbing hover:border-charcoal transition-all duration-150 ${draggedContact?.id === contact.id ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${avatarColor(contact.name)}`}>
                                            {initials(contact.name)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-charcoal text-xs truncate">{contact.name}</p>
                                            <p className="text-[10px] text-muted truncate">{contact.company || 'No company'}</p>
                                        </div>
                                    </div>
                                    {(latestDeal.get(contact.id!)?.value || 0) > 0 && (
                                        <p className="text-[11px] font-bold text-charcoal pl-9 tabular-nums">{formatMoney(latestDeal.get(contact.id!)!.value, currency)}</p>
                                    )}
                                </div>
                            )) : (
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
            <CrmHeader>
                <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
                    <Icon name="upload" className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Import</span>
                </Button>
                <Button onClick={() => setIsAddContactModalOpen(true)}>
                    <Icon name="plus" className="w-4 h-4 mr-2" /> Add Contact
                </Button>
            </CrmHeader>

            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search name, email, company, tag..." className="w-full md:max-w-sm" id="search-contacts" />
                <div className="flex items-center gap-2 md:ml-auto">
                    <select aria-label="Sort contacts" value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="text-sm border border-border bg-canvas px-2 py-2 focus:outline-none focus:border-content">
                        <option value="recent">Newest first</option>
                        <option value="name">Name A–Z</option>
                        <option value="company">Company A–Z</option>
                    </select>
                    <div className="flex border border-border overflow-hidden" role="tablist" aria-label="View">
                        <button role="tab" aria-selected={viewMode === 'table'} onClick={() => setViewMode('table')} className={`px-3 py-2 text-sm font-medium transition-colors flex items-center ${viewMode === 'table' ? 'bg-charcoal text-canvas' : 'bg-canvas text-muted hover:bg-surface'}`}>
                            <Icon name="list" className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Table</span>
                        </button>
                        <button role="tab" aria-selected={viewMode === 'kanban'} onClick={() => setViewMode('kanban')} className={`px-3 py-2 text-sm font-medium transition-colors flex items-center ${viewMode === 'kanban' ? 'bg-charcoal text-canvas' : 'bg-canvas text-muted hover:bg-surface'}`}>
                            <Icon name="layers" className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Board</span>
                        </button>
                    </div>
                    <IconButton icon="download" label="Export contacts to CSV" onClick={() => exportContacts(filteredContacts)} disabled={filteredContacts.length === 0} />
                </div>
            </div>

            {allTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <Icon name="tag" className="w-3.5 h-3.5 text-muted mr-0.5" />
                    {allTags.map(([tag, count]) => (
                        <button
                            key={tag}
                            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                            className={`text-xs font-semibold px-2 py-1 border transition-colors ${tagFilter === tag ? 'bg-charcoal text-canvas border-charcoal' : 'bg-canvas text-muted border-border hover:border-charcoal hover:text-charcoal'}`}
                        >
                            {tag} <span className="opacity-60">{count}</span>
                        </button>
                    ))}
                    {tagFilter && !allTags.some(([t]) => t === tagFilter) && (
                        <button onClick={() => setTagFilter(null)} className="text-xs font-semibold px-2 py-1 border bg-charcoal text-canvas border-charcoal">{tagFilter} ✕</button>
                    )}
                </div>
            )}

            {viewMode === 'table' ? renderTableView() : renderKanbanView()}

            {selectedIds.size > 0 && (
                <div className="fixed bottom-4 left-4 right-4 md:left-[calc(50%+110px)] md:right-auto md:-translate-x-1/2 bg-canvas border border-charcoal shadow-hard px-4 py-3 flex flex-wrap items-center gap-3 z-40">
                    <span className="text-sm font-semibold text-charcoal">{selectedIds.size} selected</span>
                    <div className="h-4 w-px bg-border hidden sm:block" />
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-muted uppercase font-bold tracking-wider">Stage:</span>
                        {Object.values(DealStage).map(stage => (
                            <button key={stage} onClick={() => handleBulkStageUpdate(stage)} className={`px-2 py-1 text-xs font-semibold hover:ring-1 hover:ring-charcoal ${dealStageClass[stage]}`}>
                                {stage}
                            </button>
                        ))}
                    </div>
                    <div className="h-4 w-px bg-border hidden sm:block" />
                    <Button variant="ghost" className="py-1 px-2 text-sm" onClick={() => exportContacts(contacts.filter(c => selectedIds.has(c.id!)))}>
                        <Icon name="download" className="w-4 h-4 mr-1" /> Export
                    </Button>
                    <Button variant="ghost" onClick={confirmBulkDelete} className="py-1 px-2 text-sm text-activity-red hover:bg-activity-red/10">
                        <Icon name="trash" className="w-4 h-4 mr-1" /> Delete
                    </Button>
                    <IconButton icon="x" label="Clear selection" onClick={() => setSelectedIds(new Set())} />
                </div>
            )}

            <Modal isOpen={isAddContactModalOpen} onClose={() => setIsAddContactModalOpen(false)} title="Add New Contact">
                <ContactForm onClose={() => setIsAddContactModalOpen(false)} />
            </Modal>

            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Contacts">
                <ImportModal onClose={() => setIsImportModalOpen(false)} />
            </Modal>

            <Modal isOpen={!!selectedContact} onClose={() => setSelectedContactId(null)} title="Contact" maxWidthClass="max-w-2xl">
                {selectedContact && <ContactDetail contact={selectedContact} onDelete={requestDelete} />}
            </Modal>
        </div>
    );
};

export default CRM;
