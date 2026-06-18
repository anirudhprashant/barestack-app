import React, { useState } from 'react';
import { Button, Icon, Modal, Input, Select, PageHeader, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { Expense, ExpenseCategory } from '../types';
import { useData } from '../dataStore';
import { useToast } from '../src/context/ToastContext';

const AddExpenseForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { data, addExpense, addRecentActivity } = useData();
    const { toast } = useToast();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.Other);
    const [projectId, setProjectId] = useState<string | undefined>(undefined);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addExpense({
                date: new Date(date).toISOString(),
                category,
                amount: parseFloat(amount) || 0,
                description,
                project_id: projectId,
            });
            await addRecentActivity({
                timestamp: new Date().toISOString(),
                type: 'EXPENSE_ADDED',
                description: `Added expense: ${description} for $${amount}`
            });
            toast('Expense added', 'success');
            onClose();
        } catch (error) {
            console.error("Failed to add expense:", error);
            toast('Could not add expense. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Description" id="description" value={description} onChange={e => setDescription(e.target.value)} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Amount ($)" id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
                <Input label="Date" id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <Select label="Category" id="category" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>
                {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Project (Optional)" id="project" value={projectId || ''} onChange={e => setProjectId(e.target.value || undefined)}>
                <option value="">None</option>
                {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>{loading ? 'Saving...' : 'Save Expense'}</Button>
            </div>
        </form>
    );
};

const Expenses: React.FC = () => {
    const { data, deleteExpense } = useData();
    const { toast, confirm } = useToast();
    const { expenses, projects } = data;
    const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);

    const getProjectName = (projectId?: string) => {
        if (!projectId) return '-';
        return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
    };

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
            console.error("Failed to delete expense:", error);
            toast('Could not delete expense. Please try again.', 'error');
        }
    };

    const categoryColors: Record<string, string> = {
        [ExpenseCategory.Travel]: 'bg-activity-blue/10 text-activity-blue',
        [ExpenseCategory.Meals]: 'bg-activity-orange/10 text-activity-orange',
        [ExpenseCategory.Software]: 'bg-activity-purple/10 text-activity-purple',
        [ExpenseCategory.Equipment]: 'bg-surface text-muted',
        [ExpenseCategory.Other]: 'bg-surface text-muted',
    };

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader title="Expenses">
                <Button variant="primary" onClick={() => setIsAddExpenseModalOpen(true)}>
                    <Icon name="plus" className="w-4 h-4 mr-2" /> Add Expense
                </Button>
            </PageHeader>

            {expenses.length > 0 ? (
                <div className="bg-canvas border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.map(expense => (
                                <TableRow key={expense.id}>
                                    <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <span className="font-medium text-charcoal">{expense.description}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[expense.category] || 'bg-surface text-muted'}`}>
                                            {expense.category}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-muted">{getProjectName(expense.project_id)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold text-charcoal">${expense.amount.toFixed(2)}</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleDelete(expense)}
                                                className="text-muted hover:text-activity-red transition-colors"
                                                title="Delete Expense"
                                            >
                                                <Icon name="trash" className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12 bg-canvas border border-dashed border-border">
                    <div className="w-16 h-16 bg-surface flex items-center justify-center mx-auto mb-4">
                        <Icon name="credit-card" className="w-8 h-8 text-muted" />
                    </div>
                    <h3 className="text-lg font-medium text-charcoal mb-1">No expenses recorded</h3>
                    <p className="text-muted mb-6">Keep track of your business spending here.</p>
                </div>
            )}

            <Modal isOpen={isAddExpenseModalOpen} onClose={() => setIsAddExpenseModalOpen(false)} title="Add New Expense">
                <AddExpenseForm onClose={() => setIsAddExpenseModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Expenses;
