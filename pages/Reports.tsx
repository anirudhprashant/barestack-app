
import React from 'react';
import { Card, PageHeader } from '../components/ui';
import { useHistory } from '../historyStore';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { subDays, formatISO } from 'date-fns';
import { InvoiceStatus } from '../types';

const Reports: React.FC = () => {
    const { state } = useHistory();
    const { invoices, projects, timeEntries } = state.present;

    // --- Generate Chart Data ---
    const revenueData = React.useMemo(() => {
        const data = Array.from({ length: 6 }, (_, i) => {
            const d = subDays(new Date(), (5 - i) * 30);
            return { name: formatISO(d, { representation: 'date' }).substring(0, 7), revenue: 0 };
        });
        invoices.filter(i => i.status === InvoiceStatus.Paid && i.paidDate).forEach(inv => {
            const month = formatISO(new Date(inv.paidDate!), { representation: 'date' }).substring(0, 7);
            const monthData = data.find(m => m.name === month);
            if (monthData) {
                const subtotal = inv.lineItems.reduce((s, li) => s + li.quantity * li.rate, 0);
                monthData.revenue += subtotal * (1 + inv.taxRate / 100);
            }
        });
        return data;
    }, [invoices]);

    const projectProfitabilityData = React.useMemo(() => {
        return projects.map(p => {
            const loggedHours = timeEntries
                .filter(te => te.projectId === p.id)
                .reduce((sum, te) => sum + te.hours, 0);
            // Assuming a simple cost calculation, e.g., $50/hour
            const actualCost = loggedHours * 50; 
            return { name: p.name, budget: p.budget, actual: actualCost };
        });
    }, [projects, timeEntries]);

    const timeBreakdownData = React.useMemo(() => {
        return projects.map(p => ({
            name: p.name,
            hours: timeEntries.filter(te => te.projectId === p.id).reduce((sum, te) => sum + te.hours, 0)
        })).filter(p => p.hours > 0);
    }, [projects, timeEntries]);
    
    const COLORS = ['#2B2B2B', '#8884d8', '#82ca9d', '#ffc658', '#FF8042'];

    return (
        <div>
            <div className="mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="col-span-1 lg:col-span-2">
                    <h3 className="text-2xl font-bold mb-4">Revenue Over Time</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip contentStyle={{ backgroundColor: '#F5F5F5', border: '2px solid #2B2B2B', borderRadius: '10px' }} />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#2B2B2B" strokeWidth={4} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
                <Card>
                    <h3 className="text-2xl font-bold mb-4">Project Profitability</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={projectProfitabilityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip contentStyle={{ backgroundColor: '#F5F5F5', border: '2px solid #2B2B2B', borderRadius: '10px' }} />
                            <Legend />
                            <Bar dataKey="budget" fill="#8884d8" />
                            <Bar dataKey="actual" fill="#2B2B2B" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
                <Card>
                    <h3 className="text-2xl font-bold mb-4">Time Breakdown by Project</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={timeBreakdownData} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {timeBreakdownData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#F5F5F5', border: '2px solid #2B2B2B', borderRadius: '10px' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
};

export default Reports;
