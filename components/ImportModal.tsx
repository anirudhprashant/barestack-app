import React, { useState, FC } from 'react';
import { useData } from '../dataStore';
import { useToast } from '../src/context/ToastContext';
import { Contact, Creatable, ImportBatch } from '../types';
import { Button, Icon } from './ui';

type Resolution = 'create' | 'update' | 'skip';

interface DuplicateHandlerProps {
    duplicates: Contact[];
    onConfirm: (resolutions: Record<string, Resolution>) => void;
    onCancel: () => void;
}

const DuplicateHandler: FC<DuplicateHandlerProps> = ({ duplicates, onConfirm, onCancel }) => {
    const { toast } = useToast();
    const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});

    const handleResolutionChange = (email: string, resolution: Resolution) => {
        setResolutions(prev => ({ ...prev, [email]: resolution }));
    };

    const handleConfirm = () => {
        // Ensure all duplicates have a resolution
        const allResolved = duplicates.every(d => resolutions[d.email!]);
        if (!allResolved) {
            toast('Please resolve all duplicates before proceeding.', 'error');
            return;
        }
        onConfirm(resolutions);
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted">We found {duplicates.length} contact{duplicates.length === 1 ? '' : 's'} that already exist in your CRM. How would you like to handle them?</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-muted uppercase tracking-wider">Apply to all:</span>
                {(['skip', 'update', 'create'] as Resolution[]).map(r => (
                    <button
                        key={r}
                        type="button"
                        onClick={() => setResolutions(Object.fromEntries(duplicates.map(d => [d.email, r])))}
                        className="px-2.5 py-1 border border-border hover:border-charcoal text-charcoal font-semibold"
                    >
                        {r === 'skip' ? 'Skip' : r === 'update' ? 'Update' : 'Create new'}
                    </button>
                ))}
            </div>
            <div className="max-h-60 overflow-y-auto border border-border">
                <table className="w-full text-left text-sm">
                    <thead className="bg-surface sticky top-0">
                        <tr>
                            <th className="p-2 font-semibold text-charcoal">Contact</th>
                            <th className="p-2 font-semibold text-charcoal">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {duplicates.map(dup => (
                            <tr key={dup.email}>
                                <td className="p-2">
                                    <div className="font-medium">{dup.name}</div>
                                    <div className="text-xs text-muted">{dup.email}</div>
                                </td>
                                <td className="p-2">
                                    <div className="flex space-x-2">
                                        <label className="flex items-center space-x-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`res-${dup.email}`}
                                                checked={resolutions[dup.email!] === 'skip'}
                                                onChange={() => handleResolutionChange(dup.email!, 'skip')}
                                                className="accent-charcoal"
                                            />
                                            <span>Skip</span>
                                        </label>
                                        <label className="flex items-center space-x-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`res-${dup.email}`}
                                                checked={resolutions[dup.email!] === 'update'}
                                                onChange={() => handleResolutionChange(dup.email!, 'update')}
                                                className="accent-charcoal"
                                            />
                                            <span>Update</span>
                                        </label>
                                        <label className="flex items-center space-x-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`res-${dup.email}`}
                                                checked={resolutions[dup.email!] === 'create'}
                                                onChange={() => handleResolutionChange(dup.email!, 'create')}
                                                className="accent-charcoal"
                                            />
                                            <span>Create New</span>
                                        </label>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                <Button variant="secondary" onClick={onCancel}>Cancel Import</Button>
                <Button variant="primary" onClick={handleConfirm}>Confirm & Import</Button>
            </div>
        </div>
    );
};

export const ImportModal: FC<{ onClose: () => void }> = ({ onClose }) => {
    const { data, addMultipleContacts, updateContact } = useData();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'upload' | 'duplicates' | 'importing'>('upload');
    const [detectedDuplicates, setDetectedDuplicates] = useState<Contact[]>([]);
    const [newUniqueContacts, setNewUniqueContacts] = useState<Creatable<Contact>[]>([]);
    const [dragging, setDragging] = useState(false);
    const [skippedInFile, setSkippedInFile] = useState(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleClose = () => {
        setFile(null);
        setError(null);
        setStep('upload');
        onClose();
    };

    // Drop prototype-polluting keys that a malicious spreadsheet could inject
    // via crafted header cells (defense-in-depth on top of the patched parser).
    const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
    const sanitizeRow = (row: Record<string, unknown>): Record<string, unknown> => {
        const clean: Record<string, unknown> = Object.create(null);
        for (const key of Object.keys(row)) {
            if (DANGEROUS_KEYS.has(key)) continue;
            clean[key] = row[key];
        }
        return clean;
    };

    const parseFile = async (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    // Loaded on demand: the spreadsheet parser is large and only
                    // needed when someone actually imports a file.
                    const XLSX = await import('xlsx');
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
                    resolve(json.map(sanitizeRow));
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    };

    const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10MB — matches the UI hint

    const handleParseAndCheck = async () => {
        if (!file) return;

        if (file.size > MAX_IMPORT_BYTES) {
            setError('File is too large. Maximum import size is 10MB.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const rawData = await parseFile(file);

            if (rawData.length === 0) {
                throw new Error("The file appears to be empty.");
            }

            // Helper to find value case-insensitively and check common variations
            const getValue = (row: any, candidates: string[]) => {
                const rowKeys = Object.keys(row);
                for (const candidate of candidates) {
                    const match = rowKeys.find(k => k.toLowerCase() === candidate.toLowerCase());
                    if (match && row[match]) return row[match];
                }
                return '';
            };

            // Map fields with flexible header matching
            const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
            const firstLast = (row: any) => [str(getValue(row, ['first name', 'firstname', 'given name'])), str(getValue(row, ['last name', 'lastname', 'surname', 'family name']))].filter(Boolean).join(' ');
            const allMapped: Creatable<Contact>[] = rawData.map((row: any) => ({
                name: str(getValue(row, ['name', 'full name', 'contact name', 'contact'])) || firstLast(row) || 'Unknown',
                email: str(getValue(row, ['email', 'e-mail', 'email address', 'mail'])),
                phone: str(getValue(row, ['phone', 'phone number', 'mobile', 'cell', 'telephone'])),
                company: str(getValue(row, ['company', 'organization', 'organisation', 'business', 'company name'])),
                tags: str(getValue(row, ['tags', 'keywords', 'labels'])).split(/[,;]/).map(t => t.trim()).filter(Boolean),
            })).filter(c => c.email); // Require email

            // Keep the first row for each email; later repeats in the same file
            // would otherwise create duplicate contacts.
            const seen = new Set<string>();
            const mappedContacts = allMapped.filter(c => {
                const key = c.email.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            setSkippedInFile(allMapped.length - mappedContacts.length);

            if (mappedContacts.length === 0) {
                throw new Error("No valid contacts found. Please ensure your file has an 'Email' column.");
            }

            // Check for duplicates against existing data
            const duplicates: Contact[] = [];
            const unique: Creatable<Contact>[] = [];

            mappedContacts.forEach(newContact => {
                const existing = data.contacts.find(c => c.email && c.email.toLowerCase() === newContact.email.toLowerCase());
                if (existing) {
                    // Keep the *file* data; the existing contact is looked up again by email on import.
                    duplicates.push(newContact as Contact);
                } else {
                    unique.push(newContact);
                }
            });

            setDetectedDuplicates(duplicates);
            setNewUniqueContacts(unique);

            if (duplicates.length > 0) {
                setStep('duplicates');
            } else {
                // No duplicates, proceed directly
                await processImport(unique, []);
            }

        } catch (err: any) {
            setError(err.message || "Failed to parse file.");
        } finally {
            setLoading(false);
        }
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
                    // File data overwrites existing fields, but blank cells never wipe existing values.
                    return updateContact({
                        id: existingContact.id!,
                        name: fileContact.name && fileContact.name !== 'Unknown' ? fileContact.name : existingContact.name,
                        phone: fileContact.phone || existingContact.phone,
                        company: fileContact.company || existingContact.company,
                        tags: Array.from(new Set([...(existingContact.tags || []), ...(fileContact.tags || [])])),
                    });
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

            const parts = [`${toCreate.length} added`];
            if (toUpdate.length) parts.push(`${toUpdate.length} updated`);
            if (skippedInFile) parts.push(`${skippedInFile} duplicate row${skippedInFile === 1 ? '' : 's'} skipped`);
            toast(`Import complete: ${parts.join(', ')}`, 'success');
            handleClose();
        } catch (err: any) {
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
            return <div className="text-center p-8"><p className="text-xl font-display text-charcoal animate-pulse">Importing contacts, please wait...</p></div>;
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
                        <p className="text-sm text-muted">Upload a CSV, XLS, or XLSX file to import contacts. We'll look for headers like 'Name', 'Email', 'Phone', and 'Company'.</p>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragging(false);
                                const dropped = e.dataTransfer.files?.[0];
                                if (dropped) { setFile(dropped); setError(null); }
                            }}
                            className={`border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-charcoal bg-surface' : 'border-border hover:bg-surface'}`}
                        >
                            <Icon name="upload" className="w-8 h-8 text-muted mx-auto mb-2" />
                            <label className="block text-sm font-medium text-charcoal mb-2 cursor-pointer">
                                <span className="underline underline-offset-2">Click to upload</span> or drag and drop
                                <input
                                    type="file"
                                    accept=".csv,.xls,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs text-muted">CSV, XLS, XLSX up to 10MB</p>
                        </div>
                        {file && (
                            <div className="flex items-center p-3 bg-surface border border-border text-charcoal text-sm">
                                <Icon name="file" className="w-4 h-4 mr-2" />
                                <span className="font-medium truncate">{file.name}</span>
                            </div>
                        )}
                        {error && (
                            <div className="p-3 bg-activity-red/10 border border-activity-red/30 text-activity-red text-sm flex items-center">
                                <Icon name="alert-circle" className="w-4 h-4 mr-2" />
                                {error}
                            </div>
                        )}
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
