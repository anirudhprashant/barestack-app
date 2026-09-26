import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startOfMonth, startOfYear, subMonths, startOfQuarter } from 'date-fns';
import { Button, Icon, IconButton, Modal, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, SearchInput, Segmented } from '../components/ui';
import { Expense, ExpenseCategory } from '../types';
import { useData, useCurrency } from '../dataStore';
import { useToast } from '../src/context/ToastContext';
import { formatMoney, currencySymbol } from '../src/lib/format';
import { toDateInput, toStoredDate, todayInput, formatDateOnly, parseDateOnly, sortTime } from '../src/lib/dates';
import { toCSV, downloadText } from '../src/lib/csv';

const categoryColors: Record<string, string> = {
    [ExpenseCategory.Travel]: 'bg-activity-blue/10 text-activity-blue',
    [ExpenseCategory.Meals]: 'bg-activity-orange/10 text-activity-orange',
    [ExpenseCategory.Software]: 'bg-activity-purple/10 text-activity-purple',
    [ExpenseCategory.Equipment]: 'bg-activity-indigo/10 text-activity-indigo',
    [ExpenseCategory.Other]: 'bg-surface text-muted',
};

const ExpenseForm: React.FC<{ expense?: Expense; onClose: () => void }> = ({ expense, onClose }) => {
    const { data, addExpense, updateExpense, addRecentActivity } = useData();
    const currency = useCurrency();
    const { toast } = useToast();
    const [description, setDescription] = useState(expense?.description || '');
    const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
    const [category, setCategory] = useState<ExpenseCategory>(expense?.category || ExpenseCategory.Other);
    const [projectId, setProjectId] = useState(expense?.project_id || '');
    const [date, setDate] = useState(expense ? toDateInput(expense.date) : todayInput());
    const [receiptUrl, setReceiptUrl] = useState(expense?.receipt_url || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount);
        if (!Number.isFinite(value) || value < 0) {
            toast('Enter a valid amount.', 'error');
            return;
        }
        const url = receiptUrl.trim();
        if (url && !/^https?:\/\//i.test(url)) {
            toast('Receipt link must start with http:// or https://', 'error');
            return;
        }
        setLoading(true);
        const payload = {
            date: toStoredDate(date || todayInput()),
            category,
            amount: Math.round(value * 100) / 100,
            description: description.trim(),
            project_id: projectId,
            receipt_url: url,
        };
        try {
            if (expense?.id) {
                await updateExpense({ id: expense.id, ...payload });
                toast('Expense updated', 'success');
            } else {
                await addExpense(payload);
                addRecentActivity({ type: 'EXPENSE_ADDED', description: `Added expense: ${payload.description} (${formatMoney(payload.amount, currency)})` });
                toast('Expense added', 'success');
            }
            onClose();
        } catch (error) {
            console.error('Failed to save expense:', error);
            toast('Could not save the expense. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Description" id="expense-description" value={description} onChange={e => setDescription(e.target.value)} required autoFocus />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={`Amount (${currencySymbol(currency)})`} id="expense-amount" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                <Input label="Date" id="expense-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Category" id="expense-category" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>
                    {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Select label="Project" hint="optional" id="expense-project" value={projectId} onChange={e => setProjectId(e.target.value)}>
                    <option value="">None</option>
                    {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
            </div>
            <Input label="Receipt link" hint="optional" id="expense-receipt" type="url" placeholder="https://drive.google.com/..." value={receiptUrl} onChange={e => setReceiptUrl(e.target.value)} />
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : expense ? 'Save Expense' : 'Add Expense'}</Button>
            </div>
        </form>
    );
};

type Period = 'month' | 'last3' | 'quarter' | 'year' | 'all';

const periodStart = (p: Period): Date | null => {
    const now = new Date();
    switch (p) {
        case 'month': return startOfMonth(now);
        case 'last3': return startOfMonth(subMonths(now, 2));
        case 'quarter': return startOfQuarter(now);
        case 'year': return startOfYear(now);
        default: return null;
    }
};

const Expenses: React.FC = () => {
    const { data, deleteExpense } = useData();
    const currency = useCurrency();
    const { toast, confirm } = useToast();
    const { expenses, projects } = data;
    const [searchParams, setSearchParams] = useSearchParams();
    const [modal, setModal] = useState<{ expense?: Expense } | null>(null);
    useEffect(() => {
        if (searchParams.get('new')) {
            setModal({});
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);
    const [period, setPeriod] = useState<Period>('all');
    const [category, setCategory] = useState<'' | ExpenseCategory>('');
    const [search, setSearch] = useState('');

    const getProjectName = (projectId?: string) => (projectId ? projects.find(p => p.id === projectId)?.name || 'Unknown Project' : '');

    const filtered = useMemo(() => {
        const start = periodStart(period);
        const q = search.trim().toLowerCase();
        return expenses
            .filter(ex => !start || (parseDateOnly(ex.date) || new Date(0)) >= start)
            .filter(ex => !category || ex.category === category)
            .filter(ex => !q || ex.description.toLowerCase().includes(q) || getProjectName(ex.project_id).toLowerCase().includes(q))
            .sort((a, b) => sortTime(b.date) - sortTime(a.date));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expenses, period, category, search, projects]);

    const total = filtered.reduce((s, ex) => s + ex.amount, 0);
    const byCategory = useMemo(() => {
        const map = new Map<string, number>();
        for (const ex of filtered) map.set(ex.category, (map.get(ex.category) || 0) + ex.amount);
        return [...map.entries()].sort((a, b) => b[1] - a[1]);
    }, [filtered]);

    const closeModal = () => setModal(null);

    const handleDelete = async (expense: Expense) => {
        const confirmed = await confirm({
            title: 'Delete expense',
            message: `Delete expense "${expense.description}"?`,
            danger: true,
            confirmLabel: 'Delete',
        });
        if (!confirmed) return;
        try {
            await deleteExpense(expense.id!);
            toast('Expense deleted', 'success');
        } catch (error) {
            console.error('Failed to delete expense:', error);
            toast('Could not delete expense. Please try again.', 'error');
        }
    };

    const exportCSV = () => {
        const rows = filtered.map(ex => ({
            date: formatDateOnly(ex.date, 'yyyy-MM-dd'),
            description: ex.description,
            category: ex.category,
            project: getProjectName(ex.project_id),
            amount: ex.amount,
            currency,
            receipt: ex.receipt_url || '',
        }));
        downloadText(toCSV(rows), `expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
                <Segmented<Period>
                    value={period}
                    onChange={setPeriod}
                    options={[
                        { value: 'month', label: 'This month' },
                        { value: 'last3', label: '3 months' },
                        { value: 'quarter', label: 'Quarter' },
                        { value: 'year', label: 'Year' },
                        { value: 'all', label: 'All' },
                    ]}
                />
                <SearchInput value={search} onChange={setSearch} placeholder="Search expenses..." className="lg:w-56" />
                <div className="flex gap-2 lg:ml-auto">
                    <Button variant="secondary" onClick={exportCSV} disabled={filtered.length === 0}>
                        <Icon name="download" className="w-4 h-4 mr-2" /> CSV
                    </Button>
                    <Button variant="primary" onClick={() => setModal({})}>
                        <Icon name="plus" className="w-4 h-4 mr-2" /> Add Expense
                    </Button>
                </div>
            </div>

            {expenses.length > 0 && (
                <div className="flex flex-wrap items-stretch gap-2 mb-5">
                    <div className="bg-[#192118] text-canvas px-4 py-2.5 min-w-[140px]">
                        <p className="text-[11px] uppercase tracking-wider font-bold opacity-70">Total</p>
                        <p className="text-lg font-bold tabular-nums">{formatMoney(total, currency)}</p>
                    </div>
                    {byCategory.map(([cat, amt]) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(category === cat ? '' : cat as ExpenseCategory)}
                            className={`text-left px-4 py-2.5 border transition-colors ${category === cat ? 'border-charcoal bg-surface' : 'border-border bg-canvas hover:border-charcoal'}`}
                        >
                            <p className="text-[11px] uppercase tracking-wider font-bold text-muted">{cat}</p>
                            <p className="text-sm font-bold tabular-nums">{formatMoney(amt, currency)}</p>
                        </button>
                    ))}
                    {category && !byCategory.some(([c]) => c === category) && (
                        <button onClick={() => setCategory('')} className="px-4 py-2.5 border border-charcoal bg-surface text-sm font-semibold">{category} ✕</button>
                    )}
                </div>
            )}

            {filtered.length > 0 ? (
                <div className="bg-canvas border border-border overflow-hidden">
                    <Table className="border-0">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="hidden sm:table-cell">Category</TableHead>
                                <TableHead className="hidden md:table-cell">Project</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(expense => (
                                <TableRow key={expense.id}>
                                    <TableCell className="whitespace-nowrap">{formatDateOnly(expense.date)}</TableCell>
                                    <TableCell>
                                        <span className="font-medium text-charcoal">{expense.description}</span>
                                        {expense.receipt_url && /^https?:\/\//i.test(expense.receipt_url) && (
                                            <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center text-xs text-accent hover:underline">
                                                <Icon name="external-link" className="w-3 h-3 mr-0.5" />receipt
                                            </a>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <span className={`px-2 py-0.5 text-xs font-semibold ${categoryColors[expense.category] || 'bg-surface text-muted'}`}>{expense.category}</span>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell"><span className="text-muted">{getProjectName(expense.project_id) || '—'}</span></TableCell>
                                    <TableCell className="text-right"><span className="font-bold text-charcoal tabular-nums whitespace-nowrap">{formatMoney(expense.amount, currency)}</span></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-0.5">
                                            <IconButton icon="edit" label="Edit expense" onClick={() => setModal({ expense })} />
                                            <IconButton icon="trash" label="Delete expense" tone="danger" onClick={() => handleDelete(expense)} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : expenses.length === 0 ? (
                <EmptyState icon="credit-card" title="No expenses recorded" description="Keep track of your business spending here. Link expenses to projects to see true project cost.">
                    <Button onClick={() => setModal({})}><Icon name="plus" className="w-4 h-4 mr-2" />Add Expense</Button>
                </EmptyState>
            ) : (
                <EmptyState icon="search" title="No matching expenses" description="Try a different period, category or search." />
            )}

            <Modal isOpen={!!modal} onClose={closeModal} title={modal?.expense ? 'Edit Expense' : 'Add New Expense'}>
                {modal && <ExpenseForm key={modal.expense?.id || 'new'} expense={modal.expense} onClose={closeModal} />}
            </Modal>
        </div>
    );
};

export default Expenses;
