import React from 'react';
import { User } from '@/types';
import Card from '@/components/ui/Card';
import { Link } from 'react-router-dom';
import StarRating from '@/components/ui/StarRating';
import Button from '@/components/ui/Button';

interface ProviderListCardProps {
  row: {
      name: string;
      id: string;
      avatarUrl?: string;
      headline?: string;
      avgRating: number;
      reviewsCount: number;
      selectionStatus: string;
  };
}

const ProviderListCard: React.FC<ProviderListCardProps> = ({ row: provider }) => {
    return (
        <Card className="p-4 flex flex-col h-full">
            <div className="flex-grow">
                 <div className="flex items-start gap-3">
                    <img src={provider.avatarUrl} alt={provider.name} className="w-12 h-12 rounded-full" />
                    <div>
                        <Link to={`/profile/${provider.id}`} className="font-bold hover:underline">{provider.name}</Link>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                           <StarRating rating={provider.avgRating} /> ({provider.reviewsCount})
                        </div>
                    </div>
                </div>
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{provider.headline}</p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xs font-semibold px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-md">{provider.selectionStatus}</span>
                <Button variant="secondary" size="sm">View Profile</Button>
            </div>
        </Card>
    );
}

// Wrapper for DataTable
const ProviderListCardWrapper = (row: any) => <ProviderListCard row={row} />;
export default ProviderListCardWrapper;
