import React from 'react';
import { Card, PageHeader, Button, Icon } from '../components/ui';
import { Expense, ExpenseCategory } from '../types';
import { useData } from '../dataStore';

const Expenses: React.FC = () => {
    const { data, addExpense, addRecentActivity } = useData();
    const { expenses, projects } = data;

    const handleAddExpense = async () => {
        const description = prompt("Enter expense description:", "New Software Subscription");
        if (!description) return;
        
        const amount = prompt("Enter amount:", "50");
        if (!amount || isNaN(parseFloat(amount))) return;

        const newExpense: Omit<Expense, 'id' | 'user_id' | 'created_at'> = {
            date: new Date().toISOString(),
            category: ExpenseCategory.Software,
            amount: parseFloat(amount),
            description: description,
        };
        
        await addExpense(newExpense);
        await addRecentActivity({
            timestamp: new Date().toISOString(),
            type: 'EXPENSE_ADDED',
            description: `Added expense: ${description} for $${newExpense.amount}`
        });
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
        </div>
    );
};

export default Expenses;