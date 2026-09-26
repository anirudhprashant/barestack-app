import React, { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
    value: string;
    onSave: (newValue: string) => Promise<unknown> | void;
    className?: string;
    type?: 'text' | 'email' | 'tel';
    placeholder?: string;
    required?: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({
    value,
    onSave,
    className = "",
    type = "text",
    placeholder = "Click to edit",
    required = false,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (saving) return;
        const next = tempValue.trim();
        if (next === value || (required && !next)) {
            setTempValue(value);
            setIsEditing(false);
            return;
        }
        setSaving(true);
        try {
            await onSave(next);
            setIsEditing(false);
        } catch {
            // Keep the editor open with the typed value so nothing is lost;
            // the caller shows the error toast.
            inputRef.current?.focus();
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setTempValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div className={className} onClick={(e) => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    type={type}
                    value={tempValue}
                    disabled={saving}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="w-full px-2 py-1 text-sm border border-charcoal focus:outline-none focus:ring-1 focus:ring-charcoal bg-canvas text-charcoal"
                    placeholder={placeholder}
                />
            </div>
        );
    }

    return (
        <button
            type="button"
            className={`text-left w-full cursor-text hover:bg-surface px-2 py-1 -ml-2 min-h-[28px] flex items-center ${!value ? 'text-muted italic' : ''} ${className}`}
            onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
            title="Click to edit"
        >
            <span className="truncate">{value || placeholder}</span>
        </button>
    );
};
