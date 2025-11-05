import React, { useState } from 'react';
import { Card, PageHeader, Button, Icon, Modal, Input, Select, Textarea } from '../components/ui';
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
            <Input label="Amount ($)" id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Input label="Date" id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
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
    
    return (
        <div>
            <PageHeader title="Expenses">
                <Button variant="primary" onClick={() => setIsAddExpenseModalOpen(true)}><Icon name="plus"/> Add Expense</Button>
            </PageHeader>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-[3px] border-brand-dark">
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
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full border-[3px] border-brand-dark text-brand-dark bg-brand-light`}>{expense.category}</span>
                                    </td>
                                    <td className="p-4">{getProjectName(expense.project_id)}</td>
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

            <Modal isOpen={isAddExpenseModalOpen} onClose={() => setIsAddExpenseModalOpen(false)} title="Add New Expense">
                <AddExpenseForm onClose={() => setIsAddExpenseModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Expenses;