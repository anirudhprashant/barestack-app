import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Icon, Modal, Input } from '../components/ui';
import { ProjectStatus } from '../types';
import { useData } from '../dataStore';
import { ProjectForm } from '../components/ProjectForm';

const Projects: React.FC = () => {
    const { data } = useData();
    const { projects, contacts } = data;
    const navigate = useNavigate();
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const getClientName = (clientId: string) => {
        return contacts.find(c => c.id === clientId)?.name || 'Unknown Client';
    };

    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getClientName(project.client_id).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-full sm:w-72">
                    <Input
                        label=""
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                <Button variant="primary" onClick={() => setIsAddProjectModalOpen(true)}>
                    <Icon name="plus" className="w-4 h-4 mr-2" /> New Project
                </Button>
            </div>

            {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                        <Card
                            key={project.id}
                            className="cursor-pointer hover:border-charcoal transition-all duration-200"
                            onClick={() => navigate(`/projects/${project.id}`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-charcoal truncate pr-2">{project.name}</h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${project.status === ProjectStatus.Active ? 'bg-activity-green/10 text-activity-green' :
                                        project.status === ProjectStatus.Completed ? 'bg-activity-blue/10 text-activity-blue' :
                                            'bg-surface text-muted'
                                    }`}>
                                    {project.status}
                                </span>
                            </div>
                            <p className="text-muted text-sm flex items-center">
                                <Icon name="users" className="w-4 h-4 mr-2 text-muted" />
                                {getClientName(project.client_id)}
                            </p>
                            <div className="flex justify-between text-sm font-medium pt-4 border-t border-border/50 text-muted">
                                <span>${project.budget.toLocaleString()}</span>
                                <span>{project.estimated_hours} hrs</span>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-canvas border border-dashed border-border">
                    <div className="w-16 h-16 bg-surface flex items-center justify-center mx-auto mb-4">
                        <Icon name="clipboard" className="w-8 h-8 text-muted" />
                    </div>
                    <h3 className="text-lg font-medium text-charcoal mb-1">No projects found</h3>
                    <p className="text-muted mb-6">
                        {searchTerm ? "Try adjusting your search terms." : "Create your first project to get started."}
                    </p>
                </div>
            )}

            <Modal isOpen={isAddProjectModalOpen} onClose={() => setIsAddProjectModalOpen(false)} title="Add New Project">
                <ProjectForm onClose={() => setIsAddProjectModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Projects;
