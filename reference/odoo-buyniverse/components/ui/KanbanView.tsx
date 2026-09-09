
import React, { useState } from 'react';

// Kanban Card Component
const KanbanCard = ({ item, renderCard, onDragStart }: any) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            className="mb-3 cursor-grab active:cursor-grabbing"
        >
            {renderCard(item)}
        </div>
    );
};


// Kanban Column Component
const KanbanColumn = ({ columnId, title, items, renderCard, onDragStart, onDrop, onDragOver, idKey }: any) => {
    const [isDragOver, setIsDragOver] = useState(false);
    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
                onDragOver(e);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
                onDrop(e, columnId);
                setIsDragOver(false);
            }}
            className={`flex-shrink-0 w-72 bg-slate-100 dark:bg-slate-900/50 rounded-xl p-3 transition-colors ${isDragOver ? 'bg-primary-50 dark:bg-primary-900/50' : ''}`}
        >
            <h3 className="font-semibold text-sm mb-4 px-1 text-slate-600 dark:text-slate-300 uppercase tracking-wider">{title} ({items.length})</h3>
            <div className="space-y-3 h-[calc(100%-2.5rem)] overflow-y-auto pr-1">
                {items.map((item: any) => (
                    <KanbanCard key={item[idKey]} item={item} renderCard={renderCard} onDragStart={onDragStart} />
                ))}
            </div>
        </div>
    );
};


// Main Kanban View Component
interface KanbanViewProps<TData> {
    data: TData[];
    kanbanConfig: {
        groupBy: keyof TData;
        columns: string[];
        renderCard: (item: TData) => React.ReactNode;
        onCardMove: (cardId: string, newColumnId: string) => void;
    };
    idKey: keyof TData;
}

export const KanbanView = <TData extends { [key: string]: any }>({ data, kanbanConfig, idKey }: KanbanViewProps<TData>) => {
    const [draggedItem, setDraggedItem] = useState<TData | null>(null);

    const handleDragStart = (e: React.DragEvent, item: TData) => {
        setDraggedItem(item);
        e.dataTransfer.setData("text/plain", item[idKey as keyof TData]);
    };

    const handleDrop = (e: React.DragEvent, columnId: string) => {
        if (draggedItem && draggedItem[kanbanConfig.groupBy] !== columnId) {
            kanbanConfig.onCardMove(draggedItem[idKey as keyof TData] as string, columnId);
        }
        setDraggedItem(null);
    };

    const groupedData = data.reduce((acc, item) => {
        const key = item[kanbanConfig.groupBy] as string;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {} as Record<string, TData[]>);

    return (
        <div className="flex gap-4 p-4 overflow-x-auto">
            {kanbanConfig.columns.map(columnId => (
                <KanbanColumn
                    key={columnId}
                    columnId={columnId}
                    title={columnId}
                    items={groupedData[columnId] || []}
                    renderCard={kanbanConfig.renderCard}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onDragOver={(e: React.DragEvent) => e.preventDefault()}
                    idKey={idKey}
                />
            ))}
        </div>
    );
};