import React, { useState, useRef, useEffect } from 'react';

interface InlineNumberEditorProps {
  value: number;
  onSave: (value: number) => void;
  onCancel: () => void;
}

export const InlineNumberEditor: React.FC<InlineNumberEditorProps> = ({ value, onSave, onCancel }) => {
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    onSave(Number(currentValue));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  };
  
  const adjustValue = (amount: number) => {
    setCurrentValue(prev => Number(prev) + amount);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="number"
        value={currentValue}
        onChange={(e) => setCurrentValue(Number(e.target.value))}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 border border-primary-500 rounded-md bg-white dark:bg-slate-900 focus:ring-1 focus:ring-primary-500 focus:outline-none"
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
        <button onClick={() => adjustValue(1)} className="h-3 w-4 text-xs leading-none flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">▲</button>
        <button onClick={() => adjustValue(-1)} className="h-3 w-4 text-xs leading-none flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">▼</button>
      </div>
    </div>
  );
};