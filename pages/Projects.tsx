
import React, { useState, useEffect } from 'react';
import { Card, PageHeader, Button, Icon } from '../components/ui';
import { Project, Task, TaskStatus, ProjectStatus } from '../types';
import { useHistory } from '../historyStore';

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    return (
        <div className="bg-white p-3 rounded-[10px] border-2 border-brand-dark mb-3 cursor-grab active:cursor-grabbing">
            <p className="font-bold">{task.title}</p>
            <p className="text-sm text-gray-500">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
            <div className="flex justify-between items-center mt-2">
                <span className="text-xs font-bold">{task.estimatedHours} hrs</span>
                <div className="w-8 h-8 bg-brand-light rounded-full border-2 border-brand-dark"></div>
            </div>
        </div>
    );
};

const Projects: React.FC = () => {
    const { state, setState } = useHistory();
    const { projects, contacts, tasks } = state.present;
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedProjectId && projects.length > 0) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId]);

    const handleAddProject = () => {
        const name = prompt("Enter project name:", "New Marketing Campaign");
        if (!name || contacts.length === 0) {
            if (contacts.length === 0) alert("Please create a contact first.");
            return;
        }
        
        const randomContact = contacts[Math.floor(Math.random() * contacts.length)];
        const newProject: Project = {
            id: `p${Date.now()}`,
            name,
            clientId: randomContact.id,
            status: ProjectStatus.Active,
            budget: 5000,
            estimatedHours: 100,
        };

        const newActivity = {
            id: `ra${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'PROJECT_CREATED' as const,
            description: `New project created: ${name}`
        };

        setState({
            ...state.present,
            projects: [...state.present.projects, newProject],
            recentActivity: [...state.present.recentActivity, newActivity]
        });
    };

    const handleAddTask = () => {
        if (!selectedProject) return;
        const title = prompt("Enter task title:", "Draft initial designs");
        if (!title) return;

        const newTask: Task = {
            id: `t${Date.now()}`,
            projectId: selectedProject.id,
            title,
            assignedTo: 'u1',
            dueDate: new Date().toISOString(),
            estimatedHours: 8,
            status: TaskStatus.ToDo,
        };

        setState({ ...state.present, tasks: [...state.present.tasks, newTask] });
    };

    const getClientName = (clientId: string) => contacts.find(c => c.id === clientId)?.name || 'Unknown Client';
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const selectedProjectTasks = tasks.filter(t => t.projectId === selectedProjectId);
    const taskStages = Object.values(TaskStatus);

    return (
        <div>
            <PageHeader title="Projects">
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
                                <tr key={project.id} className={`border-b-2 border-brand-light last:border-b-0 cursor-pointer hover:bg-brand-light ${selectedProjectId === project.id ? 'bg-brand-light' : ''}`} onClick={() => setSelectedProjectId(project.id)}>
                                    <td className="p-4 font-bold">{project.name}</td>
                                    <td className="p-4">{getClientName(project.clientId)}</td>
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
                        <Button variant="primary" onClick={handleAddTask}><Icon name="plus"/> Add Task</Button>
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
        </div>
    );
};

export default Projects;
