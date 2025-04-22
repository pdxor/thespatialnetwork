import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { CheckSquare, Calendar, AlertCircle, Edit, Trash2, Folder, User, Clock, Package, Plus, Users, Award, CheckCircle, XCircle } from 'lucide-react';
import MemberList from '../common/MemberList';

type Task = Database['public']['Tables']['tasks']['Row'];
type InventoryItem = Database['public']['Tables']['items']['Row'];

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Badge {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

const TaskDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [task, setTask] = useState<Task | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<Member[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [userHasBadge, setUserHasBadge] = useState(false);
  const [showVerificationOptions, setShowVerificationOptions] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [completedBy, setCompletedBy] = useState<Member | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    
    const fetchTask = async () => {
      try {
        // Fetch task
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .single();
          
        if (taskError) throw taskError;
        
        if (!taskData) {
          setError('Task not found');
          return;
        }
        
        setTask(taskData);
        
        // Fetch project name if task is associated with a project
        if (taskData.project_id) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('title')
            .eq('id', taskData.project_id)
            .single();
            
          if (projectError) console.error('Error fetching project:', projectError);
          else setProjectName(projectData?.title || null);
        }
        
        // Fetch assignees
        if (taskData.assignees && taskData.assignees.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .in('user_id', taskData.assignees);
            
          if (profilesError) {
            console.error('Error fetching assignees:', profilesError);
          } else if (profiles) {
            const memberList: Member[] = profiles.map(profile => ({
              id: profile.user_id,
              name: profile.name || 'Team Member',
              email: profile.email || ''
            }));
            setAssignees(memberList);
          }
        } else if (taskData.assigned_to) {
          // Legacy: only assigned_to is set
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .eq('user_id', taskData.assigned_to)
            .single();
            
          if (profileError) {
            console.error('Error fetching assignee:', profileError);
          } else if (profile) {
            setAssignees([{
              id: profile.user_id,
              name: profile.name || 'Assignee',
              email: profile.email || ''
            }]);
          }
        }
        
        // Fetch inventory items associated with this task
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('items')
          .select('*')
          .eq('associated_task_id', id);
          
        if (inventoryError) console.error('Error fetching inventory items:', inventoryError);
        else setInventoryItems(inventoryData || []);
        
        // Fetch badge if task has one
        if (taskData.badge_id) {
          const { data: badgeData, error: badgeError } = await supabase
            .from('badges')
            .select('id, title, description, image_url')
            .eq('id', taskData.badge_id)
            .single();
            
          if (badgeError) {
            console.error('Error fetching badge:', badgeError);
          } else if (badgeData) {
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
        
        // If task is done, check who completed it
        if (taskData.status === 'done' && taskData.assignees && taskData.assignees.length > 0) {
          // Assume the first assignee completed it (this is a simplification)
          const { data: completerProfile, error: completerError } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .eq('user_id', taskData.assignees[0])
            .single();
            
          if (!completerError && completerProfile) {
            setCompletedBy({
              id: completerProfile.user_id,
              name: completerProfile.name || 'Team Member',
              email: completerProfile.email || ''
            });
          }
        }
        
      } catch (err) {
        console.error('Error fetching task details:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while loading the task');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchTask();
  }, [id, user]);
  
  const handleDelete = async () => {
    if (!task || !user) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);
        
      if (error) throw error;
      
      // Navigate back to tasks list or project tasks
      if (task.is_project_task && task.project_id) {
        navigate(`/projects/${task.project_id}/tasks`);
      } else {
        navigate('/tasks');
      }
      
    } catch (err) {
      console.error('Error deleting task:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while deleting the task');
      }
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };
  
  const handleCompleteTask = async () => {
    if (!task || !user) return;
    
    setCompleting(true);
    try {
      // Update task status to done
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          status: 'done',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
        
      if (updateError) throw updateError;
      
      // If task has a badge and doesn't require verification (or user is creator)
      if (task.badge_id && (!task.completion_verification || task.created_by === user.id)) {
        await awardBadge();
      }
      
      // Update local state
      setTask({
        ...task,
        status: 'done'
      });
      
      setShowCompleteConfirm(false);
      
      // If verification is required and user is not the creator, show verification message
      if (task.completion_verification && task.created_by !== user.id) {
        setShowVerificationOptions(true);
      }
      
    } catch (err) {
      console.error('Error completing task:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while completing the task');
      }
    } finally {
      setCompleting(false);
    }
  };
  
  const handleVerifyCompletion = async (approved: boolean) => {
    if (!task || !user || !task.badge_id) return;
    
    setVerifying(true);
    try {
      if (approved) {
        // Award badge to the assignee who completed the task
        await awardBadge();
      }
      
      // Hide verification options
      setShowVerificationOptions(false);
      
    } catch (err) {
      console.error('Error verifying task completion:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while verifying task completion');
      }
    } finally {
      setVerifying(false);
    }
  };
  
  const awardBadge = async () => {
    if (!task || !user || !task.badge_id) return;
    
    try {
      // Determine who gets the badge (assignee or current user)
      const recipientId = task.assignees && task.assignees.length > 0 
        ? task.assignees[0] 
        : user.id;
      
      // Check if user already has this badge
      const { data: existingBadge, error: checkError } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', recipientId)
        .eq('badge_id', task.badge_id)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      // If user doesn't have the badge yet, award it
      if (!existingBadge) {
        const { error: awardError } = await supabase
          .from('user_badges')
          .insert({
            user_id: recipientId,
            badge_id: task.badge_id,
            task_id: task.id,
            earned_at: new Date().toISOString()
          });
          
        if (awardError) throw awardError;
        
        // Update local state if current user earned the badge
        if (recipientId === user.id) {
          setUserHasBadge(true);
        }
      }
      
    } catch (err) {
      console.error('Error awarding badge:', err);
      throw err;
    }
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200';
      case 'done':
        return 'bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200';
      case 'blocked':
        return 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };
  
  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200';
      case 'medium':
        return 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200';
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };
  
  // Format status for display
  const formatStatus = (status: string) => {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'in_progress':
        return 'In Progress';
      case 'done':
        return 'Done';
      case 'blocked':
        return 'Blocked';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 dark:border-green-400"></div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <div className="mt-4">
          <button
            onClick={() => navigate('/tasks')}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Return to Tasks
          </button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded">
        Task not found. It may have been deleted or you don't have access.
      </div>
    );
  }

  // Format date for display
  const formattedDueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
    
  const formattedCreatedDate = new Date(task.created_at).toLocaleDateString('en-US', {
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
              <h3 className="text-xl font-bold">Delete Task</h3>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-300">Are you sure you want to delete this task? This action cannot be undone.</p>
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
                    Delete Task
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Complete Task Confirmation Modal */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 transform transition-all duration-300 ease-in-out">
            <div className="flex items-center text-green-600 dark:text-green-400 mb-4">
              <CheckCircle className="h-6 w-6 mr-2" />
              <h3 className="text-xl font-bold">Complete Task</h3>
            </div>
            <p className="mb-4 text-gray-600 dark:text-gray-300">
              Are you sure you want to mark this task as complete?
            </p>
            
            {badge && (
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center">
                {badge.image_url ? (
                  <img 
                    src={badge.image_url} 
                    alt={badge.title} 
                    className="h-12 w-12 object-contain mr-3"
                  />
                ) : (
                  <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-3">
                    <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    You'll earn the "{badge.title}" badge!
                  </p>
                  {task.completion_verification && task.created_by !== user.id && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      Note: The task creator must verify completion before the badge is awarded.
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 font-medium"
                disabled={completing}
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteTask}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center font-medium shadow-sm"
                disabled={completing}
              >
                {completing ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Task
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Verification Options Modal */}
      {showVerificationOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 transform transition-all duration-300 ease-in-out">
            <div className="flex items-center text-blue-600 dark:text-blue-400 mb-4">
              <Award className="h-6 w-6 mr-2" />
              <h3 className="text-xl font-bold">Verification Required</h3>
            </div>
            
            {task.created_by === user.id && completedBy && (
              <>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  <span className="font-medium">{completedBy.name}</span> has completed this task. 
                  Since verification is required, you need to approve before awarding the badge.
                </p>
                
                {badge && (
                  <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center">
                    {badge.image_url ? (
                      <img 
                        src={badge.image_url} 
                        alt={badge.title} 
                        className="h-12 w-12 object-contain mr-3"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-3">
                        <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">
                        "{badge.title}" badge will be awarded upon approval
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => handleVerifyCompletion(false)}
                    className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 font-medium flex items-center"
                    disabled={verifying}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleVerifyCompletion(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center font-medium shadow-sm"
                    disabled={verifying}
                  >
                    {verifying ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
            
            {task.created_by !== user.id && (
              <>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  You've marked this task as complete. The task creator needs to verify your completion before the badge is awarded.
                </p>
                
                {badge && (
                  <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center">
                    {badge.image_url ? (
                      <img 
                        src={badge.image_url} 
                        alt={badge.title} 
                        className="h-12 w-12 object-contain mr-3"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-3">
                        <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">
                        "{badge.title}" badge pending verification
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowVerificationOptions(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium shadow-sm"
                  >
                    Understood
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center">
              <CheckSquare className="h-6 w-6 mr-2 text-green-600 dark:text-green-400" />
              {task.title}
            </h1>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                {formatStatus(task.status)}
              </span>
              
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
              </span>
              
              {badge && (
                <span className="bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <Award className="h-3.5 w-3.5 mr-1" />
                  Awards Badge
                </span>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Link
              to={`/tasks/edit/${task.id}`}
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
        </div>
        
        {/* Complete Task Button */}
        {task.status !== 'done' && (
          <div className="mb-6">
            <button
              onClick={() => setShowCompleteConfirm(true)}
              className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors shadow-sm flex items-center"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Mark as Complete
            </button>
          </div>
        )}
        
        {/* Badge Display */}
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
                  Complete this task to earn the "{badge.title}" badge
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
                
                {task.completion_verification && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                    Requires verification from task creator
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {task.description && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Description</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{task.description}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Details</h2>
            
            <div className="space-y-3">
              {formattedDueDate && (
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
                    <p className="text-gray-700 dark:text-gray-300">{formattedDueDate}</p>
                  </div>
                </div>
              )}
              
              {task.is_project_task && projectName && (
                <div className="flex items-start">
                  <Folder className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                    <Link 
                      to={`/projects/${task.project_id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {projectName}
                    </Link>
                  </div>
                </div>
              )}
              
              <div className="flex items-start">
                <Clock className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created On</p>
                  <p className="text-gray-700 dark:text-gray-300">{formattedCreatedDate}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                <Users className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
                Assignees
              </h2>
            </div>
            
            {assignees.length > 0 ? (
              <MemberList 
                members={assignees}
                isEditable={false}
              />
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No assignees for this task</p>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Related Inventory</h2>
            <Link 
              to={`/inventory/new?task_id=${task.id}`}
              className="text-sm bg-green-600 dark:bg-green-700 text-white px-3 py-1 rounded hover:bg-green-700 dark:hover:bg-green-600 flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Link>
          </div>
          
          {inventoryItems.length > 0 ? (
            <div className="space-y-3">
              {inventoryItems.map(item => (
                <Link
                  key={item.id}
                  to={`/inventory/${item.id}`}
                  className="block bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start">
                    <Package className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{item.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">{item.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No inventory items associated with this task.</p>
          )}
        </div>
        
        <div className="flex justify-between mt-8">
          <Link
            to="/tasks"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            ← Back to All Tasks
          </Link>
          
          {task.is_project_task && task.project_id && (
            <Link
              to={`/projects/${task.project_id}/tasks`}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              Back to Project Tasks
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailView;