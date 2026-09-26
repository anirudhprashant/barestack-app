import React, { useState, FC, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, useCurrency } from '../dataStore';
import { Contact, DealStage, Note, InvoiceStatus } from '../types';
import { Button, Icon, IconButton, Modal, Textarea } from './ui';
import { useToast } from '../src/context/ToastContext';
import { formatMoney, initials, avatarColor } from '../src/lib/format';
import { formatDateOnly, formatDateTime } from '../src/lib/dates';
import { invoiceTotal, effectiveStatus, isUnpaid } from '../src/lib/invoice';
import { DealForm } from './DealForm';
import { ProjectForm } from './ProjectForm';
import { InvoiceForm } from './InvoiceForm';
import { ContactForm } from './ContactForm';
import { invoiceStatusClass, dealStageClass, projectStatusClass } from './badges';

const NoteItem: FC<{ note: Note }> = ({ note }) => {
    const { updateNote, deleteNote } = useData();
    const { toast, confirm } = useToast();
    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState(note.content);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!content.trim()) return;
        setSaving(true);
        try {
            await updateNote({ id: note.id, content: content.trim() });
            setEditing(false);
        } catch {
            toast('Could not update note', 'error');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!await confirm({ title: 'Delete note', message: 'Delete this note?', danger: true, confirmLabel: 'Delete' })) return;
        try {
            await deleteNote(note.id);
        } catch {
            toast('Could not delete note', 'error');
        }
    };

    if (editing) {
        return (
            <div className="p-3 bg-surface border border-charcoal space-y-2">
                <Textarea id={`edit-note-${note.id}`} value={content} onChange={e => setContent(e.target.value)} rows={3} placeholder="Note" />
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" className="text-sm py-1" onClick={() => { setContent(note.content); setEditing(false); }}>Cancel</Button>
                    <Button className="text-sm py-1" onClick={save} disabled={saving || !content.trim()}>{saving ? 'Saving...' : 'Save'}</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 bg-surface border border-border group">
            <p className="text-sm text-charcoal whitespace-pre-wrap break-words">{note.content}</p>
            <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted">{note.created ? formatDateTime(note.created) : ''}</p>
                <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <IconButton icon="edit" label="Edit note" onClick={() => setEditing(true)} />
                    <IconButton icon="trash" label="Delete note" tone="danger" onClick={remove} />
                </div>
            </div>
        </div>
    );
};

const AddNoteForm: FC<{ contactId: string }> = ({ contactId }) => {
    const { addNote } = useData();
    const { toast } = useToast();
    const [noteContent, setNoteContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim()) return;
        setLoading(true);
        try {
            await addNote({ contact_id: contactId, content: noteContent.trim() });
            setNoteContent('');
        } catch (error) {
            console.error('Failed to add note:', error);
            toast('Failed to add note. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
                id={`note-${contactId}`}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e); }}
                rows={3}
                placeholder="Add a note... (Ctrl+Enter to save)"
            />
            <Button type="submit" variant="primary" disabled={loading || !noteContent.trim()} className="text-sm">
                {loading ? 'Saving...' : 'Add Note'}
            </Button>
        </form>
    );
};

type Pane = 'overview' | 'deals' | 'projects' | 'invoices';

