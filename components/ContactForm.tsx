import React, { useState, FC } from 'react';
import { Button, Input } from './ui';
import { Contact } from '../types';
import { useData } from '../dataStore';

interface ContactFormProps {
    contact?: Contact;
    onClose: () => void;
    onSuccess?: (newContact: Contact) => void;
}

export const ContactForm: FC<ContactFormProps> = ({ contact, onClose, onSuccess }) => {
    const { addContact, updateContact, addRecentActivity } = useData();
    const [formData, setFormData] = useState({
        name: contact?.name || '',
        email: contact?.email || '',
        phone: contact?.phone || '',
        company: contact?.company || '',
        tags: contact?.tags?.join(', ') || '',
    });
    const [loading, setLoading] = useState(false);
    const isEditing = !!contact;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const contactData = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            };

            if (isEditing) {
                await updateContact({ ...contact, ...contactData });
                if (onSuccess) onSuccess({ ...contact, ...contactData } as Contact);
            } else {
                const newContact = await addContact(contactData);
                await addRecentActivity({
                    timestamp: new Date().toISOString(),
                    type: 'CONTACT_ADDED',
                    description: `New contact added: ${formData.name}`
                });
                if (onSuccess) onSuccess(newContact);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save contact:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" id="name" value={formData.name} onChange={handleChange} required />
            <Input label="Email Address" id="email" type="email" value={formData.email} onChange={handleChange} required />
            <Input label="Phone Number" id="phone" value={formData.phone} onChange={handleChange} />
            <Input label="Company" id="company" value={formData.company} onChange={handleChange} />
            <Input label="Tags (comma-separated)" id="tags" value={formData.tags} onChange={handleChange} />
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Contact'}</Button>
            </div>
        </form>
    );
};
