import React from 'react';
import { Award, User } from 'lucide-react';

interface BadgeProps {
  badge: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    created_by: string;
    created_at: string;
  };
  isCreator?: boolean;
  isEarned?: boolean;
  earnedAt?: string;
}

const BadgeCard: React.FC<BadgeProps> = ({ badge, isCreator = false, isEarned = false, earnedAt }) => {
  // Format date if available
  const formattedDate = badge.created_at 
    ? new Date(badge.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const formattedEarnedDate = earnedAt
    ? new Date(earnedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${isEarned ? 'border-purple-300 dark:border-purple-700' : 'border-gray-200 dark:border-gray-700'} hover:shadow-md transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-600 h-full flex flex-col overflow-hidden`}>
      <div className={`p-4 flex justify-center items-center ${isEarned ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
        {badge.image_url ? (
          <img 
            src={badge.image_url} 
            alt={badge.title} 
            className="h-24 w-24 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128?text=Badge';
            }}
          />
        ) : (
          <div className="h-24 w-24 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <Award className="h-12 w-12 text-purple-600 dark:text-purple-400" />
          </div>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-gray-800 dark:text-gray-100">{badge.title}</h3>
          {isCreator && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
              Created by you
            </span>
          )}
          {isEarned && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full flex items-center">
              <Award className="h-3 w-3 mr-1" />
              Earned
            </span>
          )}
        </div>
        
        {badge.description && (
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{badge.description}</p>
        )}
        
        <div className="mt-auto text-xs text-gray-500 dark:text-gray-400">
          {isEarned && formattedEarnedDate ? (
            <div className="flex items-center">
              <Award className="h-3.5 w-3.5 mr-1 text-purple-500 dark:text-purple-400" />
              Earned on {formattedEarnedDate}
            </div>
          ) : (
            <div className="flex items-center">
              <User className="h-3.5 w-3.5 mr-1" />
              Created {formattedDate}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BadgeCard;