import React, { useState } from 'react';
import { Button, Icon, Modal, Input, Select, PageHeader, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { Expense, ExpenseCategory } from '../types';
import { useData } from '../dataStore';

// --- Add Expense Form ---
const AddExpenseForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { data, addExpense, addRecentActivity } = useData();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.Other);
    const [projectId, setProjectId] = useState<string | undefined>(undefined);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const newExpense: Omit<Expense, 'id' | 'user_id' | 'created_at'> = {
            date: new Date(date).toISOString(),
            category,
            amount: parseFloat(amount) || 0,
            description,
            project_id: projectId,
        };

        await addExpense(newExpense);
        await addRecentActivity({
            timestamp: new Date().toISOString(),
            type: 'EXPENSE_ADDED',
            description: `Added expense: ${description} for $${newExpense.amount}`
        });
        setLoading(false);
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Description" id="description" value={description} onChange={e => setDescription(e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
                <Input label="Amount ($)" id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
                <Input label="Date" id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <Select label="Category" id="category" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>
                {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Project (Optional)" id="project" value={projectId} onChange={e => setProjectId(e.target.value)}>
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
    const { data } = useData();
    const { expenses, projects } = data;
    const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);

    const getProjectName = (projectId?: string) => {
        if (!projectId) return '-';
        return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
    };

    const categoryColors: Record<string, string> = {
        [ExpenseCategory.Travel]: 'bg-blue-100 text-blue-700',
        [ExpenseCategory.Meals]: 'bg-orange-100 text-orange-700',
        [ExpenseCategory.Software]: 'bg-purple-100 text-purple-700',
        [ExpenseCategory.Office]: 'bg-gray-100 text-gray-700',
        [ExpenseCategory.Other]: 'bg-gray-100 text-gray-600',
    };

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader title="Expenses">
                <Button variant="primary" onClick={() => setIsAddExpenseModalOpen(true)}>
                    <Icon name="plus" className="w-4 h-4 mr-2" /> Add Expense
                </Button>
            </PageHeader>

            {expenses.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                                        <span className="font-medium text-gray-900">{expense.description}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[expense.category] || 'bg-gray-100 text-gray-600'}`}>
                                            {expense.category}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-gray-600">{getProjectName(expense.project_id)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold text-gray-900">${expense.amount.toFixed(2)}</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                            <Icon name="more-horizontal" className="w-5 h-5" />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="credit-card" className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No expenses recorded</h3>
                    <p className="text-gray-500 mb-6">Keep track of your business spending here.</p>
                </div>
            )}

            <Modal isOpen={isAddExpenseModalOpen} onClose={() => setIsAddExpenseModalOpen(false)} title="Add New Expense">
                <AddExpenseForm onClose={() => setIsAddExpenseModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Expenses;
