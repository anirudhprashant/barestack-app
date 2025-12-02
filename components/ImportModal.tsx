import React, { useState, FC } from 'react';
import { useData } from '../dataStore';
import { Contact, Creatable, ImportBatch } from '../types';
import { Button, Icon } from './ui';
import * as XLSX from 'xlsx';

type Resolution = 'create' | 'update' | 'skip';

interface DuplicateHandlerProps {
    duplicates: Contact[];
    onConfirm: (resolutions: Record<string, Resolution>) => void;
    onCancel: () => void;
}

const DuplicateHandler: FC<DuplicateHandlerProps> = ({ duplicates, onConfirm, onCancel }) => {
    const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});

    const handleResolutionChange = (email: string, resolution: Resolution) => {
        setResolutions(prev => ({ ...prev, [email]: resolution }));
    };

    const handleConfirm = () => {
        // Ensure all duplicates have a resolution
        const allResolved = duplicates.every(d => resolutions[d.email!]);
        if (!allResolved) {
            alert("Please resolve all duplicates before proceeding.");
            return;
        }
        onConfirm(resolutions);
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">We found {duplicates.length} contacts that already exist in your CRM. How would you like to handle them?</p>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="p-2 font-semibold text-gray-700">Contact</th>
                            <th className="p-2 font-semibold text-gray-700">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {duplicates.map(dup => (
                            <tr key={dup.email}>
                                <td className="p-2">
                                    <div className="font-medium">{dup.name}</div>
                                    <div className="text-xs text-gray-500">{dup.email}</div>
                                </td>
                                <td className="p-2">
                                    <div className="flex space-x-2">
                                        <label className="flex items-center space-x-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`res-${dup.email}`}
                                                checked={resolutions[dup.email!] === 'skip'}
                                                onChange={() => handleResolutionChange(dup.email!, 'skip')}
                                                className="text-brand-dark focus:ring-brand-dark"
                                            />
                                            <span>Skip</span>
                                        </label>
                                        <label className="flex items-center space-x-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`res-${dup.email}`}
                                                checked={resolutions[dup.email!] === 'update'}
                                                onChange={() => handleResolutionChange(dup.email!, 'update')}
                                                className="text-brand-dark focus:ring-brand-dark"
                                            />
                                            <span>Update</span>
                                        </label>
                                        <label className="flex items-center space-x-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`res-${dup.email}`}
                                                checked={resolutions[dup.email!] === 'create'}
                                                onChange={() => handleResolutionChange(dup.email!, 'create')}
                                                className="text-brand-dark focus:ring-brand-dark"
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
            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <Button variant="secondary" onClick={onCancel}>Cancel Import</Button>
                <Button variant="primary" onClick={handleConfirm}>Confirm & Import</Button>
            </div>
        </div>
    );
};

export const ImportModal: FC<{ onClose: () => void }> = ({ onClose }) => {
    const { data, addMultipleContacts, updateContact } = useData();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'upload' | 'duplicates' | 'importing'>('upload');
    const [detectedDuplicates, setDetectedDuplicates] = useState<Contact[]>([]);
    const [newUniqueContacts, setNewUniqueContacts] = useState<Creatable<Contact>[]>([]);

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

    const parseFile = async (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet);
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsBinaryString(file);
        });
    };

    const handleParseAndCheck = async () => {
        if (!file) return;
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
            const mappedContacts: Creatable<Contact>[] = rawData.map((row: any) => ({
                name: getValue(row, ['name', 'full name', 'contact name', 'contact']) || 'Unknown',
                email: getValue(row, ['email', 'e-mail', 'email address', 'mail']),
                phone: getValue(row, ['phone', 'phone number', 'mobile', 'cell']),
                company: getValue(row, ['company', 'organization', 'business', 'company name']),
                tags: getValue(row, ['tags', 'keywords', 'labels']) ? getValue(row, ['tags', 'keywords', 'labels']).toString().split(',').map((t: string) => t.trim()) : [],
                // last_interaction removed as it's not in the contacts table
            })).filter(c => c.email); // Require email

            if (mappedContacts.length === 0) {
                throw new Error("No valid contacts found. Please ensure your file has an 'Email' column.");
            }

            // Check for duplicates against existing data
            const duplicates: Contact[] = [];
            const unique: Creatable<Contact>[] = [];

            mappedContacts.forEach(newContact => {
                const existing = data.contacts.find(c => c.email && c.email.toLowerCase() === newContact.email.toLowerCase());
                if (existing) {
                    // Add the *new* data as a potential update, but keep the ID of the existing one for reference if needed
                    duplicates.push({ ...newContact, id: existing.id } as Contact);
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
            return <div className="text-center p-8"><p className="text-xl font-bold text-gray-700">Importing contacts, please wait...</p></div>;
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
                        <p className="text-sm text-gray-600">Upload a CSV, XLS, or XLSX file to import contacts. We'll look for headers like 'Name', 'Email', 'Phone', and 'Company'.</p>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                            <Icon name="upload" className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <label className="block text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                                <span className="text-brand-dark hover:underline">Click to upload</span> or drag and drop
                                <input
                                    type="file"
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs text-gray-500">CSV, XLS, XLSX up to 10MB</p>
                        </div>
                        {file && (
                            <div className="flex items-center p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                                <Icon name="file" className="w-4 h-4 mr-2" />
                                <span className="font-medium truncate">{file.name}</span>
                            </div>
                        )}
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center">
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
