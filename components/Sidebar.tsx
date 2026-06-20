import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../dataStore';
import * as Icons from 'lucide-react';
import { navItems } from '../constants';
import { Icon } from './ui';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

/** Shared sidebar content between desktop and mobile variants */
const SidebarContent: React.FC<{
    userName: string;
    userEmail: string;
    userInitial: string;
    iconMap: Record<string, React.ReactNode>;
    onNavigate?: () => void;
}> = ({ userName, userEmail, userInitial, iconMap, onNavigate }) => (
    <>
        {/* Header */}
        <div className="h-[var(--app-shell-header-height)] flex items-center px-5 border-b border-border/50 shrink-0">
            <div className="text-xl font-bold font-display tracking-tight text-canvas">
                BareStack<span className="italic">OS</span>
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col space-y-0.5 px-3 py-4 overflow-y-auto">
            {navItems.map((item) => (
                <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-none ${isActive
                            ? 'bg-canvas text-charcoal'
                            : 'text-canvas/60 hover:text-canvas hover:bg-canvas/10'
                        }`
                    }
                >
                    {iconMap[item.icon] || <Icons.Grid className="w-4 h-4" />}
                    <span>{item.label}</span>
                </NavLink>
            ))}
        </nav>

        {/* Account footer — separated from nav by top border */}
        <div className="shrink-0 border-t border-canvas/20 px-3 py-4 space-y-1">
            {/* Settings — grouped with account, not mixed into nav */}
            <NavLink
                to="/settings"
                onClick={onNavigate}
                className={({ isActive }) =>
                    `flex items-center gap-3 px-2 py-2 text-sm font-medium transition-all duration-150 rounded-none ${isActive
                        ? 'bg-canvas text-charcoal'
                        : 'text-canvas/60 hover:text-canvas hover:bg-canvas/10'
                    }`
                }
            >
                <Icons.Settings className="w-5 h-5 flex-shrink-0" />
                <span>Settings</span>
            </NavLink>

            {/* User profile */}
            <div className="flex items-center gap-3 px-2 pt-3">
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-canvas/80 font-bold text-xs">
                    {userInitial}
                </div>
                <div className="min-w-0">
                    <div className="text-canvas text-sm font-medium truncate max-w-[150px] leading-tight" title={userName}>
                        {userName}
                    </div>
                    <div className="text-canvas/40 text-xs truncate max-w-[150px]" title={userEmail}>
                        {userEmail}
                    </div>
                </div>
            </div>
        </div>
    </>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { data } = useData();

    const userName = data.userProfile.name || data.userProfile.email || 'User';
    const userEmail = data.userProfile.email || '';
    const userInitial = userName[0].toUpperCase();

    const iconMap: Record<string, React.ReactNode> = {
        grid: <Icons.LayoutGrid className="w-4 h-4" />,
        users: <Icons.Users className="w-4 h-4" />,
        clipboard: <Icons.ClipboardList className="w-4 h-4" />,
        document: <Icons.FileText className="w-4 h-4" />,
        clock: <Icons.Clock className="w-4 h-4" />,
        receipt: <Icons.Receipt className="w-4 h-4" />,
        chart: <Icons.BarChart3 className="w-4 h-4" />,
        settings: <Icons.Settings className="w-4 h-4" />,
    };

    return (
        <>
            {/* Desktop sidebar — always visible on md+ */}
            <div className="hidden md:flex fixed top-0 left-0 h-full w-[220px] bg-[#192118] paper-grain flex-col z-20">
                <SidebarContent userName={userName} userEmail={userEmail} userInitial={userInitial} iconMap={iconMap} />
            </div>

            {/* Mobile sidebar — slide-in drawer */}
            <div
                className={`md:hidden fixed top-0 left-0 h-full w-[260px] bg-[#192118] paper-grain flex-col z-30 transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Close button for mobile */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-3 p-2 text-canvas/60 hover:text-canvas transition-colors z-10"
                    aria-label="Close navigation"
                >
                    <Icon name="x" size={20} />
                </button>
                <SidebarContent userName={userName} userEmail={userEmail} userInitial={userInitial} iconMap={iconMap} onNavigate={onClose} />
            </div>
        </>
    );
};

export default Sidebar;