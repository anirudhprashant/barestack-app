import React, { useState } from 'react';
import { Button, Icon, Modal, Input, Select, Textarea } from './ui';
import { Project, ProjectStatus, Contact } from '../types';
import { useData, useCurrency } from '../dataStore';
import { useToast } from '../src/context/ToastContext';
import { ContactForm } from './ContactForm';
import { currencySymbol } from '../src/lib/format';
import { toDateInput, toStoredDate } from '../src/lib/dates';

interface ProjectFormProps {
    project?: Project;
    initialClientId?: string;
    onClose: () => void;
    onSaved?: (project: Project) => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ project, initialClientId, onClose, onSaved }) => {
    const { data, addProject, updateProject, addRecentActivity } = useData();
    const currency = useCurrency();
    const { toast } = useToast();
    const [name, setName] = useState(project?.name || '');
    const [clientId, setClientId] = useState(project?.client_id || initialClientId || data.contacts[0]?.id || '');
    const [budget, setBudget] = useState(project?.budget ? String(project.budget) : '');
    const [estimatedHours, setEstimatedHours] = useState(project?.estimated_hours ? String(project.estimated_hours) : '');
    const [hourlyRate, setHourlyRate] = useState(project?.hourly_rate ? String(project.hourly_rate) : '');
    const [dueDate, setDueDate] = useState(toDateInput(project?.due_date));
    const [description, setDescription] = useState(project?.description || '');
    const [status, setStatus] = useState(project?.status || ProjectStatus.Active);
    const [loading, setLoading] = useState(false);
    const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) {
            toast('Please select a client.', 'error');
            return;
        }
        setLoading(true);
        const payload = {
            name: name.trim(),
            client_id: clientId,
            status,
            budget: Math.max(0, parseFloat(budget) || 0),
            estimated_hours: Math.max(0, parseFloat(estimatedHours) || 0),
            hourly_rate: Math.max(0, parseFloat(hourlyRate) || 0),
            due_date: dueDate ? toStoredDate(dueDate) : '',
            description: description.trim(),
        };
        try {
            let saved: Project;
            if (project?.id) {
                saved = await updateProject({ id: project.id, ...payload });
                toast('Project updated', 'success');
            } else {
                saved = await addProject(payload);
                addRecentActivity({ type: 'PROJECT_CREATED', description: `New project created: ${payload.name}` });
                toast('Project created', 'success');
            }
            onSaved?.(saved);
            onClose();
        } catch (error) {
            console.error('Failed to save project:', error);
            toast('Failed to save project. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClientAdded = (newContact: Contact) => {
        setClientId(newContact.id!);
        setIsAddClientModalOpen(false);
    };

    const sym = currencySymbol(currency);

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Project Name" id="projectName" value={name} onChange={e => setName(e.target.value)} required autoFocus />

                <div>
                    <label htmlFor="project-client" className="block text-sm font-semibold text-charcoal mb-1.5">Client</label>
                    <div className="flex space-x-2">
                        <Select id="project-client" className="flex-grow" value={clientId} onChange={e => setClientId(e.target.value)} required>
                            <option value="" disabled>Select a client</option>
                            {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
                        </Select>
                        <Button type="button" variant="secondary" onClick={() => setIsAddClientModalOpen(true)} title="Add new client" aria-label="Add new client">
                            <Icon name="plus" className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input label={`Budget (${sym})`} id="budget" type="number" min="0" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} />
                    <Input label="Est. hours" id="estimatedHours" type="number" min="0" step="0.25" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} />
                    <Input label={`Rate (${sym}/h)`} id="hourlyRate" type="number" min="0" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select label="Status" id="status" value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}>
                        {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <Input label="Due date" id="projectDue" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <Textarea label="Description" id="projectDescription" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Scope, links, anything useful" />
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : project ? 'Save Project' : 'Create Project'}</Button>
                </div>
            </form>

            <Modal isOpen={isAddClientModalOpen} onClose={() => setIsAddClientModalOpen(false)} title="Add New Client">
                <ContactForm onClose={() => setIsAddClientModalOpen(false)} onSuccess={handleClientAdded} />
            </Modal>
        </>
    );
};
