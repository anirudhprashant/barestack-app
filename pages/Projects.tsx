
import React, { useEffect, useMemo, useState } from 'react';
import { Card, PageHeader, Button, Icon, Input, Modal } from '../components/ui';
import { TaskStatus, ProjectStatus } from '../types';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Project {
    _id: Id<"projects">;
    name: string;
    clientId: Id<"contacts">;
    status: "Active" | "Archived" | "Completed";
    budget: number;
    estimatedHours: number;
}

interface Task {
    _id: Id<"tasks">;
    projectId: Id<"projects">;
    title: string;
    assignedTo?: string;
    dueDate?: string;
    estimatedHours: number;
    status: "To Do" | "In Progress" | "Done";
}

const TaskCard: React.FC<{ 
    task: Task; 
    onEdit: () => void; 
    onDelete: () => void; 
    onToggleStatus: () => void;
}> = ({ task, onEdit, onDelete, onToggleStatus }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: task._id 
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            {...attributes} 
            {...listeners}
            className="bg-white p-3 rounded-[10px] border-2 border-brand-dark mb-3 cursor-move hover:shadow-neo transition-all"
        >
            <div className="flex justify-between items-start mb-2">
                <p className="font-bold flex-1">{task.title}</p>
                <div className="flex space-x-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                        className="p-1 hover:bg-brand-light rounded"
                    >
                        <Icon name="edit" className="w-4 h-4"/>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                        className="p-1 hover:bg-brand-light rounded"
                    >
                        <Icon name="trash" className="w-4 h-4"/>
                    </button>
                </div>
            </div>
            <p className="text-sm text-gray-500">Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</p>
            <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-bold">{task.estimatedHours} hrs</span>
                <input 
                    type="checkbox" 
                    checked={task.status === "Done"} 
                    onChange={(e) => { e.stopPropagation(); onToggleStatus(); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded border-2 border-brand-dark cursor-pointer"
                />
            </div>
        </div>
    );
};

const Projects: React.FC = () => {
    const contacts = useQuery(api.crm.listContacts) || [];
    const projects = useQuery(api.projects.listProjects) || [];
    const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
    const tasks = useQuery(api.projects.listTasks, selectedProjectId ? { projectId: selectedProjectId } : undefined) || [];

    const createProject = useMutation(api.projects.createProject);
    const updateProject = useMutation(api.projects.updateProject);
    const deleteProject = useMutation(api.projects.deleteProject);
    const createTask = useMutation(api.projects.createTask);
    const updateTask = useMutation(api.projects.updateTask);
    const deleteTask = useMutation(api.projects.deleteTask);

    const sensors = useSensors(
        useSensor(PointerSensor, { 
            activationConstraint: { 
                distance: 8 
            } 
        })
    );

    useEffect(() => {
        if (!selectedProjectId && projects.length > 0) {
            setSelectedProjectId(projects[0]._id);
        }
    }, [projects, selectedProjectId]);

    const [showProjectModal, setShowProjectModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [projectForm, setProjectForm] = useState({ name: '', clientId: '' as string, budget: 0, estimatedHours: 0 });
    
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskForm, setTaskForm] = useState({ title: '', dueDate: '', estimatedHours: 8 });

    const handleAddProject = () => {
        if (contacts.length === 0) {
            alert("Please create a contact first.");
            return;
        }
        setEditingProject(null);
        setProjectForm({ name: '', clientId: String(contacts[0]._id), budget: 0, estimatedHours: 0 });
        setShowProjectModal(true);
    };

    const handleEditProject = (project: Project) => {
        setEditingProject(project);
        setProjectForm({ 
            name: project.name, 
            clientId: String(project.clientId), 
            budget: project.budget, 
            estimatedHours: project.estimatedHours 
        });
        setShowProjectModal(true);
    };

    const handleDeleteProject = async (id: Id<"projects">) => {
        if (window.confirm("Are you sure you want to delete this project?")) {
            await deleteProject({ id });
            if (selectedProjectId === id) {
                setSelectedProjectId(null);
            }
        }
    };

    const saveProject = async () => {
        if (contacts.length === 0) return;
        const name = projectForm.name.trim();
        if (!name) return;

        const clientId = (projectForm.clientId || String(contacts[0]._id)) as Id<"contacts">;

        if (editingProject) {
            await updateProject({
                id: editingProject._id,
                name,
                clientId,
                budget: projectForm.budget || 0,
                estimatedHours: projectForm.estimatedHours || 0,
            });
        } else {
            await createProject({
                name,
                clientId,
                status: "Active",
                budget: projectForm.budget || 0,
                estimatedHours: projectForm.estimatedHours || 0,
            });
        }

        setShowProjectModal(false);
        setProjectForm({ name: '', clientId: '', budget: 0, estimatedHours: 0 });
        setEditingProject(null);
    };

    const selectedProject = useMemo(() => {
        if (!selectedProjectId) return null;
        return projects.find(p => p._id === selectedProjectId) ?? null;
    }, [projects, selectedProjectId]);

    const handleAddTask = () => {
        if (!selectedProject) return;
        setEditingTask(null);
        setTaskForm({ title: '', dueDate: '', estimatedHours: 8 });
        setShowTaskModal(true);
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setTaskForm({ 
            title: task.title, 
            dueDate: task.dueDate ? task.dueDate.substring(0, 10) : '', 
            estimatedHours: task.estimatedHours 
        });
        setShowTaskModal(true);
    };

    const handleDeleteTask = async (id: Id<"tasks">) => {
        if (window.confirm("Are you sure you want to delete this task?")) {
            await deleteTask({ id });
        }
    };

    const handleToggleTaskStatus = async (task: Task) => {
        const newStatus: Task["status"] = task.status === "Done" ? "To Do" : "Done";
        await updateTask({ id: task._id, status: newStatus });
    };


    const saveTask = async () => {
        if (!selectedProjectId) return;
        const title = taskForm.title.trim();
        if (!title) return;

        if (editingTask) {
            await updateTask({
                id: editingTask._id,
                title,
                estimatedHours: taskForm.estimatedHours || 8,
                dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
            });
        } else {
            await createTask({
                projectId: selectedProjectId,
                title,
                estimatedHours: taskForm.estimatedHours || 8,
                status: "To Do",
                dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
            });
        }

        setShowTaskModal(false);
        setTaskForm({ title: '', dueDate: '', estimatedHours: 8 });
        setEditingTask(null);
    };

    const getClientName = (clientId: Id<"contacts">) => contacts.find(c => c._id === clientId)?.name || 'Unknown Client';
    const taskStages = Object.values(TaskStatus);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const taskId = active.id as Id<"tasks">;
        const task = tasks.find(t => t._id === taskId);
        if (!task) return;

        const containerId = (over.data?.current as any)?.sortable?.containerId ?? over.id;
        if (typeof containerId !== 'string') return;
        if (!taskStages.includes(containerId as TaskStatus)) return;

        const nextStatus = containerId as Task["status"];
        if (task.status === nextStatus) return;

        void updateTask({ id: taskId, status: nextStatus });
    };

    return (
        <div>
            <PageHeader>
                <Button variant="primary" onClick={handleAddProject}><Icon name="plus"/> Add Project</Button>
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
                                <tr key={project._id} className={`border-b-2 border-brand-light last:border-b-0 cursor-pointer hover:bg-brand-light ${selectedProjectId === project._id ? 'bg-brand-light' : ''}`} onClick={() => setSelectedProjectId(project._id)}>
                                    <td className="p-4 font-bold">{project.name}</td>
                                    <td className="p-4">{getClientName(project.clientId)}</td>
                                    <td className="p-4">${project.budget.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full border-2 border-brand-dark text-brand-dark ${project.status === ProjectStatus.Active ? 'bg-green-300' : 'bg-gray-300'}`}>{project.status}</span>
                                    </td>
                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex space-x-2">
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none" onClick={() => handleEditProject(project)}><Icon name="edit"/></Button>
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none" onClick={() => handleDeleteProject(project._id)}><Icon name="trash"/></Button>
                                        </div>
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
                        <Button variant="primary" onClick={handleAddTask}><Icon name="plus"/> Add Task</Button>
                    </PageHeader>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {taskStages.map(stage => {
                                const stageTasks = tasks.filter(t => t.status === stage);
                                return (
                                    <div key={stage} className="bg-brand-light p-4 rounded-[10px] border-2 border-brand-dark">
                                        <h3 className="font-extrabold text-lg mb-4 text-center">
                                            {stage} ({stageTasks.length})
                                        </h3>
                                        <SortableContext 
                                            id={stage} 
                                            items={stageTasks.map(t => t._id)} 
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div>
                                                {stageTasks.map(task => (
                                                    <TaskCard 
                                                        key={task._id} 
                                                        task={task}
                                                        onEdit={() => handleEditTask(task)}
                                                        onDelete={() => handleDeleteTask(task._id)}
                                                        onToggleStatus={() => handleToggleTaskStatus(task)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </div>
                                );
                            })}
                        </div>
                    </DndContext>
                </div>
            )}

            {showProjectModal && (
                <Modal title={editingProject ? "Edit Project" : "Create Project"} onClose={() => setShowProjectModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowProjectModal(false)}>Cancel</Button>
                            <Button onClick={saveProject}>{editingProject ? "Update" : "Create"} Project</Button>
                        </>
                    }
                >
                    <Input label="Project Name" id="project-name" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} />
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Client</label>
                        <select className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" value={projectForm.clientId} onChange={e => setProjectForm({ ...projectForm, clientId: e.target.value })}>
                            {contacts.map(c => (
                                <option key={c._id} value={String(c._id)}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <Input label="Budget ($)" id="project-budget" type="number" value={String(projectForm.budget)} onChange={e => setProjectForm({ ...projectForm, budget: parseInt(e.target.value || '0') })} />
                    <Input label="Estimated Hours" id="project-hours" type="number" value={String(projectForm.estimatedHours)} onChange={e => setProjectForm({ ...projectForm, estimatedHours: parseInt(e.target.value || '0') })} />
                </Modal>
            )}

            {showTaskModal && (
                <Modal title={editingTask ? "Edit Task" : "Add Task"} onClose={() => setShowTaskModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowTaskModal(false)}>Cancel</Button>
                            <Button onClick={saveTask}>{editingTask ? "Update" : "Add"} Task</Button>
                        </>
                    }
                >
                    <Input label="Title" id="task-title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Due Date</label>
                        <input type="date" className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                    </div>
                    <Input label="Estimated Hours" id="task-hours" type="number" value={String(taskForm.estimatedHours)} onChange={e => setTaskForm({ ...taskForm, estimatedHours: parseInt(e.target.value || '8') })} />
                </Modal>
            )}
        </div>
    );
};

export default Projects;
