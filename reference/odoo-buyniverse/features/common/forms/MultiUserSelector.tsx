
import React, { useState, useRef, useEffect } from 'react';
import { User } from '@/types';
import { useAppState } from '@/context/AppStateContext';

interface MultiUserSelectorProps {
  allUsers: User[];
  selectedUserIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  label: string;
}

const MultiUserSelector: React.FC<MultiUserSelectorProps> = ({ allUsers, selectedUserIds, onSelectionChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { users: appUsers } = useAppState(); // Use users from global state

    const selectedUsers = selectedUserIds.map(id => appUsers.find(u => u.id === id)).filter(Boolean) as User[];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    
    const handleToggle = (userId: string) => {
        const newSelection = selectedUserIds.includes(userId)
            ? selectedUserIds.filter(id => id !== userId)
            : [...selectedUserIds, userId];
        onSelectionChange(newSelection);
    };

    return (
        <div ref={wrapperRef}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative w-full cursor-default rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700/50 py-2 pl-3 pr-10 text-left shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                >
                    <span className="flex items-center">
                        {selectedUsers.length > 0 ? (
                            <div className="flex -space-x-1 overflow-hidden">
                                {selectedUsers.map(user => (
                                    <img key={user.id} className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-700" src={user.avatarUrl} alt={user.name} loading="lazy" decoding="async" />
                                ))}
                            </div>
                        ) : (
                            <span className="text-slate-500">Select users...</span>
                        )}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
                        <i className="fa-solid fa-chevron-down text-slate-400"></i>
                    </span>
                </button>
                {isOpen && (
                    <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white dark:bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {allUsers.map(user => (
                            <li key={user.id} onClick={() => handleToggle(user.id)} className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 dark:text-gray-200 hover:bg-primary-500 hover:text-white">
                                <div className="flex items-center">
                                    <img src={user.avatarUrl} alt="" className="h-6 w-6 flex-shrink-0 rounded-full" loading="lazy" decoding="async" />
                                    <span className="ml-3 block truncate">{user.name}</span>
                                </div>
                                {selectedUserIds.includes(user.id) && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                                        <i className="fa-solid fa-check"></i>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default MultiUserSelector;
