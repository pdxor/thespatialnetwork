import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Award, Edit, Trash2, AlertCircle, CheckSquare, ArrowLeft, Clock, User, CheckCircle, XCircle } from 'lucide-react';

interface BadgeQuest {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  badge_id: string | null;
  required_tasks_count: number;
  created_at: string;
  updated_at: string;
}

interface Badge {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

interface QuestTask {
  id: string;
  quest_id: string;
  task_id: string;
  order_position: number;
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
  };
}

interface UserProgress {
  id: string;
  user_id: string;
  quest_id: string;
  completed_tasks: string[];
  progress_percentage: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

const BadgeQuestDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [quest, setQuest] = useState<BadgeQuest | null>(null);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [questTasks, setQuestTasks] = useState<QuestTask[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userHasBadge, setUserHasBadge] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    
    const fetchQuestDetails = async () => {
      try {
        // Fetch quest
        const { data: questData, error: questError } = await supabase
          .from('badge_quests')
          .select('*')
          .eq('id', id)
          .single();
          
        if (questError) throw questError;
        
        if (!questData) {
          setError('Quest not found');
          return;
        }
        
        setQuest(questData);
        
        // Fetch badge if quest has one
        if (questData.badge_id) {
          const { data: badgeData, error: badgeError } = await supabase
            .from('badges')
            .select('*')
            .eq('id', questData.badge_id)
            .single();
            
          if (!badgeError && badgeData) {
            setBadge(badgeData);
            
            // Check if user already has this badge
            const { data: userBadgeData, error: userBadgeError } = await supabase
              .from('user_badges')
              .select('id')
              .eq('user_id', user.id)
              .eq('badge_id', badgeData.id)
              .maybeSingle();
              
            if (!userBadgeError && userBadgeData) {
              setUserHasBadge(true);
            }
          }
        }
        
        // Fetch quest tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('badge_quest_tasks')
          .select(`
            id,
            quest_id,
            task_id,
            order_position,
            task:tasks(id, title, description, status)
          `)
          .eq('quest_id', id)
          .order('order_position', { ascending: true });
          
        if (tasksError) throw tasksError;
        
        setQuestTasks(tasksData || []);
        
        // Fetch user progress
        const { data: progressData, error: progressError } = await supabase
          .from('user_quest_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('quest_id', id)
          .maybeSingle();
          
        if (!progressError && progressData) {
          setUserProgress(progressData);
        }
        
        // Fetch creator's name
        const { data: creatorData, error: creatorError } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', questData.created_by)
          .single();
          
        if (!creatorError && creatorData) {
          setCreatorName(creatorData.name);
        }
        
      } catch (err) {
        console.error('Error fetching quest details:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while loading the quest');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestDetails();
  }, [id, user]);
  
  const handleDelete = async () => {
    if (!quest || !user) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('badge_quests')
        .delete()
        .eq('id', quest.id);
        
      if (error) throw error;
      
      // Navigate back to badge quests list
      navigate('/badge-quests');
      
    } catch (err) {
      console.error('Error deleting badge quest:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while deleting the badge quest');
      }
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleStartQuest = async () => {
    if (!quest || !user) return;
    
    try {
      // Create user progress record
      const { error } = await supabase
        .from('user_quest_progress')
        .insert({
          user_id: user.id,
          quest_id: quest.id,
          completed_tasks: [],
          progress_percentage: 0,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      // Refresh the page to show progress
      window.location.reload();
      
    } catch (err) {
      console.error('Error starting quest:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while starting the quest');
      }
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!quest || !user || !userProgress) return;
    
    try {
      // Check if task is already completed
      if (userProgress.completed_tasks.includes(taskId)) {
        return;
      }
      
      // Add task to completed tasks
      const updatedCompletedTasks = [...userProgress.completed_tasks, taskId];
      
      // Calculate new progress percentage
      const newProgressPercentage = Math.round(
        (updatedCompletedTasks.length / quest.required_tasks_count) * 100
      );
      
      // Check if quest is now complete
      const isComplete = updatedCompletedTasks.length >= quest.required_tasks_count;
      
      // Update user progress
      const { error } = await supabase
        .from('user_quest_progress')
        .update({
          completed_tasks: updatedCompletedTasks,
          progress_percentage: Math.min(newProgressPercentage, 100),
          updated_at: new Date().toISOString(),
          completed_at: isComplete ? new Date().toISOString() : null
        })
        .eq('id', userProgress.id);
        
      if (error) throw error;
      
      // If quest is complete and has a badge, award the badge
      if (isComplete && quest.badge_id && !userHasBadge) {
        const { error: badgeError } = await supabase
          .from('user_badges')
          .insert({
            user_id: user.id,
            badge_id: quest.badge_id,
            earned_at: new Date().toISOString()
          });
          
        if (badgeError) throw badgeError;
        
        setUserHasBadge(true);
      }
      
      // Update local state
      setUserProgress({
        ...userProgress,
        completed_tasks: updatedCompletedTasks,
        progress_percentage: Math.min(newProgressPercentage, 100),
        completed_at: isComplete ? new Date().toISOString() : null
      });
      
    } catch (err) {
      console.error('Error completing task:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while completing the task');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 dark:border-purple-400"></div>
      </div>
    );
  }

  if (error && !quest) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <div className="mt-4">
          <button
            onClick={() => navigate('/badge-quests')}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Return to Badge Quests
          </button>
        </div>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 p-4 rounded-md">
        Quest not found. It may have been deleted or you don't have access.
      </div>
    );
  }

