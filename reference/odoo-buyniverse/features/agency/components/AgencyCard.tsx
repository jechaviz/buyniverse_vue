
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Agency } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const { Link } = ReactRouterDOM;

interface AgencyCardProps {
    agency: Agency;
}

const AgencyCard: React.FC<AgencyCardProps> = ({ agency }) => {
    return (
        <Card className="p-6 flex flex-col">
            <div className="flex-grow">
                <div className="flex items-center gap-4">
                    <img src={agency.logoUrl} alt={`${agency.name} logo`} className="w-16 h-16 rounded-lg flex-shrink-0" loading="lazy" decoding="async" />
                    <div>
                        <Link to={`/agency/${agency.id}`}>
                            <h3 className="text-lg font-bold text-gray-800 hover:text-primary-700">{agency.name}</h3>
                        </Link>
                         <p className="text-sm text-gray-500">{agency.members.length} members</p>
                    </div>
                </div>
                <p className="text-sm text-gray-700 font-medium mt-4 line-clamp-2 h-10">{agency.tagline}</p>
            </div>
             <div className="mt-6 pt-4 border-t border-gray-100">
                <Link to={`/agency/${agency.id}`}>
                    <Button variant="secondary" className="w-full">View Agency</Button>
                </Link>
            </div>
        </Card>
    );
};

export default AgencyCard;
