
import React, { useState } from 'react';
import { Card, PageHeader, Button, Icon, Input, Modal } from '../components/ui';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';

interface TimeEntry {
    _id: Id<"timeEntries">;
    projectId: Id<"projects">;
    taskId?: Id<"tasks">;
    date: string;
    hours: number;
    description: string;
    isBillable: boolean;
}

const TimeTracking: React.FC = () => {
    const [filterProjectId, setFilterProjectId] = useState<string>('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const projects = useQuery(api.projects.listProjects) || [];
    const timeEntries = useQuery(
        api.timeTracking.listTimeEntries,
        {
            projectId: filterProjectId ? (filterProjectId as Id<"projects">) : undefined,
            startDate: filterStartDate || undefined,
            endDate: filterEndDate || undefined,
        }
    ) || [];

    const createTimeEntry = useMutation(api.timeTracking.createTimeEntry);
    const updateTimeEntry = useMutation(api.timeTracking.updateTimeEntry);
    const deleteTimeEntry = useMutation(api.timeTracking.deleteTimeEntry);

    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
    const [entryForm, setEntryForm] = useState({
        projectId: '',
        date: new Date().toISOString().substring(0, 10),
        hours: 8,
        description: '',
        isBillable: true,
    });

    const handleAddEntry = () => {
        if (projects.length === 0) {
            alert("Please create a project first.");
            return;
        }
        setEditingEntry(null);
        setEntryForm({
            projectId: String(projects[0]._id),
            date: new Date().toISOString().substring(0, 10),
            hours: 8,
            description: '',
            isBillable: true,
        });
        setShowModal(true);
    };

    const handleEditEntry = (entry: TimeEntry) => {
        setEditingEntry(entry);
        setEntryForm({
            projectId: String(entry.projectId),
            date: entry.date.substring(0, 10),
            hours: entry.hours,
            description: entry.description,
            isBillable: entry.isBillable,
        });
        setShowModal(true);
    };

    const handleDeleteEntry = async (id: Id<"timeEntries">) => {
        if (window.confirm("Are you sure you want to delete this time entry?")) {
            await deleteTimeEntry({ id });
        }
    };

    const saveEntry = async () => {
        if (!entryForm.projectId || !entryForm.description.trim()) return;

        if (editingEntry) {
            await updateTimeEntry({
                id: editingEntry._id,
                hours: entryForm.hours,
                description: entryForm.description.trim(),
                isBillable: entryForm.isBillable,
            });
        } else {
            await createTimeEntry({
                projectId: entryForm.projectId as Id<"projects">,
                date: new Date(entryForm.date).toISOString(),
                hours: entryForm.hours,
                description: entryForm.description.trim(),
                isBillable: entryForm.isBillable,
            });
        }

        setShowModal(false);
        setEntryForm({
            projectId: '',
            date: new Date().toISOString().substring(0, 10),
            hours: 8,
            description: '',
            isBillable: true,
        });
        setEditingEntry(null);
    };

    const getProjectName = (projectId: Id<"projects">) => {
        return projects.find(p => p._id === projectId)?.name || 'Unknown Project';
    };

    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const billableHours = timeEntries.filter(e => e.isBillable).reduce((sum, entry) => sum + entry.hours, 0);

    return (
        <div>
            <PageHeader>
                <Button variant="primary" onClick={handleAddEntry}><Icon name="plus"/> Add Time Entry</Button>
            </PageHeader>

            <Card className="mb-6">
                <h3 className="text-xl font-bold mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Project</label>
                        <select 
                            className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark"
                            value={filterProjectId}
                            onChange={e => setFilterProjectId(e.target.value)}
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Start Date</label>
                        <input 
                            type="date" 
                            className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark"
                            value={filterStartDate}
                            onChange={e => setFilterStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">End Date</label>
                        <input 
                            type="date" 
                            className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark"
                            value={filterEndDate}
                            onChange={e => setFilterEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                    <h3 className="text-lg font-bold mb-2">Total Hours</h3>
                    <p className="text-4xl font-black">{totalHours.toFixed(1)}</p>
                </Card>
                <Card>
                    <h3 className="text-lg font-bold mb-2">Billable Hours</h3>
                    <p className="text-4xl font-black">{billableHours.toFixed(1)}</p>
                </Card>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-brand-dark">
                                <th className="p-4 font-black">Date</th>
                                <th className="p-4 font-black">Project</th>
                                <th className="p-4 font-black">Description</th>
                                <th className="p-4 font-black">Hours</th>
                                <th className="p-4 font-black">Billable</th>
                                <th className="p-4 font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {timeEntries.map(entry => (
                                <tr key={entry._id} className="border-b-2 border-brand-light last:border-b-0">
                                    <td className="p-4">{new Date(entry.date).toLocaleDateString()}</td>
                                    <td className="p-4 font-bold">{getProjectName(entry.projectId)}</td>
                                    <td className="p-4">{entry.description}</td>
                                    <td className="p-4 font-bold">{entry.hours}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full border-2 border-brand-dark ${entry.isBillable ? 'bg-green-300' : 'bg-gray-300'}`}>
                                            {entry.isBillable ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex space-x-2">
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none" onClick={() => handleEditEntry(entry)}>
                                                <Icon name="edit"/>
                                            </Button>
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none" onClick={() => handleDeleteEntry(entry._id)}>
                                                <Icon name="trash"/>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {timeEntries.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No time entries found. Click "Add Time Entry" to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showModal && (
                <Modal title={editingEntry ? "Edit Time Entry" : "Add Time Entry"} onClose={() => setShowModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button onClick={saveEntry}>{editingEntry ? "Update" : "Add"} Entry</Button>
                        </>
                    }
                >
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Project</label>
                        <select 
                            className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark"
                            value={entryForm.projectId}
                            onChange={e => setEntryForm({ ...entryForm, projectId: e.target.value })}
                            disabled={!!editingEntry}
                        >
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Date</label>
                        <input 
                            type="date" 
                            className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark"
                            value={entryForm.date}
                            onChange={e => setEntryForm({ ...entryForm, date: e.target.value })}
                            disabled={!!editingEntry}
                        />
                    </div>
                    <Input 
                        label="Hours" 
                        id="entry-hours" 
                        type="number" 
                        step="0.5"
                        value={String(entryForm.hours)} 
                        onChange={e => setEntryForm({ ...entryForm, hours: parseFloat(e.target.value || '0') })} 
                    />
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Description</label>
                        <textarea 
                            className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark"
                            rows={3}
                            value={entryForm.description}
                            onChange={e => setEntryForm({ ...entryForm, description: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            id="is-billable"
                            checked={entryForm.isBillable}
                            onChange={e => setEntryForm({ ...entryForm, isBillable: e.target.checked })}
                            className="w-5 h-5 rounded border-2 border-brand-dark"
                        />
                        <label htmlFor="is-billable" className="font-bold text-brand-dark">Billable</label>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default TimeTracking;
