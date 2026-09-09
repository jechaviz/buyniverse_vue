import React, { useState, useRef, useEffect } from 'react';

interface InlineDateEditorProps {
  value: string | Date;
  onSave: (value: string) => void;
  onCancel: () => void;
}

const formatDateForInput = (date: string | Date): string => {
    if (!date) return '';
    try {
        return new Date(date).toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
}

export const InlineDateEditor: React.FC<InlineDateEditorProps> = ({ value, onSave, onCancel }) => {
  const [currentValue, setCurrentValue] = useState(formatDateForInput(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    onSave(currentValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <input
      ref={inputRef}
      type="date"
      value={currentValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className="w-full px-2 py-1 border border-primary-500 rounded-md bg-white dark:bg-slate-900 focus:ring-1 focus:ring-primary-500 focus:outline-none"
    />
  );
};