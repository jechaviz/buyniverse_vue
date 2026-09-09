
import React, { useState, useEffect, useRef, createContext, useContext } from 'react';

const DropdownContext = createContext({
    open: false,
    setOpen: (open: boolean) => {},
});

interface DropdownProps {
    children: React.ReactNode;
}

const Dropdown: React.FC<DropdownProps> = ({ children }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <DropdownContext.Provider value={{ open, setOpen }}>
            <div ref={dropdownRef} className="relative">
                {children}
            </div>
        </DropdownContext.Provider>
    );
};

const Trigger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { open, setOpen } = useContext(DropdownContext);
    return <div onClick={() => setOpen(!open)}>{children}</div>;
};


interface ContentProps {
    children: React.ReactNode;
    align?: 'left' | 'right';
}

const Content: React.FC<ContentProps> = ({ children, align = 'right' }) => {
    const { open } = useContext(DropdownContext);
    const alignmentClasses = align === 'right' ? 'right-0' : 'left-0';

    if (!open) return null;

    return (
        <div className={`absolute z-50 mt-2 ${alignmentClasses} w-48 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 dark:ring-slate-700 focus:outline-none animate-fade-in`}>
            {children}
        </div>
    );
};

// A simplified Dropdown that assumes the first child is the trigger
// and the second is the content, for easier use as in the original codebase.
interface SimplifiedDropdownProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
    align?: 'left' | 'right';
}

const SimplifiedDropdown: React.FC<SimplifiedDropdownProps> = ({ trigger, children, align }) => {
    return (
        <Dropdown>
            <Trigger>{trigger}</Trigger>
            <Content align={align}>{children}</Content>
        </Dropdown>
    )
}

export default SimplifiedDropdown;
