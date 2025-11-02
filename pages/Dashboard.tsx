
import React from 'react';
import { Card, StatCard, Icon } from '../components/ui';
import { useState, useEffect } from 'react';
import { Card, StatCard, Icon } from '../components/ui';
import { RecentActivity } from '../types';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    outstandingRevenue: 0,
    activeProjects: 0,
    hoursLoggedThisWeek: 0,
    totalContacts: 0,
    unpaidInvoices: 0,
    activeTasks: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsData = await api.get('/dashboard/stats');
        setStats(statsData);
        const activityData = await api.get('/dashboard/activity');
        setRecentActivity(activityData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };
    fetchData();
  }, []);

  const activityIconMap: Record<string, React.ReactNode> = {
    CONTACT_CREATED: <Icon name="users" className="w-6 h-6 text-blue-500" />,
    PROJECT_CREATED: <Icon name="clipboard" className="w-6 h-6 text-purple-500" />,
    INVOICE_CREATED: <Icon name="document" className="w-6 h-6 text-green-500" />,
    TASK_CREATED: <Icon name="clock" className="w-6 h-6 text-yellow-500" />,
    DEAL_CREATED: <Icon name="users" className="w-6 h-6 text-teal-500" />,
    EXPENSE_CREATED: <Icon name="receipt" className="w-6 h-6 text-orange-500" />,
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
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
          {recentActivity.map(item => (
            <div key={item.id} className="flex items-center space-x-4 p-2 border-b-2 border-brand-light last:border-b-0">
              <div className="flex-shrink-0 w-10 h-10 bg-brand-light rounded-full flex items-center justify-center border-2 border-brand-dark">
                {activityIconMap[item.action]}
              </div>
              <div className="flex-grow">
                <p className="font-semibold">{item.action.replace(/_/g, ' ').toLowerCase()}</p>
              </div>
              <div className="text-sm text-gray-500 font-medium">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
