import React, { useState, useEffect } from 'react';
import { Button, Input, PageHeader } from '../components/ui';
import { useTheme } from '../src/context/ThemeContext';
import { useData } from '../dataStore';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const Settings: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const { data, updateUserProfile } = useData();
    const [name, setName] = useState(data.userProfile.name);
    const [email, setEmail] = useState(data.userProfile.email);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        setName(data.userProfile.name);
        setEmail(data.userProfile.email);
    }, [data.userProfile]);

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        updateUserProfile({ name, email });
        alert("Profile updated!");
    };

    const convertToCSV = (items: any[]) => {
        if (items.length === 0) return '';
        const headers = Object.keys(items[0]);
        const rows = items.map(row => headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string') {
                return `"${value.replace(/"/g, '""')}"`;
            }
            if (typeof value === 'object') {
                return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','));
        return [headers.join(','), ...rows].join('\n');
    };

    const handleExportData = async () => {
        setExporting(true);
        try {
            const zip = new JSZip();

            // Add CSVs to zip
            zip.file("contacts.csv", convertToCSV(data.contacts));
            zip.file("projects.csv", convertToCSV(data.projects));
            zip.file("tasks.csv", convertToCSV(data.tasks));
            zip.file("invoices.csv", convertToCSV(data.invoices));
            zip.file("expenses.csv", convertToCSV(data.expenses));
            zip.file("time_entries.csv", convertToCSV(data.timeEntries));
            zip.file("deals.csv", convertToCSV(data.deals));

            const content = await zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: { level: 6 }
            });

            // Create a blob with proper MIME type and filename
            const blob = new Blob([content], { type: 'application/zip' });
            const filename = `barestack_export_${new Date().toISOString().split('T')[0]}.zip`;

            saveAs(blob, filename);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export data.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <PageHeader title="Settings" />

            <div className="space-y-8">
                {/* Profile Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-900">Profile</h3>
                        <p className="text-sm text-gray-500">Manage your account information.</p>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center space-x-6 mb-6">
                            <div className="w-20 h-20 rounded-full bg-brand-dark text-white flex items-center justify-center text-2xl font-bold">
                                {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                                <Button variant="secondary" className="text-sm">Change Avatar</Button>
                            </div>
                        </div>
                        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                            <Input label="Full Name" id="name" value={name} onChange={e => setName(e.target.value)} />
                            <Input label="Email Address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                            <div className="pt-2">
                                <Button variant="primary" type="submit">Save Changes</Button>
                            </div>
                        </form>
                    </div>
                </div>



                {/* Data Management Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-900">Data Management</h3>
                        <p className="text-sm text-gray-500">Export your data or manage your account data.</p>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-gray-900">Export Data</h4>
                                <p className="text-sm text-gray-500">Download all your data (Contacts, Invoices, Projects) as a ZIP file containing CSVs.</p>
                            </div>
                            <Button variant="secondary" onClick={handleExportData} disabled={exporting}>
                                {exporting ? 'Exporting...' : 'Export All Data'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
