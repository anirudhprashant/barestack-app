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
        <header className="fixed top-0 left-[240px] right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 z-10">
            <div className="flex items-center space-x-3">
                <button className="p-2 text-gray-400 hover:text-black transition-colors border border-transparent hover:border-gray-200">
                    <Icon name="bell" className="w-5 h-5" />
                </button>
                <div className="h-5 w-px bg-gray-300"></div>
                <button
                    onClick={logout}
                    className="text-sm font-medium text-gray-700 hover:text-white hover:bg-black transition-colors px-3 py-1.5 border border-transparent hover:border-black"
                >
                    Log Out
                </button>
            </div>
        </header>
    );
}
export default Header;
