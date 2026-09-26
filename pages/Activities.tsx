import React, { useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { useData } from '../dataStore';
import { EmptyState, Segmented } from '../components/ui';
import CrmHeader from '../components/CrmHeader';
import { ActivityRow, activityStyle } from '../components/activity';
import { parseDate, sortTime } from '../src/lib/dates';

const CATEGORIES = ['All', 'Contacts', 'Deals', 'Projects', 'Invoices', 'Time', 'Expenses'] as const;
type Category = typeof CATEGORIES[number];

const dayLabel = (d: Date) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, MMM d, yyyy'));

const Activities: React.FC = () => {
    const { data } = useData();
    const [category, setCategory] = useState<Category>('All');

    const groups = useMemo(() => {
        const items = [...data.recentActivity]
            .filter(a => category === 'All' || activityStyle[a.type]?.label === category)
            .sort((a, b) => sortTime(b.timestamp) - sortTime(a.timestamp));
        const out: { label: string; items: typeof items }[] = [];
        for (const item of items) {
            const d = parseDate(item.timestamp);
            const label = d ? dayLabel(d) : 'Unknown date';
            const last = out[out.length - 1];
            if (last && last.label === label) last.items.push(item);
            else out.push({ label, items: [item] });
        }
        return out;
    }, [data.recentActivity, category]);

    return (
        <div className="max-w-7xl mx-auto">
            <CrmHeader />
            <div className="max-w-4xl">
                <Segmented<Category>
                    value={category}
                    onChange={setCategory}
                    options={CATEGORIES.map(c => ({ value: c, label: c }))}
                    className="mb-4"
                />

                {groups.length > 0 ? (
                    <div className="space-y-6">
                        {groups.map(group => (
                            <section key={group.label}>
                                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 font-body">{group.label}</h3>
                                <div className="bg-canvas border border-border divide-y divide-border/50">
                                    {group.items.map(item => <ActivityRow key={item.id} item={item} />)}
                                </div>
                            </section>
                        ))}
                        <p className="text-xs text-muted text-center">Showing the latest {data.recentActivity.length} events.</p>
                    </div>
                ) : (
                    <EmptyState
                        icon="activity"
                        title={category === 'All' ? 'No activity yet' : `No ${category.toLowerCase()} activity`}
                        description="Activity appears here as you add contacts, win deals, send invoices and log time."
                    />
                )}
            </div>
        </div>
    );
};

export default Activities;
