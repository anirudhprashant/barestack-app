import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../dataStore';
import * as Icons from 'lucide-react';
import { navItems } from '../constants';

const Sidebar: React.FC = () => {
    const { data } = useData();

    const userName = data.userProfile.name || data.userProfile.email || 'User';
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
        <div className="fixed top-0 left-0 h-full w-[220px] bg-charcoal flex flex-col z-20 border-r border-border/50">
            {/* Header */}
            <div className="h-14 flex items-center px-5 border-b border-border/50">
                <div className="text-xl font-bold font-display tracking-tight text-canvas">
                    BareStack
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col justify-between px-3 py-4 overflow-y-auto">
                <nav className="flex flex-col space-y-0.5">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-none ${isActive
                                    ? 'bg-canvas text-charcoal'
                                    : 'text-muted hover:text-canvas hover:bg-charcoal/80'
                                }`
                            }
                        >
                            {iconMap[item.icon] || <Icons.Grid className="w-4 h-4" />}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}

                    <div className="pt-3 mt-3 border-t border-border/50">
                        <NavLink
                            to="/settings"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-none ${isActive
                                    ? 'bg-canvas text-charcoal'
                                    : 'text-muted hover:text-canvas hover:bg-charcoal/80'
                                }`
                            }
                        >
                            <Icons.Settings className="w-4 h-4" />
                            <span>Settings</span>
                        </NavLink>
                    </div>
                </nav>

                {/* User */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-center gap-2 px-2">
                    <div className="w-9 h-9 bg-charcoal/80 text-muted font-semibold text-sm flex items-center justify-center rounded-none border border-border/50 flex-shrink-0">
                        {userInitial}
                    </div>
                    <div className="text-muted text-xs font-medium truncate max-w-[120px]" title={userName}>
                        {userName}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
