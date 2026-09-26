import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ActivityType, RecentActivity } from '../types';
import { Icon, IconName } from './ui';
import { parseDate } from '../src/lib/dates';

export const activityStyle: Record<ActivityType, { icon: IconName; color: string; label: string }> = {
    CONTACT_ADDED: { icon: 'users', color: 'bg-activity-blue/10 border-activity-blue/20 text-activity-blue', label: 'Contacts' },
    PROJECT_CREATED: { icon: 'clipboard', color: 'bg-activity-purple/10 border-activity-purple/20 text-activity-purple', label: 'Projects' },
    INVOICE_CREATED: { icon: 'document', color: 'bg-activity-green/10 border-activity-green/20 text-activity-green', label: 'Invoices' },
    INVOICE_UPDATED: { icon: 'edit', color: 'bg-activity-blue/10 border-activity-blue/20 text-activity-blue', label: 'Invoices' },
    INVOICE_SENT: { icon: 'send', color: 'bg-activity-emerald/10 border-activity-emerald/20 text-activity-emerald', label: 'Invoices' },
    INVOICE_PAID: { icon: 'wallet', color: 'bg-activity-green/10 border-activity-green/20 text-activity-green', label: 'Invoices' },
    INVOICE_DELETED: { icon: 'trash', color: 'bg-activity-red/10 border-activity-red/20 text-activity-red', label: 'Invoices' },
    TASK_COMPLETED: { icon: 'check', color: 'bg-activity-indigo/10 border-activity-indigo/20 text-activity-indigo', label: 'Projects' },
    DEAL_ADDED: { icon: 'trending-up', color: 'bg-activity-orange/10 border-activity-orange/20 text-activity-orange', label: 'Deals' },
    DEAL_WON: { icon: 'target', color: 'bg-activity-green/10 border-activity-green/20 text-activity-green', label: 'Deals' },
    EXPENSE_ADDED: { icon: 'receipt', color: 'bg-activity-red/10 border-activity-red/20 text-activity-red', label: 'Expenses' },
    TIME_LOGGED: { icon: 'clock', color: 'bg-activity-orange/10 border-activity-orange/20 text-activity-orange', label: 'Time' },
};

const fallback = { icon: 'activity' as IconName, color: 'bg-surface border-border text-muted', label: 'Other' };

export const ActivityRow: React.FC<{ item: RecentActivity; compact?: boolean }> = ({ item, compact }) => {
    const style = activityStyle[item.type] || fallback;
    const when = parseDate(item.timestamp);
    return (
        <div className={`${compact ? 'p-4' : 'p-5'} hover:bg-surface/50 transition-colors flex items-start gap-4`}>
            <div className={`flex-shrink-0 ${compact ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center border ${style.color}`}>
                <Icon name={style.icon} className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            </div>
            <div className="flex-grow min-w-0 pt-0.5">
                <p className="text-sm font-medium text-charcoal break-words">{item.description}</p>
                <p className="text-xs text-muted mt-0.5" title={when ? when.toLocaleString() : undefined}>
                    {when ? formatDistanceToNow(when, { addSuffix: true }) : '—'}
                </p>
            </div>
        </div>
    );
};
