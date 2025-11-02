
import { useState, useEffect } from 'react';
import { Card, PageHeader, Button, Icon } from '../components/ui';
import { Project, Task, TaskStatus, ProjectStatus, Contact } from '../types';
import api from '../services/api';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const projectsData = await api.get('/projects');
      setProjects(projectsData);
      const contactsData = await api.get('/contacts');
      setContacts(contactsData);
      if (projectsData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsData[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      if (selectedProjectId) {
        try {
          const tasksData = await api.get(`/tasks?project_id=${selectedProjectId}`);
          setTasks(tasksData);
        } catch (error) {
          console.error('Failed to fetch tasks:', error);
        }
      }
    };
    fetchTasks();
  }, [selectedProjectId]);

  const handleAddProject = async () => {
    const name = prompt('Enter project name:', 'New Marketing Campaign');
    if (!name || contacts.length === 0) {
      if (contacts.length === 0) alert('Please create a contact first.');
      return;
    }

    const randomContact = contacts[Math.floor(Math.random() * contacts.length)];
    try {
      await api.post('/projects', {
        name,
        contact_id: randomContact.id,
        status: ProjectStatus.Active,
        budget: 5000,
      });
      fetchData();
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  };

  const handleAddTask = async () => {
    if (!selectedProject) return;
    const title = prompt('Enter task title:', 'Draft initial designs');
    if (!title) return;

    try {
      await api.post('/tasks', {
        project_id: selectedProject.id,
        title,
        status: TaskStatus.ToDo,
        due_date: new Date().toISOString(),
        estimated_hours: 8,
      });
      // Re-fetch tasks for the selected project
      const tasksData = await api.get(`/tasks?project_id=${selectedProjectId}`);
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const getClientName = (clientId: string) => contacts.find(c => c.id === clientId)?.name || 'Unknown Client';
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedProjectTasks = tasks.filter(t => t.projectId === selectedProjectId);
  const taskStages = Object.values(TaskStatus);

  return (
    <div>
      <PageHeader title="Projects">
        <Button variant="primary" onClick={handleAddProject}><Icon name="plus" /> Add Project</Button>
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
                    <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none"><Icon name="edit" /></Button>
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
            <Button variant="primary" onClick={handleAddTask}><Icon name="plus" /> Add Task</Button>
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
