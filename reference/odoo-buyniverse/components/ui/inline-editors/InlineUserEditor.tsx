import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '@/context/AppStateContext';

interface InlineUserEditorProps {
  value: string; // The user ID
  onSave: (value: string) => void;
  onCancel: () => void;
}

export const InlineUserEditor: React.FC<InlineUserEditorProps> = ({ value, onSave, onCancel }) => {
  const [currentValue, setCurrentValue] = useState(value);
  const { users } = useAppState();
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    selectRef.current?.focus();
  }, []);
  
  const handleSave = () => {
    onSave(currentValue);
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentValue(e.target.value);
    onSave(e.target.value);
  }

  return (
    <select
      ref={selectRef}
      value={currentValue}
      onChange={handleChange}
      onBlur={handleSave}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      className="w-full px-2 py-1 border border-primary-500 rounded-md bg-white dark:bg-slate-900 focus:ring-1 focus:ring-primary-500 focus:outline-none"
    >
      <option value="">Unassigned</option>
      {users.map(user => (
        <option key={user.id} value={user.id}>{user.name}</option>
      ))}
    </select>
  );
};