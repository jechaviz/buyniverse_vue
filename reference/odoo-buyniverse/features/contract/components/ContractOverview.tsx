


import React, { useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Contract, MilestoneStatus, User, Agency } from '@/types';
import { useAppState } from '@/context/AppStateContext';

const { Link } = ReactRouterDOM;

const StatCard: React.FC<{ label: string, value: string | number, subtext?: string }> = ({ label, value, subtext }) => (
    <div className="p-4 bg-gray-50 rounded-lg border">
        <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
    </div>
);

interface ContractOverviewProps {
    contract: Contract;
}

const ContractOverview: React.FC<ContractOverviewProps> = ({ contract }) => {
    const { users, agencies } = useAppState();

    const client = users.find(u => u.id === contract.clientId);
    const provider = agencies.find(a => a.id === contract.providerId) || users.find(u => u.id === contract.providerId);

    const financials = useMemo(() => {
        const totalBudget = contract.rateOrBid;
        const totalPaid = contract.milestones
            .filter(m => m.status === MilestoneStatus.Released)
            .reduce((sum, m) => sum + m.amount, 0);
        const inEscrow = contract.milestones
            .filter(m => m.status === MilestoneStatus.Funded || m.status === MilestoneStatus.Requested)
            .reduce((sum, m) => sum + m.amount, 0);
        const remainingToFund = totalBudget - totalPaid - inEscrow;
        
        return { totalBudget, totalPaid, inEscrow, remainingToFund };
    }, [contract]);

    const progress = useMemo(() => {
        if (contract.milestones.length === 0) return 0;
        const completedMilestones = contract.milestones.filter(m => m.status === MilestoneStatus.Released).length;
        return Math.round((completedMilestones / contract.milestones.length) * 100);
    }, [contract.milestones]);

    if (!client || !provider) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Budget" value={`$${financials.totalBudget.toLocaleString()}`} subtext={contract.jobType} />
                <StatCard label="In Escrow" value={`$${financials.inEscrow.toLocaleString()}`} />
                <StatCard label="Total Paid" value={`$${financials.totalPaid.toLocaleString()}`} />
                <StatCard label="Remaining" value={`$${financials.remainingToFund.toLocaleString()}`} />
            </div>

            <div>
                <h4 className="font-semibold mb-2">Project Progress</h4>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-sm text-right text-gray-500 mt-1">{progress}% Complete</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                <div>
                     <h4 className="font-semibold mb-2">Client</h4>
                     <Link to={`/profile/${client.id}`} className="block p-4 rounded-lg hover:bg-gray-50 border">
                        <p className="font-bold">{client.companyName || client.name}</p>
                        <p className="text-sm text-gray-500">{client.location}</p>
                    </Link>
                </div>
                 <div>
                     <h4 className="font-semibold mb-2">Provider</h4>
                     <Link to={(provider as Agency).tagline ? `/agency/${provider.id}` : `/profile/${provider.id}`} className="block p-4 rounded-lg hover:bg-gray-50 border">
                        <p className="font-bold">{provider.name}</p>
                        <p className="text-sm text-gray-500">{provider.location}</p>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ContractOverview;