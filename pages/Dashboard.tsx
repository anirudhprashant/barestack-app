import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, differenceInCalendarDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Icon, IconName, Button, Modal } from '../components/ui';
import { InvoiceStatus, ProjectStatus, TaskStatus } from '../types';
import { useData, useCurrency } from '../dataStore';
import { ContactForm } from '../components/ContactForm';
import { ProjectForm } from '../components/ProjectForm';
import { InvoiceForm } from '../components/InvoiceForm';
import { ActivityRow } from '../components/activity';
import { formatMoney, formatHours } from '../src/lib/format';
import { parseDateOnly, sortTime, formatDateOnly } from '../src/lib/dates';
import { invoiceTotal, effectiveStatus, isUnpaid } from '../src/lib/invoice';
import { computeNotifications } from '../src/lib/notifications';
import { useToast } from '../src/context/ToastContext';

const TIPS: { icon: IconName; title: string; description: string; buttonText: string; action: string }[] = [
    {
        icon: 'command',
        title: 'Jump anywhere',
        description: 'Press Ctrl+K (⌘K on Mac) to search contacts, projects and invoices, or start a timer, from any page.',
        buttonText: 'Try it on any page',
        action: '',
    },
    {
        icon: 'timer',
        title: 'Track, then bill',
        description: 'Start a timer on a project, then turn every unbilled hour into invoice lines in one click from the project page.',
        buttonText: 'Go to Time Tracking',
        action: '/time-tracking',
    },
    {
        icon: 'building',
        title: 'Look professional',
        description: 'Add your business name, address, currency and payment details once. They appear on every invoice PDF.',
        buttonText: 'Business settings',
        action: '/settings#business',
    },
    {
        icon: 'database',
        title: 'Your data, portable',
        description: 'Download a full backup any time and restore it into any BareStackOS instance, self-hosted or cloud.',
        buttonText: 'Backup & export',
        action: '/settings#data',
    },
];

