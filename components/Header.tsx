import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { navItems } from '../constants';

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
        <header className="fixed top-0 left-[200px] right-0 h-16 bg-brand-light border-b-[3px] border-brand-dark flex items-center justify-between px-8 z-10">
            <h1 className="text-2xl font-extrabold text-brand-dark">{currentPage}</h1>
            <div className="flex items-center space-x-2">
                <button 
                  onClick={logout}
                  className="bg-white text-brand-dark font-bold py-1.5 px-3 rounded-[10px] border-[3px] border-brand-dark shadow-neo-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                >
                  Log Out
                </button>
            </div>
        </header>
    );
}

export default Header;
