import React from 'react';
import { NavLink } from 'react-router-dom';
import { PageHeader, Card, Icon } from '../components/ui';
import { useData } from '../dataStore';
import { formatDistanceToNow } from 'date-fns';

// --- Sub-navigation for CRM section ---
const CrmNav = () => {
    const navLinks = [
        { href: '/crm', label: 'Contacts' },
        { href: '/crm/pipeline', label: 'Pipeline' },
        { href: '/crm/activities', label: 'Activities' },
    ];
    return (
        <div className="flex space-x-2 border-b-2 border-brand-dark mb-8">
            {navLinks.map(link => (
                <NavLink
                    key={link.href}
                    to={link.href}
                    end
                    className={({ isActive }) => 
                        `py-2 px-4 font-bold text-lg rounded-t-[10px] border-brand-dark -mb-px
                        ${isActive 
                            ? 'bg-white border-2 border-b-white' 
                            : 'bg-brand-light border-x-2 border-t-2 border-transparent hover:bg-white/60'}`
                    }
                >
                    {link.label}
                </NavLink>
            ))}
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
            <CrmNav />
            <PageHeader title="Activity Feed" />
            <div className="space-y-6 max-w-4xl mx-auto">
                {notes.length > 0 ? (
                    notes.map(note => (
                        <Card key={note.id} className="relative !p-0">
                             <div className="p-6">
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0 w-12 h-12 bg-brand-light rounded-full border-2 border-brand-dark flex items-center justify-center">
                                        <Icon name="document" className="w-6 h-6 text-brand-dark" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-bold text-lg">
                                            Note added for <span className="underline">{getContactName(note.contact_id)}</span>
                                        </p>
                                        <p className="mt-2 text-brand-dark whitespace-pre-wrap">{note.content}</p>
                                    </div>
                                    <div className="text-sm text-gray-500 font-medium flex-shrink-0">
                                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="text-center">
                        <h3 className="text-2xl font-bold">No activities yet.</h3>
                        <p className="mt-2 text-gray-500">Add a note to a contact to get started!</p>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default Activities;