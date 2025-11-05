
import React, { useState, FC } from 'react';
import { NavLink } from 'react-router-dom';
import { Card, PageHeader, Button, Icon, Modal, Input, Select } from '../components/ui';
import { Project, ProjectStatus, Creatable } from '../types';
import { useData } from '../dataStore';

// --- Shared Projects Header Component ---
const ProjectsHeader: FC<{ children?: React.ReactNode }> = ({ children }) => {
    const navLinks = [
        { href: '/projects', label: 'Projects' },
        { href: '/projects/tasks', label: 'Tasks' },
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
                            `font-bold py-2 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm transition-all active:shadow-none active:translate-x-1 active:translate-y-1
                            ${isActive 
                                ? 'bg-brand-dark text-white' 
                                : 'bg-white text-brand-dark'}`
                        }
                    >
                        {link.label}
                    </NavLink>
                ))}
            </div>
            <div className="flex items-center space-x-2">
                {children}
            </div>
        </div>
    );
};


// --- Add Project Form ---
const AddProjectForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { data, addProject, addContact, addRecentActivity } = useData();
    const [name, setName] = useState('');
    const [clientId, setClientId] = useState(data.contacts[0]?.id || '');
    const [budget, setBudget] = useState('');
    const [estimatedHours, setEstimatedHours] = useState('');
    const [status, setStatus] = useState(ProjectStatus.Active);
    
    const [isCreatingNewClient, setIsCreatingNewClient] = useState(data.contacts.length === 0);
    const [newClientName, setNewClientName] = useState('');
    const [newClientEmail, setNewClientEmail] = useState('');

    const [loading, setLoading] = useState(false);

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === '__CREATE_NEW__') {
            setIsCreatingNewClient(true);
            setClientId('__CREATE_NEW__');
        } else {
            setIsCreatingNewClient(false);
            setClientId(e.target.value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        let finalClientId = clientId;

        try {
            if (isCreatingNewClient) {
                if (!newClientName || !newClientEmail) {
                    alert("New client name and email are required.");
                    setLoading(false);
                    return;
                }
                const newContact = await addContact({
                    name: newClientName,
                    email: newClientEmail,
                    phone: '',
                    company: '',
                    tags: ['Created via Projects'],
                });
                finalClientId = newContact.id!;
            }

            const newProject: Creatable<Project> = {
                name,
                client_id: finalClientId,
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
            onClose();

        } catch (error) {
            console.error("Failed to save project", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Project Name" id="projectName" value={name} onChange={e => setName(e.target.value)} required />
            
            <Select label="Client" id="client" value={clientId} onChange={handleClientChange} required>
                {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__CREATE_NEW__">-- Create New Client --</option>
            </Select>

            {isCreatingNewClient && (
                <div className="p-4 border-2 border-brand-dark rounded-[10px] bg-brand-light space-y-4">
                    <p className="font-bold">Creating New Client</p>
                    <Input label="Client Full Name" id="newClientName" value={newClientName} onChange={e => setNewClientName(e.target.value)} required={isCreatingNewClient} />
                    <Input label="Client Email" id="newClientEmail" type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} required={isCreatingNewClient} />
                </div>
            )}

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
    );
};


const Projects: React.FC = () => {
    const { data } = useData();
    const { projects, contacts } = data;
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);

    const getClientName = (clientId: string) => contacts.find(c => c.id === clientId)?.name || 'Unknown Client';

    return (
        <div>
            <ProjectsHeader>
                <Button variant="primary" onClick={() => setIsAddProjectModalOpen(true)}>
                    <Icon name="plus"/> Add Project
                </Button>
            </ProjectsHeader>
            <Card>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-brand-dark">
                                <th className="p-4 font-black">Project Name</th>
                                <th className="p-4 font-black">Client</th>
                                <th className="p-4 font-black">Budget</th>
                                <th className="p-4 font-black">Status</th>
                                <th className="p-4 font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map(project => (
                                <tr key={project.id} className="border-b-2 border-brand-light last:border-b-0">
                                    <td className="p-4 font-bold">{project.name}</td>
                                    <td className="p-4">{getClientName(project.client_id)}</td>
                                    <td className="p-4">${project.budget.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full border-2 border-brand-dark text-brand-dark ${project.status === ProjectStatus.Active ? 'bg-green-300' : 'bg-gray-300'}`}>{project.status}</span>
                                    </td>
                                    <td className="p-4">
                                        <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none"><Icon name="edit"/></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            <Modal isOpen={isAddProjectModalOpen} onClose={() => setIsAddProjectModalOpen(false)} title="Add New Project">
                <AddProjectForm onClose={() => setIsAddProjectModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Projects;
