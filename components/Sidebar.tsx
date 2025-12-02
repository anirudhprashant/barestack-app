import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';
import { Icon } from './ui';
import { navItems } from '../constants';

const Sidebar: React.FC = () => {
    const { session } = useAuth();

    const clickSound = useMemo(() => new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSd2T18DAAAAAAAGAg4iEBAgBSoWGy4uMD0+Pz8/Pz49PTs6NzYyMjIuKCohIiAcGBUYFRQTExETEQsKCQcGBQQDAgEAAQAEBAUGBwgJCgsMDQ4ODxEREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKi0tLzAxMjM0NTc4OTs8Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAAA='), []);

    const handleFidgetClick = () => {
        clickSound.currentTime = 0;
        clickSound.play().catch(e => console.error("Error playing sound:", e));
    };

    const userInitial = session?.user?.email ? session.user.email[0].toUpperCase() : '?';

    return (
        <div className="fixed top-0 left-0 h-full w-[240px] bg-sidebar flex flex-col z-20 border-r border-gray-800">
            {/* Header */}
            <div className="h-16 flex items-center px-6 border-b border-gray-800">
                <div className="text-lg font-bold tracking-tight text-static-white">
                    BareStack
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col justify-between px-3 py-4 overflow-y-auto">
                <nav className="flex flex-col space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 border border-transparent ${isActive
                                    ? 'bg-white text-black border-white'
                                    : 'text-gray-400 hover:text-white hover:border-gray-700'
                                }`
                            }
                        >
                            <Icon name={item.icon as any} className="w-5 h-5" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}

                    <div className="pt-4 mt-2 border-t border-gray-800">
                        <NavLink
                            to="/settings"
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 border border-transparent ${isActive
                                    ? 'bg-white text-black border-white'
                                    : 'text-gray-400 hover:text-white hover:border-gray-700'
                                }`
                            }
                        >
                            <Icon name="settings" className="w-5 h-5" />
                            <span>Settings</span>
                        </NavLink>
                    </div>
                </nav>

                {/* Fidget Button */}
                <div className="pt-4 border-t border-gray-800 flex justify-center">
                    <button
                        onClick={handleFidgetClick}
                        title="Click me!"
                        className="w-10 h-10 bg-white/5 hover:bg-white/10 text-static-white font-semibold text-sm rounded-none active:scale-95 transition-all flex items-center justify-center border border-white/10"
                    >
                        {userInitial}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
