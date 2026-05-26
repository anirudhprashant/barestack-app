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
        <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
            <div className="flex space-x-1">
                {navLinks.map(link => (
                    <NavLink
                        key={link.href}
                        to={link.href}
                        end
                        className={({ isActive }) =>
                            `text-sm font-semibold py-2 px-4 border transition-all rounded-none
                            ${isActive
                                ? 'bg-charcoal text-canvas border-charcoal'
                                : 'bg-canvas text-muted border-transparent hover:text-charcoal hover:border-border'}`
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
