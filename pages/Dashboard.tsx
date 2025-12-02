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
        color: 'text-yellow-400',
        title: 'Pro Tip',
        description: 'Track billable hours directly from your projects to keep your invoicing accurate and effortless.',
        buttonText: 'Go to Projects',
        action: '/projects'
    },
    {
        icon: 'chart',
        color: 'text-blue-400',
        title: 'Did you know?',
        description: 'You can export your financial reports to CSV for easier accounting and tax preparation.',
        buttonText: 'View Reports',
        action: '/expenses'
    },
    {
        icon: 'users',
        color: 'text-green-400',
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
            }, 300); // Wait for fade out
        }, 8000); // Change every 8 seconds

        return () => clearInterval(interval);
    }, []);

    const tip = TIPS[currentIndex];

    return (
        <div className="bg-white text-black border border-gray-200 p-6 relative overflow-hidden transition-all duration-500">
            <div className={`relative z-10 transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex items-center mb-3">
                    <Icon name={tip.icon as any} className={`w-5 h-5 ${tip.color} mr-2`} />
                    <h3 className="text-lg font-bold">{tip.title}</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed min-h-[60px]">
                    {tip.description}
                </p>
                <Button
                    variant="secondary"
                    className="w-full justify-center bg-black text-white border-transparent hover:bg-gray-800 text-sm py-2 transition-all rounded-none"
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
                        className={`h-1 transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-black' : 'w-1 bg-gray-300'}`}
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
        'CONTACT_ADDED': <Icon name="users" className="w-5 h-5 text-blue-600" />,
        'PROJECT_CREATED': <Icon name="clipboard" className="w-5 h-5 text-purple-600" />,
        'INVOICE_CREATED': <Icon name="document" className="w-5 h-5 text-green-600" />,
        'INVOICE_SENT': <Icon name="document" className="w-5 h-5 text-emerald-600" />,
        'TASK_COMPLETED': <Icon name="check" className="w-5 h-5 text-indigo-600" />,
        'DEAL_ADDED': <Icon name="users" className="w-5 h-5 text-orange-600" />,
        'EXPENSE_ADDED': <Icon name="receipt" className="w-5 h-5 text-red-600" />,
    };

    const activityBgMap: Record<RecentActivity['type'], string> = {
        'CONTACT_ADDED': 'bg-blue-50 border-blue-100',
        'PROJECT_CREATED': 'bg-purple-50 border-purple-100',
        'INVOICE_CREATED': 'bg-green-50 border-green-100',
        'INVOICE_SENT': 'bg-emerald-50 border-emerald-100',
        'TASK_COMPLETED': 'bg-indigo-50 border-indigo-100',
        'DEAL_ADDED': 'bg-orange-50 border-orange-100',
        'EXPENSE_ADDED': 'bg-red-50 border-red-100',
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
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                        {getGreeting()}, {userProfile.name}
                    </h1>
                    <p className="text-sm text-gray-500 font-medium tracking-wide">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
                </div>
                <div className="flex space-x-3">
                    <Button variant="secondary" className="bg-white shadow-sm border border-gray-200 hover:bg-gray-50 text-gray-700" onClick={() => navigate('/settings')}>
                        <Icon name="settings" className="w-4 h-4 mr-2" /> Settings
                    </Button>
                </div>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="group relative bg-white text-black p-7 border border-gray-200 hover:border-black transition-all duration-300">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-5">
                            <Icon name="trending-up" className="w-8 h-8 text-black" />
                            <span className="text-xs font-bold px-2.5 py-1 bg-green-600 text-white rounded-none">Revenue</span>
                        </div>
                        <div className="text-4xl font-bold text-black mb-2 tracking-tight">${stats.outstandingRevenue.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 font-medium">Outstanding from {stats.unpaidInvoices} invoices</div>
                    </div>
                </div>

                <div className="group relative bg-white text-black p-7 border border-gray-200 hover:border-black transition-all duration-300">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-5">
                            <Icon name="clipboard" className="w-8 h-8 text-black" />
                            <span className="text-xs font-bold px-2.5 py-1 bg-blue-600 text-white rounded-none">Projects</span>
                        </div>
                        <div className="text-4xl font-bold text-black mb-2 tracking-tight">{stats.activeProjects}</div>
                        <div className="text-sm text-gray-600 font-medium">Active projects with {stats.activeTasks} tasks</div>
                    </div>
                </div>

                <div className="group relative bg-white text-black p-7 border border-gray-200 hover:border-black transition-all duration-300">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-5">
                            <Icon name="clock" className="w-8 h-8 text-black" />
                            <span className="text-xs font-bold px-2.5 py-1 bg-orange-600 text-white rounded-none">Time</span>
                        </div>
                        <div className="text-4xl font-bold text-black mb-2 tracking-tight">{stats.hoursLoggedThisWeek}</div>
                        <div className="text-sm text-gray-600 font-medium">Hours logged this week</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                        onClick={() => setIsAddContactModalOpen(true)}
                        className="group flex items-center justify-center gap-2 px-3 py-4 bg-white text-black border border-gray-200 hover:border-black transition-all duration-200"
                    >
                        <Icon name="users" className="w-4 h-4" />
                        <span className="font-semibold text-xs uppercase tracking-wider">Add Contact</span>
                    </button>
                    <button
                        onClick={() => setIsAddProjectModalOpen(true)}
                        className="group flex items-center justify-center gap-2 px-3 py-4 bg-white text-black border border-gray-200 hover:border-black transition-all duration-200"
                    >
                        <Icon name="plus" className="w-4 h-4" />
                        <span className="font-semibold text-xs uppercase tracking-wider">New Project</span>
                    </button>
                    <button
                        onClick={() => setIsAddInvoiceModalOpen(true)}
                        className="group flex items-center justify-center gap-2 px-3 py-4 bg-white text-black border border-gray-200 hover:border-black transition-all duration-200"
                    >
                        <Icon name="document" className="w-4 h-4" />
                        <span className="font-semibold text-xs uppercase tracking-wider">Create Invoice</span>
                    </button>
                    <button
                        onClick={() => navigate('/time-tracking')}
                        className="group flex items-center justify-center gap-2 px-3 py-4 bg-white text-black border border-gray-200 hover:border-black transition-all duration-200"
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
                    <div className="bg-white border border-gray-200">
                        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recent Activity</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {sortedActivity.length > 0 ? sortedActivity.slice(0, 6).map(item => (
                                <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start space-x-4">
                                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center border ${activityBgMap[item.type] || 'bg-gray-100 border-gray-200'}`}>
                                        {activityIconMap[item.type]}
                                    </div>
                                    <div className="flex-grow pt-0.5">
                                        <p className="text-sm font-medium text-gray-900">{item.description}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 flex items-center">
                                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-12 text-gray-500">
                                    <Icon name="activity" className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p>No recent activity to show.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
                            <button className="text-xs font-bold uppercase tracking-wider text-black hover:underline">View All Activity</button>
                        </div>
                    </div>
                </div>

                {/* Side Panel */}
                <div className="space-y-6">
                    {/* Pro Tip Card */}
                    <ProTipCard />

                    {/* Mini Stats */}
                    <div className="bg-white border border-gray-200 p-5">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Overview</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Total Contacts</span>
                                <span className="text-sm font-bold text-gray-900">{stats.totalContacts}</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 overflow-hidden">
                                <div className="bg-black h-full" style={{ width: '70%' }}></div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-sm text-gray-600">Tasks Completed</span>
                                <span className="text-sm font-bold text-gray-900">
                                    {tasks.filter(t => t.status === TaskStatus.Done).length} / {tasks.length}
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 overflow-hidden">
                                <div className="bg-black h-full" style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === TaskStatus.Done).length / tasks.length) * 100 : 0}%` }}></div>
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
