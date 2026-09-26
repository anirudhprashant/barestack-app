import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Icon, Modal, EmptyState, SearchInput, Segmented } from '../components/ui';
import { ProjectStatus } from '../types';
import { useData, useCurrency } from '../dataStore';
import { ProjectForm } from '../components/ProjectForm';
import { formatMoney, formatHours } from '../src/lib/format';
import { formatDateOnly, parseDateOnly } from '../src/lib/dates';
import { projectMetrics, pct } from '../src/lib/projects';
import { projectStatusClass } from '../components/badges';

type Filter = 'all' | ProjectStatus;

const Bar: React.FC<{ value: number; warn?: boolean }> = ({ value, warn }) => (
    <div className="w-full bg-surface h-1.5 overflow-hidden">
        <div className={`h-full ${warn ? 'bg-activity-red' : 'bg-charcoal'}`} style={{ width: `${value}%` }} />
    </div>
);

const Projects: React.FC = () => {
    const { data } = useData();
    const currency = useCurrency();
    const { projects, contacts } = data;
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    useEffect(() => {
        if (searchParams.get('new')) {
            setIsAddProjectModalOpen(true);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<Filter>(ProjectStatus.Active);

    const getClientName = (clientId: string) => contacts.find(c => c.id === clientId)?.name || 'Unknown Client';

    const counts = useMemo(() => ({
        all: projects.length,
        [ProjectStatus.Active]: projects.filter(p => p.status === ProjectStatus.Active).length,
        [ProjectStatus.Completed]: projects.filter(p => p.status === ProjectStatus.Completed).length,
        [ProjectStatus.Archived]: projects.filter(p => p.status === ProjectStatus.Archived).length,
    }), [projects]);

    const filteredProjects = projects.filter(project => {
        const q = searchTerm.trim().toLowerCase();
        return (filter === 'all' || project.status === filter) &&
            (!q || project.name.toLowerCase().includes(q) || getClientName(project.client_id).toLowerCase().includes(q));
    });

    const closeModal = () => setIsAddProjectModalOpen(false);

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
                <Segmented<Filter>
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { value: ProjectStatus.Active, label: `Active ${counts[ProjectStatus.Active]}` },
                        { value: ProjectStatus.Completed, label: `Completed ${counts[ProjectStatus.Completed]}` },
                        { value: ProjectStatus.Archived, label: `Archived ${counts[ProjectStatus.Archived]}` },
                        { value: 'all', label: `All ${counts.all}` },
                    ]}
                />
                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search projects or clients..." className="md:w-72" />
                <Button variant="primary" className="md:ml-auto" onClick={() => setIsAddProjectModalOpen(true)}>
                    <Icon name="plus" className="w-4 h-4 mr-2" /> New Project
                </Button>
            </div>

            {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredProjects.map(project => {
                        const m = projectMetrics(project, data);
                        const due = parseDateOnly(project.due_date);
                        const overdue = due && project.status === ProjectStatus.Active && due < new Date(new Date().toDateString());
                        return (
                            <button
                                key={project.id}
                                className="text-left bg-canvas p-5 border border-border hover:border-charcoal transition-colors flex flex-col"
                                onClick={() => navigate(`/projects/${project.id}`)}
                            >
                                <div className="flex justify-between items-start gap-2 mb-1 w-full">
                                    <h3 className="text-lg font-bold text-charcoal truncate">{project.name}</h3>
                                    <span className={`px-2 py-0.5 text-xs font-semibold shrink-0 ${projectStatusClass[project.status]}`}>{project.status}</span>
                                </div>
                                <p className="text-muted text-sm flex items-center mb-4">
                                    <Icon name="user" className="w-3.5 h-3.5 mr-1.5" />
                                    <span className="truncate">{getClientName(project.client_id)}</span>
                                    {due && (
                                        <span className={`ml-auto flex items-center gap-1 text-xs shrink-0 ${overdue ? 'text-activity-red font-semibold' : ''}`}>
                                            <Icon name="calendar" className="w-3 h-3" />{formatDateOnly(project.due_date, 'MMM d')}
                                        </span>
                                    )}
                                </p>

                                <div className="space-y-3 mt-auto w-full">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted">Hours</span>
                                            <span className="font-semibold tabular-nums">{formatHours(m.hoursLogged)}{project.estimated_hours ? ` / ${formatHours(project.estimated_hours)}` : ''}</span>
                                        </div>
                                        <Bar value={pct(m.hoursLogged, project.estimated_hours)} warn={!!project.estimated_hours && m.hoursLogged > project.estimated_hours} />
                                    </div>
                                    {project.budget > 0 && (
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-muted">Budget</span>
                                                <span className="font-semibold tabular-nums">{formatMoney(m.budgetUsed, currency, { compact: true })} / {formatMoney(project.budget, currency, { compact: true })}</span>
                                            </div>
                                            <Bar value={pct(m.budgetUsed, project.budget)} warn={m.budgetUsed > project.budget} />
                                        </div>
                                    )}
                                    <div className="flex justify-between text-xs pt-3 border-t border-border/60 text-muted">
                                        <span>{m.tasksTotal ? `${m.tasksDone}/${m.tasksTotal} tasks done` : 'No tasks'}{m.tasksOverdue ? <span className="text-activity-red font-semibold"> · {m.tasksOverdue} overdue</span> : null}</span>
                                        {m.unbilledHours > 0 && <span className="text-accent font-semibold">{formatHours(m.unbilledHours)} unbilled</span>}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : projects.length === 0 ? (
                <EmptyState icon="clipboard" title="No projects yet" description="Create a project for a client to track tasks, time, budget and billing in one place.">
                    <Button onClick={() => setIsAddProjectModalOpen(true)}><Icon name="plus" className="w-4 h-4 mr-2" />New Project</Button>
                </EmptyState>
            ) : (
                <EmptyState icon="search" title="No projects found" description={searchTerm ? 'Try adjusting your search terms.' : 'Nothing with this status yet.'} />
            )}

            <Modal isOpen={isAddProjectModalOpen} onClose={closeModal} title="Add New Project">
                <ProjectForm onClose={closeModal} onSaved={(p) => navigate(`/projects/${p.id}`)} />
            </Modal>
        </div>
    );
};

export default Projects;
