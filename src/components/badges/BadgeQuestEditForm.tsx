import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Award, Save, CheckSquare, Plus, Trash2, ArrowLeft, Info } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
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

const BadgeQuestEditForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [requiredTasksCount, setRequiredTasksCount] = useState(1);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!id || !user) return;
    
    const fetchQuestAndData = async () => {
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
        
        // Set form values
        setTitle(questData.title);
        setDescription(questData.description || '');
        setBadgeId(questData.badge_id || '');
        setRequiredTasksCount(questData.required_tasks_count);
        
        // Fetch quest tasks
        const { data: questTasksData, error: questTasksError } = await supabase
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
          
        if (questTasksError) throw questTasksError;
        
        // Extract tasks from quest tasks
        const tasks = questTasksData?.map(qt => ({
          id: qt.task.id,
          title: qt.task.title,
          description: qt.task.description,
          status: qt.task.status
        })) || [];
        
        setSelectedTasks(tasks);
        
        // Fetch available tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('id, title, description, status')
          .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
          .order('created_at', { ascending: false });
          
        if (tasksError) throw tasksError;
        
        setAvailableTasks(tasksData || []);
        
        // Fetch badges
        const { data: badgesData, error: badgesError } = await supabase
          .from('badges')
          .select('id, title, description, image_url')
          .order('title', { ascending: true });
          
        if (badgesError) throw badgesError;
        
        setBadges(badgesData || []);
        
      } catch (err) {
        console.error('Error fetching quest data:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while loading the quest');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestAndData();
  }, [id, user]);

  const handleAddTask = (task: Task) => {
    if (!selectedTasks.some(t => t.id === task.id)) {
      setSelectedTasks([...selectedTasks, task]);
    }
  };

  const handleRemoveTask = (taskId: string) => {
    setSelectedTasks(selectedTasks.filter(task => task.id !== taskId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    
    if (selectedTasks.length === 0) {
      setError('Please select at least one task for the quest');
      return;
    }

    if (requiredTasksCount > selectedTasks.length) {
      setError(`Required tasks count cannot be greater than the number of selected tasks (${selectedTasks.length})`);
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update the badge quest
      const { error: questError } = await supabase
        .from('badge_quests')
        .update({
          title,
          description: description || null,
          badge_id: badgeId || null,
          required_tasks_count: requiredTasksCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (questError) throw questError;
      
      // Delete existing quest tasks
      const { error: deleteError } = await supabase
        .from('badge_quest_tasks')
        .delete()
        .eq('quest_id', id);
        
      if (deleteError) throw deleteError;
      
      // Add new tasks to the quest
      const questTasks = selectedTasks.map((task, index) => ({
        quest_id: id,
        task_id: task.id,
        order_position: index
      }));
      
      const { error: tasksError } = await supabase
        .from('badge_quest_tasks')
        .insert(questTasks);
        
      if (tasksError) throw tasksError;
      
      // Update user progress records if required tasks count changed
      const { error: progressError } = await supabase
        .from('user_quest_progress')
        .update({
          progress_percentage: 0, // Reset progress
          updated_at: new Date().toISOString()
        })
        .eq('quest_id', id);
        
      if (progressError) throw progressError;
      
      setSuccess('Badge quest updated successfully!');
      
      // Navigate to badge quest detail view after success
      setTimeout(() => {
        navigate(`/badge-quests/${id}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error updating badge quest:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update badge quest. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Filter tasks based on search query
  const filteredTasks = availableTasks.filter(task => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 dark:border-purple-400"></div>
      </div>
    );
  }

  if (error && !title) {
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="mb-6">
        <Link 
          to={`/badge-quests/${id}`}
          className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Quest
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
        <Award className="h-6 w-6 mr-2 text-purple-600 dark:text-purple-400" />
        Edit Badge Quest
      </h1>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="title">
            Quest Title *
          </label>
          <input
            id="title"
            type="text"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter quest title"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter quest description"
            rows={3}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="badgeId">
            Badge Reward
          </label>
          <select
            id="badgeId"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            value={badgeId}
            onChange={(e) => setBadgeId(e.target.value)}
          >
            <option value="">Select a badge (optional)</option>
            {badges.map(badge => (
              <option key={badge.id} value={badge.id}>{badge.title}</option>
            ))}
          </select>
          
          {badges.length === 0 && (
            <div className="mt-2 flex justify-between items-center">
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center">
                <Info className="h-4 w-4 mr-1" />
                No badges available. Create badges to award for quest completion.
              </p>
              <Link
                to="/badges/new"
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create Badge
              </Link>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="requiredTasksCount">
            Required Tasks to Complete
          </label>
          <div className="flex items-center">
            <input
              id="requiredTasksCount"
              type="number"
              min="1"
              max={selectedTasks.length || 1}
              className="w-24 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={requiredTasksCount}
              onChange={(e) => setRequiredTasksCount(Math.max(1, Math.min(parseInt(e.target.value) || 1, selectedTasks.length || 1)))}
            />
            <span className="ml-2 text-gray-600 dark:text-gray-300">
              out of {selectedTasks.length} selected tasks
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Users must complete this many tasks from the quest to earn the badge.
          </p>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium">
              Quest Tasks
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search tasks..."
                className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Available Tasks */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Available Tasks</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md h-64 overflow-y-auto p-2">
                {filteredTasks.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTasks
                      .filter(task => !selectedTasks.some(t => t.id === task.id))
                      .map(task => (
                        <div 
                          key={task.id}
                          className="p-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center"
                          onClick={() => handleAddTask(task)}
                        >
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-100">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{task.description}</p>
                            )}
                          </div>
                          <Plus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    {searchQuery ? "No matching tasks found" : "No available tasks"}
                  </div>
                )}
              </div>
            </div>
            
            {/* Selected Tasks */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Selected Tasks</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md h-64 overflow-y-auto p-2">
                {selectedTasks.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTasks.map((task, index) => (
                      <div 
                        key={task.id}
                        className="p-2 border border-purple-200 dark:border-purple-700 rounded-md bg-purple-50 dark:bg-purple-900/20 flex justify-between items-center"
                      >
                        <div className="flex items-center">
                          <span className="w-5 h-5 bg-purple-600 dark:bg-purple-700 text-white rounded-full flex items-center justify-center text-xs mr-2">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-100">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{task.description}</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(task.id)}
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <CheckSquare className="h-8 w-8 mb-2 text-gray-400 dark:text-gray-500" />
                    <p>No tasks selected</p>
                    <p className="text-xs">Add tasks from the left panel</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <button
            type="submit"
            className="bg-purple-600 dark:bg-purple-700 text-white py-2 px-6 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 flex items-center shadow-sm"
            disabled={saving || selectedTasks.length === 0}
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Changes
              </>
            )}
          </button>
          
          <button
            type="button"
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            onClick={() => navigate(`/badge-quests/${id}`)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default BadgeQuestEditForm;