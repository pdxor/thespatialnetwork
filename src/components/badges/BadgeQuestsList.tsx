import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Award, Plus, Search, Filter, X, CheckSquare } from 'lucide-react';

interface BadgeQuest {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  badge_id: string | null;
  required_tasks_count: number;
  created_at: string;
  updated_at: string;
  badges: {
    id: string;
    title: string;
    image_url: string | null;
  } | null;
  task_count: number;
  creator_profile: {
    name: string;
  } | null;
}

interface UserProgress {
  quest_id: string;
  progress_percentage: number;
  completed_at: string | null;
}

const BadgeQuestsList: React.FC = () => {
  const { user } = useAuth();
  const [quests, setQuests] = useState<BadgeQuest[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCreatedByMe, setFilterCreatedByMe] = useState(false);
  const [filterInProgress, setFilterInProgress] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchQuests = async () => {
      try {
        setLoading(true);
        
        // Fetch quests with badge and task count - updated to use creator_profile
        const { data, error } = await supabase
          .from('badge_quests')
          .select(`
            *,
            badges (id, title, image_url),
            task_count:badge_quest_tasks(count),
            creator_profile:profiles!badge_quests_created_by_profiles_fkey(name)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching badge quests:', error);
          setError('Could not load badge quests');
          return;
        }
        
        // Process the data to get the task count
        const processedQuests = data.map(quest => ({
          ...quest,
          task_count: quest.task_count?.[0]?.count || 0
        }));
        
        setQuests(processedQuests || []);
        
        // Fetch user progress for all quests
        if (processedQuests.length > 0) {
          const questIds = processedQuests.map(quest => quest.id);
          
          const { data: progressData, error: progressError } = await supabase
            .from('user_quest_progress')
            .select('quest_id, progress_percentage, completed_at')
            .eq('user_id', user.id)
            .in('quest_id', questIds);
            
          if (!progressError && progressData) {
            // Convert to a map for easier lookup
            const progressMap: Record<string, UserProgress> = {};
            progressData.forEach(progress => {
              progressMap[progress.quest_id] = {
                quest_id: progress.quest_id,
                progress_percentage: progress.progress_percentage,
                completed_at: progress.completed_at
              };
            });
            
            setUserProgress(progressMap);
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchQuests();
  }, [user]);

  // Filter quests based on search query and filters
  const filteredQuests = quests.filter(quest => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = quest.title.toLowerCase().includes(query);
      const matchesDescription = quest.description && quest.description.toLowerCase().includes(query);
      const matchesBadge = quest.badges?.title.toLowerCase().includes(query);
      
      if (!matchesTitle && !matchesDescription && !matchesBadge) {
        return false;
      }
    }
    
    // Apply created by me filter
    if (filterCreatedByMe && quest.created_by !== user?.id) {
      return false;
    }
    
    // Apply in progress filter
    if (filterInProgress) {
      const progress = userProgress[quest.id];
      if (!progress || progress.completed_at !== null) {
        return false;
      }
    }
    
    // Apply completed filter
    if (filterCompleted) {
      const progress = userProgress[quest.id];
      if (!progress || progress.completed_at === null) {
        return false;
      }
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
          Badge Quests
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search quests..."
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
          
          <Link
            to="/badge-quests/new"
            className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-600 text-white px-5 py-2.5 rounded-lg hover:from-purple-700 hover:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-500 transition-all duration-200 shadow-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-1.5" />
            Create Quest
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
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
        
        <div className="flex items-center">
          <input
            id="filterInProgress"
            type="checkbox"
            className="h-4 w-4 text-purple-500 dark:text-purple-400 focus:ring-purple-400 dark:focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
            checked={filterInProgress}
            onChange={(e) => {
              setFilterInProgress(e.target.checked);
              if (e.target.checked) setFilterCompleted(false);
            }}
          />
          <label className="ml-2 text-gray-700 dark:text-gray-200 text-sm" htmlFor="filterInProgress">
            In progress
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            id="filterCompleted"
            type="checkbox"
            className="h-4 w-4 text-purple-500 dark:text-purple-400 focus:ring-purple-400 dark:focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
            checked={filterCompleted}
            onChange={(e) => {
              setFilterCompleted(e.target.checked);
              if (e.target.checked) setFilterInProgress(false);
            }}
          />
          <label className="ml-2 text-gray-700 dark:text-gray-200 text-sm" htmlFor="filterCompleted">
            Completed
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {quests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-10 text-center border border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="h-10 w-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3">No badge quests yet</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">Create badge quests to group tasks together and reward users with badges upon completion!</p>
          <Link
            to="/badge-quests/new"
            className="inline-flex items-center bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-500 transition-all duration-200 shadow-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create First Quest
          </Link>
        </div>
      ) : filteredQuests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">No matching quests</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Try adjusting your search or filters</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterCreatedByMe(false);
              setFilterInProgress(false);
              setFilterCompleted(false);
            }}
            className="inline-flex items-center bg-gray-600 dark:bg-gray-700 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors shadow-sm font-medium"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuests.map((quest) => {
            const progress = userProgress[quest.id];
            const isCompleted = progress?.completed_at !== null;
            const isInProgress = progress && !isCompleted;
            
            return (
              <Link key={quest.id} to={`/badge-quests/${quest.id}`}>
                <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${
                  isCompleted 
                    ? 'border-green-300 dark:border-green-700' 
                    : isInProgress 
                      ? 'border-blue-300 dark:border-blue-700'
                      : 'border-gray-200 dark:border-gray-700'
                } hover:shadow-md transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-600 h-full flex flex-col overflow-hidden`}>
                  <div className={`p-4 ${
                    isCompleted 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : isInProgress 
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'bg-gray-50 dark:bg-gray-700/30'
                  }`}>
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-800 dark:text-gray-100">{quest.title}</h3>
                      {quest.created_by === user?.id && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                          Created by you
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center mt-2">
                      <CheckSquare className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {quest.required_tasks_count} of {quest.task_count} tasks required
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col">
                    {quest.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{quest.description}</p>
                    )}
                    
                    {/* Badge reward */}
                    {quest.badges && (
                      <div className="flex items-center mb-3">
                        {quest.badges.image_url ? (
                          <img 
                            src={quest.badges.image_url} 
                            alt={quest.badges.title} 
                            className="h-8 w-8 object-contain mr-2"
                          />
                        ) : (
                          <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-2">
                            <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Reward: {quest.badges.title}
                        </span>
                      </div>
                    )}
                    
                    {/* Progress bar */}
                    {progress && (
                      <div className="mt-auto">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                            {progress.progress_percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              isCompleted 
                                ? 'bg-green-500 dark:bg-green-400' 
                                : 'bg-purple-600 dark:bg-purple-500'
                            }`}
                            style={{ width: `${progress.progress_percentage}%` }}
                          ></div>
                        </div>
                        
                        {isCompleted && (
                          <div className="mt-2 text-center">
                            <span className="text-xs bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BadgeQuestsList;