import React, { FC } from 'react';
import { NavLink } from 'react-router-dom';

const CrmHeader: FC<{ children?: React.ReactNode }> = ({ children }) => {
    const navLinks = [
        { href: '/crm', label: 'Contacts' },
        { href: '/crm/pipeline', label: 'Pipeline' },
        { href: '/crm/activities', label: 'Activities' },
        { href: '/crm/imports', label: 'Imports' },
    ];

    return (
        <div className="flex justify-between items-center mb-8">
            <div className="flex space-x-2">
                {navLinks.map(link => (
                    <NavLink
                        key={link.href}
                        to={link.href}
                        end
                        className={({ isActive }) => 
                            `font-bold py-2 px-4 rounded-[10px] border-[3px] border-brand-dark shadow-neo-sm transition-all active:shadow-none active:translate-x-1 active:translate-y-1
                            ${isActive 
                                ? 'bg-brand-dark text-white' 
                                : 'bg-white text-brand-dark'}`
                        }
                    >
                        {link.label}
                    </NavLink>
                ))}
            </div>
            <div className="flex items-center space-x-2">
                {children}
            </div>
        </div>
    );
};

export default CrmHeader;
