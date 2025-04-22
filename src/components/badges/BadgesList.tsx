import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Award, Plus, Search, X, CheckSquare } from 'lucide-react';
import BadgeCard from './BadgeCard';

interface Badge {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const BadgesList: React.FC = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCreatedByMe, setFilterCreatedByMe] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchBadges = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('badges')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching badges:', error);
          setError('Could not load badges');
        } else {
          setBadges(data || []);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [user]);

  // Filter badges based on search query and filter
  const filteredBadges = badges.filter(badge => {
    // Apply created by me filter
    if (filterCreatedByMe && badge.created_by !== user?.id) {
      return false;
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        badge.title.toLowerCase().includes(query) ||
        (badge.description && badge.description.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 dark:border-purple-400"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <Award className="h-6 w-6 mr-2 text-purple-600 dark:text-purple-400" />
          Badges
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search badges..."
              className="pl-10 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          <div className="flex items-center">
            <input
              id="filterCreatedByMe"
              type="checkbox"
              className="h-4 w-4 text-purple-500 dark:text-purple-400 focus:ring-purple-400 dark:focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
              checked={filterCreatedByMe}
              onChange={(e) => setFilterCreatedByMe(e.target.checked)}
            />
            <label className="ml-2 text-gray-700 dark:text-gray-200 text-sm" htmlFor="filterCreatedByMe">
              Created by me
            </label>
          </div>
          
          <div className="flex gap-2">
            <Link
              to="/badges/new"
              className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-600 text-white px-5 py-2.5 rounded-lg hover:from-purple-700 hover:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-500 transition-all duration-200 shadow-sm font-medium"
            >
              <Plus className="h-5 w-5 mr-1.5" />
              Create Badge
            </Link>
            
            <Link
              to="/badge-quests"
              className="flex items-center justify-center bg-blue-600 dark:bg-blue-700 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 shadow-sm font-medium"
            >
              <CheckSquare className="h-5 w-5 mr-1.5" />
              Badge Quests
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {badges.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-10 text-center border border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="h-10 w-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3">No badges yet</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">Create badges to reward task completion and recognize achievements!</p>
          <Link
            to="/badges/new"
            className="inline-flex items-center bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-500 transition-all duration-200 shadow-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create First Badge
          </Link>
        </div>
      ) : filteredBadges.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">No matching badges</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Try adjusting your search or filters</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterCreatedByMe(false);
            }}
            className="inline-flex items-center bg-gray-600 dark:bg-gray-700 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors shadow-sm font-medium"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBadges.map((badge) => (
            <Link key={badge.id} to={`/badges/${badge.id}`}>
              <BadgeCard badge={badge} isCreator={badge.created_by === user?.id} />
            </Link>
          ))}
        </div>
      )}
      
      {/* Link to badge quests */}
      <div className="mt-8 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 text-center">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Badge Quests</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Create multi-task quests that reward users with badges upon completion. 
          Quests are a great way to encourage users to complete a series of related tasks.
        </p>
        <Link
          to="/badge-quests"
          className="inline-flex items-center bg-blue-600 dark:bg-blue-700 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm font-medium"
        >
          <CheckSquare className="h-5 w-5 mr-1.5" />
          View Badge Quests
        </Link>
      </div>
    </div>
  );
};

export default BadgesList;