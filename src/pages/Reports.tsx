import React from 'react';
import { Card, PageHeader } from '../components/ui';
import { useData } from '../dataStore';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { subDays, formatISO } from 'date-fns';
import { InvoiceStatus } from '../types';

const Reports: React.FC = () => {
    const { data } = useData();
    const { invoices, projects, timeEntries } = data;

    // --- Generate Chart Data ---
    const revenueData = React.useMemo(() => {
        const data = Array.from({ length: 6 }, (_, i) => {
            const d = subDays(new Date(), (5 - i) * 30);
            return { name: formatISO(d, { representation: 'date' }).substring(0, 7), revenue: 0 };
        });
        invoices.filter(i => i.status === InvoiceStatus.Paid && i.paid_date).forEach(inv => {
            const month = formatISO(new Date(inv.paid_date!), { representation: 'date' }).substring(0, 7);
            const monthData = data.find(m => m.name === month);
            if (monthData) {
                const subtotal = inv.line_items.reduce((s, li) => s + li.quantity * li.rate, 0);
                monthData.revenue += subtotal * (1 + inv.tax_rate / 100);
            }
        });
        return data;
    }, [invoices]);

    const projectProfitabilityData = React.useMemo(() => {
        return projects.map(p => {
            const loggedHours = timeEntries
                .filter(te => te.project_id === p.id)
                .reduce((sum, te) => sum + te.hours, 0);
            // Assuming a simple cost calculation, e.g., $50/hour
            const actualCost = loggedHours * 50; 
            return { name: p.name, budget: p.budget, actual: actualCost };
        });
    }, [projects, timeEntries]);

    const timeBreakdownData = React.useMemo(() => {
        return projects.map(p => ({
            name: p.name,
            hours: timeEntries.filter(te => te.project_id === p.id).reduce((sum, te) => sum + te.hours, 0)
        })).filter(p => p.hours > 0);
    }, [projects, timeEntries]);
    
    // Adhering to the strict color palette
    const COLORS = ['#2B2B2B', '#F5F5F5', '#FFFFFF'];
    const tooltipStyle = { 
        backgroundColor: '#F5F5F5', 
        border: '3px solid #2B2B2B', 
        borderRadius: '10px' 
    };

    return (
        <div>
            <PageHeader title="Reports" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="col-span-1 lg:col-span-2">
                    <h3 className="text-2xl font-bold mb-4">Revenue Over Time</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip contentStyle={tooltipStyle} />
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
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend />
                            <Bar dataKey="budget" fill="#F5F5F5" stroke="#2B2B2B" strokeWidth={2}/>
                            <Bar dataKey="actual" fill="#2B2B2B" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
                <Card>
                    <h3 className="text-2xl font-bold mb-4">Time Breakdown by Project</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={timeBreakdownData} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#2B2B2B" label>
                                {timeBreakdownData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#2B2B2B" strokeWidth={2} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
};

export default Reports;