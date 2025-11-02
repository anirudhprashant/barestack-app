
import React, { useState } from 'react';
import { Card, PageHeader, Button, Icon, Input, Modal } from '../components/ui';
import { Expense, ExpenseCategory } from '../types';
import { useHistory } from '../historyStore';

const Expenses: React.FC = () => {
    const { state, setState } = useHistory();
    const { expenses, projects } = state.present;
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState<{ description: string; amount: number; category: ExpenseCategory; date: string; projectId?: string }>({
        description: '',
        amount: 0,
        category: ExpenseCategory.Other,
        date: '',
        projectId: projects[0]?.id,
    });

    const handleAddExpense = () => {
        setExpenseForm({ description: '', amount: 0, category: ExpenseCategory.Other, date: '', projectId: projects[0]?.id });
        setShowExpenseModal(true);
    };

    const saveExpense = () => {
        const description = expenseForm.description.trim();
        if (!description) return;
        const amountNum = expenseForm.amount || 0;
        const newExpense: Expense = {
            id: `e${Date.now()}`,
            date: expenseForm.date || new Date().toISOString(),
            category: expenseForm.category,
            amount: amountNum,
            description: description,
            projectId: expenseForm.projectId || undefined,
        };

        const newActivity = {
            id: `ra${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'EXPENSE_ADDED' as const,
            description: `Added expense: ${description} for $${newExpense.amount}`
        };

        setState({
            ...state.present,
            expenses: [...state.present.expenses, newExpense],
            recentActivity: [...state.present.recentActivity, newActivity]
        });
        setShowExpenseModal(false);
    };
    
    const getProjectName = (projectId?: string) => {
        if (!projectId) return '-';
        return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
    };
    
    const categoryColors: Record<ExpenseCategory, string> = {
        [ExpenseCategory.Travel]: 'bg-blue-300',
        [ExpenseCategory.Meals]: 'bg-orange-300',
        [ExpenseCategory.Equipment]: 'bg-purple-300',
        [ExpenseCategory.Software]: 'bg-indigo-300',
        [ExpenseCategory.Other]: 'bg-gray-300',
    };

    return (
        <div>
            <PageHeader title="Expenses">
                <Button variant="primary" onClick={handleAddExpense}><Icon name="plus"/> Add Expense</Button>
            </PageHeader>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-brand-dark">
                                <th className="p-4 font-black">Date</th>
                                <th className="p-4 font-black">Description</th>
                                <th className="p-4 font-black">Category</th>
                                <th className="p-4 font-black">Project</th>
                                <th className="p-4 font-black">Amount</th>
                                <th className="p-4 font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(expense => (
                                <tr key={expense.id} className="border-b-2 border-brand-light last:border-b-0">
                                    <td className="p-4 font-semibold">{new Date(expense.date).toLocaleDateString()}</td>
                                    <td className="p-4 font-bold">{expense.description}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full border-2 border-brand-dark text-brand-dark ${categoryColors[expense.category]}`}>{expense.category}</span>
                                    </td>
                                    <td className="p-4">{getProjectName(expense.projectId)}</td>
                                    <td className="p-4 font-bold">${expense.amount.toFixed(2)}</td>
                                    <td className="p-4">
                                         <div className="flex space-x-2">
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none"><Icon name="receipt"/></Button>
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none"><Icon name="edit"/></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showExpenseModal && (
                <Modal title="Add Expense" onClose={() => setShowExpenseModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowExpenseModal(false)}>Cancel</Button>
                            <Button onClick={saveExpense}>Add Expense</Button>
                        </>
                    }
                >
                    <Input label="Description" id="expense-description" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                    <Input label="Amount ($)" id="expense-amount" type="number" value={String(expenseForm.amount)} onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value || '0') })} />
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Category</label>
                        <select className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}>
                            {Object.values(ExpenseCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Date</label>
                        <input type="date" className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Project (optional)</label>
                        <select className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" value={expenseForm.projectId || ''} onChange={e => setExpenseForm({ ...expenseForm, projectId: e.target.value || undefined })}>
                            <option value="">None</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Expenses;
