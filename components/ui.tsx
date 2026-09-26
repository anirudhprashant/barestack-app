
import React from 'react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';

export type IconName = 'grid' | 'users' | 'clipboard' | 'document' | 'clock' | 'receipt' | 'chart' | 'settings' | 'plus' | 'search' | 'trash' | 'edit' | 'chevron-down' | 'chevron-left' | 'chevron-right' | 'x' | 'check' | 'bell' | 'mail' | 'phone' | 'zap' | 'eye' | 'trending-up' | 'activity' | 'download' | 'credit-card' | 'more-horizontal' | 'upload' | 'dollar-sign' | 'user' | 'folder' | 'file' | 'alert-circle' | 'alert-triangle' | 'menu' | 'arrow-left' | 'arrow-right' | 'calendar' | 'play' | 'stop' | 'copy' | 'filter' | 'command' | 'tag' | 'briefcase' | 'building' | 'refresh' | 'check-circle' | 'send' | 'wallet' | 'archive' | 'external-link' | 'globe' | 'hash' | 'list' | 'layers' | 'pie-chart' | 'target' | 'timer' | 'inbox' | 'save' | 'database' | 'log-out' | 'sparkles' | 'sun' | 'moon' | 'monitor' | 'keyboard' | 'link';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: IconName;
    size?: number;
}

const iconMap: Record<IconName, React.ComponentType<any>> = {
    'grid': LucideIcons.LayoutGrid,
    'users': LucideIcons.Users,
    'clipboard': LucideIcons.ClipboardList,
    'document': LucideIcons.FileText,
    'clock': LucideIcons.Clock,
    'receipt': LucideIcons.Receipt,
    'chart': LucideIcons.BarChart3,
    'settings': LucideIcons.Settings,
    'plus': LucideIcons.Plus,
    'search': LucideIcons.Search,
    'trash': LucideIcons.Trash2,
    'edit': LucideIcons.Pencil,
    'chevron-down': LucideIcons.ChevronDown,
    'chevron-left': LucideIcons.ChevronLeft,
    'chevron-right': LucideIcons.ChevronRight,
    'x': LucideIcons.X,
    'check': LucideIcons.Check,
    'bell': LucideIcons.Bell,
    'mail': LucideIcons.Mail,
    'phone': LucideIcons.Phone,
    'zap': LucideIcons.Zap,
    'eye': LucideIcons.Eye,
    'trending-up': LucideIcons.TrendingUp,
    'activity': LucideIcons.Activity,
    'download': LucideIcons.Download,
    'credit-card': LucideIcons.CreditCard,
    'more-horizontal': LucideIcons.MoreHorizontal,
    'upload': LucideIcons.Upload,
    'dollar-sign': LucideIcons.DollarSign,
    'user': LucideIcons.User,
    'folder': LucideIcons.Folder,
    'file': LucideIcons.File,
    'alert-circle': LucideIcons.AlertCircle,
    'alert-triangle': LucideIcons.AlertTriangle,
    'menu': LucideIcons.Menu,
    'arrow-left': LucideIcons.ArrowLeft,
    'arrow-right': LucideIcons.ArrowRight,
    'calendar': LucideIcons.Calendar,
    'play': LucideIcons.Play,
    'stop': LucideIcons.Square,
    'copy': LucideIcons.Copy,
    'filter': LucideIcons.Filter,
    'command': LucideIcons.Command,
    'tag': LucideIcons.Tag,
    'briefcase': LucideIcons.Briefcase,
    'building': LucideIcons.Building2,
    'refresh': LucideIcons.RefreshCw,
    'check-circle': LucideIcons.CheckCircle2,
    'send': LucideIcons.Send,
    'wallet': LucideIcons.Wallet,
    'archive': LucideIcons.Archive,
    'external-link': LucideIcons.ExternalLink,
    'globe': LucideIcons.Globe,
    'hash': LucideIcons.Hash,
    'list': LucideIcons.List,
    'layers': LucideIcons.Layers,
    'pie-chart': LucideIcons.PieChart,
    'target': LucideIcons.Target,
    'timer': LucideIcons.Timer,
    'inbox': LucideIcons.Inbox,
    'save': LucideIcons.Save,
    'database': LucideIcons.Database,
    'log-out': LucideIcons.LogOut,
    'sparkles': LucideIcons.Sparkles,
    'sun': LucideIcons.Sun,
    'moon': LucideIcons.Moon,
    'monitor': LucideIcons.Monitor,
    'keyboard': LucideIcons.Keyboard,
    'link': LucideIcons.Link,
};

