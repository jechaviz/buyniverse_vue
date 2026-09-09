
import React, { useMemo, useState } from 'react';
import { DashboardCategory, WidgetConfig } from '@/types';
import { useAppDispatch } from '@/context/AppStateContext';
import { useTranslation } from '@/hooks/useTranslation';
import Card from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';


interface DashboardWidgetProps {
    widget: WidgetConfig;
    tableId: string;
    data: any[];
    categoryId: string;
    onEditRequest: (widget: WidgetConfig) => void;
    onDrop: (widgetId: string, sourceCatId: string) => void;
    layout: DashboardCategory[];
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({ widget, tableId, data, categoryId, onEditRequest, onDrop, layout }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [isDragOver, setIsDragOver] = useState(false);
    
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData("widgetId", widget.id);
        e.dataTransfer.setData("sourceCategoryId", categoryId);
    }
    
    const handleDelete = () => {
        if(window.confirm(`Are you sure you want to delete the widget "${widget.title}"?`)) {
            dispatch({ type: 'DELETE_WIDGET', payload: { tableId, widgetId: widget.id } });
        }
    }
    
    const handleDuplicate = () => {
        dispatch({ type: 'DUPLICATE_WIDGET', payload: { tableId, categoryId, widgetId: widget.id } });
    }
    
    const handleSizeChange = (newSize: number) => {
        dispatch({ type: 'UPDATE_WIDGET', payload: { tableId, widget: { ...widget, size: newSize } } });
    }

    const chartData = useMemo(() => {
        if (data.length === 0) return [];
        
        if (widget.type === 'summary') return []; // No processing needed for summary

        if (!widget.xAxisColumn) return [];

        const grouped = data.reduce((acc, row) => {
            const key = String(row[widget.xAxisColumn!]);
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {} as Record<string, any[]>);

        return Object.entries(grouped).map(([name, items]: [string, any[]]) => {
            let value = 0;
            if (widget.aggregation === 'count') {
                value = items.length;
            } else if (widget.yAxisColumn) {
                const numericItems = items.map(item => Number(item[widget.yAxisColumn!])).filter(n => !isNaN(n));
                if (widget.aggregation === 'sum') {
                    value = numericItems.reduce((a, b) => a + b, 0);
                } else if (widget.aggregation === 'average') {
                    value = numericItems.length > 0 ? numericItems.reduce((a, b) => a + b, 0) / numericItems.length : 0;
                }
            }
            return { name, value };
        });
    }, [data, widget]);
    
     const summaryValue = useMemo(() => {
        if (!widget.yAxisColumn || !widget.aggregation) return 0;
        if(widget.aggregation === 'count') return data.length;

        const numericItems = data.map(item => Number(item[widget.yAxisColumn!])).filter(n => !isNaN(n));
        if(widget.aggregation === 'sum') return numericItems.reduce((a, b) => a + b, 0);
        if(widget.aggregation === 'average') return numericItems.length > 0 ? numericItems.reduce((a, b) => a + b, 0) / numericItems.length : 0;
        return 0;
    }, [data, widget]);
    
    const handleExport = async () => {
        const { exportToCsv } = await import('@/utils/csv');
        if (widget.type === 'summary') {
            const dataToExport = [{ 
                value: summaryValue, 
                aggregation: widget.aggregation || '', 
                column: widget.yAxisColumn || '' 
            }];
            const columnsForExport = [
                { accessorKey: 'value', header: () => 'Value'}, 
                { accessorKey: 'aggregation', header: () => 'Aggregation'}, 
                { accessorKey: 'column', header: () => 'Column'}
            ];
            exportToCsv(dataToExport, columnsForExport, `${widget.title}.csv`);
        } else {
            const columnsForExport = [
                { accessorKey: 'name', header: () => widget.xAxisColumn || 'Category' }, 
                { accessorKey: 'value', header: () => 'Value' }
            ];
            exportToCsv(chartData, columnsForExport, `${widget.title}.csv`);
        }
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];
    const gridSpanClass = `lg:col-span-${widget.size}`;

    return (
        <div 
            draggable 
            onDragStart={handleDragStart}
            onDrop={(e) => {
                e.stopPropagation(); // Prevent category drop from firing
                const droppedWidgetId = e.dataTransfer.getData("widgetId");
                const sourceCatId = e.dataTransfer.getData("sourceCategoryId");
                onDrop(droppedWidgetId, sourceCatId);
                setIsDragOver(false);
            }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={`cursor-grab active:cursor-grabbing transition-all ${gridSpanClass} ${isDragOver ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
        >
            <Card className="p-4 flex flex-col h-full">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm">{widget.title}</h4>
                     <Dropdown
                        align="right"
                        trigger={<button className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><i className="fa-solid fa-ellipsis-v"></i></button>}
                    >
                        <div className="py-1">
                            <button onClick={() => onEditRequest(widget)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t('common.table.dashboard.editWidgetAI')}</button>
                            <button onClick={handleDuplicate} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Duplicate Widget</button>
                            <button onClick={handleExport} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Export Data</button>
                            <div className="px-4 py-2 text-sm">
                                {t('common.table.dashboard.resize')}: 
                                <button onClick={() => handleSizeChange(widget.size - 1)} disabled={widget.size <= (widget.minSize || 1)} className="ml-2 w-6 h-6 rounded bg-slate-200 disabled:opacity-50">-</button>
                                <button onClick={() => handleSizeChange(widget.size + 1)} disabled={widget.size >= (widget.maxSize || 4)} className="ml-1 w-6 h-6 rounded bg-slate-200 disabled:opacity-50">+</button>
                            </div>
                            <button onClick={handleDelete} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">{t('common.table.dashboard.deleteWidget')}</button>
                        </div>
                    </Dropdown>
                </div>
                <div className="flex-grow w-full">
                    {widget.type === 'bar' && (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                <XAxis dataKey="name" fontSize={10} />
                                <YAxis fontSize={10}/>
                                <RechartsTooltip />
                                <Bar dataKey="value" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                    {widget.type === 'pie' && (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => { const RADIAN = Math.PI / 180; const radius = innerRadius + (outerRadius - innerRadius) * 0.5; const x = cx + radius * Math.cos(-midAngle * RADIAN); const y = cy + radius * Math.sin(-midAngle * RADIAN); return ( <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}> {`${(percent * 100).toFixed(0)}%`} </text> ); }}>
                                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                    {widget.type === 'summary' && (
                        <div className="text-center flex flex-col justify-center h-full">
                            <p className="text-4xl font-bold">{summaryValue.toLocaleString('en-US', {maximumFractionDigits: 2})}</p>
                            <p className="text-sm text-slate-500">{t(`common.table.dashboard.${widget.aggregation || 'count'}`)} of {widget.yAxisColumn}</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default DashboardWidget;
