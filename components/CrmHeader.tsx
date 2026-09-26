import React, { FC } from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../dataStore';

const CrmHeader: FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { data } = useData();
    const openDeals = data.deals.filter(d => d.stage !== 'Won' && d.stage !== 'Lost').length;
    const navLinks = [
        { href: '/crm', label: 'Contacts', count: data.contacts.length },
        { href: '/crm/pipeline', label: 'Pipeline', count: openDeals },
        { href: '/crm/activities', label: 'Activity' },
        { href: '/crm/imports', label: 'Imports' },
    ];

    return (
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6 border-b border-border pb-4">
            <nav className="flex gap-1 overflow-x-auto -mx-1 px-1 scrollbar-hide" aria-label="CRM sections">
                {navLinks.map(link => (
                    <NavLink
                        key={link.href}
                        to={link.href}
                        end
                        className={({ isActive }) =>
                            `text-sm font-semibold py-2 px-3 sm:px-4 border transition-all rounded-none whitespace-nowrap flex items-center gap-1.5
                            ${isActive
                                ? 'bg-charcoal text-canvas border-charcoal'
                                : 'bg-canvas text-muted border-transparent hover:text-charcoal hover:border-border'}`
                        }
                    >
                        {link.label}
                        {!!link.count && <span className="text-[11px] opacity-70 tabular-nums">{link.count}</span>}
                    </NavLink>
                ))}
            </nav>
            {children && <div className="flex items-center gap-2 justify-end">{children}</div>}
        </div>
    );
};

export default CrmHeader;
