import React, { useState, useEffect } from 'react';
import { Button, Icon, Modal, Input, Select } from './ui';
import { Project, ProjectStatus, Creatable, Contact } from '../types';
import { useData } from '../dataStore';
import { useToast } from '../src/context/ToastContext';
import { ContactForm } from './ContactForm';

export const ProjectForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { data, addProject, addRecentActivity } = useData();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [clientId, setClientId] = useState('');
    const [budget, setBudget] = useState('');
    const [estimatedHours, setEstimatedHours] = useState('');
    const [status, setStatus] = useState(ProjectStatus.Active);
    const [loading, setLoading] = useState(false);
    const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

    useEffect(() => {
        if (data.contacts.length > 0 && !clientId) {
            setClientId(data.contacts[0].id!);
        }
    }, [data.contacts, clientId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) {
            toast('Please select a client.', 'error');
            return;
        }
        setLoading(true);
        try {
            const newProject: Creatable<Project> = {
                name,
                client_id: clientId,
                status,
                budget: parseInt(budget) || 0,
                estimated_hours: parseInt(estimatedHours) || 0,
            };

            await addProject(newProject);
            await addRecentActivity({
                timestamp: new Date().toISOString(),
                type: 'PROJECT_CREATED',
                description: `New project created: ${name}`
            });
            toast('Project created', 'success');
            onClose();
        } catch (error) {
            console.error("Failed to create project:", error);
            toast('Failed to create project. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClientAdded = (newContact: Contact) => {
        setClientId(newContact.id!);
        setIsAddClientModalOpen(false);
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Project Name" id="projectName" value={name} onChange={e => setName(e.target.value)} required />

                <div>
                    <label htmlFor="client" className="block text-sm font-semibold text-charcoal mb-1.5">Client</label>
                    <div className="flex space-x-2">
                        <div className="flex-grow">
                            <select
                                id="client"
                                value={clientId}
                                onChange={e => setClientId(e.target.value)}
                                required
                                className="w-full p-2.5 bg-canvas text-charcoal rounded-none border border-border focus:outline-none focus:border-content focus:border-2 appearance-none bg-no-repeat bg-right pr-8 transition-colors"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23141C11' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}
                            >
                                <option value="" disabled>Select a Client</option>
                                {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <Button type="button" variant="secondary" onClick={() => setIsAddClientModalOpen(true)} title="Add New Client">
                            <Icon name="plus" className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <Input label="Budget ($)" id="budget" type="number" value={budget} onChange={e => setBudget(e.target.value)} />
                <Input label="Estimated Hours" id="estimatedHours" type="number" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} />
                <Select label="Status" id="status" value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}>
                    {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Project'}</Button>
                </div>
            </form>

            <Modal isOpen={isAddClientModalOpen} onClose={() => setIsAddClientModalOpen(false)} title="Add New Client">
                <ContactForm onClose={() => setIsAddClientModalOpen(false)} onSuccess={handleClientAdded} />
            </Modal>
        </>
    );
};
