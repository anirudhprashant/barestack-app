import React, { useMemo, useState } from 'react';
import { format, startOfMonth, startOfYear, subMonths, eachMonthOfInterval, isSameMonth, endOfMonth } from 'date-fns';
import { useData, useCurrency } from '../dataStore';
import { InvoiceStatus, DealStage } from '../types';
import { Segmented, StatTile, Icon, IconButton, EmptyState } from '../components/ui';
import { formatMoney, formatHours } from '../src/lib/format';
import { parseDateOnly } from '../src/lib/dates';
import { invoiceTotal, isUnpaid } from '../src/lib/invoice';
import { toCSV, downloadText } from '../src/lib/csv';

type Range = '3m' | '6m' | 'ytd' | '12m';

// Validated pair (dataviz validator, light surface #FAF9F5): passes lightness,
// chroma, CVD separation and contrast. Revenue = blue, expenses = accent.
const REVENUE = '#2563EB';
const EXPENSE = '#C37624';

const rangeStart = (r: Range, now: Date) => {
    switch (r) {
        case '3m': return startOfMonth(subMonths(now, 2));
        case '6m': return startOfMonth(subMonths(now, 5));
        case 'ytd': return startOfYear(now);
        default: return startOfMonth(subMonths(now, 11));
    }
};

