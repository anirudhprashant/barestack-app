
import React from 'react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';

type IconName = 'grid' | 'users' | 'clipboard' | 'document' | 'clock' | 'receipt' | 'chart' | 'settings' | 'plus' | 'search' | 'trash' | 'edit' | 'chevron-down' | 'x' | 'check' | 'bell' | 'mail' | 'phone' | 'zap' | 'eye' | 'trending-up' | 'activity' | 'download' | 'credit-card' | 'more-horizontal' | 'upload' | 'dollar-sign' | 'user' | 'folder';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: IconName;
}

const iconMap: Record<IconName, React.ComponentType<any>> = {
    grid: LucideIcons.LayoutGrid,
    users: LucideIcons.Users,
    clipboard: LucideIcons.ClipboardList,
    document: LucideIcons.FileText,
    clock: LucideIcons.Clock,
    receipt: LucideIcons.Receipt,
    chart: LucideIcons.BarChart3,
    settings: LucideIcons.Settings,
    plus: LucideIcons.Plus,
    search: LucideIcons.Search,
    trash: LucideIcons.Trash2,
    edit: LucideIcons.Pencil,
    'chevron-down': LucideIcons.ChevronDown,
    x: LucideIcons.X,
    check: LucideIcons.Check,
    bell: LucideIcons.Bell,
    mail: LucideIcons.Mail,
    phone: LucideIcons.Phone,
    zap: LucideIcons.Zap,
    eye: LucideIcons.Eye,
    'trending-up': LucideIcons.TrendingUp,
    activity: LucideIcons.Activity,
    download: LucideIcons.Download,
    'credit-card': LucideIcons.CreditCard,
    'more-horizontal': LucideIcons.MoreHorizontal,
    upload: LucideIcons.Upload,
    'dollar-sign': LucideIcons.DollarSign,
    user: LucideIcons.User,
    folder: LucideIcons.Folder,
};

export const Icon: React.FC<IconProps> = ({ name, ...props }) => {
    const IconComponent = iconMap[name];
    if (!IconComponent) {
        return <LucideIcons.Circle Icon {...props} />;
    }
    return <IconComponent size={props.size || 18} strokeWidth={1.75} {...props} />;
};


// --- CARD COMPONENT ---
interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
    return (
        <div onClick={onClick} className={`bg-canvas p-6 border border-border ${className}`}>
            {children}
        </div>
    );
};

// --- BUTTON COMPONENT ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    className?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseClasses = "font-semibold py-2 px-4 rounded-none transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1";

    let variantClasses = "";
    if (variant === 'primary') {
        variantClasses = "bg-charcoal text-canvas hover:bg-content focus:ring-charcoal border border-charcoal";
    } else if (variant === 'secondary') {
        variantClasses = "bg-canvas text-charcoal border border-charcoal hover:bg-surface focus:ring-border";
    } else if (variant === 'danger') {
        variantClasses = "bg-surface text-activity-red border border-activity-red/30 hover:bg-activity-red/10 focus:ring-activity-red";
    } else if (variant === 'ghost') {
        variantClasses = "bg-transparent text-charcoal hover:bg-surface focus:ring-border border border-transparent";
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
            <label htmlFor={id} className="block text-sm font-semibold text-charcoal mb-1.5">{label}</label>
            <input id={id} {...props} className="w-full p-2.5 bg-canvas text-charcoal rounded-none border border-border focus:outline-none focus:border-content focus:border-2 transition-colors" />
        </div>
    );
};

// --- TEXTAREA COMPONENT ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
}
export const Textarea: React.FC<TextareaProps> = ({ label, id, ...props }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-charcoal mb-1.5">{label}</label>
            <textarea id={id} {...props} className="w-full p-2.5 bg-canvas text-charcoal rounded-none border border-border focus:outline-none focus:border-content focus:border-2 transition-colors" />
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
            <label htmlFor={id} className="block text-sm font-semibold text-charcoal mb-1.5">{label}</label>
            <select id={id} {...props} className="w-full p-2.5 bg-canvas text-charcoal rounded-none border border-border focus:outline-none focus:border-content focus:border-2 appearance-none bg-no-repeat bg-right pr-8 transition-colors" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23141C11' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")` }}>
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
        <div className="fixed inset-0 bg-charcoal/80 backdrop-blur-none z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-canvas p-6 w-full max-w-lg relative border border-border"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                    <h2 className="text-2xl font-bold text-charcoal">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface text-muted transition-colors rounded-none">
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
                    <h3 className="text-sm font-medium text-muted">{title}</h3>
                    <div className="p-2 bg-surface border border-border">
                        <Icon name={icon} className="w-5 h-5 text-charcoal" />
                    </div>
                </div>
                <p className="text-3xl font-bold text-charcoal">{value}</p>
            </div>
        </Card>
    );
};

// --- TABLE COMPONENTS ---
export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`overflow-x-auto border border-border ${className}`}>
        <table className="w-full text-left border-collapse bg-canvas">
            {children}
        </table>
    </div>
);

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <thead className="bg-surface border-b border-border">
        {children}
    </thead>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <tbody className="divide-y divide-border/50">
        {children}
    </tbody>
);

export const TableRow: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
    <tr
        onClick={onClick}
        className={`transition-colors hover:bg-surface/50 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
        {children}
    </tr>
);

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <th className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted ${className}`}>
        {children}
    </th>
);

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <td className={`py-3 px-4 text-sm text-charcoal ${className}`}>
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
            <h2 className="text-2xl font-bold text-charcoal">{title}</h2>
            {children && <div className="flex space-x-3">{children}</div>}
        </div>
    );
};
