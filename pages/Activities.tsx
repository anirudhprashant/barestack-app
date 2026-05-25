import React from 'react';
import { Icon } from '../components/ui';
import { useData } from '../dataStore';
import { formatDistanceToNow, format } from 'date-fns';
import { PageHeader } from '../components/ui';
import { RecentActivity } from '../types';

const Activities: React.FC = () => {
    const { data } = useData();
    const { recentActivity, notes, contacts } = data;

    const getContactName = (contactId: string) => {
        return contacts.find(c => c.id === contactId)?.name || 'Unknown Contact';
    };

    const activityIconMap: Record<RecentActivity['type'], { icon: string, color: string }> = {
        'CONTACT_ADDED': { icon: 'users', color: 'bg-blue-50 border-blue-200 text-blue-600' },
        'PROJECT_CREATED': { icon: 'clipboard', color: 'bg-purple-50 border-purple-200 text-purple-600' },
        'INVOICE_CREATED': { icon: 'document', color: 'bg-green-50 border-green-200 text-green-600' },
        'INVOICE_SENT': { icon: 'mail', color: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
        'TASK_COMPLETED': { icon: 'check', color: 'bg-indigo-50 border-indigo-200 text-indigo-600' },
        'DEAL_ADDED': { icon: 'trending-up', color: 'bg-orange-50 border-orange-200 text-orange-600' },
        'EXPENSE_ADDED': { icon: 'receipt', color: 'bg-red-50 border-red-200 text-red-600' },
    };

    const allActivities = [...recentActivity].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className="max-w-4xl mx-auto">
            <PageHeader title="Activity Log" />

            <div className="bg-white border border-gray-200">
                {allActivities.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {allActivities.map((item, index) => {
                            const iconConfig = activityIconMap[item.type] || { icon: 'activity', color: 'bg-gray-50 border-gray-200 text-gray-600' };
                            return (
                                <div key={item.id || index} className="p-5 hover:bg-gray-50 transition-colors flex items-start space-x-4">
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${iconConfig.color}`}>
                                        <Icon name={iconConfig.icon as any} className="w-5 h-5" />
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{item.description}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icon name="activity" className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No activity yet</h3>
                        <p className="text-sm text-gray-500">Activity will appear here as you use the app.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Activities;