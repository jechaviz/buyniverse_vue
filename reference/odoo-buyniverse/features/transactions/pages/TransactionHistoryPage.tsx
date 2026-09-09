

import React, { useMemo } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';

const TransactionHistoryPage: React.FC = () => {
    const { transactions, currentUser } = useAppState();
    
    const myTransactions = useMemo(() => {
        return transactions
            .filter(t => t.userId === currentUser.id)
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [transactions, currentUser.id]);

    const balance = useMemo(() => {
        return myTransactions.reduce((acc, t) => acc + t.amount, 0);
    }, [myTransactions]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Transaction History</h1>

            <Card className="p-6">
                <p className="text-sm uppercase text-gray-500">Current Balance</p>
                <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </Card>

            <Card className="overflow-hidden">
                <div className="p-4 bg-gray-50 border-b hidden md:grid grid-cols-4 gap-4 text-sm font-semibold text-gray-600">
                    <div>Date</div>
                    <div>Description</div>
                    <div className="text-right">Amount</div>
                    <div className="text-right">Invoice</div>
                </div>
                {myTransactions.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {myTransactions.map(t => (
                            <li key={t.id} className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                                <div className="text-sm text-gray-600">
                                    <span className="md:hidden font-semibold">Date: </span>
                                    {new Date(t.date).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-gray-800 col-span-2 md:col-span-1">
                                    {t.description}
                                </div>
                                <div className={`font-semibold text-right ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                   {t.amount < 0 ? '-' : ''}${Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-right">
                                    <Link to={`/invoice/${t.invoiceId}`} className="text-primary-600 hover:underline text-sm font-semibold">
                                        View
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500 p-8">You have no transactions yet.</p>
                )}
            </Card>
        </div>
    );
};

export default TransactionHistoryPage;