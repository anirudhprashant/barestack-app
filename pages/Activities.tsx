import React, { FC } from 'react';
import { NavLink } from 'react-router-dom';
import { Card, Icon } from '../components/ui';
import { useData } from '../dataStore';
import { formatDistanceToNow } from 'date-fns';

// --- Shared CRM Header Component ---
const CrmHeader: FC<{ children?: React.ReactNode }> = ({ children }) => {
    const navLinks = [
        { href: '/crm', label: 'Contacts' },
        { href: '/crm/pipeline', label: 'Pipeline' },
        { href: '/crm/activities', label: 'Activities' },
        { href: '/crm/imports', label: 'Imports' },
    ];

    return (
        <div className="flex justify-between items-center mb-8">
            <div className="flex space-x-2">
                {navLinks.map(link => (
                    <NavLink
                        key={link.href}
                        to={link.href}
                        end
                        className={({ isActive }) => 
                            `font-bold py-2 px-4 rounded-[10px] border-[3px] border-brand-dark shadow-neo-sm transition-all active:shadow-none active:translate-x-1 active:translate-y-1
                            ${isActive 
                                ? 'bg-brand-dark text-white' 
                                : 'bg-white text-brand-dark'}`
                        }
                    >
                        {link.label}
                    </NavLink>
                ))}
            </div>
            <div>
                {children}
            </div>
        </div>
    );
};

const Activities: React.FC = () => {
    const { data } = useData();
    const { notes, contacts } = data;

    const getContactName = (contactId: string) => {
        return contacts.find(c => c.id === contactId)?.name || 'Unknown Contact';
    };

    return (
        <div>
            <CrmHeader />
            <div className="space-y-6 max-w-4xl mx-auto">
                {notes.length > 0 ? (
                    notes.map(note => (
                        <Card key={note.id} className="relative !p-0">
                             <div className="p-6">
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0 w-12 h-12 bg-brand-light rounded-full border-[3px] border-brand-dark flex items-center justify-center">
                                        <Icon name="document" className="w-6 h-6 text-brand-dark" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-bold text-lg">
                                            Note added for <span className="underline">{getContactName(note.contact_id)}</span>
                                        </p>
                                        <p className="mt-2 text-brand-dark whitespace-pre-wrap">{note.content}</p>
                                    </div>
                                    <div className="text-sm text-brand-dark opacity-70 font-medium flex-shrink-0">
                                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="text-center">
                        <h3 className="text-2xl font-bold">No activities yet.</h3>
                        <p className="mt-2 text-brand-dark opacity-70">Add a note to a contact to get started!</p>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default Activities;