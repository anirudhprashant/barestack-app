import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';
import * as Icons from 'lucide-react';
import { navItems } from '../constants';

const Sidebar: React.FC = () => {
    const { session } = useAuth();

    const userName = session?.user?.name || session?.user?.email || 'User';
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
        <div className="fixed top-0 left-0 h-full w-[220px] bg-[#0a0a0a] flex flex-col z-20 border-r border-zinc-800">
            {/* Header */}
            <div className="h-14 flex items-center px-5 border-b border-zinc-800">
                <div className="text-base font-bold tracking-tight text-white">
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
                                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-md ${isActive
                                    ? 'bg-white text-black'
                                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
                                }`
                            }
                        >
                            {iconMap[item.icon] || <Icons.Grid className="w-4 h-4" />}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}

                    <div className="pt-3 mt-3 border-t border-zinc-800">
                        <NavLink
                            to="/settings"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-md ${isActive
                                    ? 'bg-white text-black'
                                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
                                }`
                            }
                        >
                            <Icons.Settings className="w-4 h-4" />
                            <span>Settings</span>
                        </NavLink>
                    </div>
                </nav>

                {/* User */}
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-center gap-2 px-2">
                    <div className="w-9 h-9 bg-zinc-800 text-zinc-400 font-semibold text-sm flex items-center justify-center rounded-md flex-shrink-0">
                        {userInitial}
                    </div>
                    <div className="text-zinc-400 text-xs font-medium truncate max-w-[120px]" title={userName}>
                        {userName}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
