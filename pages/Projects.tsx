import React, { useState, useEffect } from 'react';
import { Card, PageHeader, Button, Icon, Modal, Input, Select, Textarea } from '../components/ui';
import { Project, Task, TaskStatus, ProjectStatus } from '../types';
import { useData } from '../dataStore';

// --- Add Project Form ---
const AddProjectForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { data, addProject, addRecentActivity } = useData();
    const [name, setName] = useState('');
    const [clientId, setClientId] = useState(data.contacts[0]?.id || '');
    const [budget, setBudget] = useState('');
    const [estimatedHours, setEstimatedHours] = useState('');
    const [status, setStatus] = useState(ProjectStatus.Active);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const newProject: Omit<Project, 'id' | 'user_id' | 'created_at'> = {
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
        setLoading(false);
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Project Name" id="projectName" value={name} onChange={e => setName(e.target.value)} required />
            <Select label="Client" id="client" value={clientId} onChange={e => setClientId(e.target.value)} required>
                {data.contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
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

// --- Add Task Form ---
const AddTaskForm: React.FC<{ projectId: string, onClose: () => void }> = ({ projectId, onClose }) => {
    const { addTask } = useData();
    const [title, setTitle] = useState('');
    const [estimatedHours, setEstimatedHours] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const newTask: Omit<Task, 'id' | 'user_id' | 'created_at'> = {
            project_id: projectId,
            title,
            assigned_to: 'u1', // Placeholder for user assignment
            due_date: new Date(dueDate).toISOString(),
            estimated_hours: parseInt(estimatedHours) || 0,
            status: TaskStatus.ToDo,
        };
        await addTask(newTask);
        setLoading(false);
        onClose();
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Task Title" id="taskTitle" value={title} onChange={e => setTitle(e.target.value)} required />
            <Input label="Estimated Hours" id="taskHours" type="number" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} />
            <Input label="Due Date" id="taskDueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Task'}</Button>
            </div>
        </form>
    );
};


const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    return (
        <div className="bg-white p-3 rounded-[10px] border-2 border-brand-dark mb-3 cursor-grab active:cursor-grabbing">
            <p className="font-bold">{task.title}</p>
            <p className="text-sm text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
            <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-bold">{task.estimated_hours} hrs</span>
                <div className="w-8 h-8 bg-brand-light rounded-full border-2 border-brand-dark"></div>
            </div>
        </div>
    );
};

const Projects: React.FC = () => {
    const { data } = useData();
    const { projects, contacts, tasks } = data;
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

    useEffect(() => {
        if (!selectedProjectId && projects.length > 0) {
            setSelectedProjectId(projects[0].id!);
        }
    }, [projects, selectedProjectId]);

    const getClientName = (clientId: string) => contacts.find(c => c.id === clientId)?.name || 'Unknown Client';
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const selectedProjectTasks = tasks.filter(t => t.project_id === selectedProjectId);
    const taskStages = Object.values(TaskStatus);

    return (
        <div>
            <PageHeader title="Projects">
                <Button variant="primary" onClick={() => setIsAddProjectModalOpen(true)} disabled={contacts.length === 0}>
                    <Icon name="plus"/> Add Project
                </Button>
            </PageHeader>
            <Card className="mb-8">
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
                                <tr key={project.id} className={`border-b-2 border-brand-light last:border-b-0 cursor-pointer hover:bg-brand-light ${selectedProjectId === project.id ? 'bg-brand-light' : ''}`} onClick={() => setSelectedProjectId(project.id!)}>
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

            {selectedProject && (
                <div>
                    <PageHeader title={`Tasks for ${selectedProject.name}`}>
                        <Button variant="primary" onClick={() => setIsAddTaskModalOpen(true)}><Icon name="plus"/> Add Task</Button>
                    </PageHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {taskStages.map(stage => (
                            <div key={stage} className="bg-brand-light p-4 rounded-[10px] border-2 border-brand-dark">
                                <h3 className="font-extrabold text-lg mb-4 text-center">{stage} ({selectedProjectTasks.filter(t => t.status === stage).length})</h3>
                                <div>
                                    {selectedProjectTasks.filter(t => t.status === stage).map(task => (
                                        <TaskCard key={task.id} task={task} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <Modal isOpen={isAddProjectModalOpen} onClose={() => setIsAddProjectModalOpen(false)} title="Add New Project">
                <AddProjectForm onClose={() => setIsAddProjectModalOpen(false)} />
            </Modal>
            
            {selectedProject && (
                <Modal isOpen={isAddTaskModalOpen} onClose={() => setIsAddTaskModalOpen(false)} title="Add New Task">
                    <AddTaskForm projectId={selectedProject.id!} onClose={() => setIsAddTaskModalOpen(false)} />
                </Modal>
            )}
        </div>
    );
};

export default Projects;