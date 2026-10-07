import React, { useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, isSameWeek } from 'date-fns';
import { Button, Icon, IconButton, Modal, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, StatTile } from '../components/ui';
import { useData, useCurrency } from '../dataStore';
import { ProjectStatus, TimeEntry } from '../types';
import { useToast } from '../src/context/ToastContext';
import { useTimer } from '../src/context/TimerContext';
import { TimeEntryForm } from '../components/TimeEntryForm';
import { formatDuration, formatHours, formatMoney } from '../src/lib/format';
import { parseDateOnly, sortTime, formatDateOnly } from '../src/lib/dates';
import { toCSV, downloadText } from '../src/lib/csv';

const PAGE = 25;

const TimerCard: React.FC = () => {
    const { data } = useData();
    const timer = useTimer();
    const active = data.projects.filter(p => p.status === ProjectStatus.Active);
    const [projectId, setProjectId] = useState(active[0]?.id || '');
    const [description, setDescription] = useState('');
    const runningProject = data.projects.find(p => p.id === timer.projectId);

    return (
        <div className="bs-ink bg-panel paper-grain relative text-cream border border-border p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 font-body">
                    <Icon name="timer" className="w-4 h-4" /> Timer
                </h3>
                {timer.running && <span className="w-2 h-2 bg-activity-red rounded-full animate-pulse" aria-hidden />}
            </div>
            {timer.running ? (
                <div>
                    <p className="bs-score text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">{formatDuration(timer.elapsedMs)}</p>
                    <p className="text-sm text-cream/70 mt-1 truncate">{runningProject?.name || 'Project'}{timer.description ? ` · ${timer.description}` : ''}</p>
                    <div className="flex gap-2 mt-5">
                        <button onClick={timer.stop} className="bs-btn bs-btn-amber flex-1 flex items-center justify-center gap-2 bg-cream text-[#151817] font-semibold py-2.5 hover:bg-cream/90 transition-colors">
                            <Icon name="stop" className="w-4 h-4" /> Stop &amp; save
                        </button>
                        <button onClick={timer.discard} className="bs-btn bs-btn-secondary px-3 border border-cream/30 text-cream/70 hover:text-cream hover:border-cream text-sm font-semibold transition-colors">
                            Discard
                        </button>
                    </div>
                </div>
            ) : active.length === 0 ? (
                <p className="text-sm text-cream/70">Create an active project to start tracking time.</p>
            ) : (
                <form
                    className="space-y-3"
                    onSubmit={(e) => { e.preventDefault(); if (projectId) timer.start(projectId, undefined, description.trim()); setDescription(''); }}
                >
                    <select
                        aria-label="Project to track"
                        value={projectId}
                        onChange={e => setProjectId(e.target.value)}
                        className="bs-input w-full p-2.5 bg-transparent border border-cream/30 text-cream focus:outline-none focus:border-cream [&>option]:text-[#151817]"
                    >
                        {active.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input
                        aria-label="What are you working on?"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="What are you working on?"
                        className="bs-input w-full p-2.5 bg-transparent border border-cream/30 text-cream placeholder:text-cream/40 focus:outline-none focus:border-cream"
                    />
                    <button type="submit" className="bs-btn bs-btn-amber w-full flex items-center justify-center gap-2 bg-cream text-[#151817] font-semibold py-2.5 hover:bg-cream/90 transition-colors">
                        <Icon name="play" className="w-4 h-4" /> Start timer
                    </button>
                </form>
            )}
        </div>
    );
};

const TimeTracking: React.FC = () => {
    const { data, deleteTimeEntry } = useData();
    const currency = useCurrency();
    const { toast, confirm } = useToast();
    const { timeEntries, projects } = data;
    const [weekOffset, setWeekOffset] = useState(0);
    const [projectFilter, setProjectFilter] = useState('');
    const [editing, setEditing] = useState<TimeEntry | null>(null);
    const [shown, setShown] = useState(PAGE);

    const weekRef = addWeeks(new Date(), weekOffset);
    const week = eachDayOfInterval({
        start: startOfWeek(weekRef, { weekStartsOn: 1 }),
        end: endOfWeek(weekRef, { weekStartsOn: 1 }),
    });

    // Date-only values parsed as local calendar days (no UTC shift).
    const entryDays = useMemo(() => timeEntries.map(te => ({ te, day: parseDateOnly(te.date) })), [timeEntries]);
    const hoursOn = (day: Date, billableOnly = false) => entryDays
        .filter(({ te, day: d }) => d && isSameDay(d, day) && (!billableOnly || te.is_billable))
        .reduce((sum, { te }) => sum + te.hours, 0);

    const dayHours = week.map(d => hoursOn(d));
    const weekTotal = dayHours.reduce((a, b) => a + b, 0);
    const weekBillable = week.reduce((s, d) => s + hoursOn(d, true), 0);
    const peak = Math.max(...dayHours, 1);
    const isThisWeek = isSameWeek(weekRef, new Date(), { weekStartsOn: 1 });

    const unbilled = useMemo(() => {
        let hours = 0, value = 0;
        for (const te of timeEntries) {
            if (!te.is_billable || te.invoice_id) continue;
            hours += te.hours;
            value += te.hours * (projects.find(p => p.id === te.project_id)?.hourly_rate || 0);
        }
        return { hours, value };
    }, [timeEntries, projects]);

    const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Unknown Project';
    const getTaskTitle = (taskId: string) => (taskId ? data.tasks.find(t => t.id === taskId)?.title : undefined);

    const filtered = useMemo(() => [...timeEntries]
        .filter(te => !projectFilter || te.project_id === projectFilter)
        .sort((a, b) => sortTime(b.date) - sortTime(a.date) || sortTime(b.created) - sortTime(a.created)), [timeEntries, projectFilter]);

    const handleDelete = async (entry: TimeEntry) => {
        const ok = await confirm({
            title: 'Delete time entry',
            message: entry.invoice_id ? 'This entry is already on an invoice. Delete it anyway? The invoice is not changed.' : `Delete ${formatHours(entry.hours)} on ${getProjectName(entry.project_id)}?`,
            danger: true,
            confirmLabel: 'Delete',
        });
        if (!ok) return;
        try {
            await deleteTimeEntry(entry.id!);
            toast('Entry deleted', 'success');
        } catch {
            toast('Could not delete the entry.', 'error');
        }
    };

    const exportCSV = () => {
        const rows = filtered.map(te => ({
            date: formatDateOnly(te.date, 'yyyy-MM-dd'),
            project: getProjectName(te.project_id),
            task: getTaskTitle(te.task_id) || '',
            description: te.description,
            hours: te.hours,
            billable: te.is_billable ? 'yes' : 'no',
            billed: te.invoice_id ? 'yes' : 'no',
        }));
        downloadText(toCSV(rows), `time_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatTile label="This week" value={formatHours(weekTotal)} sub={isThisWeek ? 'Logged this week' : `Week of ${format(week[0], 'MMM d')}`} badge="Week" badgeClass="bg-[#c37624] text-cream" />
                <StatTile label="Billable" value={formatHours(weekBillable)} sub={weekTotal ? `${Math.round((weekBillable / weekTotal) * 100)}% of the week` : 'No time this week'} badge="Billable" />
                <StatTile label="Unbilled" value={formatHours(unbilled.hours)} sub={unbilled.value ? `${formatMoney(unbilled.value, currency)} ready to invoice` : 'Billable, not invoiced'} badge="To bill" badgeClass="bg-[#e8b86d] text-[#151817]" />
                <StatTile label="Active projects" value={projects.filter(p => p.status === ProjectStatus.Active).length} sub="Available to track" badge="Projects" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <TimerCard />
                    <div className="bg-canvas border border-border">
                        <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center">
                            <Icon name="clock" className="w-5 h-5 mr-2.5 text-charcoal" />
                            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider font-body">Log time manually</h3>
                        </div>
                        <div className="p-5 sm:p-6">
                            <TimeEntryForm inline onClose={() => undefined} />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-canvas border border-border">
                        <div className="px-5 sm:px-6 py-4 border-b border-border flex justify-between items-center gap-3">
                            <div className="flex items-center gap-1">
                                <IconButton icon="chevron-left" label="Previous week" onClick={() => setWeekOffset(w => w - 1)} />
                                <div className="px-1">
                                    <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider font-body">{isThisWeek ? 'This week' : weekOffset === -1 ? 'Last week' : 'Week'}</h3>
                                    <span className="text-xs text-muted font-medium">{format(week[0], 'MMM d')} – {format(week[6], 'MMM d, yyyy')}</span>
                                </div>
                                <IconButton icon="chevron-right" label="Next week" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} />
                                {!isThisWeek && <button onClick={() => setWeekOffset(0)} className="text-xs font-semibold underline ml-1">Today</button>}
                            </div>
                            <div className="text-right">
                                <div className="text-3xl sm:text-4xl font-bold text-charcoal tracking-tight leading-none tabular-nums">{Math.round(weekTotal * 100) / 100}<span className="text-xl text-muted font-semibold">h</span></div>
                                <span className="text-xs text-muted font-medium uppercase tracking-wider">logged</span>
                            </div>
                        </div>
                        <div className="p-5 sm:p-6">
                            <div className="flex items-end justify-between gap-2 sm:gap-3 h-44" role="img" aria-label={`Hours per day: ${week.map((d, i) => `${format(d, 'EEE')} ${Math.round(dayHours[i] * 100) / 100}`).join(', ')}`}>
                                {week.map((day, i) => {
                                    const isToday = isSameDay(day, new Date());
                                    const hours = dayHours[i];
                                    const barPct = hours > 0 ? Math.max((hours / peak) * 100, 8) : 0;
                                    return (
                                        <div key={day.toISOString()} className="flex-1 flex flex-col items-center justify-end h-full group">
                                            <span className={`text-xs font-bold mb-2 tabular-nums ${hours > 0 ? 'text-charcoal' : 'text-transparent'}`}>{Math.round(hours * 10) / 10}h</span>
                                            <div className="w-full flex-1 flex items-end">
                                                <div
                                                    className={`w-full transition-all duration-300 ${isToday ? 'bg-[#c37624]' : hours > 0 ? 'bg-charcoal group-hover:opacity-75' : 'bg-surface border-x border-t border-border'}`}
                                                    style={{ height: hours > 0 ? `${barPct}%` : '4px' }}
                                                    title={`${format(day, 'EEEE')}: ${formatHours(hours)}`}
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
                                    <div className="text-lg font-bold text-charcoal tracking-tight tabular-nums">{formatHours(weekTotal / Math.max(1, dayHours.filter(h => h > 0).length))}</div>
                                    <div className="text-xs text-muted font-medium uppercase tracking-wider">Avg / active day</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-charcoal tracking-tight">{dayHours.filter(h => h > 0).length}<span className="text-muted">/7</span></div>
                                    <div className="text-xs text-muted font-medium uppercase tracking-wider">Days active</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-charcoal tracking-tight tabular-nums">{formatHours(hoursOn(new Date()))}</div>
                                    <div className="text-xs text-muted font-medium uppercase tracking-wider">Today</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-canvas border border-border overflow-hidden">
                <div className="px-5 sm:px-6 py-3 border-b border-border bg-surface flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider font-body">Entries</h3>
                    <div className="flex items-center gap-2">
                        <Select aria-label="Filter by project" id="time-project-filter" value={projectFilter} onChange={e => { setProjectFilter(e.target.value); setShown(PAGE); }} className="min-w-[160px] [&_select]:py-1.5 [&_select]:text-sm">
                            <option value="">All projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                        <IconButton icon="download" label="Export to CSV" onClick={exportCSV} disabled={filtered.length === 0} />
                    </div>
                </div>
                {filtered.length > 0 ? (
                    <>
                        <Table className="border-0">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Project</TableHead>
                                    <TableHead className="hidden md:table-cell">Description</TableHead>
                                    <TableHead className="text-right">Hours</TableHead>
                                    <TableHead className="hidden sm:table-cell">Billing</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.slice(0, shown).map(entry => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-medium text-charcoal whitespace-nowrap">{formatDateOnly(entry.date)}</TableCell>
                                        <TableCell>
                                            <span className="font-medium text-charcoal block truncate max-w-[200px]">{getProjectName(entry.project_id)}</span>
                                            {getTaskTitle(entry.task_id) && <span className="text-xs text-muted block truncate max-w-[200px]">{getTaskTitle(entry.task_id)}</span>}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell"><span className="text-muted truncate max-w-xs block">{entry.description || '—'}</span></TableCell>
                                        <TableCell className="text-right"><span className="font-bold text-charcoal tabular-nums">{formatHours(entry.hours)}</span></TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            {!entry.is_billable ? <span className="text-xs text-muted">Non-billable</span>
                                                : entry.invoice_id ? <span className="text-xs font-bold px-1.5 py-0.5 bg-activity-green/10 text-activity-green">Billed</span>
                                                    : <span className="text-xs font-bold px-1.5 py-0.5 bg-panel text-cream">Billable</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-0.5">
                                                <IconButton icon="edit" label="Edit entry" onClick={() => setEditing(entry)} />
                                                <IconButton icon="trash" label="Delete entry" tone="danger" onClick={() => handleDelete(entry)} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {filtered.length > shown && (
                            <div className="p-3 border-t border-border text-center">
                                <Button variant="ghost" className="mx-auto text-sm" onClick={() => setShown(s => s + PAGE)}>
                                    Show more ({filtered.length - shown} left)
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-6">
                        <EmptyState icon="clock" title="No time entries yet" description="Start the timer or log time manually above." />
                    </div>
                )}
            </div>

            <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Time Entry">
                {editing && <TimeEntryForm key={editing.id} entry={editing} onClose={() => setEditing(null)} />}
            </Modal>
        </div>
    );
};

export default TimeTracking;
