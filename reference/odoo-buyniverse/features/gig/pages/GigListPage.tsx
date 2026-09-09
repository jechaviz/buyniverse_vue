
import React, { useState, useMemo } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { Gig } from '@/types';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { GigCard } from '@/features/gig';

const GigListPage: React.FC = () => {
    const { gigs } = useAppState();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredGigs = useMemo(() => {
        if (!searchTerm) return gigs;
        const lowercasedFilter = searchTerm.toLowerCase();
        return gigs.filter((gig: Gig) =>
            gig.title.toLowerCase().includes(lowercasedFilter) ||
            gig.description.toLowerCase().includes(lowercasedFilter)
        );
    }, [gigs, searchTerm]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Browse Packaged Services</h1>
                <p className="text-lg text-gray-600 mt-2">Find predefined services with fixed prices to get your project started quickly.</p>
            </div>
            <Card className="p-4">
                <Input
                    placeholder="Search services (e.g., 'logo design', 'react component')"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredGigs.map(gig => (
                    <GigCard key={gig.id} gig={gig} />
                ))}
            </div>

            {filteredGigs.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-700">No Services Found</h3>
                    <p className="text-gray-500 mt-2">Try adjusting your search term.</p>
                </div>
            )}
        </div>
    );
};

export default GigListPage;
