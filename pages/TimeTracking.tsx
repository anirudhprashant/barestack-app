import React, { useState } from 'react';
import { Button, Input, Select, Textarea, PageHeader, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Icon } from '../components/ui';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { useData } from '../dataStore';
import { Creatable, TimeEntry } from '../types';

const TimeTracking: React.FC = () => {
    const { data, addTimeEntry } = useData();
    const { timeEntries, projects } = data;

    // Manual Entry Form State
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
            alert("Project and hours are required.");
            return;
        }
        setIsSubmitting(true);
        const newEntry: Creatable<TimeEntry> = {
            project_id: formState.projectId,
            task_id: '', // Tasks are optional for time entries in this design
            date: new Date(formState.date).toISOString(),
            hours: parseFloat(formState.hours),
            description: formState.description,
            is_billable: true, // Default to billable
        };

        try {
            await addTimeEntry(newEntry);
            // Reset form
            setFormState({
                projectId: projects[0]?.id || '',
                date: new Date().toISOString().split('T')[0],
                hours: '',
                description: ''
            });
        } catch (error) {
            console.error("Failed to add time entry", error);
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

    // Sort entries by date descending
    const recentEntries = [...timeEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader title="Time Tracking" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Time Entry Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <Icon name="clock" className="w-5 h-5 mr-2 text-brand-dark" />
                            Log Time
                        </h3>
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

                {/* Weekly Overview */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">This Week</h3>
                        <div className="grid grid-cols-7 gap-2">
                            {week.map(day => {
                                const isToday = isSameDay(day, new Date());
                                const hours = getHoursForDay(day);
                                return (
                                    <div key={day.toString()} className={`flex flex-col items-center p-3 rounded-lg border ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                                        <span className={`text-xs font-semibold mb-1 ${isToday ? 'text-blue-700' : 'text-gray-500'}`}>{format(day, 'EEE')}</span>
                                        <span className={`text-sm font-bold mb-2 ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>{format(day, 'd')}</span>
                                        <div className={`w-full py-2 rounded-md text-center ${hours > 0 ? 'bg-brand-dark text-white shadow-sm' : 'bg-gray-200 text-gray-400'}`}>
                                            <span className="text-sm font-bold">{hours > 0 ? hours : '-'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-8 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Total Hours This Week</span>
                            <span className="text-2xl font-bold text-brand-dark">
                                {week.reduce((sum, day) => sum + getHoursForDay(day), 0)}h
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Entries Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Recent Entries</h3>
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
                                    <TableCell>{format(parseISO(entry.date), 'MMM d, yyyy')}</TableCell>
                                    <TableCell>
                                        <span className="font-medium text-gray-900">{getProjectName(entry.project_id)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-gray-600 truncate max-w-xs block">{entry.description || '-'}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold text-gray-900">{entry.hours}h</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {entry.is_billable ? (
                                            <Icon name="check" className="w-4 h-4 text-green-500 ml-auto" />
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        No time entries yet. Start tracking your time above!
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimeTracking;
