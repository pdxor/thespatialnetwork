import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Award, Edit, Trash2, AlertCircle, User, Clock, CheckSquare, Plus } from 'lucide-react';

interface Badge {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

interface UserWithBadge {
  user_id: string;
  name: string;
  email: string;
  earned_at: string;
}

interface BadgeQuest {
  id: string;
  title: string;
  description: string | null;
  required_tasks_count: number;
  task_count: number;
}

const BadgeDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [badge, setBadge] = useState<Badge | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [tasksWithBadge, setTasksWithBadge] = useState<Task[]>([]);
  const [usersWithBadge, setUsersWithBadge] = useState<UserWithBadge[]>([]);
  const [quests, setQuests] = useState<BadgeQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userHasBadge, setUserHasBadge] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    
    const fetchBadgeDetails = async () => {
      try {
        // Fetch badge
        const { data: badgeData, error: badgeError } = await supabase
          .from('badges')
          .select('*')
          .eq('id', id)
          .single();
          
        if (badgeError) throw badgeError;
        
        if (!badgeData) {
          setError('Badge not found');
          return;
        }
        
        setBadge(badgeData);
        
        // Fetch creator's name
        const { data: creatorData, error: creatorError } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', badgeData.created_by)
          .single();
          
        if (!creatorError && creatorData) {
          setCreatorName(creatorData.name);
        }
        
        // Fetch tasks that award this badge
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('id, title, status')
          .eq('badge_id', id);
          
        if (!tasksError) {
          setTasksWithBadge(tasksData || []);
        }
        
        // Fetch badge quests that award this badge
        const { data: questsData, error: questsError } = await supabase
          .from('badge_quests')
          .select(`
            id, 
            title, 
            description, 
            required_tasks_count,
            task_count:badge_quest_tasks(count)
          `)
          .eq('badge_id', id);
          
        if (!questsError) {
          // Process the data to get the task count
          const processedQuests = questsData?.map(quest => ({
            ...quest,
            task_count: quest.task_count?.[0]?.count || 0
          })) || [];
          
          setQuests(processedQuests);
        }
        
        // Fetch users who have earned this badge
        const { data: userBadgesData, error: userBadgesError } = await supabase
          .from('user_badges')
          .select('user_id, earned_at')
          .eq('badge_id', id);
          
        if (!userBadgesError && userBadgesData && userBadgesData.length > 0) {
          // Check if current user has this badge
          const currentUserHasBadge = userBadgesData.some(ub => ub.user_id === user.id);
          setUserHasBadge(currentUserHasBadge);
          
          // Get profiles for users with this badge
          const userIds = userBadgesData.map(ub => ub.user_id);
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .in('user_id', userIds);
            
          if (!profilesError && profilesData) {
            // Combine profile data with earned_at date
            const usersWithBadgeData = profilesData.map(profile => {
              const userBadge = userBadgesData.find(ub => ub.user_id === profile.user_id);
              return {
                ...profile,
                earned_at: userBadge?.earned_at || ''
              };
            });
            
            setUsersWithBadge(usersWithBadgeData);
          }
        }
        
      } catch (err) {
        console.error('Error fetching badge details:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while loading the badge');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchBadgeDetails();
  }, [id, user]);
  
  const handleDelete = async () => {
    if (!badge || !user) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', badge.id);
        
      if (error) throw error;
      
      // Navigate back to badges list
      navigate('/badges');
      
    } catch (err) {
      console.error('Error deleting badge:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while deleting the badge');
      }
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 dark:border-purple-400"></div>
      </div>
    );
  }

  if (error && !badge) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <div className="mt-4">
          <button
            onClick={() => navigate('/badges')}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Return to Badges
          </button>
        </div>
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 p-4 rounded-md">
        Badge not found. It may have been deleted or you don't have access.
      </div>
    );
  }

  // Format date for display
  const formattedCreatedDate = new Date(badge.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 transform transition-all duration-300 ease-in-out">
            <div className="flex items-center text-red-600 dark:text-red-400 mb-4">
              <AlertCircle className="h-6 w-6 mr-2" />
              <h3 className="text-xl font-bold">Delete Badge</h3>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-300">Are you sure you want to delete "{badge.title}"? This action cannot be undone and will remove this badge from all tasks and users who have earned it.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 font-medium"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center font-medium shadow-sm"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex justify-center">
            <div className={`p-6 rounded-lg ${userHasBadge ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
              {badge.image_url ? (
                <img 
                  src={badge.image_url} 
                  alt={badge.title} 
                  className="h-40 w-40 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128?text=Badge';
                  }}
                />
              ) : (
                <div className="h-40 w-40 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Award className="h-20 w-20 text-purple-600 dark:text-purple-400" />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center">
                  {badge.title}
                  {userHasBadge && (
                    <span className="ml-2 text-sm bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full flex items-center">
                      <Award className="h-3.5 w-3.5 mr-1" />
                      Earned
                    </span>
                  )}
                </h1>
                
                <div className="flex items-center text-gray-600 dark:text-gray-300 mb-4">
                  <User className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm">
                    Created by {creatorName || 'Unknown'} on {formattedCreatedDate}
                  </span>
                </div>
              </div>
              
              {badge.created_by === user?.id && (
                <div className="flex space-x-2">
                  <Link
                    to={`/badges/edit/${badge.id}`}
                    className="bg-blue-600 dark:bg-blue-700 text-white p-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-red-600 dark:bg-red-700 text-white p-2 rounded hover:bg-red-700 dark:hover:bg-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
            
            {badge.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Description</h2>
                <p className="text-gray-700 dark:text-gray-300">{badge.description}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Badge Quests Section */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                <Award className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                Badge Quests
              </h2>
              
              {badge.created_by === user?.id && (
                <Link
                  to={`/badge-quests/new?badge_id=${badge.id}`}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Quest
                </Link>
              )}
            </div>
            
            {quests.length > 0 ? (
              <div className="space-y-3">
                {quests.map(quest => (
                  <Link
                    key={quest.id}
                    to={`/badge-quests/${quest.id}`}
                    className="block bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">{quest.title}</p>
                        {quest.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">{quest.description}</p>
                        )}
                        <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <CheckSquare className="h-3.5 w-3.5 mr-1" />
                          {quest.required_tasks_count} of {quest.task_count} tasks required
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-gray-500 dark:text-gray-400">No quests are currently awarding this badge</p>
                {badge.created_by === user?.id && (
                  <Link
                    to={`/badge-quests/new?badge_id=${badge.id}`}
                    className="mt-2 inline-flex items-center text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Create a quest with this badge
                  </Link>
                )}
              </div>
            )}
          </div>
          
          {/* Tasks that award this badge */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
              <CheckSquare className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Tasks that Award this Badge
            </h2>
            
            {tasksWithBadge.length > 0 ? (
              <div className="space-y-3">
                {tasksWithBadge.map(task => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="block bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start">
                      <CheckSquare className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">{task.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Status: {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-gray-500 dark:text-gray-400">No tasks are currently awarding this badge</p>
                {badge.created_by === user?.id && (
                  <Link
                    to="/tasks/new"
                    className="mt-2 inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Create a task with this badge
                  </Link>
                )}
              </div>
            )}
          </div>
          
          {/* Users who have earned this badge */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
              <Award className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
              Users who Earned this Badge
            </h2>
            
            {usersWithBadge.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {usersWithBadge.map(userWithBadge => (
                  <div
                    key={userWithBadge.user_id}
                    className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-2">
                        <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">{userWithBadge.name}</p>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Earned on {new Date(userWithBadge.earned_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-gray-500 dark:text-gray-400">No users have earned this badge yet</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between mt-8">
          <Link
            to="/badges"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            ← Back to Badges
          </Link>
          
          <Link
            to="/badge-quests"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            View All Quests
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BadgeDetailView;