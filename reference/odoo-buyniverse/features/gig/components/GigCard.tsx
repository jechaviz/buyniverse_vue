
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Gig, User, Agency } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import Card from '@/components/ui/Card';
import StarRating from '@/components/ui/StarRating'; // Assuming future reviews for gigs

const { Link } = ReactRouterDOM;

const GigCard: React.FC<{ gig: Gig }> = ({ gig }) => {
    const { users, agencies } = useAppState();

    const creator: User | Agency | undefined = gig.creatorType === 'user'
        ? users.find(u => u.id === gig.creatorId)
        : agencies.find(a => a.id === gig.creatorId);

    // Placeholder for reviews
    const avgRating = 4.5 + (parseInt(gig.id.slice(-1), 16) % 5) / 10;
    const reviewCount = 10 + (parseInt(gig.id.slice(-2, -1), 16));

    return (
        <Card className="flex flex-col overflow-hidden group">
            <Link to={`/gig/${gig.id}`}>
                <img src={gig.imageUrl} alt={gig.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
            </Link>
            <div className="p-4 flex flex-col flex-grow">
                {creator && (
                    <div className="flex items-center gap-2 mb-2">
                         <img src={(creator as Agency).logoUrl || 'https://via.placeholder.com/150/16a34a/ffffff?text=U'} alt={creator.name} className="w-6 h-6 rounded-full" loading="lazy" decoding="async" />
                         <span className="text-xs font-semibold text-gray-600">{creator.name}</span>
                    </div>
                )}
                <Link to={`/gig/${gig.id}`} className="flex-grow">
                    <p className="text-gray-800 font-semibold hover:text-primary-600 line-clamp-2">{gig.title}</p>
                </Link>
                <div className="flex items-center gap-1 text-sm mt-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span className="font-bold text-yellow-500">{avgRating.toFixed(1)}</span>
                    <span className="text-gray-400">({reviewCount})</span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 text-right">
                    <span className="text-xs text-gray-500 uppercase">Starting at </span>
                    <span className="font-bold text-lg text-gray-800">${gig.price.toLocaleString()}</span>
                </div>
            </div>
        </Card>
    );
};

export default GigCard;
