
import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import { Contract, TimeEntry, UserType, NotificationType, ContractType } from '@/types';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

const TimesheetView: React.FC<{ contract: Contract }> = ({ contract }) => {
    const { currentUser, timeEntries, jobs, gigs } = useAppState();
    const dispatch = useAppDispatch();

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [hours, setHours] = useState('');
    const [memo, setMemo] = useState('');
    const [error, setError] = useState('');

    const isFreelancer = currentUser.type === UserType.Freelancer;

    const source = useMemo(() => {
        return contract.type === ContractType.Job
            ? jobs.find(j => j.id === contract.sourceId)
            : gigs.find(g => g.id === contract.sourceId);
    }, [jobs, gigs, contract]);

    const contractTimeEntries = useMemo(() => {
        return timeEntries
            .filter(entry => entry.contractId === contract.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [timeEntries, contract.id]);

    const totalHours = useMemo(() => {
        return contractTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    }, [contractTimeEntries]);

    const handleLogTime = (e: React.FormEvent) => {
        e.preventDefault();
        const hoursNum = parseFloat(hours);
        if (!date || isNaN(hoursNum) || hoursNum <= 0) {
            setError('Please enter a valid date and hours.');
            return;
        }
        if (!memo.trim()) {
            setError('A memo is required to describe the work done.');
            return;
        }
        setError('');

        const newTimeEntry: TimeEntry = {
            id: `te-${Date.now()}`,
            contractId: contract.id,
            userId: currentUser.id,
            date: new Date(date),
            hours: hoursNum,
            memo: memo,
        };
        
        const notification = {
            id: `notif-time-${Date.now()}`,
            userId: contract.clientId,
            type: NotificationType.TIME_LOGGED,
            text: `${currentUser.name} logged ${hoursNum} hours on your contract: "${source?.title || 'Untitled Project'}".`,
            link: `/contract/${contract.id}`,
            isRead: false,
            createdAt: new Date(),
        };

        dispatch({ type: 'LOG_TIME', payload: { timeEntry: newTimeEntry, notification } });
        
        // Reset form
        setHours('');
        setMemo('');
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-xs font-semibold uppercase text-gray-500">Total Hours Logged</p>
                    <p className="text-2xl font-bold text-gray-800">{totalHours.toFixed(2)}</p>
                </div>
                 <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-xs font-semibold uppercase text-gray-500">Total Billed</p>
                    <p className="text-2xl font-bold text-gray-800">${(totalHours * contract.rateOrBid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            {isFreelancer && !contract.endedAt && (
                <div className="p-6 border rounded-lg bg-white shadow-sm">
                    <h3 className="text-lg font-bold mb-4">Log Time</h3>
                    <form onSubmit={handleLogTime} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                            <Input
                                label="Hours"
                                type="number"
                                step="0.25"
                                min="0"
                                value={hours}
                                onChange={(e) => setHours(e.target.value)}
                                placeholder="e.g., 4.5"
                                required
                            />
                        </div>
                        <Textarea
                            label="Memo"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="Describe the work you performed..."
                            required
                            rows={3}
                        />
                         {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div className="text-right">
                            <Button type="submit">Log Time</Button>
                        </div>
                    </form>
                </div>
            )}

            <div>
                <h3 className="text-lg font-bold mb-4">Work Diary</h3>
                {contractTimeEntries.length > 0 ? (
                    <div className="overflow-hidden border rounded-lg">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-sm font-semibold text-gray-600">Date</th>
                                    <th className="p-3 text-sm font-semibold text-gray-600">Memo</th>
                                    <th className="p-3 text-sm font-semibold text-gray-600 text-right">Hours</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {contractTimeEntries.map(entry => (
                                    <tr key={entry.id}>
                                        <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{new Date(entry.date).toLocaleDateString()}</td>
                                        <td className="p-3 text-sm text-gray-800">{entry.memo}</td>
                                        <td className="p-3 text-sm font-semibold text-gray-800 text-right">{entry.hours.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        No time has been logged for this contract yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimesheetView;
