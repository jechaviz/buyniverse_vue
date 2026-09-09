
import React, { useState, KeyboardEvent } from 'react';

interface TagInputProps {
    label: string;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ label, tags, onTagsChange, placeholder }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            const newTag = inputValue.trim();
            if (newTag && !tags.includes(newTag)) {
                onTagsChange([...tags, newTag]);
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <div className="flex flex-wrap items-center gap-2 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50">
                {tags.map((tag, index) => (
                    <div key={index} className="flex items-center gap-1 bg-primary-100 dark:bg-primary-500/20 text-primary-800 dark:text-primary-300 text-sm font-medium px-2 py-1 rounded">
                        <span>{tag}</span>
                        <button onClick={() => removeTag(tag)} className="text-primary-600 hover:text-primary-800 dark:text-primary-200 dark:hover:text-primary-100">
                            <i className="fa-solid fa-times text-xs"></i>
                        </button>
                    </div>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || "Add a tag..."}
                    className="flex-grow bg-transparent focus:outline-none text-sm"
                />
            </div>
        </div>
    );
};

export default TagInput;
