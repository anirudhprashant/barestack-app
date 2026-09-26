import { AppState, Project, TaskStatus } from '../../types';

export interface ProjectMetrics {
    hoursLogged: number;
    billableHours: number;
    unbilledHours: number;
    unbilledEntryIds: string[];
    timeValue: number; // billable hours x hourly rate
    expenses: number;
    budgetUsed: number; // time value + expenses
    tasksTotal: number;
    tasksDone: number;
    tasksOverdue: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function projectMetrics(project: Project, data: Pick<AppState, 'timeEntries' | 'expenses' | 'tasks'>, today: Date = new Date()): ProjectMetrics {
    const entries = data.timeEntries.filter(te => te.project_id === project.id);
    const billable = entries.filter(te => te.is_billable);
    const unbilled = billable.filter(te => !te.invoice_id);
    const expenses = data.expenses.filter(ex => ex.project_id === project.id).reduce((s, ex) => s + (ex.amount || 0), 0);
    const tasks = data.tasks.filter(t => t.project_id === project.id);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const billableHours = billable.reduce((s, te) => s + te.hours, 0);
    const timeValue = billableHours * (project.hourly_rate || 0);
    return {
        hoursLogged: round2(entries.reduce((s, te) => s + te.hours, 0)),
        billableHours: round2(billableHours),
        unbilledHours: round2(unbilled.reduce((s, te) => s + te.hours, 0)),
        unbilledEntryIds: unbilled.map(te => te.id!).filter(Boolean),
        timeValue: round2(timeValue),
        expenses: round2(expenses),
        budgetUsed: round2(timeValue + expenses),
        tasksTotal: tasks.length,
        tasksDone: tasks.filter(t => t.status === TaskStatus.Done).length,
        tasksOverdue: tasks.filter(t => {
            if (t.status === TaskStatus.Done || !t.due_date) return false;
            const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t.due_date);
            if (!m) return false;
            return new Date(+m[1], +m[2] - 1, +m[3]).getTime() < startOfToday;
        }).length,
    };
}

// 0..100, capped, for progress bars.
export function pct(value: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, (value / total) * 100));
}
