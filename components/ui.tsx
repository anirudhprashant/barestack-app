
import React from 'react';
import { createPortal } from 'react-dom';

// --- ICON COMPONENT ---
type IconName = 'grid' | 'users' | 'clipboard' | 'document' | 'clock' | 'receipt' | 'chart' | 'settings' | 'plus' | 'search' | 'trash' | 'edit' | 'chevron-down' | 'x' | 'check' | 'bell' | 'mail' | 'phone' | 'zap' | 'eye' | 'trending-up' | 'activity';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: IconName;
}

export const Icon: React.FC<IconProps> = ({ name, ...props }) => {
    const icons: Record<IconName, React.ReactNode> = {
        grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />,
        users: (
            <>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </>
        ),
        clipboard: <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m4 0V2a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2m-4 5h4m-4 4h4m-4 4h2" />,
        document: (
            <>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </>
        ),
        clock: (
            <>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </>
        ),
        receipt: <path d="M2 2v20l4-4 4 4 4-4 4 4V2H2zm5 5h10m-10 4h10m-10 4h6" />,
        chart: (
            <>
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
            </>
        ),
        settings: (
            <>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </>
        ),
        plus: (
            <>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
            </>
        ),
        search: (
            <>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </>
        ),
        trash: (
            <>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
            </>
        ),
        edit: (
            <>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </>
        ),
        'chevron-down': <polyline points="6 9 12 15 18 9" />,
        x: <line x1="18" y1="6" x2="6" y2="18" />,
        check: <path d="M20 6 9 17l-5-5" />,
        bell: (
            <>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </>
        ),
        mail: (
            <>
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </>
        ),
        phone: (
            <>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </>
        ),
        zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
        eye: (
            <>
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
            </>
        ),
        'trending-up': (
            <>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
            </>
        ),
        activity: (
            <>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </>
        ),
    };

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {icons[name]}
        </svg>
    );
};


// --- CARD COMPONENT ---
interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
    return (
        <div onClick={onClick} className={`bg-white p-6 border border-gray-200 ${className}`}>
            {children}
        </div>
    );
};

// --- BUTTON COMPONENT ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
    className?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseClasses = "font-medium py-2 px-4 rounded-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1";

    let variantClasses = "";
    if (variant === 'primary') {
        variantClasses = "bg-black text-white hover:bg-gray-800 focus:ring-gray-800 border border-transparent";
    } else if (variant === 'secondary') {
        variantClasses = "bg-white text-black border border-black hover:bg-gray-50 focus:ring-gray-300";
    } else if (variant === 'danger') {
        variantClasses = "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 focus:ring-red-200";
    } else if (variant === 'ghost') {
        variantClasses = "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300 border border-transparent";
    }

    return (
        <button className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
            {children}
        </button>
    );
};

// --- INPUT COMPONENT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <input id={id} {...props} className="w-full p-2.5 bg-white text-gray-900 rounded-none border border-gray-300 focus:outline-none focus:border-brand-dark focus:border-2 transition-colors" />
        </div>
    );
}

// --- TEXTAREA COMPONENT ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
}
export const Textarea: React.FC<TextareaProps> = ({ label, id, ...props }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <textarea id={id} {...props} className="w-full p-2.5 bg-white text-gray-900 rounded-none border border-gray-300 focus:outline-none focus:border-brand-dark focus:border-2 transition-colors" />
        </div>
    );
};

// --- SELECT COMPONENT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    children: React.ReactNode;
}
export const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <select id={id} {...props} className="w-full p-2.5 bg-white text-gray-900 rounded-none border border-gray-300 focus:outline-none focus:border-brand-dark focus:border-2 appearance-none bg-no-repeat bg-right pr-8 transition-colors" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23000000' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}>
                {children}
            </select>
        </div>
    );
};

// --- MODAL COMPONENT ---
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white p-6 shadow-none w-full max-w-lg relative animate-in fade-in zoom-in duration-200 border-2 border-brand-dark"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
                    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 text-gray-500 transition-colors rounded-none">
                        <Icon name="x" className="w-5 h-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
};


// --- STAT CARD COMPONENT ---
interface StatCardProps {
    title: string;
    value: string | number;
    icon: IconName;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
    return (
        <Card className="flex flex-col justify-between h-full">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
                    <div className="p-2 bg-gray-50 border border-gray-200">
                        <Icon name={icon} className="w-5 h-5 text-gray-700" />
                    </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
        </Card>
    );
};

// --- TABLE COMPONENTS ---
export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`overflow-x-auto border border-gray-200 ${className}`}>
        <table className="w-full text-left border-collapse bg-white">
            {children}
        </table>
    </div>
);

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <thead className="bg-gray-50 border-b border-gray-200">
        {children}
    </thead>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <tbody className="divide-y divide-gray-100">
        {children}
    </tbody>
);

export const TableRow: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
    <tr
        onClick={onClick}
        className={`transition-colors hover:bg-gray-50/50 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
        {children}
    </tr>
);

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <th className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 ${className}`}>
        {children}
    </th>
);

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <td className={`py-3 px-4 text-sm text-gray-700 ${className}`}>
        {children}
    </td>
);

// --- PAGE HEADER ---
interface PageHeaderProps {
    title: string;
    children?: React.ReactNode;
}
export const PageHeader: React.FC<PageHeaderProps> = ({ title, children }) => {
    return (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {children && <div className="flex space-x-3">{children}</div>}
        </div>
    );
};
