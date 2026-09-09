import React, { useState } from 'react';

interface InlineSliderEditorProps {
  value: number;
  onSave: (value: number) => void;
  onCancel: () => void;
}

export const InlineSliderEditor: React.FC<InlineSliderEditorProps> = ({ value, onSave, onCancel }) => {
  const [currentValue, setCurrentValue] = useState(value);

  const handleMouseUp = () => {
    onSave(currentValue);
  };

  return (
    <div className="flex items-center gap-2 p-1">
      <input
        type="range"
        min="0"
        max="100"
        value={currentValue}
        onChange={(e) => setCurrentValue(Number(e.target.value))}
        onMouseUp={handleMouseUp}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        autoFocus
        className="w-full"
      />
      <span className="text-xs font-semibold w-8 text-right">{currentValue}%</span>
    </div>
  );
};