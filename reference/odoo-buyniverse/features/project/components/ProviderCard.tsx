
import React, { useState, useMemo } from 'react';
import { Proposal, User } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import StarRating from '@/components/ui/StarRating';

interface ProviderCardProps {
  row: {
      provider: User | undefined;
  } & Proposal;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ row: proposal }) => {
    const { provider } = proposal;
    const { reviews } = useAppState();
    const [isExpanded, setIsExpanded] = useState(false);

    const providerReviews = useMemo(() => {
        if (!provider) return [];
        return reviews.filter(r => r.toUserId === provider.id);
    }, [reviews, provider]);

    const avgRating = providerReviews.length > 0 
        ? providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length 
        : 0;

    if (!provider) return null;

    const onlineStatusColor = {
        'online': 'bg-green-500',
        'away': 'bg-yellow-500',
        'offline': 'bg-slate-400'
    }[provider.onlineStatus || 'offline'];

    return (
        <Card className="p-4 flex flex-col h-full">
            <div className="flex-grow">
                <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                        <img src={provider.avatarUrl} alt={provider.name} className="w-12 h-12 rounded-full" />
                        <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${onlineStatusColor} ring-2 ring-white`}></span>
                    </div>
                    <div>
                        <p className="font-bold">{provider.name}</p>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                           <StarRating rating={avgRating} /> ({providerReviews.length})
                        </div>
                    </div>
                </div>
                
                <p className={`text-sm text-slate-600 mt-3 ${isExpanded ? '' : 'line-clamp-3'}`}>
                    {proposal.coverLetter}
                </p>
                <button onClick={() => setIsExpanded(!isExpanded)} className="text-sm text-primary-600 hover:underline mt-1">
                    {isExpanded ? 'Read Less' : 'Read More'}
                </button>
                
                <div className="mt-3">
                    <div className="flex flex-wrap gap-1">
                        {provider.skills?.slice(0, 4).map(skill => (
                            <Tag key={skill} className="text-xs">{skill}</Tag>
                        ))}
                    </div>
                </div>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-3">
                     <span className="text-xs text-slate-500">PROVIDER'S BID</span>
                     <span className="font-bold text-lg">${proposal.bid.toLocaleString()}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="secondary" className="flex-1"><i className="fa-regular fa-comment-dots mr-2"></i> Chat</Button>
                    <Button className="flex-1"><i className="fa-solid fa-check mr-2"></i> Hire</Button>
                 </div>
                 <div className="flex items-center justify-center gap-4 mt-3">
                    <button className="text-xs text-slate-500 hover:text-primary-600"><i className="fa-regular fa-star mr-1"></i> Favorite</button>
                    <button className="text-xs text-slate-500 hover:text-red-600"><i className="fa-regular fa-eye-slash mr-1"></i> Hide</button>
                 </div>
            </div>
        </Card>
    );
};

// This is a wrapper to match the expected props from DataTable's renderCard
const ProviderCardWrapper = (row: any) => <ProviderCard row={row} />;

export default ProviderCardWrapper;