export const ContactDetail: FC<{ contact: Contact; onDelete: (c: Contact) => void }> = ({ contact, onDelete }) => {
    const { data } = useData();
    const currency = useCurrency();
    const navigate = useNavigate();
    const [pane, setPane] = useState<Pane>('overview');
    const [modal, setModal] = useState<null | 'deal' | 'project' | 'invoice' | 'edit'>(null);

    const related = useMemo(() => {
        const deals = data.deals.filter(d => d.contact_id === contact.id);
        const projects = data.projects.filter(p => p.client_id === contact.id);
        const invoices = data.invoices.filter(i => i.client_id === contact.id);
        const notes = data.notes.filter(n => n.contact_id === contact.id);
        const paid = invoices.filter(i => i.status === InvoiceStatus.Paid).reduce((s, i) => s + invoiceTotal(i), 0);
        const outstanding = invoices.filter(isUnpaid).reduce((s, i) => s + invoiceTotal(i), 0);
        const pipeline = deals.filter(d => d.stage !== DealStage.Won && d.stage !== DealStage.Lost).reduce((s, d) => s + (d.value || 0), 0);
        return { deals, projects, invoices, notes, paid, outstanding, pipeline };
    }, [data, contact.id]);

    const panes: { id: Pane; label: string; count?: number }[] = [
        { id: 'overview', label: 'Notes', count: related.notes.length },
        { id: 'deals', label: 'Deals', count: related.deals.length },
        { id: 'projects', label: 'Projects', count: related.projects.length },
        { id: 'invoices', label: 'Invoices', count: related.invoices.length },
    ];

    return (
        <div>
            <div className="flex items-start gap-4 mb-5 min-w-0">
                <div className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center font-bold text-xl ${avatarColor(contact.name)}`}>
                    {initials(contact.name)}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-bold text-charcoal truncate">{contact.name}</h3>
                    <p className="text-muted truncate">{contact.company || 'No company'}</p>
                    {contact.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {contact.tags.map(t => (
                                <span key={t} className="text-[11px] font-semibold px-1.5 py-0.5 bg-surface border border-border text-muted">{t}</span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-1 shrink-0">
                    <IconButton icon="edit" label="Edit contact" onClick={() => setModal('edit')} />
                    <IconButton icon="trash" label="Delete contact" tone="danger" onClick={() => onDelete(contact)} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div className="min-w-0 px-3 py-2 bg-surface border border-border">
                    <p className="text-xs text-muted uppercase font-semibold tracking-wide">Email</p>
                    <p className="text-charcoal text-sm break-words">
                        {contact.email ? <a href={`mailto:${contact.email}`} className="hover:text-accent transition-colors">{contact.email}</a> : '—'}
                    </p>
                </div>
                <div className="min-w-0 px-3 py-2 bg-surface border border-border">
                    <p className="text-xs text-muted uppercase font-semibold tracking-wide">Phone</p>
                    <p className="text-charcoal text-sm break-words">
                        {contact.phone ? <a href={`tel:${contact.phone}`} className="hover:text-accent transition-colors">{contact.phone}</a> : '—'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                    { label: 'Paid', value: related.paid },
                    { label: 'Outstanding', value: related.outstanding },
                    { label: 'Open deals', value: related.pipeline },
                ].map(s => (
                    <div key={s.label} className="border border-border p-2.5 text-center">
                        <p className="text-sm sm:text-base font-bold text-charcoal tabular-nums truncate">{formatMoney(s.value, currency, { compact: s.value >= 100000 })}</p>
                        <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
                <Button variant="secondary" className="text-xs py-1.5 px-3" onClick={() => setModal('deal')}><Icon name="trending-up" className="w-3.5 h-3.5 mr-1.5" />Deal</Button>
                <Button variant="secondary" className="text-xs py-1.5 px-3" onClick={() => setModal('project')}><Icon name="clipboard" className="w-3.5 h-3.5 mr-1.5" />Project</Button>
                <Button variant="secondary" className="text-xs py-1.5 px-3" onClick={() => setModal('invoice')}><Icon name="document" className="w-3.5 h-3.5 mr-1.5" />Invoice</Button>
            </div>

            <div className="flex border-b border-border mb-4 overflow-x-auto scrollbar-hide">
                {panes.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setPane(p.id)}
                        className={`px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${pane === p.id ? 'border-charcoal text-charcoal' : 'border-transparent text-muted hover:text-charcoal'}`}
                    >
                        {p.label}{p.count ? <span className="ml-1.5 text-xs text-muted">{p.count}</span> : null}
                    </button>
                ))}
            </div>

            {pane === 'overview' && (
                <div>
                    {related.notes.length > 0 ? (
                        <div className="space-y-3 mb-4">
                            {related.notes.map(note => <NoteItem key={note.id} note={note} />)}
                        </div>
                    ) : (
                        <p className="text-sm text-muted mb-4">No notes yet.</p>
                    )}
                    <AddNoteForm contactId={contact.id!} />
                </div>
            )}

            {pane === 'deals' && (
                related.deals.length ? (
                    <ul className="divide-y divide-border/50 border border-border">
                        {related.deals.map(d => (
                            <li key={d.id} className="flex items-center justify-between gap-3 p-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-charcoal truncate">{d.title || 'Untitled deal'}</p>
                                    <p className="text-xs text-muted">{d.expected_close ? `Close ${formatDateOnly(d.expected_close)}` : 'No close date'}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold tabular-nums">{formatMoney(d.value, currency)}</p>
                                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 ${dealStageClass[d.stage]}`}>{d.stage}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted">No deals yet.</p>
            )}

            {pane === 'projects' && (
                related.projects.length ? (
                    <ul className="divide-y divide-border/50 border border-border">
                        {related.projects.map(p => (
                            <li key={p.id}>
                                <button onClick={() => navigate(`/projects/${p.id}`)} className="w-full flex items-center justify-between gap-3 p-3 hover:bg-surface text-left">
                                    <span className="text-sm font-semibold text-charcoal truncate">{p.name}</span>
                                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 shrink-0 ${projectStatusClass[p.status]}`}>{p.status}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted">No projects yet.</p>
            )}

            {pane === 'invoices' && (
                related.invoices.length ? (
                    <ul className="divide-y divide-border/50 border border-border">
                        {related.invoices.map(i => {
                            const st = effectiveStatus(i);
                            return (
                                <li key={i.id}>
                                    <button onClick={() => navigate(`/invoices?open=${i.id}`)} className="w-full flex items-center justify-between gap-3 p-3 hover:bg-surface text-left">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-charcoal">{i.invoice_number}</p>
                                            <p className="text-xs text-muted">Due {formatDateOnly(i.due_date)}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold tabular-nums">{formatMoney(invoiceTotal(i), currency)}</p>
                                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 ${invoiceStatusClass[st]}`}>{st}</span>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : <p className="text-sm text-muted">No invoices yet.</p>
            )}

            <Modal isOpen={modal === 'edit'} onClose={() => setModal(null)} title="Edit Contact">
                <ContactForm contact={contact} onClose={() => setModal(null)} />
            </Modal>
            <Modal isOpen={modal === 'deal'} onClose={() => setModal(null)} title={`New deal for ${contact.name}`}>
                <DealForm initialContactId={contact.id} onClose={() => { setModal(null); setPane('deals'); }} />
            </Modal>
            <Modal isOpen={modal === 'project'} onClose={() => setModal(null)} title={`New project for ${contact.name}`}>
                <ProjectForm initialClientId={contact.id} onClose={() => { setModal(null); setPane('projects'); }} />
            </Modal>
            <Modal isOpen={modal === 'invoice'} onClose={() => setModal(null)} title={`New invoice for ${contact.name}`} maxWidthClass="max-w-3xl">
                <InvoiceForm initialClientId={contact.id} onClose={() => { setModal(null); setPane('invoices'); }} />
            </Modal>
        </div>
    );
};