export const Icon: React.FC<IconProps> = ({ name, size = 18, ...props }) => {
    const IconComponent = iconMap[name] ?? LucideIcons.Circle;
    return <IconComponent size={size} strokeWidth={1.75} {...props} />;
};


// --- CARD COMPONENT ---
interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
    return (
        <div onClick={onClick} className={`bg-canvas p-4 sm:p-6 border border-border ${className}`}>
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
const fieldClass = "w-full p-2.5 bg-canvas text-charcoal rounded-none border border-border focus:outline-none focus:border-content focus:ring-1 focus:ring-content transition-colors disabled:opacity-60";

const FieldLabel: React.FC<{ htmlFor?: string; label?: string; hint?: string }> = ({ htmlFor, label, hint }) =>
    label ? (
        <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-semibold text-charcoal mb-1.5">
            <span>{label}</span>
            {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
        </label>
    ) : null;

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
}

export const Input: React.FC<InputProps> = ({ label, hint, id, className = '', ...props }) => {
    return (
        <div className={className}>
            <FieldLabel htmlFor={id} label={label} hint={hint} />
            <input id={id} aria-label={label ? undefined : props.placeholder} {...props} className={fieldClass} />
        </div>
    );
};

// --- TEXTAREA COMPONENT ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    hint?: string;
}
export const Textarea: React.FC<TextareaProps> = ({ label, hint, id, className = '', ...props }) => {
    return (
        <div className={className}>
            <FieldLabel htmlFor={id} label={label} hint={hint} />
            <textarea id={id} aria-label={label ? undefined : props.placeholder} {...props} className={fieldClass} />
        </div>
    );
};

