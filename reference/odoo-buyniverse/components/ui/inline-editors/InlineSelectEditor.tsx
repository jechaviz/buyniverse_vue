import React, { useState, useRef, useEffect } from 'react';

interface InlineSelectEditorProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  options: { value: string; label: string }[];
}

export const InlineSelectEditor: React.FC<InlineSelectEditorProps> = ({ value, onSave, onCancel, options }) => {
  const [currentValue, setCurrentValue] = useState(value);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    selectRef.current?.focus();
  }, []);

  const handleSave = () => {
    onSave(currentValue);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentValue(e.target.value);
    onSave(e.target.value); // Save immediately on change for selects
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
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};