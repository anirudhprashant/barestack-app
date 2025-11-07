

import React, { useState, useEffect, FC } from 'react';
import { Card, PageHeader, Button, Icon, Modal, Input, Select } from '../components/ui';
import { Project, Task, TaskStatus, Creatable, ProjectStatus } from '../types';
import { useData } from '../dataStore';
import { useAuth } from '../auth';

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
        onClose();
        setLoading(false);
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
const AddTaskForm: FC<{ projectId: string, onClose: () => void }> = ({ projectId, onClose }) => {
    const { addTask } = useData();
    const { session } = useAuth();
    const [title, setTitle] = useState('');
    const [estimatedHours, setEstimatedHours] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.user) {
            console.error("No user session found.");
            return;
        }
        setLoading(true);
        const newTask: Creatable<Task> = {
            project_id: projectId,
            title,
            assigned_to: session.user.id,
            due_date: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
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

// --- Task Card ---
const TaskCard: FC<{ task: Task, onDragStart: (e: React.DragEvent, task: Task) => void, onComplete: (task: Task) => void }> = ({ task, onDragStart, onComplete }) => {
    return (
        <div 
            draggable 
            onDragStart={(e) => onDragStart(e, task)}
            className="bg-white p-3 rounded-[10px] border-[3px] border-brand-dark mb-3 cursor-grab active:cursor-grabbing"
        >
            <p className="font-bold">{task.title}</p>
            <p className="text-sm text-brand-dark opacity-70">Due: {new Date(task.due_date).toLocaleDateString()}</p>
            <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-bold bg-brand-light px-2 py-1 rounded-md border-[3px] border-brand-dark">{task.estimated_hours} hrs</span>
                {task.status !== TaskStatus.Done && (
                     <button
                        title="Mark as Done"
                        onClick={() => onComplete(task)}
                        className="w-8 h-8 bg-white rounded-full border-[3px] border-brand-dark flex items-center justify-center hover:bg-brand-light transition-colors active:shadow-none active:translate-y-0.5"
                    >
                        <Icon name="check" className="w-5 h-5 text-brand-dark" />
                    </button>
                )}
            </div>
        </div>
    );
};

// --- Main Projects Component ---
const Projects: React.FC = () => {
    const { data, updateTask } = useData();
    const { projects, tasks } = data;
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    
    // Drag and Drop state
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

    useEffect(() => {
        if (!selectedProjectId && projects.length > 0) {
            setSelectedProjectId(projects[0].id!);
        }
    }, [projects, selectedProjectId]);

    const handleCompleteTask = async (task: Task) => {
        if (task.status !== TaskStatus.Done) {
            await updateTask({ ...task, status: TaskStatus.Done });
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, task: Task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id!);
    };

    const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        if (draggedTask?.status !== status) {
            setDragOverStatus(status);
        }
    };

    const handleDragLeave = () => {
        setDragOverStatus(null);
    };

    const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
        e.preventDefault();
        if (draggedTask && draggedTask.status !== newStatus) {
            await updateTask({ ...draggedTask, status: newStatus });
        }
        setDraggedTask(null);
        setDragOverStatus(null);
    };

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const selectedProjectTasks = tasks.filter(t => t.project_id === selectedProjectId);
    const taskStages = Object.values(TaskStatus);

    return (
        <div>
            <PageHeader title="Projects & Tasks">
                 <Button variant="primary" onClick={() => setIsAddProjectModalOpen(true)}>
                    <Icon name="plus"/> Add Project
                </Button>
            </PageHeader>

            <div className="mb-6 flex items-end space-x-2">
                <div className="flex-grow max-w-sm">
                    {projects.length > 0 ? (
                        <Select label="Selected Project" id="project-selector" value={selectedProjectId || ''} onChange={e => setSelectedProjectId(e.target.value)}>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    ) : (
                        <p className="font-bold">No projects found. Please add a project first.</p>
                    )}
                </div>
                 {selectedProject && (
                    <Button variant="secondary" onClick={() => setIsAddTaskModalOpen(true)}>
                        <Icon name="plus"/> Add Task
                    </Button>
                )}
            </div>

            {selectedProject ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {taskStages.map(stage => (
                        <div 
                            key={stage}
                            onDragOver={(e) => handleDragOver(e, stage)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, stage)}
                            className="bg-brand-light p-4 rounded-[10px] border-[3px] border-brand-dark h-full"
                        >
                            <h3 className="font-extrabold text-lg mb-4 text-center pb-2 border-b-[3px] border-brand-dark">{stage} ({selectedProjectTasks.filter(t => t.status === stage).length})</h3>
                            <div className={`min-h-[300px] p-2 rounded-[10px] transition-all ${dragOverStatus === stage ? 'border-[3px] border-dashed border-brand-dark bg-white/50' : ''}`}>
                                {selectedProjectTasks.filter(t => t.status === stage).map(task => (
                                    <div key={task.id} style={{ opacity: draggedTask?.id === task.id ? 0.5 : 1 }}>
                                        <TaskCard task={task} onDragStart={handleDragStart} onComplete={handleCompleteTask} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 <Card className="text-center p-12">
                    <h3 className="text-2xl font-bold">No Project Selected</h3>
                    <p className="mt-2 text-brand-dark opacity-70">Please select a project from the dropdown to view its tasks, or create a new project.</p>
                </Card>
            )}
            
            <Modal isOpen={isAddProjectModalOpen} onClose={() => setIsAddProjectModalOpen(false)} title="Add New Project">
                <AddProjectForm onClose={() => setIsAddProjectModalOpen(false)} />
            </Modal>

            {selectedProject && (
                <Modal isOpen={isAddTaskModalOpen} onClose={() => setIsAddTaskModalOpen(false)} title={`Add Task to ${selectedProject.name}`}>
                    <AddTaskForm projectId={selectedProject.id!} onClose={() => setIsAddTaskModalOpen(false)} />
                </Modal>
            )}
        </div>
    );
};

export default Projects;