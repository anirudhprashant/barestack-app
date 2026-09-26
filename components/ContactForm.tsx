import React, { useState, FC } from 'react';
import { Button, Input } from './ui';
import { Contact } from '../types';
import { useData } from '../dataStore';
import { useToast } from '../src/context/ToastContext';

interface ContactFormProps {
    contact?: Contact;
    onClose: () => void;
    onSuccess?: (newContact: Contact) => void;
}

export const ContactForm: FC<ContactFormProps> = ({ contact, onClose, onSuccess }) => {
    const { data, addContact, updateContact, addRecentActivity } = useData();
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        name: contact?.name || '',
        email: contact?.email || '',
        phone: contact?.phone || '',
        company: contact?.company || '',
        tags: (contact?.tags || []).join(', '),
    });
    const [loading, setLoading] = useState(false);
    const isEditing = !!contact?.id;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const emailLower = formData.email.trim().toLowerCase();
    const duplicate = emailLower
        ? data.contacts.find(c => c.id !== contact?.id && c.email?.toLowerCase() === emailLower)
        : undefined;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const contactData = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                company: formData.company.trim(),
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            };

            let saved: Contact;
            if (isEditing) {
                saved = await updateContact({ id: contact!.id!, ...contactData });
            } else {
                saved = await addContact(contactData);
                addRecentActivity({
                    type: 'CONTACT_ADDED',
                    description: `New contact added: ${contactData.name}`
                });
            }
            toast(isEditing ? 'Contact updated' : 'Contact added', 'success');
            onSuccess?.(saved);
            onClose();
        } catch (error) {
            console.error('Failed to save contact:', error);
            toast('Failed to save contact', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Field ids are prefixed so this form can sit inside another form's modal
    // (e.g. "add client" from the invoice form) without duplicate DOM ids.
    const fid = (f: string) => `contact-${contact?.id || 'new'}-${f}`;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" id={fid('name')} name="name" value={formData.name} onChange={handleChange} required autoFocus />
            <div>
                <Input label="Email Address" id={fid('email')} name="email" type="email" value={formData.email} onChange={handleChange} required />
                {duplicate && (
                    <p className="text-xs text-activity-orange mt-1.5">
                        {duplicate.name} already uses this email.
                    </p>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Phone Number" id={fid('phone')} name="phone" type="tel" value={formData.phone} onChange={handleChange} />
                <Input label="Company" id={fid('company')} name="company" value={formData.company} onChange={handleChange} />
            </div>
            <Input label="Tags" hint="comma-separated" id={fid('tags')} name="tags" value={formData.tags} onChange={handleChange} placeholder="client, retainer, vip" />
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Contact'}</Button>
            </div>
        </form>
    );
};
