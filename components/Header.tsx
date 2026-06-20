import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { navItems } from '../constants';
import { Icon } from './ui';
import { Power } from 'lucide-react';

interface HeaderProps {
    onMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
    const location = useLocation();
    const { logout } = useAuth();

    const getPageTitle = (pathname: string) => {
        if (pathname.startsWith('/crm')) return 'CRM';
        if (pathname.startsWith('/projects')) return 'Projects';
        const item = navItems.find(i => i.href === pathname);
        return item?.label || 'Overview';
    };
    const currentPage = getPageTitle(location.pathname);

    return (
        <header className="fixed top-0 left-0 md:left-[220px] right-0 h-[var(--app-shell-header-height)] bg-canvas border-b border-border flex items-center justify-between px-4 sm:px-6 z-10">
            <div className="flex items-center gap-3">
                {/* Hamburger — visible on mobile only */}
                {onMenuToggle && (
                    <button
                        onClick={onMenuToggle}
                        className="md:hidden p-2 -ml-2 text-charcoal hover:bg-surface transition-colors"
                        aria-label="Open navigation menu"
                    >
                        <Icon name="menu" size={22} />
                    </button>
                )}
                <h1 className="text-lg font-display text-charcoal">{currentPage}</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
                <button className="p-2 text-muted hover:text-charcoal transition-colors border border-transparent hover:border-border">
                    <Icon name="bell" className="w-5 h-5" />
                </button>
                <div className="h-5 w-px bg-border hidden sm:block"></div>
                {/* Desktop: boxed text button. Mobile: bare red power icon. */}
                <button
                    onClick={logout}
                    aria-label="Log out"
                    className="hidden sm:inline-flex text-sm font-semibold text-muted hover:text-canvas hover:bg-charcoal transition-colors px-3 py-1.5 border border-border hover:border-charcoal"
                >
                    Log Out
                </button>
                <button
                    onClick={logout}
                    aria-label="Log out"
                    className="sm:hidden p-1.5 text-red-600 hover:text-red-700 transition-colors"
                >
                    <Power size={20} strokeWidth={2.5} />
                </button>
            </div>
        </header>
    );
};
export default Header;