import React, { useState } from 'react';
import { Button, Icon, Modal, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { useData } from '../dataStore';
import { ImportBatch } from '../types';
import CrmHeader from '../components/CrmHeader';
import { ImportModal } from '../components/ImportModal';
import { useToast } from '../src/context/ToastContext';
import { formatDateTime } from '../src/lib/dates';

const Imports: React.FC = () => {
    const { data, undoImport } = useData();
    const { toast } = useToast();
    const { importBatches } = data;
    const [undoingBatch, setUndoingBatch] = useState<ImportBatch | null>(null);
    const [loading, setLoading] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    // How many contacts from each batch still exist (some may have been deleted by hand).
    const remaining = (batchId: string) => data.contacts.filter(c => c.import_batch_id === batchId).length;

    const handleUndoConfirm = async () => {
        if (!undoingBatch) return;
        setLoading(true);
        try {
            await undoImport(undoingBatch.id);
            toast('Import undone', 'success');
        } catch (error) {
            console.error('Failed to undo import:', error);
            toast('Failed to undo import. Please try again.', 'error');
        } finally {
            setLoading(false);
            setUndoingBatch(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <CrmHeader>
                <Button onClick={() => setImportOpen(true)}>
                    <Icon name="upload" className="w-4 h-4 mr-2" /> Import Contacts
                </Button>
            </CrmHeader>

            {importBatches.length > 0 ? (
                <div className="bg-canvas border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File</TableHead>
                                <TableHead>Imported</TableHead>
                                <TableHead className="text-right">Contacts</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {importBatches.map(batch => {
                                const left = remaining(batch.id);
                                return (
                                    <TableRow key={batch.id}>
                                        <TableCell>
                                            <span className="flex items-center gap-2 font-medium">
                                                <Icon name="file" className="w-4 h-4 text-muted shrink-0" />
                                                <span className="truncate max-w-[260px]">{batch.file_name}</span>
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted whitespace-nowrap">{formatDateTime(batch.created)}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {left}{left !== batch.contact_count && <span className="text-muted"> / {batch.contact_count}</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="secondary" className="text-sm py-1 px-3 ml-auto" onClick={() => setUndoingBatch(batch)}>
                                                Undo import
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <EmptyState icon="upload" title="No imports yet" description="Import contacts from a CSV or Excel file. Every import can be undone from here.">
                    <Button onClick={() => setImportOpen(true)}><Icon name="upload" className="w-4 h-4 mr-2" />Import Contacts</Button>
                </EmptyState>
            )}

            <Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Import Contacts">
                <ImportModal onClose={() => setImportOpen(false)} />
            </Modal>

            <Modal isOpen={!!undoingBatch} onClose={() => setUndoingBatch(null)} title="Undo Import">
                <p className="mb-6 text-charcoal">
                    Undo the import of <strong>{undoingBatch ? remaining(undoingBatch.id) : 0} contacts</strong> from “{undoingBatch?.file_name}”?
                    This permanently deletes those contacts along with their deals, projects, invoices and notes.
                </p>
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setUndoingBatch(null)} disabled={loading}>Cancel</Button>
                    <Button variant="danger" onClick={handleUndoConfirm} disabled={loading}>
                        {loading ? 'Deleting...' : 'Yes, undo import'}
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default Imports;
