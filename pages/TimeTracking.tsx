import React, { useState } from 'react';
import { Button, Input, Select, Textarea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Icon } from '../components/ui';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { useData } from '../dataStore';
import { Creatable, TimeEntry } from '../types';
import { useToast } from '../src/context/ToastContext';

const TimeTracking: React.FC = () => {
    const { data, addTimeEntry } = useData();
    const { toast } = useToast();
    const { timeEntries, projects } = data;

    const [formState, setFormState] = useState({
        projectId: projects[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        description: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.projectId || !formState.hours) {
            toast('Project and hours are required.', 'error');
            return;
        }
        setIsSubmitting(true);
        const newEntry: Creatable<TimeEntry> = {
            project_id: formState.projectId,
            task_id: '',
            date: new Date(formState.date).toISOString(),
            hours: parseFloat(formState.hours),
            description: formState.description,
            is_billable: true,
        };

        try {
            await addTimeEntry(newEntry);
            toast('Time logged', 'success');
            setFormState({
                projectId: projects[0]?.id || '',
                date: new Date().toISOString().split('T')[0],
                hours: '',
                description: ''
            });
        } catch (error) {
            console.error("Failed to add time entry", error);
            toast('Failed to log time. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const week = eachDayOfInterval({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 })
    });

    const getHoursForDay = (day: Date) => {
        return timeEntries
            .filter(entry => isSameDay(new Date(entry.date), day))
            .reduce((sum, entry) => sum + entry.hours, 0);
    };

    const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Unknown Project';
    const recentEntries = [...timeEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    const totalHoursThisWeek = week.reduce((sum, day) => sum + getHoursForDay(day), 0);

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Page title is shown in the top Header bar; no in-content PageHeader to avoid duplication. */}

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-canvas text-charcoal p-7 border border-border hover:border-charcoal transition-all duration-300">
                    <div className="flex justify-between items-start mb-5">
                        <Icon name="clock" className="w-8 h-8 text-charcoal" />
                        <span className="text-xs font-bold px-2.5 py-1 bg-[#c37624] text-canvas rounded-none">This Week</span>
                    </div>
                    <div className="text-4xl font-bold text-charcoal mb-2 tracking-tight">{totalHoursThisWeek}h</div>
                    <div className="text-sm text-muted font-medium">Logged this week</div>
                </div>

                <div className="bg-canvas text-charcoal p-7 border border-border hover:border-charcoal transition-all duration-300">
                    <div className="flex justify-between items-start mb-5">
                        <Icon name="document" className="w-8 h-8 text-charcoal" />
                        <span className="text-xs font-bold px-2.5 py-1 bg-[#192118] text-canvas rounded-none">Billable</span>
                    </div>
                    <div className="text-4xl font-bold text-charcoal mb-2 tracking-tight">
                        {timeEntries.filter(e => e.is_billable).reduce((sum, e) => sum + e.hours, 0)}h
                    </div>
                    <div className="text-sm text-muted font-medium">Billable hours total</div>
                </div>

                <div className="bg-canvas text-charcoal p-7 border border-border hover:border-charcoal transition-all duration-300">
                    <div className="flex justify-between items-start mb-5">
                        <Icon name="clipboard" className="w-8 h-8 text-charcoal" />
                        <span className="text-xs font-bold px-2.5 py-1 bg-[#e8b86d] text-charcoal rounded-none">Projects</span>
                    </div>
                    <div className="text-4xl font-bold text-charcoal mb-2 tracking-tight">{projects.length}</div>
                    <div className="text-sm text-muted font-medium">Active projects tracked</div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
                {/* Entry Form */}
                <div className="lg:col-span-2">
                    <div className="bg-canvas border border-border">
                        <div className="px-5 sm:px-6 py-4 border-b border-border bg-[#192118] flex items-center">
                            <Icon name="clock" className="w-5 h-5 mr-2.5 text-canvas" />
                            <h3 className="text-sm font-bold text-canvas uppercase tracking-wider">Log Time</h3>
                        </div>
                        <div className="p-5 sm:p-6">
                            <form className="space-y-5" onSubmit={handleManualSubmit}>
                                <Select label="Project" id="projectId" value={formState.projectId} onChange={handleFormChange}>
                                    {projects.length === 0 && <option value="">No projects yet</option>}
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </Select>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Date" id="date" type="date" value={formState.date} onChange={handleFormChange} />
                                    <Input label="Hours" id="hours" type="number" step="0.1" placeholder="e.g., 2.5" value={formState.hours} onChange={handleFormChange} required />
                                </div>
                                <Textarea label="Description (Optional)" id="description" value={formState.description} onChange={handleFormChange} rows={3} placeholder="What did you work on?" />
                                <Button variant="primary" type="submit" disabled={isSubmitting} className="w-full justify-center py-3">
                                    {isSubmitting ? 'Adding…' : 'Add Entry'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Weekly Overview — bar chart */}
                <div className="lg:col-span-3">
                    <div className="bg-canvas border border-border">
                        <div className="px-5 sm:px-6 py-4 border-b border-border flex justify-between items-baseline">
                            <div>
                                <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider">This Week</h3>
                                <span className="text-xs text-muted font-medium">{format(week[0], 'MMM d')} – {format(week[6], 'MMM d')}</span>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl sm:text-4xl font-bold text-charcoal tracking-tight leading-none">{totalHoursThisWeek}<span className="text-xl text-muted font-semibold">h</span></div>
                                <span className="text-xs text-muted font-medium uppercase tracking-wider">logged</span>
                            </div>
                        </div>
                        <div className="p-5 sm:p-6">
                            {/* Bar chart */}
                            <div className="flex items-end justify-between gap-2 sm:gap-3 h-44">
                                {week.map(day => {
                                    const isToday = isSameDay(day, new Date());
                                    const hours = getHoursForDay(day);
                                    const peak = Math.max(...week.map(getHoursForDay), 1);
                                    const pct = hours > 0 ? Math.max((hours / peak) * 100, 8) : 0;
                                    return (
                                        <div key={day.toString()} className="flex-1 flex flex-col items-center justify-end h-full group">
                                            <span className={`text-xs font-bold mb-2 tabular-nums ${hours > 0 ? 'text-charcoal' : 'text-transparent'}`}>{hours}h</span>
                                            <div className="w-full flex-1 flex items-end">
                                                <div
                                                    className={`w-full transition-all duration-300 ${isToday ? 'bg-[#c37624]' : hours > 0 ? 'bg-charcoal group-hover:bg-[#192118]' : 'bg-surface border-x border-t border-border'}`}
                                                    style={{ height: hours > 0 ? `${pct}%` : '4px' }}
                                                    title={`${format(day, 'EEEE')}: ${hours}h`}
                                                />
                                            </div>
                                            <span className={`text-xs font-semibold mt-2 uppercase tracking-wider ${isToday ? 'text-[#c37624]' : 'text-muted'}`}>{format(day, 'EEE')}</span>
                                            <span className={`text-xs ${isToday ? 'text-charcoal font-bold' : 'text-muted'}`}>{format(day, 'd')}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-5 pt-5 border-t border-border grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-lg font-bold text-charcoal tracking-tight">{(totalHoursThisWeek / 7).toFixed(1)}h</div>
                                    <div className="text-xs text-muted font-medium uppercase tracking-wider">Daily avg</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-charcoal tracking-tight">{week.filter(d => getHoursForDay(d) > 0).length}<span className="text-muted">/7</span></div>
                                    <div className="text-xs text-muted font-medium uppercase tracking-wider">Days active</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-charcoal tracking-tight">{getHoursForDay(new Date())}h</div>
                                    <div className="text-xs text-muted font-medium uppercase tracking-wider">Today</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Entries */}
            <div className="bg-canvas border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-surface">
                    <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider">Recent Entries</h3>
                </div>
                {recentEntries.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Hours</TableHead>
                                <TableHead className="text-right">Billable</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentEntries.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium text-charcoal">
                                        {format(parseISO(entry.date), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-charcoal">{getProjectName(entry.project_id)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-muted truncate max-w-xs block">{entry.description || '-'}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold text-charcoal">{entry.hours}h</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {entry.is_billable ? (
                                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-[#192118] text-canvas">YES</span>
                                        ) : (
                                            <span className="text-muted text-xs">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="p-12 text-center text-muted border-t border-border">
                        <Icon name="clock" className="w-12 h-12 mx-auto text-border mb-4" />
                        <p className="font-medium">No time entries yet</p>
                        <p className="text-sm mt-1">Start tracking your time above</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimeTracking;
