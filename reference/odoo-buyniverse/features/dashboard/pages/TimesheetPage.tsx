


import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import Card from '@/components/ui/Card';
import { ContractType, Job, Gig } from '@/types';

const { Link } = ReactRouterDOM;

const TimesheetPage: React.FC = () => {
    const { currentUser, contracts, jobs, gigs } = useAppState();

    const hourlyContracts = contracts.filter(c =>
        c.jobType === 'Hourly' &&
        (c.providerId === currentUser.id || (currentUser.agencyId && c.providerId === currentUser.agencyId)) &&
        !c.endedAt
    );

    const getSourceForContract = (contract: typeof hourlyContracts[0]): Job | Gig | undefined => {
        return contract.type === ContractType.Job ?
            jobs.find(j => j.id === contract.sourceId) :
            gigs.find(g => g.id === contract.sourceId);
    }


    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">My Timesheets</h1>
            <p className="text-gray-600">
                Select an active hourly contract to view its timesheet and log your hours.
            </p>
            {hourlyContracts.length > 0 ? (
                <Card className="overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                        {hourlyContracts.map(contract => {
                            const source = getSourceForContract(contract);
                            if (!source) return null;
                            return (
                                <li key={contract.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <Link to={`/contract/${contract.id}`} className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-primary-700">{source.title}</p>
                                            <p className="text-sm text-gray-500">Contract #{contract.id.slice(-6)}</p>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700">${contract.rateOrBid}/hr</span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </Card>
            ) : (
                <Card className="p-8 text-center text-gray-500">
                    You have no active hourly contracts.
                </Card>
            )}
        </div>
    );
};

export default TimesheetPage;