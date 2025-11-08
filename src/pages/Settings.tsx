

import React, { useState } from 'react';
import { Card, PageHeader, Button, Input } from '../components/ui';

const Settings: React.FC = () => {
    // Note: In a real app, these values would come from a user settings table.
    const [profile, setProfile] = useState({
        fullName: 'Demo User',
        email: 'demo@barestask.org',
        companyName: 'My Awesome Co.',
    });
    
    const [invoiceSettings, setInvoiceSettings] = useState({
        taxRate: '10',
        paymentTerms: 'Net 30',
        invoicePrefix: 'INV-',
    });

    const [generalSettings, setGeneralSettings] = useState({
        currency: 'USD',
        timezone: 'America/New_York',
    });

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, [e.target.id]: e.target.value });
    };
    
    const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInvoiceSettings({ ...invoiceSettings, [e.target.id]: e.target.value });
    };

    const handleGeneralChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setGeneralSettings({ ...generalSettings, [e.target.id]: e.target.value });
    };
    
    // Placeholder submit handlers
    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Saving profile:', profile);
        // API call to save settings would go here
    };
    
    const handleInvoiceSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Saving invoice settings:', invoiceSettings);
        // API call to save settings would go here
    };

    const handleGeneralSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Saving general settings:', generalSettings);
        // API call to save settings would go here
    };

    return (
        <div>
            <PageHeader title="Settings" />
            <div className="space-y-8">
                <Card>
                    <h3 className="text-2xl font-bold mb-6 border-b-[3px] border-brand-dark pb-2">User Profile</h3>
                    <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-lg">
                        <Input label="Full Name" id="fullName" value={profile.fullName} onChange={handleProfileChange} />
                        <Input label="Email" id="email" type="email" value={profile.email} onChange={handleProfileChange} />
                        <Input label="Company Name" id="companyName" value={profile.companyName} onChange={handleProfileChange} />
                        <div>
                             <label className="block text-brand-dark font-bold mb-2">Company Logo</label>
                             <input type="file" className="w-full text-brand-dark file:mr-4 file:py-2 file:px-4 file:rounded-[10px] file:border-[3px] file:border-brand-dark file:text-sm file:font-semibold file:bg-white file:text-brand-dark hover:file:bg-brand-light"/>
                        </div>
                        <Button type="submit" variant="secondary">Save Profile</Button>
                    </form>
                </Card>
                
                <Card>
                    <h3 className="text-2xl font-bold mb-6 border-b-[3px] border-brand-dark pb-2">Invoice Settings</h3>
                    <form onSubmit={handleInvoiceSubmit} className="space-y-4 max-w-lg">
                        <Input label="Default Tax Rate (%)" id="taxRate" type="number" value={invoiceSettings.taxRate} onChange={handleInvoiceChange} />
                        <Input label="Payment Terms (e.g., 'Net 30')" id="paymentTerms" value={invoiceSettings.paymentTerms} onChange={handleInvoiceChange} />
                         <Input label="Invoice Prefix" id="invoicePrefix" value={invoiceSettings.invoicePrefix} onChange={handleInvoiceChange} />
                        <Button type="submit" variant="secondary">Save Invoice Settings</Button>
                    </form>
                </Card>

                 <Card>
                    <h3 className="text-2xl font-bold mb-6 border-b-[3px] border-brand-dark pb-2">General</h3>
                    <form onSubmit={handleGeneralSubmit} className="space-y-4 max-w-lg">
                       <div>
                            <label htmlFor="currency" className="block text-brand-dark font-bold mb-2">Currency</label>
                            <select id="currency" value={generalSettings.currency} onChange={handleGeneralChange} className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-[3px] border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark">
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                            </select>
                       </div>
                        <div>
                            <label htmlFor="timezone" className="block text-brand-dark font-bold mb-2">Timezone</label>
                            <select id="timezone" value={generalSettings.timezone} onChange={handleGeneralChange} className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-[3px] border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark">
                                <option value="America/New_York">America/New_York (EST)</option>
                                <option value="Europe/London">Europe/London (GMT)</option>
                                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                            </select>
                       </div>
                        <Button type="submit" variant="secondary">Save General Settings</Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default Settings;