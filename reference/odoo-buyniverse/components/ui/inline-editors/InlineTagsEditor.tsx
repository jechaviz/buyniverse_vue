import React, { useState, useRef, useEffect } from 'react';

interface InlineTagsEditorProps {
  value: string[];
  onSave: (value: string[]) => void;
  onCancel: () => void;
}

export const InlineTagsEditor: React.FC<InlineTagsEditorProps> = ({ value, onSave, onCancel }) => {
  const [currentValue, setCurrentValue] = useState(Array.isArray(value) ? value.join(', ') : '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    const tags = currentValue.split(',').map(t => t.trim()).filter(Boolean);
    onSave(tags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={currentValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className="w-full px-2 py-1 border border-primary-500 rounded-md bg-white dark:bg-slate-900 focus:ring-1 focus:ring-primary-500 focus:outline-none"
    />
  );
};