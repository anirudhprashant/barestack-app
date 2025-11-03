
import React from 'react';
import { Card, PageHeader, Button, Input } from '../components/ui';

const Settings: React.FC = () => {
    return (
        <div>
            <PageHeader title="Settings" />
            <div className="space-y-8">
                <Card>
                    <h3 className="text-2xl font-bold mb-6 border-b-2 border-brand-dark pb-2">User Profile</h3>
                    <form className="space-y-4 max-w-lg">
                        <Input label="Full Name" id="fullName" defaultValue="Demo User" />
                        <Input label="Email" id="email" type="email" defaultValue="demo@barestask.org" />
                        <Input label="Company Name" id="companyName" defaultValue="My Awesome Co." />
                        <div>
                             <label className="block text-brand-dark font-bold mb-2">Company Logo</label>
                             <input type="file" className="w-full text-brand-dark file:mr-4 file:py-2 file:px-4 file:rounded-[10px] file:border-2 file:border-brand-dark file:text-sm file:font-semibold file:bg-white file:text-brand-dark hover:file:bg-brand-light"/>
                        </div>
                        <Button variant="secondary">Save Profile</Button>
                    </form>
                </Card>
                
                <Card>
                    <h3 className="text-2xl font-bold mb-6 border-b-2 border-brand-dark pb-2">Invoice Settings</h3>
                    <form className="space-y-4 max-w-lg">
                        <Input label="Default Tax Rate (%)" id="taxRate" type="number" defaultValue="10" />
                        <Input label="Payment Terms (e.g., 'Net 30')" id="paymentTerms" defaultValue="Net 30" />
                         <Input label="Invoice Prefix" id="invoicePrefix" defaultValue="INV-" />
                        <Button variant="secondary">Save Invoice Settings</Button>
                    </form>
                </Card>

                 <Card>
                    <h3 className="text-2xl font-bold mb-6 border-b-2 border-brand-dark pb-2">General</h3>
                    <form className="space-y-4 max-w-lg">
                       <div>
                            <label htmlFor="currency" className="block text-brand-dark font-bold mb-2">Currency</label>
                            <select id="currency" className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark">
                                <option>USD ($)</option>
                                <option>EUR (€)</option>
                                <option>GBP (£)</option>
                            </select>
                       </div>
                        <div>
                            <label htmlFor="timezone" className="block text-brand-dark font-bold mb-2">Timezone</label>
                            <select id="timezone" className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark">
                                <option>America/New_York (EST)</option>
                                <option>Europe/London (GMT)</option>
                                <option>Asia/Tokyo (JST)</option>
                            </select>
                       </div>
                        <Button variant="secondary">Save General Settings</Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default Settings;
