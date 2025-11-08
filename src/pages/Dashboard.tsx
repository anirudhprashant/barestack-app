import React from 'react';
import { Card, StatCard, Icon } from '../components/ui';
import { RecentActivity, InvoiceStatus, ProjectStatus, TaskStatus } from '../types';
import { formatDistanceToNow, startOfWeek, endOfWeek } from 'date-fns';
import { useData } from '../dataStore';

const Dashboard: React.FC = () => {
    const { data } = useData();
    const { contacts, projects, invoices, timeEntries, tasks, recentActivity } = data;

    const activityIconMap: Record<RecentActivity['type'], React.ReactNode> = {
        'CONTACT_ADDED': <Icon name="users" className="w-6 h-6 text-brand-dark"/>,
        'PROJECT_CREATED': <Icon name="clipboard" className="w-6 h-6 text-brand-dark"/>,
        'INVOICE_SENT': <Icon name="document" className="w-6 h-6 text-brand-dark"/>,
        'TASK_COMPLETED': <Icon name="clock" className="w-6 h-6 text-brand-dark"/>,
        'DEAL_ADDED': <Icon name="users" className="w-6 h-6 text-brand-dark"/>,
        'EXPENSE_ADDED': <Icon name="receipt" className="w-6 h-6 text-brand-dark"/>,
    };

    // Calculate stats
    const unpaidInvoices = invoices.filter(i => i.status === InvoiceStatus.Sent || i.status === InvoiceStatus.Overdue);
    const outstandingRevenue = unpaidInvoices.reduce((sum, inv) => {
        const subtotal = inv.line_items.reduce((s, li) => s + li.quantity * li.rate, 0);
        return sum + subtotal * (1 + inv.tax_rate / 100);
    }, 0);

    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const hoursThisWeek = timeEntries
        .filter(te => new Date(te.date) >= weekStart && new Date(te.date) <= weekEnd)
        .reduce((sum, te) => sum + te.hours, 0);
        
    const stats = {
        totalContacts: contacts.length,
        activeProjects: projects.filter(p => p.status === ProjectStatus.Active).length,
        unpaidInvoices: unpaidInvoices.length,
        hoursLoggedThisWeek: hoursThisWeek,
        outstandingRevenue: outstandingRevenue,
        activeTasks: tasks.filter(t => t.status !== TaskStatus.Done).length,
    };

    const sortedActivity = [...recentActivity].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="Outstanding Revenue" value={`$${stats.outstandingRevenue.toLocaleString()}`} icon="chart" />
                <StatCard title="Active Projects" value={stats.activeProjects} icon="clipboard" />
                <StatCard title="Hours Logged This Week" value={stats.hoursLoggedThisWeek} icon="clock" />
                <StatCard title="Total Contacts" value={stats.totalContacts} icon="users" />
                <StatCard title="Unpaid Invoices" value={stats.unpaidInvoices} icon="document" />
                <StatCard title="Active Tasks" value={stats.activeTasks} icon="clipboard" />
            </div>

            <Card>
                <h3 className="text-2xl font-bold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                    {sortedActivity.slice(0, 10).map(item => (
                        <div key={item.id} className="flex items-center space-x-4 p-2 border-b-2 border-brand-light last:border-b-0">
                            <div className="flex-shrink-0 w-10 h-10 bg-brand-light rounded-full flex items-center justify-center border-[3px] border-brand-dark">
                                {activityIconMap[item.type]}
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold">{item.description}</p>
                            </div>
                            <div className="text-sm text-brand-dark opacity-70 font-medium">
                                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;