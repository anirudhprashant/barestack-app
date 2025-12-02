import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../dataStore';
import { useAuth } from '../auth';
import { PageHeader, Button, Icon, Modal, Input, Card } from '../components/ui';
import { Task, TaskStatus, Creatable } from '../types';

// --- Add Task Form ---
const AddTaskForm: React.FC<{ projectId: string, onClose: () => void }> = ({ projectId, onClose }) => {
    const { addTask } = useData();
    const { session } = useAuth();
    const [title, setTitle] = useState('');
    const [estimatedHours, setEstimatedHours] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.user) return;

        setLoading(true);
        try {
            const newTask: Creatable<Task> = {
                project_id: projectId,
                title,
                assigned_to: session.user.id,
                due_date: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
                estimated_hours: parseInt(estimatedHours) || 0,
                status: TaskStatus.ToDo,
            };
            await addTask(newTask);
            onClose();
        } catch (error) {
            console.error("Failed to add task:", error);
            alert("Failed to add task. Please try again.");
        } finally {
            setLoading(false);
        }
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
const TaskCard: React.FC<{ task: Task, onDragStart: (e: React.DragEvent, task: Task) => void, onComplete: (task: Task) => void }> = ({ task, onDragStart, onComplete }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            className="bg-white p-4 border border-gray-200 mb-3 cursor-grab active:cursor-grabbing hover:border-black transition-colors group"
        >
            <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-gray-900 leading-snug">{task.title}</p>
                {task.status !== TaskStatus.Done && (
                    <button
                        title="Mark as Done"
                        onClick={() => onComplete(task)}
                        className="text-gray-400 hover:text-black transition-colors p-1 opacity-0 group-hover:opacity-100"
                    >
                        <Icon name="check" className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                <div className="flex items-center space-x-2">
                    <span className="flex items-center">
                        <Icon name="clock" className="w-3 h-3 mr-1" />
                        {new Date(task.due_date).toLocaleDateString()}
                    </span>
                </div>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 font-medium border border-gray-200">{task.estimated_hours} hrs</span>
            </div>
        </div>
    );
};

const ProjectDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data, updateTask, addRecentActivity } = useData();
    const { projects, tasks } = data;

    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

    const project = projects.find(p => p.id === id);
    const projectTasks = tasks.filter(t => t.project_id === id);
    const taskStages = Object.values(TaskStatus);

    if (!project) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">Project not found.</p>
                <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
            </div>
        );
    }

    const handleCompleteTask = async (task: Task) => {
        if (task.status !== TaskStatus.Done) {
            try {
                await updateTask({ ...task, status: TaskStatus.Done });
                await addRecentActivity({
                    timestamp: new Date().toISOString(),
                    type: 'TASK_COMPLETED',
                    description: `Task completed: ${task.title}`
                });
            } catch (error) {
                console.error("Failed to complete task:", error);
                alert("Failed to complete task. Please try again.");
            }
        }
    };

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
            try {
                await updateTask({ ...draggedTask, status: newStatus });
            } catch (error) {
                console.error("Failed to update task status:", error);
                alert("Failed to move task. Please try again.");
            }
        }
        setDraggedTask(null);
        setDragOverStatus(null);
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Breadcrumb / Back Link */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/projects')}
                    className="text-gray-500 hover:text-gray-900 flex items-center text-sm font-medium transition-colors"
                >
                    <Icon name="chevron-down" className="w-4 h-4 rotate-90 mr-1" />
                    Back to Projects
                </button>
            </div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className={`px-2.5 py-0.5 text-xs font-medium border ${project.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                            project.status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                            {project.status}
                        </span>
                        <span className="flex items-center">
                            <Icon name="receipt" className="w-4 h-4 mr-1.5 text-gray-400" />
                            ${project.budget.toLocaleString()}
                        </span>
                        <span className="flex items-center">
                            <Icon name="clock" className="w-4 h-4 mr-1.5 text-gray-400" />
                            {project.estimated_hours} hrs est.
                        </span>
                    </div>
                </div>
                <Button variant="primary" onClick={() => setIsAddTaskModalOpen(true)}>
                    <Icon name="plus" className="w-4 h-4" />
                    <span>Add Task</span>
                </Button>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-250px)] overflow-hidden">
                {taskStages.map(stage => {
                    return (
                        <div
                            key={stage}
                            onDragOver={(e) => handleDragOver(e, stage)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, stage)}
                            className={`flex flex-col h-full border border-black bg-gray-50 transition-colors ${dragOverStatus === stage
                                ? 'bg-gray-100 ring-2 ring-black'
                                : ''
                                }`}
                        >
                            <div className="p-4 flex items-center justify-between border-b border-black bg-white">
                                <h3 className="font-bold text-black text-sm uppercase tracking-wide">{stage}</h3>
                                <span className="bg-black text-white text-xs font-bold px-2 py-0.5">
                                    {projectTasks.filter(t => t.status === stage).length}
                                </span>
                            </div>

                            <div className="p-3 flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-300">
                                {projectTasks.filter(t => t.status === stage).map(task => (
                                    <div key={task.id} style={{ opacity: draggedTask?.id === task.id ? 0.5 : 1 }}>
                                        <TaskCard task={task} onDragStart={handleDragStart} onComplete={handleCompleteTask} />
                                    </div>
                                ))}
                                {projectTasks.filter(t => t.status === stage).length === 0 && (
                                    <div className="h-32 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 text-sm">
                                        <Icon name="clipboard" className="w-8 h-8 mb-2 opacity-20" />
                                        <span>No tasks</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isAddTaskModalOpen} onClose={() => setIsAddTaskModalOpen(false)} title={`Add Task to ${project.name}`}>
                <AddTaskForm projectId={project.id!} onClose={() => setIsAddTaskModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default ProjectDetails;
