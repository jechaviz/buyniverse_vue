import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '@/context/AppStateContext';

interface InlineMultiUserEditorProps {
  value: string[]; // array of user IDs
  onSave: (value: string[]) => void;
  onCancel: () => void;
}

export const InlineMultiUserEditor: React.FC<InlineMultiUserEditorProps> = ({ value, onSave, onCancel }) => {
  const [currentValue, setCurrentValue] = useState<string[]>(value || []);
  const { users } = useAppState();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        onSave(currentValue);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef, currentValue, onSave]);
  
  const handleToggle = (userId: string) => {
      setCurrentValue(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  }

  return (
    <div ref={wrapperRef} className="absolute z-10 w-48 rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
      <ul className="max-h-40 overflow-auto py-1">
        {users.map(user => (
            <li key={user.id} onClick={() => handleToggle(user.id)} className="text-gray-700 dark:text-gray-200 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-primary-500 hover:text-white">
                <div className="flex items-center">
                    <img src={user.avatarUrl} alt="" className="h-5 w-5 flex-shrink-0 rounded-full" />
                    <span className="ml-3 block truncate text-sm">{user.name}</span>
                </div>
                {currentValue.includes(user.id) && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <i className="fa-solid fa-check text-xs"></i>
                    </span>
                )}
            </li>
        ))}
      </ul>
    </div>
  );
};