const HBar: React.FC<{ label: string; sub?: string; value: number; max: number; display: string; color?: string }> = ({ label, sub, value, max, display, color = REVENUE }) => (
    <div className="py-2" title={`${label}: ${display}`}>
        <div className="flex justify-between gap-3 text-sm mb-1">
            <span className="font-medium text-charcoal truncate">{label}{sub && <span className="text-muted font-normal"> · {sub}</span>}</span>
            <span className="font-semibold tabular-nums shrink-0">{display}</span>
        </div>
        <div className="h-2 bg-surface">
            <div className="h-full" style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%`, background: color }} />
        </div>
    </div>
);

const Reports: React.FC = () => {
    const { data } = useData();
    const currency = useCurrency();
    const [range, setRange] = useState<Range>('12m');
    const [showTable, setShowTable] = useState(false);
    const [hover, setHover] = useState<number | null>(null);

    const report = useMemo(() => {
        const now = new Date();
        const start = rangeStart(range, now);
        const end = endOfMonth(now);
        const months = eachMonthOfInterval({ start, end });
        const inRange = (d: Date | null) => !!d && d >= start && d <= end;

        // Revenue is recognised when an invoice is paid (paid_date, falling back
        // to the issue date for invoices marked paid before paid_date existed).
        const paid = data.invoices
            .filter(i => i.status === InvoiceStatus.Paid)
            .map(i => ({ inv: i, when: parseDateOnly(i.paid_date) || parseDateOnly(i.issue_date), total: invoiceTotal(i) }))
            .filter(x => inRange(x.when));
        const expenses = data.expenses
            .map(e => ({ ex: e, when: parseDateOnly(e.date) }))
            .filter(x => inRange(x.when));
        const time = data.timeEntries
            .map(t => ({ te: t, when: parseDateOnly(t.date) }))
            .filter(x => inRange(x.when));

        const monthly = months.map(m => ({
            month: m,
            revenue: paid.filter(x => isSameMonth(x.when!, m)).reduce((s, x) => s + x.total, 0),
            expenses: expenses.filter(x => isSameMonth(x.when!, m)).reduce((s, x) => s + x.ex.amount, 0),
            hours: time.filter(x => isSameMonth(x.when!, m)).reduce((s, x) => s + x.te.hours, 0),
        }));

        const revenue = monthly.reduce((s, m) => s + m.revenue, 0);
        const spend = monthly.reduce((s, m) => s + m.expenses, 0);
        const hours = time.reduce((s, x) => s + x.te.hours, 0);
        const billable = time.filter(x => x.te.is_billable).reduce((s, x) => s + x.te.hours, 0);

        const byClient = new Map<string, number>();
        for (const x of paid) byClient.set(x.inv.client_id, (byClient.get(x.inv.client_id) || 0) + x.total);
        const topClients = [...byClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
            .map(([id, total]) => ({ name: data.contacts.find(c => c.id === id)?.name || 'Unknown client', total }));

        const byProject = new Map<string, { hours: number; billable: number }>();
        for (const x of time) {
            const cur = byProject.get(x.te.project_id) || { hours: 0, billable: 0 };
            cur.hours += x.te.hours;
            if (x.te.is_billable) cur.billable += x.te.hours;
            byProject.set(x.te.project_id, cur);
        }
        const topProjects = [...byProject.entries()].sort((a, b) => b[1].hours - a[1].hours).slice(0, 8)
            .map(([id, v]) => ({ name: data.projects.find(p => p.id === id)?.name || 'Unknown project', ...v }));

        const byCategory = new Map<string, number>();
        for (const x of expenses) byCategory.set(x.ex.category, (byCategory.get(x.ex.category) || 0) + x.ex.amount);
        const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

        const outstanding = data.invoices.filter(isUnpaid).reduce((s, i) => s + invoiceTotal(i), 0);
        const openPipeline = data.deals.filter(d => d.stage !== DealStage.Won && d.stage !== DealStage.Lost).reduce((s, d) => s + (d.value || 0), 0);

        return { months, monthly, revenue, spend, profit: revenue - spend, hours, billable, topClients, topProjects, categories, outstanding, openPipeline };
    }, [data, range]);

    const peak = Math.max(1, ...report.monthly.map(m => Math.max(m.revenue, m.expenses)));
    const hasAny = report.revenue > 0 || report.spend > 0 || report.hours > 0;
    const margin = report.revenue > 0 ? Math.round((report.profit / report.revenue) * 100) : null;

    const exportCSV = () => {
        downloadText(toCSV(report.monthly.map(m => ({
            month: format(m.month, 'yyyy-MM'),
            revenue: Math.round(m.revenue * 100) / 100,
            expenses: Math.round(m.expenses * 100) / 100,
            profit: Math.round((m.revenue - m.expenses) * 100) / 100,
            hours: Math.round(m.hours * 100) / 100,
            currency,
        }))), `report_${range}_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <Segmented<Range>
                    value={range}
                    onChange={setRange}
                    options={[
                        { value: '3m', label: '3 months' },
                        { value: '6m', label: '6 months' },
                        { value: 'ytd', label: 'Year to date' },
                        { value: '12m', label: '12 months' },
                    ]}
                />
                <span className="text-sm text-muted">{format(report.months[0], 'MMM yyyy')} – {format(report.months[report.months.length - 1], 'MMM yyyy')}</span>
                <IconButton icon="download" label="Export monthly report to CSV" onClick={exportCSV} className="ml-auto border border-border" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatTile label="Revenue" value={formatMoney(report.revenue, currency)} sub="From paid invoices" badge="In" badgeClass="bg-activity-blue text-canvas" />
                <StatTile label="Expenses" value={formatMoney(report.spend, currency)} sub="Recorded spend" badge="Out" badgeClass="bg-[#c37624] text-canvas" />
                <StatTile label="Profit" value={formatMoney(report.profit, currency)} sub={margin === null ? 'Revenue minus expenses' : `${margin}% margin`} badge="Net" />
                <StatTile label="Hours" value={formatHours(report.hours)} sub={report.hours ? `${Math.round((report.billable / report.hours) * 100)}% billable` : 'No time logged'} badge="Time" badgeClass="bg-[#e8b86d] text-charcoal" />
            </div>

            {!hasAny ? (
                <EmptyState icon="chart" title="Nothing to report yet" description="Mark invoices as paid, record expenses and log time. Your numbers show up here." />
            ) : (
                <>
                    <div className="bg-canvas border border-border">
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider font-body">Revenue vs. expenses</h3>
                            <div className="flex items-center gap-4 text-xs text-muted">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 inline-block" style={{ background: REVENUE }} />Revenue</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 inline-block" style={{ background: EXPENSE }} />Expenses</span>
                                <button className="underline font-semibold text-charcoal" onClick={() => setShowTable(v => !v)}>{showTable ? 'Chart' : 'Table'}</button>
                            </div>
                        </div>
                        {showTable ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
                                        <tr><th className="text-left p-3">Month</th><th className="text-right p-3">Revenue</th><th className="text-right p-3">Expenses</th><th className="text-right p-3">Profit</th><th className="text-right p-3">Hours</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {report.monthly.map(m => (
                                            <tr key={m.month.toISOString()}>
                                                <td className="p-3">{format(m.month, 'MMM yyyy')}</td>
                                                <td className="p-3 text-right tabular-nums">{formatMoney(m.revenue, currency)}</td>
                                                <td className="p-3 text-right tabular-nums">{formatMoney(m.expenses, currency)}</td>
                                                <td className={`p-3 text-right tabular-nums font-semibold ${m.revenue - m.expenses < 0 ? 'text-activity-red' : ''}`}>{formatMoney(m.revenue - m.expenses, currency)}</td>
                                                <td className="p-3 text-right tabular-nums">{formatHours(m.hours)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-5">
                                <div className="relative flex gap-1 sm:gap-2 h-56 border-b border-border" onMouseLeave={() => setHover(null)}>
                                    {/* recessive gridlines */}
                                    {[0.25, 0.5, 0.75, 1].map(f => (
                                        <div key={f} className="absolute left-0 right-0 border-t border-border/40 pointer-events-none" style={{ bottom: `${f * 100}%` }}>
                                            <span className="absolute -top-2 left-0 text-[10px] text-muted bg-canvas pr-1 tabular-nums">{formatMoney(peak * f, currency, { compact: true })}</span>
                                        </div>
                                    ))}
                                    {report.monthly.map((m, i) => (
                                        <div
                                            key={m.month.toISOString()}
                                            className={`relative flex-1 flex items-end justify-center gap-[2px] h-full cursor-default ${hover === i ? 'bg-surface/70' : ''}`}
                                            onMouseEnter={() => setHover(i)}
                                            onFocus={() => setHover(i)}
                                            tabIndex={0}
                                            aria-label={`${format(m.month, 'MMMM yyyy')}: revenue ${formatMoney(m.revenue, currency)}, expenses ${formatMoney(m.expenses, currency)}`}
                                        >
                                            <div className="w-1/3 max-w-[18px]" style={{ height: `${(m.revenue / peak) * 100}%`, minHeight: m.revenue ? 2 : 0, background: REVENUE }} />
                                            <div className="w-1/3 max-w-[18px]" style={{ height: `${(m.expenses / peak) * 100}%`, minHeight: m.expenses ? 2 : 0, background: EXPENSE }} />
                                            {hover === i && (
                                                <div className={`absolute top-1 z-10 bg-charcoal text-canvas text-xs p-2.5 whitespace-nowrap pointer-events-none ${i > report.monthly.length / 2 ? 'right-0' : 'left-0'}`}>
                                                    <p className="font-bold mb-1">{format(m.month, 'MMMM yyyy')}</p>
                                                    <p className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 inline-block" style={{ background: REVENUE }} />Revenue</span><span className="tabular-nums">{formatMoney(m.revenue, currency)}</span></p>
                                                    <p className="flex justify-between gap-4"><span className="flex items-center gap-1.5"><span className="w-2 h-2 inline-block" style={{ background: EXPENSE }} />Expenses</span><span className="tabular-nums">{formatMoney(m.expenses, currency)}</span></p>
                                                    <p className="flex justify-between gap-4 border-t border-canvas/20 mt-1 pt-1"><span>Profit</span><span className="tabular-nums font-bold">{formatMoney(m.revenue - m.expenses, currency)}</span></p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-1 sm:gap-2 mt-2">
                                    {report.monthly.map((m, i) => (
                                        <span key={m.month.toISOString()} className={`flex-1 text-center text-[10px] sm:text-xs text-muted ${report.monthly.length > 6 && i % 2 === 1 ? 'hidden sm:block' : ''}`}>
                                            {format(m.month, report.monthly.length > 6 ? 'MMM' : 'MMM yy')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-canvas border border-border p-5">
                            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-3 font-body">Top clients</h3>
                            {report.topClients.length ? report.topClients.map(c => (
                                <HBar key={c.name} label={c.name} value={c.total} max={report.topClients[0].total} display={formatMoney(c.total, currency)} />
                            )) : <p className="text-sm text-muted">No paid invoices in this period.</p>}
                        </div>
                        <div className="bg-canvas border border-border p-5">
                            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-3 font-body">Hours by project</h3>
                            {report.topProjects.length ? report.topProjects.map(p => (
                                <HBar key={p.name} label={p.name} sub={`${Math.round((p.billable / (p.hours || 1)) * 100)}% billable`} value={p.hours} max={report.topProjects[0].hours} display={formatHours(p.hours)} color="#192118" />
                            )) : <p className="text-sm text-muted">No time logged in this period.</p>}
                        </div>
                        <div className="bg-canvas border border-border p-5">
                            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-3 font-body">Expenses by category</h3>
                            {report.categories.length ? report.categories.map(([cat, amt]) => (
                                <HBar key={cat} label={cat} value={amt} max={report.categories[0][1]} display={formatMoney(amt, currency)} color={EXPENSE} />
                            )) : <p className="text-sm text-muted">No expenses in this period.</p>}
                        </div>
                    </div>
                </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-canvas border border-border p-5 flex items-center gap-4">
                    <Icon name="wallet" className="w-8 h-8 text-charcoal shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wider">Outstanding now</p>
                        <p className="text-2xl font-bold tabular-nums">{formatMoney(report.outstanding, currency)}</p>
                        <p className="text-xs text-muted">Sent and overdue invoices awaiting payment</p>
                    </div>
                </div>
                <div className="bg-canvas border border-border p-5 flex items-center gap-4">
                    <Icon name="trending-up" className="w-8 h-8 text-charcoal shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wider">Open pipeline</p>
                        <p className="text-2xl font-bold tabular-nums">{formatMoney(report.openPipeline, currency)}</p>
                        <p className="text-xs text-muted">Deals not yet won or lost</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