const ProTipCard: React.FC = () => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % TIPS.length);
                setIsAnimating(false);
            }, 300);
        }, 9000);
        return () => clearInterval(interval);
    }, []);

    const tip = TIPS[currentIndex];

    return (
        <div className="bs-ink bg-panel paper-grain text-cream border border-border p-6 relative overflow-hidden">
            <div className={`relative transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex items-center mb-3">
                    <Icon name={tip.icon} className="w-5 h-5 text-accent mr-2" />
                    <h3 className="text-lg font-bold">{tip.title}</h3>
                </div>
                <p className="text-cream/70 text-sm mb-4 leading-relaxed min-h-[60px]">{tip.description}</p>
                {tip.action ? (
                    <Button
                        variant="secondary"
                        className="bs-btn-amber w-full justify-center bg-cream text-[#151817] border-cream hover:bg-cream/90 text-sm py-2"
                        onClick={() => {
                            const [path, hash] = tip.action.split('#');
                            navigate(path);
                            if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 150);
                        }}
                    >
                        {tip.buttonText}
                    </Button>
                ) : (
                    <p className="text-xs text-cream/50 font-semibold uppercase tracking-wider">{tip.buttonText}</p>
                )}
            </div>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1.5">
                {TIPS.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`Show tip ${idx + 1}`}
                        className={`h-1 transition-all duration-300 ${idx === currentIndex ? 'bs-dot-on w-4 bg-cream' : 'w-1 bg-cream/30'}`}
                    />
                ))}
            </div>
        </div>
    );
};

const CHECKLIST_KEY = 'barestack.onboarding.hidden';

const GettingStarted: React.FC<{ onAction: (a: 'contact' | 'project' | 'invoice') => void }> = ({ onAction }) => {
    const { data, loadSampleData } = useData();
    const { toast } = useToast();
    const [loadingSample, setLoadingSample] = useState(false);
    const isEmpty = data.contacts.length === 0 && data.projects.length === 0 && data.invoices.length === 0;
    const loadSample = async () => {
        setLoadingSample(true);
        try {
            await loadSampleData();
            toast('Sample data added. Remove it any time in Settings.', 'success');
        } catch (e) {
            console.error(e);
            toast('Could not add sample data.', 'error');
        } finally {
            setLoadingSample(false);
        }
    };
    const navigate = useNavigate();
    const [hidden, setHidden] = useState(() => {
        try { return localStorage.getItem(CHECKLIST_KEY) === '1'; } catch { return false; }
    });

    const steps = [
        { done: !!data.businessProfile.id, label: 'Add your business details', hint: 'Name, address, currency and payment info for invoices', run: () => navigate('/settings') },
        { done: data.contacts.length > 0, label: 'Add your first client', hint: 'Or import a spreadsheet of contacts', run: () => onAction('contact') },
        { done: data.projects.length > 0, label: 'Create a project', hint: 'Set an hourly rate to bill time automatically', run: () => onAction('project') },
        { done: data.timeEntries.length > 0, label: 'Track some time', hint: 'Use the timer or log hours manually', run: () => navigate('/time-tracking') },
        { done: data.invoices.length > 0, label: 'Send your first invoice', hint: 'Branded PDF, emailed in a click', run: () => onAction('invoice') },
    ];
    const doneCount = steps.filter(s => s.done).length;
    if (hidden || doneCount === steps.length) return null;

    return (
        <div className="bg-canvas border border-charcoal">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider font-body">Getting started</h3>
                    <p className="text-xs text-muted">{doneCount} of {steps.length} done</p>
                </div>
                <button
                    onClick={() => { setHidden(true); try { localStorage.setItem(CHECKLIST_KEY, '1'); } catch { /* ignore */ } }}
                    className="text-xs text-muted hover:text-charcoal underline"
                >
                    Hide
                </button>
            </div>
            <div className="bs-meter h-1 bg-surface"><div className="h-full bg-accent transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
            {isEmpty && (
                <div className="px-5 py-4 border-b border-border bg-surface flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <p className="text-sm text-charcoal"><span className="font-semibold">Just looking around?</span> <span className="text-muted">Fill the app with a sample agency to see everything in action.</span></p>
                    <Button variant="secondary" className="text-sm py-1.5 shrink-0" onClick={loadSample} disabled={loadingSample}>
                        <Icon name="sparkles" className="w-4 h-4 mr-2" />{loadingSample ? 'Adding…' : 'Load sample data'}
                    </Button>
                </div>
            )}
            <ol className="divide-y divide-border/50">
                {steps.map((s, i) => (
                    <li key={s.label}>
                        <button onClick={s.run} disabled={s.done} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface/60 disabled:hover:bg-transparent">
                            <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold border shrink-0 ${s.done ? 'bg-charcoal border-charcoal text-canvas' : 'border-border text-muted'}`}>
                                {s.done ? <Icon name="check" className="w-3.5 h-3.5" /> : i + 1}
                            </span>
                            <span className="min-w-0">
                                <span className={`block text-sm font-semibold ${s.done ? 'text-muted line-through' : 'text-charcoal'}`}>{s.label}</span>
                                {!s.done && <span className="block text-xs text-muted">{s.hint}</span>}
                            </span>
                            {!s.done && <Icon name="chevron-right" className="w-4 h-4 text-muted ml-auto shrink-0" />}
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { data } = useData();
    const currency = useCurrency();
    const { contacts, projects, invoices, timeEntries, tasks, recentActivity, userProfile } = data;
    const navigate = useNavigate();
    const [modal, setModal] = useState<null | 'contact' | 'project' | 'invoice'>(null);

    const stats = useMemo(() => {
        const unpaid = invoices.filter(isUnpaid);
        const overdue = unpaid.filter(i => effectiveStatus(i) === InvoiceStatus.Overdue);
        const monthStart = startOfMonth(new Date());
        const paidThisMonth = invoices
            .filter(i => i.status === InvoiceStatus.Paid)
            .filter(i => { const d = parseDateOnly(i.paid_date) || parseDateOnly(i.issue_date); return !!d && d >= monthStart; })
            .reduce((s, i) => s + invoiceTotal(i), 0);
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
        const hoursThisWeek = timeEntries
            .filter(te => { const d = parseDateOnly(te.date); return !!d && d >= weekStart && d <= weekEnd; })
            .reduce((sum, te) => sum + te.hours, 0);
        return {
            outstanding: unpaid.reduce((s, i) => s + invoiceTotal(i), 0),
            unpaidCount: unpaid.length,
            overdueCount: overdue.length,
            paidThisMonth,
            activeProjects: projects.filter(p => p.status === ProjectStatus.Active).length,
            openTasks: tasks.filter(t => t.status !== TaskStatus.Done).length,
            hoursThisWeek,
        };
    }, [invoices, projects, tasks, timeEntries]);

    const attention = useMemo(() => computeNotifications(data, currency).slice(0, 5), [data, currency]);

    const upcoming = useMemo(() => tasks
        .filter(t => t.status !== TaskStatus.Done && t.due_date)
        .filter(t => projects.find(p => p.id === t.project_id)?.status === ProjectStatus.Active)
        .sort((a, b) => sortTime(a.due_date) - sortTime(b.due_date))
        .slice(0, 5), [tasks, projects]);

    const sortedActivity = useMemo(() => [...recentActivity].sort((a, b) => sortTime(b.timestamp) - sortTime(a.timestamp)).slice(0, 6), [recentActivity]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };
    const firstName = (userProfile.name || '').trim().split(/\s+/)[0];

    const quickActions: { label: string; short: string; icon: IconName; run: () => void }[] = [
        { label: 'Add Contact', short: 'Contact', icon: 'users', run: () => setModal('contact') },
        { label: 'New Project', short: 'Project', icon: 'clipboard', run: () => setModal('project') },
        { label: 'New Invoice', short: 'Invoice', icon: 'document', run: () => setModal('invoice') },
        { label: 'Log Time', short: 'Time', icon: 'clock', run: () => navigate('/time-tracking') },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="bs-headline text-2xl sm:text-4xl font-bold font-display text-charcoal mb-2 tracking-tight">
                        {getGreeting()}{firstName ? `, ${firstName}` : ''}
                    </h1>
                    <p className="bs-meta text-sm text-muted font-medium tracking-wide">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {[
                    { icon: 'trending-up' as IconName, badge: 'Outstanding', badgeClass: 'bg-panel text-cream', value: formatMoney(stats.outstanding, currency), sub: stats.overdueCount ? <span className="text-activity-red font-semibold">{stats.overdueCount} overdue of {stats.unpaidCount}</span> : `${stats.unpaidCount} unpaid invoice${stats.unpaidCount === 1 ? '' : 's'}`, to: '/invoices' },
                    { icon: 'wallet' as IconName, badge: 'Paid', badgeClass: 'bg-activity-blue text-cream', value: formatMoney(stats.paidThisMonth, currency), sub: `Collected in ${format(new Date(), 'MMMM')}`, to: '/reports' },
                    { icon: 'clipboard' as IconName, badge: 'Projects', badgeClass: 'bg-[#e8b86d] text-[#151817]', value: stats.activeProjects, sub: `Active, ${stats.openTasks} open task${stats.openTasks === 1 ? '' : 's'}`, to: '/projects' },
                    { icon: 'clock' as IconName, badge: 'Time', badgeClass: 'bg-[#c37624] text-cream', value: formatHours(stats.hoursThisWeek), sub: 'Logged this week', to: '/time-tracking' },
                ].map(tile => (
                    <button key={tile.badge} onClick={() => navigate(tile.to)} className="bs-card text-left bg-canvas text-charcoal p-4 sm:p-6 border border-border hover:border-charcoal transition-colors">
                        <div className="flex justify-between items-start mb-4 sm:mb-5 gap-2">
                            <Icon name={tile.icon} className="w-6 h-6 sm:w-8 sm:h-8 text-charcoal" />
                            <span className={`bs-badge text-[10px] sm:text-xs font-bold px-2 py-1 ${tile.badgeClass}`}>{tile.badge}</span>
                        </div>
                        <div className="bs-score text-xl sm:text-3xl font-bold text-charcoal mb-1 tracking-tight tabular-nums truncate">{tile.value}</div>
                        <div className="bs-tile-sub text-xs sm:text-sm text-muted font-medium">{tile.sub}</div>
                    </button>
                ))}
            </div>

            <div>
                <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 font-body">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {quickActions.map(a => (
                        <button
                            key={a.label}
                            onClick={a.run}
                            className="flex items-center justify-center gap-2 px-2 sm:px-3 py-3 sm:py-4 bg-canvas text-charcoal border border-border hover:border-charcoal transition-colors"
                        >
                            <Icon name={a.icon} className="w-4 h-4" />
                            <span className="font-semibold text-xs uppercase tracking-wider hidden sm:inline">{a.label}</span>
                            <span className="font-semibold text-xs uppercase tracking-wider sm:hidden">{a.short}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <GettingStarted onAction={setModal} />

                    {attention.length > 0 && (
                        <div className="bg-canvas border border-border">
                            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                                <Icon name="alert-triangle" className="w-4 h-4 text-activity-orange" />
                                <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider font-body">Needs attention</h3>
                            </div>
                            <div className="divide-y divide-border/50">
                                {attention.map(n => (
                                    <button key={n.id} onClick={() => navigate(n.href)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface/60">
                                        <span className={`w-2 h-2 shrink-0 ${n.severity === 'critical' ? 'bg-activity-red' : n.severity === 'warning' ? 'bg-activity-orange' : 'bg-activity-blue'}`} aria-label={n.severity} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium text-charcoal truncate">{n.title}</span>
                                            <span className="block text-xs text-muted truncate">{n.detail}</span>
                                        </span>
                                        <Icon name="chevron-right" className="w-4 h-4 text-muted shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-canvas border border-border">
                        <div className="p-5 border-b border-border">
                            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider font-body">Recent Activity</h3>
                        </div>
                        <div className="divide-y divide-border/50">
                            {sortedActivity.length > 0 ? sortedActivity.map(item => <ActivityRow key={item.id} item={item} compact />) : (
                                <div className="text-center py-12 text-muted">
                                    <Icon name="activity" className="w-12 h-12 mx-auto text-border mb-3" />
                                    <p>No recent activity to show.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-surface border-t border-border text-center">
                            <button onClick={() => navigate('/crm/activities')} className="text-xs font-bold uppercase tracking-wider text-charcoal hover:underline">View All Activity</button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <ProTipCard />

                    <div className="bg-canvas border border-border">
                        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
                            <h3 className="text-xs font-bold text-muted uppercase tracking-wider font-body">Upcoming tasks</h3>
                            <span className="bs-label text-xs text-muted shrink-0">{stats.openTasks} open</span>
                        </div>
                        {upcoming.length ? (
                            <ul className="divide-y divide-border/50">
                                {upcoming.map(t => {
                                    const due = parseDateOnly(t.due_date);
                                    const days = due ? differenceInCalendarDays(due, new Date()) : null;
                                    return (
                                        <li key={t.id}>
                                            <button onClick={() => navigate(`/projects/${t.project_id}`)} className="w-full px-5 py-3 text-left hover:bg-surface/60">
                                                <p className="text-sm font-medium text-charcoal truncate">{t.title}</p>
                                                <p className="text-xs text-muted flex justify-between gap-2">
                                                    <span className="truncate">{projects.find(p => p.id === t.project_id)?.name}</span>
                                                    <span className={`shrink-0 ${days !== null && days < 0 ? 'text-activity-red font-semibold' : days === 0 ? 'text-activity-orange font-semibold' : ''}`}>
                                                        {days === null ? '' : days < 0 ? `${-days}d late` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : formatDateOnly(t.due_date, 'MMM d')}
                                                    </span>
                                                </p>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : <p className="px-5 py-6 text-sm text-muted">Nothing due. Nice.</p>}
                    </div>

                    <div className="bg-canvas border border-border p-5">
                        <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 font-body">At a glance</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-muted">Contacts</span><span className="font-bold">{contacts.length}</span></div>
                            <div className="flex justify-between"><span className="text-muted">Open deals</span><span className="font-bold">{data.deals.filter(d => d.stage !== 'Won' && d.stage !== 'Lost').length}</span></div>
                            <div className="flex justify-between"><span className="text-muted">Tasks completed</span><span className="font-bold">{tasks.filter(t => t.status === TaskStatus.Done).length} / {tasks.length}</span></div>
                            <div className="bs-meter w-full bg-surface h-1.5 overflow-hidden">
                                <div className="bg-charcoal h-full" style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === TaskStatus.Done).length / tasks.length) * 100 : 0}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={modal === 'contact'} onClose={() => setModal(null)} title="Add New Contact">
                <ContactForm onClose={() => setModal(null)} />
            </Modal>
            <Modal isOpen={modal === 'project'} onClose={() => setModal(null)} title="Add New Project">
                <ProjectForm onClose={() => setModal(null)} />
            </Modal>
            <Modal isOpen={modal === 'invoice'} onClose={() => setModal(null)} title="Create New Invoice" maxWidthClass="max-w-3xl">
                <InvoiceForm onClose={() => setModal(null)} />
            </Modal>
        </div>
    );
};

export default Dashboard;
