import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui';

interface EditableCellProps {
    value: string;
    onSave: (newValue: string) => Promise<void> | void;
    className?: string;
    type?: 'text' | 'email' | 'tel';
    placeholder?: string;
}

export const EditableCell: React.FC<EditableCellProps> = ({
    value,
    onSave,
    className = "",
    type = "text",
    placeholder = "Click to edit"
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (tempValue !== value) {
            await onSave(tempValue);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
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
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="w-full px-2 py-1 text-sm border border-brand-primary rounded focus:outline-none focus:ring-2 focus:ring-brand-primary/50 bg-white"
                    placeholder={placeholder}
                />
            </div>
        );
    }

    return (
        <div
            className={`cursor-pointer hover:bg-gray-50 px-2 py-1 rounded -ml-2 min-h-[28px] flex items-center ${!value ? 'text-gray-400 italic' : ''} ${className}`}
            onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
            title="Click to edit"
        >
            {value || placeholder}
        </div>
    );
};
