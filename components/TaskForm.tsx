import React, { useState } from 'react';
import { Button, Input, Select, Textarea } from './ui';
import { Task, TaskPriority, TaskStatus } from '../types';
import { useData } from '../dataStore';
import { useAuth } from '../auth';
import { useToast } from '../src/context/ToastContext';
import { toDateInput, toStoredDate, todayInput } from '../src/lib/dates';

interface TaskFormProps {
    projectId: string;
    task?: Task;
    initialStatus?: TaskStatus;
    onClose: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ projectId, task, initialStatus, onClose }) => {
    const { addTask, updateTask, addRecentActivity } = useData();
    const { session } = useAuth();
    const { toast } = useToast();
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [estimatedHours, setEstimatedHours] = useState(task?.estimated_hours ? String(task.estimated_hours) : '');
    const [dueDate, setDueDate] = useState(task ? toDateInput(task.due_date) : '');
    const [priority, setPriority] = useState<TaskPriority | ''>(task?.priority || '');
    const [status, setStatus] = useState<TaskStatus>(task?.status || initialStatus || TaskStatus.ToDo);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.user) return;
        setLoading(true);
        const payload = {
            project_id: projectId,
            title: title.trim(),
            description: description.trim(),
            // due_date is required by the schema; default to today when left blank.
            due_date: toStoredDate(dueDate || todayInput()),
            estimated_hours: Math.max(0, parseFloat(estimatedHours) || 0),
            priority,
            status,
        };
        try {
            if (task?.id) {
                await updateTask({ id: task.id, ...payload });
                if (status === TaskStatus.Done && task.status !== TaskStatus.Done) {
                    addRecentActivity({ type: 'TASK_COMPLETED', description: `Task completed: ${payload.title}` });
                }
                toast('Task updated', 'success');
            } else {
                await addTask({ ...payload, assigned_to: session.user.id });
                toast('Task added', 'success');
            }
            onClose();
        } catch (error) {
            console.error('Failed to save task:', error);
            toast('Failed to save task. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Task title" id="taskTitle" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
            <Textarea label="Details" id="taskDescription" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional" />
            <div className="grid grid-cols-2 gap-4">
                <Select label="Status" id="taskStatus" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Select label="Priority" id="taskPriority" value={priority} onChange={e => setPriority(e.target.value as TaskPriority | '')}>
                    <option value="">None</option>
                    {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
                <Input label="Due date" id="taskDueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                <Input label="Est. hours" id="taskHours" type="number" min="0" step="0.25" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : task ? 'Save Task' : 'Add Task'}</Button>
            </div>
        </form>
    );
};