// --- SELECT COMPONENT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    hint?: string;
    children: React.ReactNode;
}
export const Select: React.FC<SelectProps> = ({ label, hint, id, children, className = '', ...props }) => {
    return (
        <div className={className}>
            <FieldLabel htmlFor={id} label={label} hint={hint} />
            <select id={id} {...props} className={`${fieldClass} appearance-none bg-no-repeat pr-8 select-chevron`}>
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
    maxWidthClass?: string;
}

// Open modals, innermost last. Only the top one reacts to Escape, so closing a
// nested "add client" dialog doesn't also close the invoice form behind it.
const modalStack: symbol[] = [];

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidthClass = 'max-w-lg' }) => {
    const dialogRef = React.useRef<HTMLDivElement>(null);
    const onCloseRef = React.useRef(onClose);
    onCloseRef.current = onClose;

    React.useEffect(() => {
        if (!isOpen) return;
        const token = Symbol('modal');
        modalStack.push(token);
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Move focus into the dialog (for keyboard and screen-reader users)
        // unless a field inside already took it via autoFocus. Focusing the
        // dialog itself, not its first input, avoids scrolling long dialogs.
        requestAnimationFrame(() => {
            const el = dialogRef.current;
            if (!el || el.contains(document.activeElement)) return;
            el.focus({ preventScroll: true });
        });

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && modalStack[modalStack.length - 1] === token) {
                e.stopPropagation();
                onCloseRef.current();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            const idx = modalStack.indexOf(token);
            if (idx >= 0) modalStack.splice(idx, 1);
            if (modalStack.length === 0) document.body.style.overflow = prevOverflow;
            previouslyFocused?.focus?.();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div
                ref={dialogRef}
                tabIndex={-1}
                className={`bg-canvas p-4 sm:p-6 w-full ${maxWidthClass} relative border border-border max-h-[92vh] sm:max-h-[90vh] overflow-y-auto focus:outline-none animate-in fade-in slide-in-from-bottom-2 duration-150`}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="flex justify-between items-center gap-3 mb-6 border-b border-border pb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-charcoal min-w-0 truncate">{title}</h2>
                    <button onClick={onClose} aria-label="Close dialog" className="p-2 hover:bg-surface text-muted transition-colors rounded-none shrink-0">
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
    <th className={`py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wider text-muted whitespace-nowrap ${className}`}>
        {children}
    </th>
);

export const TableCell: React.FC<{ children: React.ReactNode; className?: string; onClick?: React.MouseEventHandler<HTMLTableCellElement> }> = ({ children, className = '', onClick }) => (
    <td className={`py-3 px-3 sm:px-4 text-sm text-charcoal ${className}`} onClick={onClick}>
        {children}
    </td>
);

// --- PAGE HEADER ---
interface PageHeaderProps {
    // Optional: the page title is already shown in the top Header bar, so pages
    // can omit it here to avoid a duplicate heading and just render action buttons.
    title?: string;
    children?: React.ReactNode;
}
export const PageHeader: React.FC<PageHeaderProps> = ({ title, children }) => {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ${title ? 'sm:justify-between' : 'sm:justify-end'}`}>
            {title && <h2 className="text-xl sm:text-2xl font-bold text-charcoal">{title}</h2>}
            {children && <div className="flex flex-wrap gap-2 sm:gap-3">{children}</div>}
        </div>
    );
};


// --- ICON BUTTON ---
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: IconName;
    label: string;
    tone?: 'default' | 'danger';
}
export const IconButton: React.FC<IconButtonProps> = ({ icon, label, tone = 'default', className = '', ...props }) => (
    <button
        type="button"
        title={label}
        aria-label={label}
        className={`p-1.5 transition-colors rounded-none focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 ${tone === 'danger'
            ? 'text-activity-red hover:bg-activity-red/10 focus:ring-activity-red'
            : 'text-charcoal hover:bg-surface focus:ring-charcoal'} ${className}`}
        {...props}
    >
        <Icon name={icon} className="w-[18px] h-[18px]" />
    </button>
);

// --- EMPTY STATE ---
export const EmptyState: React.FC<{ icon: IconName; title: string; description?: string; children?: React.ReactNode }> = ({ icon, title, description, children }) => (
    <div className="text-center py-12 px-4 bg-canvas border border-dashed border-border">
        <div className="w-16 h-16 bg-surface flex items-center justify-center mx-auto mb-4">
            <Icon name={icon} className="w-8 h-8 text-muted" />
        </div>
        <h3 className="text-lg font-medium text-charcoal mb-1">{title}</h3>
        {description && <p className="text-muted text-sm mb-6 max-w-md mx-auto">{description}</p>}
        {children && <div className="flex justify-center gap-2 flex-wrap">{children}</div>}
    </div>
);

// --- SEARCH INPUT ---
export const SearchInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; className?: string; id?: string }> = ({ value, onChange, placeholder = 'Search...', className = '', id }) => (
    <div className={`relative ${className}`}>
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
        <input
            id={id}
            type="search"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full pl-9 pr-3 py-2 border border-border bg-canvas rounded-none focus:outline-none focus:border-content focus:ring-1 focus:ring-content transition-colors text-charcoal text-sm"
        />
    </div>
);

// --- SEGMENTED CONTROL ---
export function Segmented<T extends string>({ value, onChange, options, className = '' }: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    className?: string;
}) {
    return (
        <div className={`inline-flex border border-border overflow-x-auto scrollbar-hide max-w-full ${className}`} role="tablist">
            {options.map(o => (
                <button
                    key={o.value}
                    type="button"
                    role="tab"
                    aria-selected={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${value === o.value ? 'bg-charcoal text-canvas' : 'bg-canvas text-muted hover:bg-surface hover:text-charcoal'}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

// --- STAT TILE ---
export const StatTile: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; badge?: string; badgeClass?: string; icon?: IconName; onClick?: () => void }> = ({ label, value, sub, badge, badgeClass = 'bg-panel text-cream', icon, onClick }) => {
    const Comp = onClick ? 'button' : 'div';
    return (
        <Comp
            onClick={onClick}
            className={`text-left w-full bg-canvas text-charcoal p-5 sm:p-6 border border-border ${onClick ? 'hover:border-charcoal cursor-pointer' : ''} transition-colors`}
        >
            <div className="flex justify-between items-start gap-2 mb-3 sm:mb-4">
                {icon ? <Icon name={icon} className="w-6 h-6 text-charcoal" /> : <span className="text-xs font-bold text-muted uppercase tracking-wider min-w-0">{label}</span>}
                {badge && <span className={`hidden sm:inline-block shrink-0 text-xs font-bold px-2.5 py-1 ${badgeClass}`}>{badge}</span>}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-charcoal mb-1 tracking-tight tabular-nums break-words">{value}</div>
            {(sub || icon) && <div className="text-sm text-muted font-medium">{sub ?? label}</div>}
        </Comp>
    );
};
