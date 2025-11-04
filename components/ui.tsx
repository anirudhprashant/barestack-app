
import React from 'react';
import ReactDOM from 'react-dom';

// --- ICON COMPONENT ---
type IconName = 'grid' | 'users' | 'clipboard' | 'document' | 'clock' | 'receipt' | 'chart' | 'settings' | 'plus' | 'search' | 'trash' | 'edit' | 'chevron-down' | 'x';

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
    };

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
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
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
    return (
        <div className={`bg-white p-6 rounded-[10px] border-2 border-brand-dark shadow-neo ${className}`}>
            {children}
        </div>
    );
};

// --- BUTTON COMPONENT ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
    className?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseClasses = "font-bold py-2 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variantClasses = variant === 'primary' 
        ? 'bg-brand-dark text-white' 
        : 'bg-white text-brand-dark';
    
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
            <label htmlFor={id} className="block text-brand-dark font-bold mb-2">{label}</label>
            <input id={id} {...props} className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark" />
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
            <label htmlFor={id} className="block text-brand-dark font-bold mb-2">{label}</label>
            <textarea id={id} {...props} className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark" />
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
            <label htmlFor={id} className="block text-brand-dark font-bold mb-2">{label}</label>
            <select id={id} {...props} className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark appearance-none bg-no-repeat bg-right pr-8" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%232B2B2B' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}>
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

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-white p-8 rounded-[10px] border-2 border-brand-dark shadow-neo w-full max-w-lg relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-extrabold text-brand-dark">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-brand-light">
                        <Icon name="x" className="w-8 h-8 text-brand-dark"/>
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
        <Card className="flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-brand-dark">{title}</h3>
                    <Icon name={icon} className="w-8 h-8 text-brand-dark" />
                </div>
                <p className="text-5xl font-black text-brand-dark mt-4">{value}</p>
            </div>
        </Card>
    );
};

// --- TOAST COMPONENT ---
// This would typically be managed by a context provider for global access.
// For simplicity, here's a basic component structure.
interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    return (
        <div className={`fixed bottom-5 right-5 p-4 rounded-[10px] border-2 border-brand-dark text-white font-bold shadow-neo z-50 ${bgColor}`}>
            {message}
            <button onClick={onClose} className="ml-4 font-black">X</button>
        </div>
    );
};

// --- PAGE HEADER ---
interface PageHeaderProps {
    title: string;
    children?: React.ReactNode;
}
export const PageHeader: React.FC<PageHeaderProps> = ({ title, children }) => {
    return (
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-4xl font-extrabold text-brand-dark">{title}</h2>
            {children && <div className="flex space-x-2">{children}</div>}
        </div>
    );
};