import React from 'react';
import { Icon } from '../components/ui';
import { useData } from '../dataStore';
import { formatDistanceToNow } from 'date-fns';
import { PageHeader } from '../components/ui';
import { RecentActivity } from '../types';

const Activities: React.FC = () => {
    const { data } = useData();
    const { recentActivity } = data;

    const activityIconMap: Record<RecentActivity['type'], { icon: string, color: string }> = {
        'CONTACT_ADDED': { icon: 'users', color: 'bg-activity-blue/10 border-activity-blue/20 text-activity-blue' },
        'PROJECT_CREATED': { icon: 'clipboard', color: 'bg-activity-purple/10 border-activity-purple/20 text-activity-purple' },
        'INVOICE_CREATED': { icon: 'document', color: 'bg-activity-green/10 border-activity-green/20 text-activity-green' },
        'INVOICE_UPDATED': { icon: 'edit', color: 'bg-activity-blue/10 border-activity-blue/20 text-activity-blue' },
        'INVOICE_SENT': { icon: 'mail', color: 'bg-activity-emerald/10 border-activity-emerald/20 text-activity-emerald' },
        'INVOICE_DELETED': { icon: 'trash', color: 'bg-activity-red/10 border-activity-red/20 text-activity-red' },
        'TASK_COMPLETED': { icon: 'check', color: 'bg-activity-indigo/10 border-activity-indigo/20 text-activity-indigo' },
        'DEAL_ADDED': { icon: 'trending-up', color: 'bg-activity-orange/10 border-activity-orange/20 text-activity-orange' },
        'EXPENSE_ADDED': { icon: 'receipt', color: 'bg-activity-red/10 border-activity-red/20 text-activity-red' },
    };

    const allActivities = [...recentActivity].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className="max-w-4xl mx-auto">
            <PageHeader title="Activity Log" />

            <div className="bg-canvas border border-border">
                {allActivities.length > 0 ? (
                    <div className="divide-y divide-border/50">
                        {allActivities.map((item, index) => {
                            const iconConfig = activityIconMap[item.type] || { icon: 'activity', color: 'bg-surface border-border text-muted' };
                            return (
                                <div key={item.id || index} className="p-5 hover:bg-surface/50 transition-colors flex items-start space-x-4">
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${iconConfig.color}`}>
                                        <Icon name={iconConfig.icon as any} className="w-5 h-5" />
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="text-sm font-medium text-charcoal">{item.description}</p>
                                        <p className="text-xs text-muted mt-1">
                                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-surface flex items-center justify-center mx-auto mb-4">
                            <Icon name="activity" className="w-8 h-8 text-muted" />
                        </div>
                        <h3 className="text-lg font-medium text-charcoal mb-1">No activity yet</h3>
                        <p className="text-sm text-muted">Activity will appear here as you use the app.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Activities;
