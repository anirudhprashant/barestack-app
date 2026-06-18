import React, { useState } from 'react';
import { Button, Input, Select, Textarea, PageHeader, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Icon } from '../components/ui';
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
            <PageHeader title="Time Tracking" />

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-canvas text-charcoal p-7 border border-border hover:border-charcoal transition-all duration-300">
                    <div className="flex justify-between items-start mb-5">
                        <Icon name="clock" className="w-8 h-8 text-charcoal" />
                        <span className="text-xs font-bold px-2.5 py-1 bg-[#c37624] text-canvas rounded-none">Time</span>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Entry Form */}
                <div className="lg:col-span-1">
                    <div className="bg-canvas border border-border">
                        <div className="px-4 sm:px-6 py-4 border-b border-border bg-surface flex items-center">
                            <Icon name="clock" className="w-5 h-5 mr-2 text-charcoal" />
                            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider">Log Time</h3>
                        </div>
                        <div className="p-6">
                            <form className="space-y-4" onSubmit={handleManualSubmit}>
                                <Select label="Project" id="projectId" value={formState.projectId} onChange={handleFormChange}>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </Select>
                                <Input label="Date" id="date" type="date" value={formState.date} onChange={handleFormChange} />
                                <Input label="Hours" id="hours" type="number" step="0.1" placeholder="e.g., 2.5" value={formState.hours} onChange={handleFormChange} required />
                                <Textarea label="Description (Optional)" id="description" value={formState.description} onChange={handleFormChange} rows={3} />
                                <Button variant="primary" type="submit" disabled={isSubmitting} className="w-full justify-center">
                                    {isSubmitting ? 'Adding...' : 'Add Entry'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Weekly Overview */}
                <div className="lg:col-span-2">
                    <div className="bg-canvas border border-border h-full">
                        <div className="px-4 sm:px-6 py-4 border-b border-border bg-surface flex justify-between items-center">
                            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider">This Week</h3>
                            <span className="text-xs text-muted font-medium">{format(week[0], 'MMM d')} - {format(week[6], 'MMM d')}</span>
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 sm:gap-3">
                                {week.map(day => {
                                    const isToday = isSameDay(day, new Date());
                                    const hours = getHoursForDay(day);
                                    return (
                                        <div key={day.toString()} className={`flex flex-col items-center p-2 sm:p-4 border ${isToday ? 'border-charcoal bg-surface' : 'border-border'}`}>
                                            <span className={`text-xs font-semibold mb-1 sm:mb-2 uppercase tracking-wider ${isToday ? 'text-charcoal' : 'text-muted'}`}>
                                                {format(day, 'EEE')}
                                            </span>
                                            <span className={`text-lg sm:text-2xl font-bold mb-1 sm:mb-3 ${isToday ? 'text-charcoal' : 'text-charcoal'}`}>
                                                {format(day, 'd')}
                                            </span>
                                            <div className={`w-full py-2 sm:py-3 text-center border ${hours > 0 ? 'bg-charcoal text-canvas border-charcoal' : 'bg-surface text-muted border-border'}`}>
                                                <span className="text-xs sm:text-sm font-bold">{hours > 0 ? `${hours}h` : '-'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
                                <span className="text-sm font-medium text-muted uppercase tracking-wider">Weekly Total</span>
                                <span className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">{totalHoursThisWeek}h</span>
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
