import React, { useState } from 'react';

interface StarInputProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

const StarInput: React.FC<StarInputProps> = ({ rating, onRatingChange }) => {
  const [hoverRating, setHoverRating] = useState(0);
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            type="button"
            key={starValue}
            className={`text-2xl transition-colors ${starValue <= (hoverRating || rating) ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}
            onClick={() => onRatingChange(starValue)}
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(0)}
          >
            <i className="fa-solid fa-star"></i>
          </button>
        );
      })}
    </div>
  );
};

export default StarInput;