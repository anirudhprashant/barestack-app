import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, useCurrency } from '../dataStore';
import { Button, Icon, IconButton, Modal, Segmented, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { Task, TaskStatus, TimeEntry, TaskPriority } from '../types';
import { useToast } from '../src/context/ToastContext';
import { ProjectForm } from '../components/ProjectForm';
import { TaskForm } from '../components/TaskForm';
import { TimeEntryForm } from '../components/TimeEntryForm';
import { InvoiceForm } from '../components/InvoiceForm';
import { formatMoney, formatHours } from '../src/lib/format';
import { formatDateOnly, parseDateOnly, sortTime } from '../src/lib/dates';
import { projectMetrics, pct } from '../src/lib/projects';
import { priorityClass, projectStatusClass } from '../components/badges';
import { useTimer } from '../src/context/TimerContext';

type Tab = 'tasks' | 'time' | 'expenses';

const PRIORITY_ORDER: Record<string, number> = { [TaskPriority.High]: 0, [TaskPriority.Medium]: 1, [TaskPriority.Low]: 2, '': 3 };

const TaskCard: React.FC<{
    task: Task;
    dragging: boolean;
    onDragStart: (e: React.DragEvent, task: Task) => void;
    onDragEnd: () => void;
    onComplete: (task: Task) => void;
    onOpen: (task: Task) => void;
}> = ({ task, dragging, onDragStart, onDragEnd, onComplete, onOpen }) => {
    const due = parseDateOnly(task.due_date);
    const overdue = task.status !== TaskStatus.Done && due && due < new Date(new Date().toDateString());
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            onDragEnd={onDragEnd}
            onClick={() => onOpen(task)}
            className={`bg-canvas p-3 border border-border cursor-grab active:cursor-grabbing hover:border-charcoal transition-colors group ${dragging ? 'opacity-50' : ''}`}
        >
            <div className="flex justify-between items-start gap-2">
                <p className={`font-medium text-sm leading-snug ${task.status === TaskStatus.Done ? 'text-muted line-through' : 'text-charcoal'}`}>{task.title}</p>
                {task.status !== TaskStatus.Done && (
                    <button
                        title="Mark as done"
                        aria-label={`Mark ${task.title} as done`}
                        onClick={(e) => { e.stopPropagation(); onComplete(task); }}
                        className="text-muted hover:text-activity-green transition-colors p-0.5 sm:opacity-0 group-hover:opacity-100 shrink-0"
                    >
                        <Icon name="check-circle" className="w-4 h-4" />
                    </button>
                )}
            </div>
            {task.description && <p className="text-xs text-muted mt-1 line-clamp-2">{task.description}</p>}
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted mt-2.5">
                {task.priority && <span className={`px-1.5 py-0.5 border font-semibold ${priorityClass[task.priority]}`}>{task.priority}</span>}
                {due && (
                    <span className={`flex items-center ${overdue ? 'text-activity-red font-semibold' : ''}`}>
                        <Icon name="calendar" className="w-3 h-3 mr-1" />{formatDateOnly(task.due_date, 'MMM d')}
                    </span>
                )}
                {task.estimated_hours > 0 && <span className="ml-auto bg-surface px-1.5 py-0.5 border border-border font-medium">{formatHours(task.estimated_hours)}</span>}
            </div>
        </div>
    );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; progress?: number; warn?: boolean }> = ({ label, value, sub, progress, warn }) => (
    <div className="bg-canvas border border-border p-4">
        <p className="text-xs font-bold text-muted uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-charcoal tabular-nums mt-1 truncate">{value}</p>
        {progress !== undefined && (
            <div className="w-full bg-surface h-1.5 overflow-hidden mt-2">
                <div className={`h-full ${warn ? 'bg-activity-red' : 'bg-charcoal'}`} style={{ width: `${progress}%` }} />
            </div>
        )}
        {sub && <p className="text-xs text-muted mt-1.5">{sub}</p>}
    </div>
);

const ProjectDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data, updateTask, deleteTask, deleteProject, deleteTimeEntry, addRecentActivity } = useData();
    const currency = useCurrency();
    const { toast, confirm } = useToast();
    const timer = useTimer();

    const [tab, setTab] = useState<Tab>('tasks');
    const [taskModal, setTaskModal] = useState<{ task?: Task; status?: TaskStatus } | null>(null);
    const [timeModal, setTimeModal] = useState<{ entry?: TimeEntry } | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

    const project = data.projects.find(p => p.id === id);
    const client = project ? data.contacts.find(c => c.id === project.client_id) : undefined;
    const metrics = useMemo(() => (project ? projectMetrics(project, data) : null), [project, data]);
    const projectTasks = useMemo(() => data.tasks
        .filter(t => t.project_id === id)
        .sort((a, b) => (PRIORITY_ORDER[a.priority || ''] - PRIORITY_ORDER[b.priority || '']) || sortTime(a.due_date) - sortTime(b.due_date)), [data.tasks, id]);
    const entries = useMemo(() => data.timeEntries.filter(te => te.project_id === id).sort((a, b) => sortTime(b.date) - sortTime(a.date)), [data.timeEntries, id]);
    const expenses = useMemo(() => data.expenses.filter(ex => ex.project_id === id).sort((a, b) => sortTime(b.date) - sortTime(a.date)), [data.expenses, id]);

    if (!project || !metrics) {
        return (
            <div className="p-8 text-center">
                <p className="text-muted mb-4">Project not found.</p>
                <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
            </div>
        );
    }

    const moveTask = async (task: Task, status: TaskStatus) => {
        if (task.status === status) return;
        try {
            await updateTask({ id: task.id!, status });
            if (status === TaskStatus.Done) {
                addRecentActivity({ type: 'TASK_COMPLETED', description: `Task completed: ${task.title}` });
            }
        } catch (error) {
            console.error('Failed to update task:', error);
            toast('Failed to update the task. Please try again.', 'error');
        }
    };

    const handleDeleteTask = async (task: Task) => {
        if (!await confirm({ title: 'Delete task', message: `Delete "${task.title}"?`, danger: true, confirmLabel: 'Delete' })) return;
        try {
            await deleteTask(task.id!);
            setTaskModal(null);
        } catch {
            toast('Could not delete the task.', 'error');
        }
    };

    const handleDeleteProject = async () => {
        const ok = await confirm({
            title: 'Delete project',
            message: `Delete "${project.name}" with its ${projectTasks.length} task(s) and ${entries.length} time entr${entries.length === 1 ? 'y' : 'ies'}? Expenses are kept but unlinked. This cannot be undone.`,
            danger: true,
            confirmLabel: 'Delete project',
        });
        if (!ok) return;
        try {
            await deleteProject(project.id!);
            toast('Project deleted', 'success');
            navigate('/projects');
        } catch {
            toast('Could not delete the project.', 'error');
        }
    };

    const handleDeleteEntry = async (entry: TimeEntry) => {
        if (entry.invoice_id && !await confirm({ title: 'Delete billed time', message: 'This entry is already on an invoice. Delete it anyway? The invoice itself is not changed.', danger: true, confirmLabel: 'Delete' })) return;
        try {
            await deleteTimeEntry(entry.id!);
        } catch {
            toast('Could not delete the entry.', 'error');
        }
    };

    const timerRunningHere = timer.running && timer.projectId === project.id;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-5">
                <button onClick={() => navigate('/projects')} className="text-muted hover:text-charcoal flex items-center text-sm font-medium transition-colors">
                    <Icon name="chevron-left" className="w-4 h-4 mr-1" /> Projects
                </button>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
                <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h1 className="text-2xl sm:text-3xl font-bold font-display text-charcoal tracking-tight break-words">{project.name}</h1>
                        <span className={`px-2.5 py-0.5 text-xs font-semibold ${projectStatusClass[project.status]}`}>{project.status}</span>
                    </div>
                    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm text-muted">
                        <button onClick={() => client && navigate(`/crm?contact=${client.id}`)} className="flex items-center hover:text-charcoal">
                            <Icon name="user" className="w-4 h-4 mr-1.5" />{client?.name || 'Unknown client'}
                        </button>
                        {project.hourly_rate ? <span className="flex items-center"><Icon name="dollar-sign" className="w-4 h-4 mr-1" />{formatMoney(project.hourly_rate, currency)}/h</span> : null}
                        {project.due_date && <span className="flex items-center"><Icon name="calendar" className="w-4 h-4 mr-1.5" />Due {formatDateOnly(project.due_date)}</span>}
                    </div>
                    {project.description && <p className="text-sm text-charcoal mt-3 max-w-2xl whitespace-pre-wrap">{project.description}</p>}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                    <Button variant={timerRunningHere ? 'danger' : 'secondary'} onClick={() => (timerRunningHere ? timer.stop() : timer.start(project.id!))}>
                        <Icon name={timerRunningHere ? 'stop' : 'play'} className="w-4 h-4 mr-2" />{timerRunningHere ? 'Stop timer' : 'Start timer'}
                    </Button>
                    <IconButton icon="edit" label="Edit project" onClick={() => setEditOpen(true)} className="border border-border" />
                    <IconButton icon="trash" label="Delete project" tone="danger" onClick={handleDeleteProject} className="border border-border" />
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <Stat
                    label="Hours"
                    value={`${formatHours(metrics.hoursLogged)}${project.estimated_hours ? ` / ${formatHours(project.estimated_hours)}` : ''}`}
                    progress={project.estimated_hours ? pct(metrics.hoursLogged, project.estimated_hours) : undefined}
                    warn={!!project.estimated_hours && metrics.hoursLogged > project.estimated_hours}
                    sub={`${formatHours(metrics.billableHours)} billable`}
                />
                <Stat
                    label="Budget used"
                    value={project.budget ? `${Math.round((metrics.budgetUsed / project.budget) * 100)}%` : formatMoney(metrics.budgetUsed, currency)}
                    progress={project.budget ? pct(metrics.budgetUsed, project.budget) : undefined}
                    warn={!!project.budget && metrics.budgetUsed > project.budget}
                    sub={project.budget ? `${formatMoney(metrics.budgetUsed, currency)} of ${formatMoney(project.budget, currency)}` : 'No budget set'}
                />
                <Stat
                    label="Tasks"
                    value={`${metrics.tasksDone} / ${metrics.tasksTotal}`}
                    progress={pct(metrics.tasksDone, metrics.tasksTotal)}
                    sub={metrics.tasksOverdue ? <span className="text-activity-red font-semibold">{metrics.tasksOverdue} overdue</span> : 'done'}
                />
                <div className="bg-canvas border border-border p-4 flex flex-col">
                    <p className="text-xs font-bold text-muted uppercase tracking-wider">Unbilled time</p>
                    <p className="text-xl font-bold text-charcoal tabular-nums mt-1">{formatHours(metrics.unbilledHours)}</p>
                    <p className="text-xs text-muted mt-1">{project.hourly_rate ? formatMoney(metrics.unbilledHours * project.hourly_rate, currency) : 'Set an hourly rate to price it'}</p>
                    <Button className="mt-auto pt-2 text-xs py-1.5" disabled={metrics.unbilledHours <= 0} onClick={() => setInvoiceOpen(true)}>
                        <Icon name="document" className="w-3.5 h-3.5 mr-1.5" />Create invoice
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <Segmented<Tab>
                    value={tab}
                    onChange={setTab}
                    options={[
                        { value: 'tasks', label: `Tasks ${projectTasks.length}` },
                        { value: 'time', label: `Time ${entries.length}` },
                        { value: 'expenses', label: `Expenses ${expenses.length}` },
                    ]}
                />
                {tab === 'tasks' && <Button onClick={() => setTaskModal({})}><Icon name="plus" className="w-4 h-4 mr-2" />Add Task</Button>}
                {tab === 'time' && <Button onClick={() => setTimeModal({})}><Icon name="plus" className="w-4 h-4 mr-2" />Log Time</Button>}
                {tab === 'expenses' && <Button variant="secondary" onClick={() => navigate('/expenses?new=1')}><Icon name="plus" className="w-4 h-4 mr-2" />Add Expense</Button>}
            </div>

            {tab === 'tasks' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.values(TaskStatus).map(stage => {
                        const list = projectTasks.filter(t => t.status === stage);
                        return (
                            <div
                                key={stage}
                                onDragOver={(e) => { e.preventDefault(); if (draggedTask?.status !== stage) setDragOverStatus(stage); }}
                                onDragLeave={() => setDragOverStatus(null)}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    if (draggedTask) await moveTask(draggedTask, stage);
                                    setDraggedTask(null);
                                    setDragOverStatus(null);
                                }}
                                className={`flex flex-col border ${dragOverStatus === stage ? 'border-charcoal ring-1 ring-charcoal' : 'border-border'} bg-surface`}
                            >
                                <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-canvas">
                                    <h3 className="font-bold text-charcoal text-xs uppercase tracking-wider font-body">{stage}</h3>
                                    <span className="bg-charcoal text-canvas text-xs font-bold px-2 py-0.5">{list.length}</span>
                                </div>
                                <div className="p-3 space-y-2 min-h-[160px] md:min-h-[360px]">
                                    {list.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            dragging={draggedTask?.id === task.id}
                                            onDragStart={(e, t) => { setDraggedTask(t); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id!); }}
                                            onDragEnd={() => { setDraggedTask(null); setDragOverStatus(null); }}
                                            onComplete={(t) => moveTask(t, TaskStatus.Done)}
                                            onOpen={(t) => setTaskModal({ task: t })}
                                        />
                                    ))}
                                    <button
                                        onClick={() => setTaskModal({ status: stage })}
                                        className="w-full py-2 text-xs font-semibold text-muted hover:text-charcoal border border-dashed border-border hover:border-charcoal transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Icon name="plus" className="w-3.5 h-3.5" /> Add task
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {tab === 'time' && (
                entries.length ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Hours</TableHead>
                                <TableHead>Billing</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map(te => (
                                <TableRow key={te.id}>
                                    <TableCell className="whitespace-nowrap">{formatDateOnly(te.date)}</TableCell>
                                    <TableCell><span className="text-muted">{te.description || '—'}</span></TableCell>
                                    <TableCell className="text-right font-bold tabular-nums">{formatHours(te.hours)}</TableCell>
                                    <TableCell>
                                        {!te.is_billable ? <span className="text-xs text-muted">Non-billable</span>
                                            : te.invoice_id ? <span className="text-xs font-semibold px-1.5 py-0.5 bg-activity-green/10 text-activity-green">Billed</span>
                                                : <span className="text-xs font-semibold px-1.5 py-0.5 bg-accent/10 text-accent">Unbilled</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-0.5">
                                            <IconButton icon="edit" label="Edit entry" onClick={() => setTimeModal({ entry: te })} />
                                            <IconButton icon="trash" label="Delete entry" tone="danger" onClick={() => handleDeleteEntry(te)} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : <p className="text-sm text-muted py-8 text-center border border-dashed border-border">No time logged on this project yet.</p>
            )}

            {tab === 'expenses' && (
                expenses.length ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.map(ex => (
                                <TableRow key={ex.id}>
                                    <TableCell className="whitespace-nowrap">{formatDateOnly(ex.date)}</TableCell>
                                    <TableCell>{ex.description}</TableCell>
                                    <TableCell><span className="text-muted">{ex.category}</span></TableCell>
                                    <TableCell className="text-right font-bold tabular-nums">{formatMoney(ex.amount, currency)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : <p className="text-sm text-muted py-8 text-center border border-dashed border-border">No expenses linked to this project.</p>
            )}

            <Modal isOpen={!!taskModal} onClose={() => setTaskModal(null)} title={taskModal?.task ? 'Edit Task' : `Add Task to ${project.name}`}>
                {taskModal && (
                    <>
                        <TaskForm key={taskModal.task?.id || 'new'} projectId={project.id!} task={taskModal.task} initialStatus={taskModal.status} onClose={() => setTaskModal(null)} />
                        {taskModal.task && (
                            <div className="border-t border-border mt-6 pt-4 flex justify-between items-center gap-2">
                                <Button variant="secondary" className="text-sm py-1.5" onClick={() => { const t = taskModal.task!; setTaskModal(null); timer.start(project.id!, t.id, t.title); }}>
                                    <Icon name="play" className="w-3.5 h-3.5 mr-1.5" />Start timer on this task
                                </Button>
                                <IconButton icon="trash" label="Delete task" tone="danger" onClick={() => handleDeleteTask(taskModal.task!)} />
                            </div>
                        )}
                    </>
                )}
            </Modal>

            <Modal isOpen={!!timeModal} onClose={() => setTimeModal(null)} title={timeModal?.entry ? 'Edit Time Entry' : 'Log Time'}>
                {timeModal && <TimeEntryForm key={timeModal.entry?.id || 'new'} entry={timeModal.entry} initialProjectId={project.id} onClose={() => setTimeModal(null)} />}
            </Modal>

            <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Project">
                <ProjectForm project={project} onClose={() => setEditOpen(false)} />
            </Modal>

            <Modal isOpen={invoiceOpen} onClose={() => setInvoiceOpen(false)} title={`Invoice ${client?.name || 'client'} for ${project.name}`} maxWidthClass="max-w-3xl">
                <InvoiceForm
                    initialClientId={project.client_id}
                    initialTimeEntryIds={metrics.unbilledEntryIds}
                    onClose={() => setInvoiceOpen(false)}
                    onSaved={(inv) => navigate(`/invoices?open=${inv.id}`)}
                />
            </Modal>
        </div>
    );
};

export default ProjectDetails;
