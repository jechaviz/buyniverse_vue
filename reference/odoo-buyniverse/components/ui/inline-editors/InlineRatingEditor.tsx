import React, { useState, useRef, useEffect } from 'react';
import StarInput from '../StarInput';

interface InlineRatingEditorProps {
  value: number;
  onSave: (value: number) => void;
  onCancel: () => void;
}

export const InlineRatingEditor: React.FC<InlineRatingEditorProps> = ({ value, onSave, onCancel }) => {
  const [currentValue, setCurrentValue] = useState(value);
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

  const handleRatingChange = (newRating: number) => {
      setCurrentValue(newRating);
      onSave(newRating); // Save immediately
  }

  return (
    <div ref={wrapperRef}>
        <StarInput rating={currentValue} onRatingChange={handleRatingChange} />
    </div>
  );
};