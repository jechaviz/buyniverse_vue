

import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { User } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import StarRating from '@/components/ui/StarRating';
import Button from '@/components/ui/Button';

const { Link } = ReactRouterDOM;

interface FreelancerCardProps {
  freelancer: User;
}

const FreelancerCard: React.FC<FreelancerCardProps> = ({ freelancer }) => {
    const { reviews, agencies } = useAppState();

    const freelancerReviews = reviews.filter(r => r.toUserId === freelancer.id);
    const avgRating = freelancerReviews.length > 0 ? freelancerReviews.reduce((sum, r) => sum + r.rating, 0) / freelancerReviews.length : 0;
    const agency = agencies.find(a => a.id === freelancer.agencyId);
    
    return (
        <Card className="p-6 flex flex-col">
            <div className="flex-grow">
                <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl font-bold text-primary-600">{freelancer.name.charAt(0)}</span>
                    </div>
                    <div>
                        <Link to={`/profile/${freelancer.id}`}>
                            <h3 className="text-lg font-bold text-gray-800 hover:text-primary-700">{freelancer.name}</h3>
                        </Link>
                         {agency && (
                            <Link to={`/agency/${agency.id}`} className="text-xs font-semibold text-gray-500 hover:text-primary-600 hover:underline">
                                Member of {agency.name}
                            </Link>
                         )}
                         <div className="flex items-center gap-1 text-sm mt-1">
                            <StarRating rating={avgRating} />
                            <span className="font-semibold">{avgRating.toFixed(1)}</span>
                            <span className="text-gray-500">({freelancerReviews.length})</span>
                        </div>
                    </div>
                </div>
                <p className="text-sm text-gray-700 font-medium mt-4 line-clamp-2 h-10">{freelancer.headline}</p>
                <div className="mt-3">
                    <div className="flex flex-wrap gap-1">
                        {freelancer.skills?.slice(0, 4).map(skill => (
                            <Tag key={skill} className="text-xs">{skill}</Tag>
                        ))}
                    </div>
                </div>
            </div>
             <div className="mt-6 pt-4 border-t border-gray-100">
                <Link to={`/profile/${freelancer.id}`}>
                    <Button variant="secondary" className="w-full">View Profile</Button>
                </Link>
            </div>
        </Card>
    );
};

export default FreelancerCard;