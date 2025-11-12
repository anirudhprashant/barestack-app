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
        <div className="fixed top-0 left-0 h-full w-[200px] bg-white border-r-[3px] border-brand-dark flex flex-col z-20">
            <div className="h-16 flex items-center p-4 border-b-[3px] border-brand-dark">
                <div className="text-2xl font-extrabold text-brand-dark">
                    BareStack
                </div>
            </div>
            <div className="flex-1 flex flex-col justify-between p-4 overflow-y-auto">
                <nav className="flex flex-col space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 p-2 rounded-[10px] text-brand-dark font-bold transition-all duration-200 hover:bg-brand-light ${isActive ? 'bg-brand-light border-[3px] border-brand-dark' : ''}`
                            }
                        >
                            <Icon name={item.icon as any} className="w-6 h-6" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
                <div>
                    <button
                        onClick={handleFidgetClick}
                        title="Click me!"
                        className="w-12 h-12 bg-white text-brand-dark font-bold text-xl rounded-full border-[3px] border-brand-dark shadow-neo-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center"
                    >
                        {userInitial}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
