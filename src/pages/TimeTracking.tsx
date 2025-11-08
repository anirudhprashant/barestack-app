import React, { useState, useRef } from 'react';
import { Card, PageHeader, Button, Input, Select, Textarea } from '../components/ui';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { useData } from '../dataStore';
import { Creatable, TimeEntry } from '../types';

const TimeTracking: React.FC = () => {
    const { data, addTimeEntry } = useData();
    const { timeEntries, projects } = data;
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<number | null>(null);
    
    // Manual Entry Form State
    const [formState, setFormState] = useState({
        projectId: projects[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        description: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleTimerToggle = () => {
        if (isTimerRunning) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
        } else {
            const startTime = Date.now() - elapsedTime;
            timerRef.current = window.setInterval(() => {
                setElapsedTime(Date.now() - startTime);
            }, 1000);
        }
        setIsTimerRunning(!isTimerRunning);
    };
    
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
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

    return (
        <div>
            <PageHeader title="Time Tracking" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <h3 className="text-2xl font-bold mb-4">Timer</h3>
                    <div className="text-6xl font-black text-center p-8 bg-brand-light border-[3px] border-brand-dark rounded-[10px] mb-4">
                        {formatTime(elapsedTime)}
                    </div>
                    <Button onClick={handleTimerToggle} variant="primary" className="w-full">
                        {isTimerRunning ? 'Stop Timer' : 'Start Timer'}
                    </Button>
                </Card>
                <Card className="lg:col-span-2">
                    <h3 className="text-2xl font-bold mb-4">Add Manual Entry</h3>
                    <form className="space-y-4" onSubmit={handleManualSubmit}>
                        <div className="grid grid-cols-2 gap-4">
                             <Select label="Project" id="projectId" value={formState.projectId} onChange={handleFormChange}>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </Select>
                             <Input label="Date" id="date" type="date" value={formState.date} onChange={handleFormChange} />
                        </div>
                        <Input label="Hours" id="hours" type="number" step="0.1" placeholder="e.g., 2.5" value={formState.hours} onChange={handleFormChange} required />
                        <Textarea label="Description (Optional)" id="description" value={formState.description} onChange={handleFormChange} rows={2} />
                        <Button variant="secondary" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add Entry'}
                        </Button>
                    </form>
                </Card>
            </div>

            <div className="mt-8">
                <PageHeader title="This Week's Timesheet" />
                <Card>
                    <div className="grid grid-cols-7 text-center border-b-[3px] border-brand-dark pb-2 mb-2">
                        {week.map(day => (
                            <div key={day.toString()} className="font-black text-lg">{format(day, 'EEE')}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 text-center">
                        {week.map(day => (
                            <div key={day.toString()} className="p-4 bg-brand-light m-1 border-[3px] border-brand-dark rounded-[10px]">
                                <div className="font-bold text-brand-dark opacity-70 text-sm">{format(day, 'd')}</div>
                                <div className="text-2xl font-extrabold mt-1">{getHoursForDay(day)}h</div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default TimeTracking;