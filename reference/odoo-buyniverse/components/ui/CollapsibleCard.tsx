import React, { ReactNode } from 'react';
import Card from './Card';

interface CollapsibleCardProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: ReactNode;
    dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ title, isOpen, onToggle, children, dragHandleProps }) => {
    return (
        <Card>
            <div 
                className="p-4 w-full border-b border-slate-200 dark:border-slate-700 flex justify-between items-center cursor-pointer"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <div
                        className={`text-slate-400 p-2 -ml-2 ${dragHandleProps ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                        {...dragHandleProps}
                        onClick={(e) => {
                            if (dragHandleProps) {
                                e.stopPropagation();
                            }
                        }}
                    >
                        <i className="fa-solid fa-grip-vertical"></i>
                    </div>
                    <h3 className="text-lg font-bold">{title}</h3>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-2">
                    <i className={`fa-solid fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                </button>
            </div>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </Card>
    );
};

export default CollapsibleCard;