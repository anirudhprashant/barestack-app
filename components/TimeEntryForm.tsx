import React, { useState } from 'react';
import { Button, Input, Select, Textarea } from './ui';
import { ProjectStatus, TimeEntry } from '../types';
import { useData } from '../dataStore';
import { useToast } from '../src/context/ToastContext';
import { toDateInput, toStoredDate, todayInput } from '../src/lib/dates';

interface TimeEntryFormProps {
    entry?: TimeEntry;
    initialProjectId?: string;
    initialTaskId?: string;
    initialHours?: number;
    initialDescription?: string;
    onClose: () => void;
    onSaved?: () => void;
    // Inline variant (Time Tracking page) resets instead of closing.
    inline?: boolean;
}

// Accepts "1.5", "1,5", "1:30" or "90m".
export function parseHours(input: string): number {
    const s = input.trim().toLowerCase();
    if (!s) return 0;
    const hm = /^(\d+):(\d{1,2})$/.exec(s);
    if (hm) return Number(hm[1]) + Number(hm[2]) / 60;
    const mins = /^(\d+(?:[.,]\d+)?)\s*m(in)?s?$/.exec(s);
    if (mins) return Number(mins[1].replace(',', '.')) / 60;
    const hrs = /^(\d+(?:[.,]\d+)?)\s*h?$/.exec(s);
    if (hrs) return Number(hrs[1].replace(',', '.'));
    return NaN;
}

export const TimeEntryForm: React.FC<TimeEntryFormProps> = ({ entry, initialProjectId, initialTaskId, initialHours, initialDescription, onClose, onSaved, inline }) => {
    const { data, addTimeEntry, updateTimeEntry, addRecentActivity } = useData();
    const { toast } = useToast();
    const activeProjects = data.projects.filter(p => p.status === ProjectStatus.Active || p.id === entry?.project_id || p.id === initialProjectId);
    const [projectId, setProjectId] = useState(entry?.project_id || initialProjectId || activeProjects[0]?.id || '');
    const [taskId, setTaskId] = useState(entry?.task_id || initialTaskId || '');
    const [date, setDate] = useState(entry ? toDateInput(entry.date) : todayInput());
    const [hours, setHours] = useState(entry ? String(entry.hours) : initialHours ? String(Math.round(initialHours * 100) / 100) : '');
    const [description, setDescription] = useState(entry?.description || initialDescription || '');
    const [billable, setBillable] = useState(entry ? entry.is_billable : true);
    const [loading, setLoading] = useState(false);

    const tasks = data.tasks.filter(t => t.project_id === projectId);
    const billed = !!entry?.invoice_id;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const h = Math.round(parseHours(hours) * 100) / 100;
        if (!projectId) {
            toast('Pick a project first.', 'error');
            return;
        }
        if (!Number.isFinite(h) || h <= 0 || h > 24) {
            toast('Enter hours between 0 and 24 (e.g. 1.5 or 1:30).', 'error');
            return;
        }
        setLoading(true);
        const payload = {
            project_id: projectId,
            task_id: taskId,
            date: toStoredDate(date || todayInput()),
            hours: h,
            description: description.trim(),
            is_billable: billable,
        };
        try {
            if (entry?.id) {
                await updateTimeEntry({ id: entry.id, ...payload });
                toast('Time entry updated', 'success');
            } else {
                await addTimeEntry({ ...payload, invoice_id: '' });
                const project = data.projects.find(p => p.id === projectId);
                addRecentActivity({ type: 'TIME_LOGGED', description: `Logged ${h}h on ${project?.name || 'a project'}` });
                toast('Time logged', 'success');
            }
            onSaved?.();
            if (inline) {
                setHours('');
                setDescription('');
                setTaskId('');
            } else {
                onClose();
            }
        } catch (error) {
            console.error('Failed to save time entry', error);
            toast('Failed to save time. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const idp = inline ? 'log' : `te-${entry?.id || 'new'}`;

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <Select label="Project" id={`${idp}-project`} value={projectId} onChange={e => { setProjectId(e.target.value); setTaskId(''); }} required>
                {activeProjects.length === 0 && <option value="">No active projects yet</option>}
                {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            {tasks.length > 0 && (
                <Select label="Task" hint="optional" id={`${idp}-task`} value={taskId} onChange={e => setTaskId(e.target.value)}>
                    <option value="">No specific task</option>
                    {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </Select>
            )}
            <div className="grid grid-cols-2 gap-4">
                <Input label="Date" id={`${idp}-date`} type="date" value={date} onChange={e => setDate(e.target.value)} required />
                <Input label="Hours" hint="1.5 or 1:30" id={`${idp}-hours`} inputMode="decimal" placeholder="e.g. 2.5" value={hours} onChange={e => setHours(e.target.value)} required />
            </div>
            <Textarea label="Description" hint="optional" id={`${idp}-description`} value={description} onChange={e => setDescription(e.target.value)} rows={inline ? 2 : 3} placeholder="What did you work on?" />
            <label className="flex items-center gap-2 text-sm font-medium text-charcoal cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 accent-charcoal" checked={billable} onChange={e => setBillable(e.target.checked)} />
                Billable
                {billed && <span className="text-xs text-muted font-normal">· already on an invoice</span>}
            </label>
            <div className={`flex ${inline ? '' : 'justify-end'} gap-2 pt-1`}>
                {!inline && <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>}
                <Button variant="primary" type="submit" disabled={loading || !projectId} className={inline ? 'w-full justify-center py-3' : ''}>
                    {loading ? 'Saving…' : entry ? 'Save Entry' : 'Add Entry'}
                </Button>
            </div>
        </form>
    );
};
