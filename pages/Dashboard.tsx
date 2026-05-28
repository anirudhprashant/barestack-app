import React, { useState, useEffect } from 'react';
import { Card, StatCard, Icon, Button, PageHeader, Modal } from '../components/ui';
import { RecentActivity, InvoiceStatus, ProjectStatus, TaskStatus } from '../types';
import { formatDistanceToNow, startOfWeek, endOfWeek, format } from 'date-fns';
import { useData } from '../dataStore';
import { useNavigate } from 'react-router-dom';
import { ContactForm } from '../components/ContactForm';
import { ProjectForm } from '../components/ProjectForm';
import { InvoiceForm } from '../components/InvoiceForm';

const TIPS = [
    {
        icon: 'zap',
        color: 'text-accent',
        title: 'Pro Tip',
        description: 'Track billable hours directly from your projects to keep your invoicing accurate and effortless.',
        buttonText: 'Go to Projects',
        action: '/projects'
    },
    {
        icon: 'chart',
        color: 'text-accent',
        title: 'Did you know?',
        description: 'You can export your financial reports to CSV for easier accounting and tax preparation.',
        buttonText: 'View Reports',
        action: '/expenses'
    },
    {
        icon: 'users',
        color: 'text-accent',
        title: 'Teamwork',
        description: 'Add team members to projects to collaborate and track time together in real-time.',
        buttonText: 'Manage Team',
        action: '/settings'
    }
] as const;

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
        }, 8000);

        return () => clearInterval(interval);
    }, []);

    const tip = TIPS[currentIndex];

    return (
        <div className="bg-[#192118] paper-grain text-canvas border border-border p-6 relative overflow-hidden transition-all duration-500">
            <div className={`relative z-10 transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex items-center mb-3">
                    <Icon name={tip.icon as any} className={`w-5 h-5 ${tip.color} mr-2`} />
                    <h3 className="text-lg font-bold">{tip.title}</h3>
                </div>
                <p className="text-canvas/70 text-sm mb-4 leading-relaxed min-h-[60px]">
                    {tip.description}
                </p>
                <Button
                    variant="secondary"
                    className="w-full justify-center bg-canvas text-charcoal border-canvas hover:bg-surface text-sm py-2 transition-all rounded-none"
                    onClick={() => navigate(tip.action)}
                >
                    {tip.buttonText}
                </Button>
            </div>

            {/* Progress Indicators */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1.5">
                {TIPS.map((_, idx) => (
                    <div
                        key={idx}
                        className={`h-1 transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-canvas' : 'w-1 bg-canvas/30'}`}
                    />
                ))}
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { data } = useData();
    const { contacts, projects, invoices, timeEntries, tasks, recentActivity, userProfile } = data;
    const navigate = useNavigate();

    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);

    const activityIconMap: Record<RecentActivity['type'], React.ReactNode> = {
        'CONTACT_ADDED': <Icon name="users" className="w-5 h-5 text-activity-blue" />,
        'PROJECT_CREATED': <Icon name="clipboard" className="w-5 h-5 text-activity-purple" />,
        'INVOICE_CREATED': <Icon name="document" className="w-5 h-5 text-activity-green" />,
        'INVOICE_SENT': <Icon name="document" className="w-5 h-5 text-activity-emerald" />,
        'TASK_COMPLETED': <Icon name="check" className="w-5 h-5 text-activity-indigo" />,
        'DEAL_ADDED': <Icon name="users" className="w-5 h-5 text-activity-orange" />,
        'EXPENSE_ADDED': <Icon name="receipt" className="w-5 h-5 text-activity-red" />,
    };

    const activityBgMap: Record<RecentActivity['type'], string> = {
        'CONTACT_ADDED': 'bg-activity-blue/10 border-activity-blue/20',
        'PROJECT_CREATED': 'bg-activity-purple/10 border-activity-purple/20',
        'INVOICE_CREATED': 'bg-activity-green/10 border-activity-green/20',
        'INVOICE_SENT': 'bg-activity-emerald/10 border-activity-emerald/20',
        'TASK_COMPLETED': 'bg-activity-indigo/10 border-activity-indigo/20',
        'DEAL_ADDED': 'bg-activity-orange/10 border-activity-orange/20',
        'EXPENSE_ADDED': 'bg-activity-red/10 border-activity-red/20',
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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold font-display text-charcoal mb-2 tracking-tight">
                        {getGreeting()}, {userProfile.name}
                    </h1>
                    <p className="text-sm text-muted font-medium tracking-wide">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
                </div>
                <div className="flex space-x-3">
                    <Button variant="secondary" className="bg-canvas border-border hover:bg-surface text-charcoal" onClick={() => navigate('/settings')}>
                        <Icon name="settings" className="w-4 h-4 mr-2" /> Settings
                    </Button>
                </div>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="group relative bg-canvas text-charcoal p-7 border border-border hover:border-charcoal transition-all duration-300">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-5">
                            <Icon name="trending-up" className="w-8 h-8 text-charcoal" />
                            <span className="text-xs font-bold px-2.5 py-1 bg-[#192118] text-canvas rounded-none">Revenue</span>
                        </div>
                        <div className="text-4xl font-bold text-charcoal mb-2 tracking-tight">${stats.outstandingRevenue.toLocaleString()}</div>
                        <div className="text-sm text-muted font-medium">Outstanding from {stats.unpaidInvoices} invoices</div>
                    </div>
                </div>

                <div className="group relative bg-canvas text-charcoal p-7 border border-border hover:border-charcoal transition-all duration-300">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-5">
                            <Icon name="clipboard" className="w-8 h-8 text-charcoal" />
                            <span className="text-xs font-bold px-2.5 py-1 bg-[#e8b86d] text-charcoal rounded-none">Projects</span>
                        </div>
                        <div className="text-4xl font-bold text-charcoal mb-2 tracking-tight">{stats.activeProjects}</div>
                        <div className="text-sm text-muted font-medium">Active projects with {stats.activeTasks} tasks</div>
                    </div>
                </div>

                <div className="group relative bg-canvas text-charcoal p-7 border border-border hover:border-charcoal transition-all duration-300">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-5">
                            <Icon name="clock" className="w-8 h-8 text-charcoal" />
                            <span className="text-xs font-bold px-2.5 py-1 bg-[#c37624] text-canvas rounded-none">Time</span>
                        </div>
                        <div className="text-4xl font-bold text-charcoal mb-2 tracking-tight">{stats.hoursLoggedThisWeek}</div>
                        <div className="text-sm text-muted font-medium">Hours logged this week</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                        onClick={() => setIsAddContactModalOpen(true)}
                        className="group flex items-center justify-center gap-2 px-3 py-4 bg-canvas text-charcoal border border-border hover:border-charcoal transition-all duration-200"
                    >
                        <Icon name="users" className="w-4 h-4" />
                        <span className="font-semibold text-xs uppercase tracking-wider">Add Contact</span>
                    </button>
                    <button
                        onClick={() => setIsAddProjectModalOpen(true)}
                        className="group flex items-center justify-center gap-2 px-3 py-4 bg-canvas text-charcoal border border-border hover:border-charcoal transition-all duration-200"
                    >
                        <Icon name="plus" className="w-4 h-4" />
                        <span className="font-semibold text-xs uppercase tracking-wider">New Project</span>
                    </button>
                    <button
                        onClick={() => setIsAddInvoiceModalOpen(true)}
                        className="group flex items-center justify-center gap-2 px-3 py-4 bg-canvas text-charcoal border border-border hover:border-charcoal transition-all duration-200"
                    >
                        <Icon name="document" className="w-4 h-4" />
                        <span className="font-semibold text-xs uppercase tracking-wider">Create Invoice</span>
                    </button>
                    <button
                        onClick={() => navigate('/time-tracking')}
                        className="group flex items-center justify-center gap-2 px-3 py-4 bg-canvas text-charcoal border border-border hover:border-charcoal transition-all duration-200"
                    >
                        <Icon name="clock" className="w-4 h-4" />
                        <span className="font-semibold text-xs uppercase tracking-wider">Log Time</span>
                    </button>
                </div>
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2">
                    <div className="bg-canvas border border-border">
                        <div className="p-5 border-b border-border flex justify-between items-center">
                            <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider">Recent Activity</h3>
                        </div>
                        <div className="divide-y divide-border/50">
                            {sortedActivity.length > 0 ? sortedActivity.slice(0, 6).map(item => (
                                <div key={item.id} className="p-4 hover:bg-surface/50 transition-colors flex items-start space-x-4">
                                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center border ${activityBgMap[item.type] || 'bg-surface border-border'}`}>
                                        {activityIconMap[item.type]}
                                    </div>
                                    <div className="flex-grow pt-0.5">
                                        <p className="text-sm font-medium text-charcoal">{item.description}</p>
                                        <p className="text-xs text-muted mt-0.5 flex items-center">
                                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            )) : (
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

                {/* Side Panel */}
                <div className="space-y-6">
                    {/* Pro Tip Card */}
                    <ProTipCard />

                    {/* Mini Stats */}
                    <div className="bg-canvas border border-border p-5">
                        <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Overview</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted">Total Contacts</span>
                                <span className="text-sm font-bold text-charcoal">{stats.totalContacts}</span>
                            </div>
                            <div className="w-full bg-surface h-1.5 overflow-hidden">
                                <div className="bg-charcoal h-full" style={{ width: '70%' }}></div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-sm text-muted">Tasks Completed</span>
                                <span className="text-sm font-bold text-charcoal">
                                    {tasks.filter(t => t.status === TaskStatus.Done).length} / {tasks.length}
                                </span>
                            </div>
                            <div className="w-full bg-surface h-1.5 overflow-hidden">
                                <div className="bg-charcoal h-full" style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === TaskStatus.Done).length / tasks.length) * 100 : 0}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isAddContactModalOpen} onClose={() => setIsAddContactModalOpen(false)} title="Add New Contact">
                <ContactForm onClose={() => setIsAddContactModalOpen(false)} />
            </Modal>

            <Modal isOpen={isAddProjectModalOpen} onClose={() => setIsAddProjectModalOpen(false)} title="Add New Project">
                <ProjectForm onClose={() => setIsAddProjectModalOpen(false)} />
            </Modal>

            <Modal isOpen={isAddInvoiceModalOpen} onClose={() => setIsAddInvoiceModalOpen(false)} title="Create New Invoice">
                <InvoiceForm onClose={() => setIsAddInvoiceModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default Dashboard;
