import React, { useState } from 'react';
import { Card, Button, Modal } from '../components/ui';
import { useData } from '../dataStore';
import { ImportBatch } from '../types';
import { format } from 'date-fns';
import CrmHeader from '../components/CrmHeader';


const Imports: React.FC = () => {
    const { data, undoImport } = useData();
    const { importBatches } = data;
    const [undoingBatch, setUndoingBatch] = useState<ImportBatch | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUndoConfirm = async () => {
        if (!undoingBatch) return;
        setLoading(true);
        try {
            await undoImport(undoingBatch.id);
        } catch (error) {
            console.error("Failed to undo import:", error);
            // Here you would show a toast to the user
        } finally {
            setLoading(false);
            setUndoingBatch(null);
        }
    };

    return (
        <div>
            <CrmHeader />
            <Card>
                <h3 className="text-2xl font-bold mb-4">Import History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-[3px] border-brand-dark">
                                <th className="p-4 font-black">File Name</th>
                                <th className="p-4 font-black">Date</th>
                                <th className="p-4 font-black">Contacts Imported</th>
                                <th className="p-4 font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {importBatches.length > 0 ? (
                                importBatches.map(batch => (
                                    <tr key={batch.id} className="border-b-2 border-brand-light last:border-b-0">
                                        <td className="p-4 font-bold">{batch.file_name}</td>
                                        <td className="p-4">{format(new Date(batch.created_at), 'PPp')}</td>
                                        <td className="p-4">{batch.contact_count}</td>
                                        <td className="p-4">
                                            <Button
                                                variant="secondary"
                                                onClick={() => setUndoingBatch(batch)}
                                            >
                                                Undo Import
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center p-8 text-brand-dark opacity-70 font-semibold">
                                        You haven't imported any contacts yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={!!undoingBatch} onClose={() => setUndoingBatch(null)} title="Confirm Undo Import">
                <p className="mb-6">
                    Are you sure you want to undo the import of <strong>{undoingBatch?.contact_count} contacts</strong> from the file "{undoingBatch?.file_name}"? This action will permanently delete these contacts and cannot be undone.
                </p>
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setUndoingBatch(null)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleUndoConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Deleting...' : 'Yes, Undo Import'}
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default Imports;
