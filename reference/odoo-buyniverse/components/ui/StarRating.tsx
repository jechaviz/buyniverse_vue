
import React from 'react';

interface StarRatingProps {
    rating: number;
    maxRating?: number;
    className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, maxRating = 5, className }) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = maxRating - fullStars - (halfStar ? 1 : 0);

    return (
        <div className={`flex items-center text-yellow-400 ${className || ''}`}>
            {[...Array(fullStars)].map((_, i) => <i key={`full-${i}`} className="fa-solid fa-star"></i>)}
            {halfStar && <i className="fa-solid fa-star-half-alt"></i>}
            {[...Array(emptyStars)].map((_, i) => <i key={`empty-${i}`} className="fa-regular fa-star"></i>)}
        </div>
    );
};

export default StarRating;
