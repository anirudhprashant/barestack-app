
import React, { useState } from 'react';
import { Card, PageHeader, Button, Icon, Input, Modal } from '../components/ui';
import { ExpenseCategory } from '../types';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';

interface Expense {
    _id: Id<"expenses">;
    date: string;
    category: "Travel" | "Meals" | "Equipment" | "Software" | "Other";
    amount: number;
    description: string;
    projectId?: Id<"projects">;
}

const Expenses: React.FC = () => {
    const projects = useQuery(api.projects.listProjects) || [];

    const [filterProjectId, setFilterProjectId] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('');

    const expenses = useQuery(
        api.expenses.listExpenses,
        {
            projectId: filterProjectId ? (filterProjectId as Id<"projects">) : undefined,
            category: filterCategory ? (filterCategory as ExpenseCategory) : undefined,
        }
    ) || [];

    const createExpense = useMutation(api.expenses.createExpense);
    const updateExpense = useMutation(api.expenses.updateExpense);
    const deleteExpense = useMutation(api.expenses.deleteExpense);

    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [expenseForm, setExpenseForm] = useState({
        date: new Date().toISOString().substring(0, 10),
        category: ExpenseCategory.Travel,
        amount: 0,
        description: '',
        projectId: '',
    });

    const handleAddExpense = () => {
        setEditingExpense(null);
        setExpenseForm({
            date: new Date().toISOString().substring(0, 10),
            category: ExpenseCategory.Travel,
            amount: 0,
            description: '',
            projectId: projects.length > 0 ? String(projects[0]._id) : '',
        });
        setShowModal(true);
    };

    const handleEditExpense = (expense: Expense) => {
        setEditingExpense(expense);
        setExpenseForm({
            date: expense.date.substring(0, 10),
            category: expense.category,
            amount: expense.amount,
            description: expense.description,
            projectId: expense.projectId ? String(expense.projectId) : '',
        });
        setShowModal(true);
    };

    const handleDeleteExpense = async (id: Id<"expenses">) => {
        if (window.confirm("Are you sure you want to delete this expense?")) {
            await deleteExpense({ id });
        }
    };

    const saveExpense = async () => {
        if (!expenseForm.description.trim()) return;

        const payload = {
            date: new Date(expenseForm.date).toISOString(),
            category: expenseForm.category,
            amount: expenseForm.amount,
            description: expenseForm.description.trim(),
            projectId: expenseForm.projectId ? (expenseForm.projectId as Id<"projects">) : undefined,
        };

        if (editingExpense) {
            await updateExpense({ id: editingExpense._id, ...payload });
        } else {
            await createExpense(payload);
        }

        setShowModal(false);
        setExpenseForm({
            date: new Date().toISOString().substring(0, 10),
            category: ExpenseCategory.Travel,
            amount: 0,
            description: '',
            projectId: projects.length > 0 ? String(projects[0]._id) : '',
        });
        setEditingExpense(null);
    };

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    const getProjectName = (projectId?: Id<"projects">) => {
        if (!projectId) return 'General';
        return projects.find(p => p._id === projectId)?.name || 'Unknown Project';
    };

    return (
        <div>
            <PageHeader>
                <Button variant="primary" onClick={handleAddExpense}><Icon name="plus"/> Add Expense</Button>
            </PageHeader>

            <Card className="mb-6">
                <h3 className="text-xl font-bold mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <label className="block text-brand-dark font-bold mb-2">Category</label>
                        <select 
                            className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark"
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {Object.values(ExpenseCategory).map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold">Total Expenses</h3>
                        <p className="text-sm text-gray-500">Filtered view</p>
                    </div>
                    <div className="text-4xl font-black">${totalAmount.toFixed(2)}</div>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-brand-dark">
                                <th className="p-4 font-black">Date</th>
                                <th className="p-4 font-black">Category</th>
                                <th className="p-4 font-black">Project</th>
                                <th className="p-4 font-black">Description</th>
                                <th className="p-4 font-black">Amount</th>
                                <th className="p-4 font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(expense => (
                                <tr key={expense._id} className="border-b-2 border-brand-light last:border-b-0">
                                    <td className="p-4">{new Date(expense.date).toLocaleDateString()}</td>
                                    <td className="p-4 font-bold">{expense.category}</td>
                                    <td className="p-4">{getProjectName(expense.projectId)}</td>
                                    <td className="p-4">{expense.description}</td>
                                    <td className="p-4 font-bold">${expense.amount.toFixed(2)}</td>
                                    <td className="p-4">
                                        <div className="flex space-x-2">
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none" onClick={() => handleEditExpense(expense)}>
                                                <Icon name="edit"/>
                                            </Button>
                                            <Button variant="secondary" className="p-2 h-12 w-12 !shadow-none" onClick={() => handleDeleteExpense(expense._id)}>
                                                <Icon name="trash"/>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {expenses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No expenses found. Click "Add Expense" to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showModal && (
                <Modal title={editingExpense ? "Edit Expense" : "Add Expense"} onClose={() => setShowModal(false)}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button onClick={saveExpense}>{editingExpense ? "Update" : "Add"} Expense</Button>
                        </>
                    }
                >
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Date</label>
                        <input 
                            type="date" 
                            className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark"
                            value={expenseForm.date}
                            onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Category</label>
                        <select 
                            className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark"
                            value={expenseForm.category}
                            onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                        >
                            {Object.values(ExpenseCategory).map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>
                    <Input 
                        label="Amount" 
                        id="expense-amount" 
                        type="number" 
                        step="0.01"
                        value={String(expenseForm.amount)} 
                        onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value || '0') })} 
                    />
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Description</label>
                        <textarea 
                            className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark"
                            rows={3}
                            value={expenseForm.description}
                            onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-brand-dark font-bold mb-2">Project</label>
                        <select 
                            className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark"
                            value={expenseForm.projectId}
                            onChange={e => setExpenseForm({ ...expenseForm, projectId: e.target.value })}
                        >
                            <option value="">Not Linked</option>
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Expenses;
