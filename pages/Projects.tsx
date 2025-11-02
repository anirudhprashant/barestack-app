
import React, { useState, useEffect } from 'react';
import { Card, PageHeader, Button, Icon, Input, Modal } from '../components/ui';
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
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [projectForm, setProjectForm] = useState({ name: '', clientId: '', budget: 0, estimatedHours: 0 });
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', dueDate: '', estimatedHours: 8 });

    useEffect(() => {
        if (!selectedProjectId && projects.length > 0) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId]);

    const handleAddProject = () => {
        if (contacts.length === 0) {
            alert("Please create a contact first.");
            return;
        }
        setProjectForm({ name: '', clientId: contacts[0].id, budget: 0, estimatedHours: 0 });
        setShowProjectModal(true);
    };

    const saveProject = () => {
        const name = projectForm.name.trim();
        if (!name) return;
        const clientId = projectForm.clientId || contacts[0].id;
        const newProject: Project = {
            id: `p${Date.now()}`,
            name,
            clientId,
            status: ProjectStatus.Active,
            budget: projectForm.budget || 0,
            estimatedHours: projectForm.estimatedHours || 0,
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
        setShowProjectModal(false);
    };

    const handleAddTask = () => {
        if (!selectedProject) return;
        setTaskForm({ title: '', dueDate: '', estimatedHours: 8 });
        setShowTaskModal(true);
    };

    const saveTask = () => {
        if (!selectedProject) return;
        const title = taskForm.title.trim();
        if (!title) return;
        const newTask: Task = {
            id: `t${Date.now()}`,
            projectId: selectedProject.id,
            title,
            assignedTo: 'u1',
            dueDate: taskForm.dueDate || new Date().toISOString(),
            estimatedHours: taskForm.estimatedHours || 8,
            status: TaskStatus.ToDo,
        };
        setState({ ...state.present, tasks: [...state.present.tasks, newTask] });
        setShowTaskModal(false);
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

            {showProjectModal && (
                <Modal title="Create Project" onClose={() => setShowProjectModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowProjectModal(false)}>Cancel</Button>
                            <Button onClick={saveProject}>Create Project</Button>
                        </>
                    }
                >
                    <Input label="Project Name" id="project-name" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} />
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Client</label>
                        <select className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" value={projectForm.clientId} onChange={e => setProjectForm({ ...projectForm, clientId: e.target.value })}>
                            {contacts.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <Input label="Budget ($)" id="project-budget" type="number" value={String(projectForm.budget)} onChange={e => setProjectForm({ ...projectForm, budget: parseInt(e.target.value || '0') })} />
                    <Input label="Estimated Hours" id="project-hours" type="number" value={String(projectForm.estimatedHours)} onChange={e => setProjectForm({ ...projectForm, estimatedHours: parseInt(e.target.value || '0') })} />
                </Modal>
            )}

            {showTaskModal && (
                <Modal title="Add Task" onClose={() => setShowTaskModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowTaskModal(false)}>Cancel</Button>
                            <Button onClick={saveTask}>Add Task</Button>
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