  // Format date for display
  const formattedCreatedDate = new Date(quest.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isQuestComplete = userProgress?.completed_at !== null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 transform transition-all duration-300 ease-in-out">
            <div className="flex items-center text-red-600 dark:text-red-400 mb-4">
              <AlertCircle className="h-6 w-6 mr-2" />
              <h3 className="text-xl font-bold">Delete Quest</h3>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-300">Are you sure you want to delete "{quest.title}"? This action cannot be undone and will remove this quest from all users' progress.</p>
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
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center">
              <Award className="h-6 w-6 mr-2 text-purple-600 dark:text-purple-400" />
              {quest.title}
            </h1>
            
            <div className="flex items-center text-gray-600 dark:text-gray-300 mb-4">
              <User className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm">
                Created by {creatorName || 'Unknown'} on {formattedCreatedDate}
              </span>
            </div>
          </div>
          
          {quest.created_by === user?.id && (
            <div className="flex space-x-2">
              <Link
                to={`/badge-quests/edit/${quest.id}`}
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
        
        {quest.description && (
          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300">{quest.description}</p>
          </div>
        )}
        
        {/* Badge Reward */}
        {badge && (
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-start">
              <div className="mr-4">
                {badge.image_url ? (
                  <img 
                    src={badge.image_url} 
                    alt={badge.title} 
                    className="h-16 w-16 object-contain"
                  />
                ) : (
                  <div className="h-16 w-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <Award className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1 flex items-center">
                  Complete this quest to earn the "{badge.title}" badge
                  {userHasBadge && (
                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Earned
                    </span>
                  )}
                </h3>
                
                {badge.description && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{badge.description}</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Progress Bar */}
        {userProgress && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-200">Your Progress</h3>
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                {userProgress.progress_percentage}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-purple-600 dark:bg-purple-500 h-2.5 rounded-full" 
                style={{ width: `${userProgress.progress_percentage}%` }}
              ></div>
            </div>
            
            {isQuestComplete && (
              <div className="mt-2 text-center">
                <span className="inline-flex items-center text-sm bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200 px-3 py-1 rounded-full">
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Quest Completed!
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Quest Tasks */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
              <CheckSquare className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Quest Tasks
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                (Complete {quest.required_tasks_count} of {questTasks.length})
              </span>
            </h2>
          </div>
          
          {questTasks.length > 0 ? (
            <div className="space-y-3">
              {questTasks.map((questTask) => {
                const task = questTask.task as any;
                const isCompleted = userProgress?.completed_tasks.includes(task.id);
                
                return (
                  <div 
                    key={questTask.id}
                    className={`p-4 border rounded-lg ${
                      isCompleted 
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <div className="mt-0.5 mr-3">
                          {isCompleted ? (
                            <div className="w-6 h-6 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800 dark:text-gray-100">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{task.description}</p>
                          )}
                          <div className="mt-2 flex items-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              task.status === 'todo' ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200' :
                              task.status === 'in_progress' ? 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200' :
                              task.status === 'done' ? 'bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200' :
                              'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200'
                            }`}>
                              {task.status === 'todo' ? 'To Do' :
                               task.status === 'in_progress' ? 'In Progress' :
                               task.status === 'done' ? 'Done' : 'Blocked'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Link
                          to={`/tasks/${task.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                        >
                          View Task
                        </Link>
                        
                        {userProgress && !isCompleted && (
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg text-center">
              <p className="text-gray-500 dark:text-gray-400">No tasks have been added to this quest</p>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        {!userProgress && (
          <div className="mb-6">
            <button
              onClick={handleStartQuest}
              className="w-full bg-purple-600 dark:bg-purple-700 text-white py-3 px-4 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors shadow-sm flex items-center justify-center"
            >
              <Award className="h-5 w-5 mr-2" />
              Start Quest
            </button>
          </div>
        )}
        
        <div className="flex justify-between mt-8">
          <Link
            to="/badge-quests"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Quests
          </Link>
          
          <Link
            to="/badges"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            Back to Badges
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BadgeQuestDetailView;