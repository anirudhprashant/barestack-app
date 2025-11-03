
import React from 'react';
import { Card, StatCard, Icon } from '../components/ui';
import { RecentActivity } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

const Dashboard: React.FC = () => {
    const stats = useQuery(api.dashboard.getStats);
    const recentActivityData = useQuery(api.dashboard.getRecentActivity);

    const activityIconMap: Record<RecentActivity['type'], React.ReactNode> = {
        'CONTACT_ADDED': <Icon name="users" className="w-6 h-6 text-blue-500"/>,
        'PROJECT_CREATED': <Icon name="clipboard" className="w-6 h-6 text-purple-500"/>,
        'INVOICE_SENT': <Icon name="document" className="w-6 h-6 text-green-500"/>,
        'TASK_COMPLETED': <Icon name="clock" className="w-6 h-6 text-yellow-500"/>,
        'DEAL_ADDED': <Icon name="users" className="w-6 h-6 text-teal-500"/>,
        'EXPENSE_ADDED': <Icon name="receipt" className="w-6 h-6 text-orange-500"/>,
    };

    const recentActivity: RecentActivity[] = (recentActivityData || []).map((item) => ({
        id: item._id,
        timestamp: item.createdAt,
        type: item.action as RecentActivity['type'],
        description: `${item.action.replace(/_/g, ' ')}: ${item.entityType} ${item.entityId}`
    }));

    if (stats === undefined) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-brand-dark font-bold text-xl">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                <StatCard title="Outstanding Revenue" value={`$${(stats.unpaid_invoices_total || 0).toLocaleString()}`} icon="chart" />
                <StatCard title="Active Projects" value={stats.active_projects || 0} icon="clipboard" />
                <StatCard title="Hours Logged This Week" value={stats.hours_this_week || 0} icon="clock" />
                <StatCard title="Total Contacts" value={stats.total_contacts || 0} icon="users" />
                <StatCard title="Active Tasks" value={stats.active_tasks || 0} icon="clipboard" />
            </div>

            <Card>
                <h3 className="text-2xl font-bold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                    {recentActivity.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No recent activity. Start by adding some contacts or projects!</p>
                    ) : (
                        recentActivity.map(item => (
                            <div key={item.id} className="flex items-center space-x-4 p-2 border-b-2 border-brand-light last:border-b-0">
                                <div className="flex-shrink-0 w-10 h-10 bg-brand-light rounded-full flex items-center justify-center border-2 border-brand-dark">
                                    {activityIconMap[item.type]}
                                </div>
                                <div className="flex-grow">
                                    <p className="font-semibold">{item.description}</p>
                                </div>
                                <div className="text-sm text-gray-500 font-medium">
                                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
