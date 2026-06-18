import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { navItems } from '../constants';
import { Icon } from './ui';

const Header: React.FC = () => {
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
        <header className="fixed top-0 left-[220px] right-0 h-[var(--app-shell-header-height)] bg-canvas border-b border-border flex items-center justify-between px-6 z-10">
            <h1 className="text-lg font-display text-charcoal">{currentPage}</h1>
            <div className="flex items-center space-x-3">
                <button className="p-2 text-muted hover:text-charcoal transition-colors border border-transparent hover:border-border">
                    <Icon name="bell" className="w-5 h-5" />
                </button>
                <div className="h-5 w-px bg-border"></div>
                <button
                    onClick={logout}
                    className="text-sm font-semibold text-muted hover:text-canvas hover:bg-charcoal transition-colors px-3 py-1.5 border border-border hover:border-charcoal"
                >
                    Log Out
                </button>
            </div>
        </header>
    );
};
export default Header;
