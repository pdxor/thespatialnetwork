import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { CheckSquare, Calendar, AlertCircle, Clock, Folder, Save, User, ArrowLeft, Users, UserPlus, Award, Plus } from 'lucide-react';
import MemberSearch from '../common/MemberSearch';
import MemberList from '../common/MemberList';

type Project = Database['public']['Tables']['projects']['Row'];

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

const TaskCreateForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get project_id from query params if present
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromQuery = queryParams.get('project_id');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done' | 'blocked'>('todo');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [isProjectTask, setIsProjectTask] = useState(projectIdFromQuery ? true : false);
  const [projectId, setProjectId] = useState(projectIdFromQuery || '');
  const [assignees, setAssignees] = useState<Member[]>([]);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [requireVerification, setRequireVerification] = useState(false);
  const [badgeId, setBadgeId] = useState('');
  const [badges, setBadges] = useState<Badge[]>([]);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<Project | null>(null);
  
  // Fetch user's projects
  useEffect(() => {
    if (!user) return;
    
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .or(`created_by.eq.${user.id},team.cs.{${user.id}}`)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        setProjects(data || []);
        
        // If project ID was passed via query params, fetch project details
        if (projectIdFromQuery) {
          const project = data?.find(p => p.id === projectIdFromQuery);
          if (project) {
            setProjectDetails(project);
          }
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    
    fetchProjects();
  }, [user, projectIdFromQuery]);

  // Fetch current user's profile to add as default assignee
  useEffect(() => {
    if (!user) return;
    
    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setAssignees([{
            id: user.id,
            name: data.name || 'Me',
            email: data.email || ''
          }]);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  // Fetch available badges
  useEffect(() => {
    if (!user) return;
    
    const fetchBadges = async () => {
      try {
        const { data, error } = await supabase
          .from('badges')
          .select('id, title, description, image_url')
          .order('title', { ascending: true });
          
        if (error) throw error;
        
        setBadges(data || []);
      } catch (err) {
        console.error('Error fetching badges:', err);
      }
    };
    
    fetchBadges();
  }, [user]);
  
  const handleAddAssignee = (member: Member) => {
    if (!assignees.some(a => a.id === member.id)) {
      setAssignees([...assignees, member]);
    }
    setShowMemberSearch(false);
  };
  
  const handleRemoveAssignee = (id: string) => {
    setAssignees(assignees.filter(a => a.id !== id));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Task data
      const taskData = {
        title,
        description: description || null,
        status,
        priority,
        due_date: dueDate || null,
        is_project_task: isProjectTask,
        project_id: isProjectTask && projectId ? projectId : null,
        assigned_to: assignees.length > 0 ? assignees[0].id : null, // Primary assignee
        assignees: assignees.map(a => a.id), // All assignees
        created_by: user.id,
        badge_id: badgeId || null,
        completion_verification: requireVerification
      };
      
      // Insert task into database
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select('id')
        .single();
        
      if (error) throw error;
      
      setSuccess('Task created successfully!');
      
      // Navigate to appropriate page after success
      setTimeout(() => {
        if (isProjectTask && projectId) {
          navigate(`/projects/${projectId}/tasks`);
        } else {
          navigate('/tasks');
        }
      }, 1500);
      
    } catch (err) {
      console.error('Error creating task:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while creating the task');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Back link to project if coming from a project page */}
      {projectIdFromQuery && projectDetails && (
        <div className="mb-6">
          <Link 
            to={`/projects/${projectIdFromQuery}`}
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to {projectDetails.title}
          </Link>
        </div>
      )}
      
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
        <CheckSquare className="h-6 w-6 mr-2 text-green-600 dark:text-green-400" />
        Create New Task
        {projectDetails && (
          <span className="ml-2 text-lg text-gray-500 dark:text-gray-400">for {projectDetails.title}</span>
        )}
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
            Task Title *
          </label>
          <input
            id="title"
            type="text"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description (optional)"
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="status">
              Status *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <select
                id="status"
                className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                required
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
              <div className="absolute right-3 top-3 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="priority">
              Priority *
            </label>
            <div className="relative">
              <AlertCircle className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <select
                id="priority"
                className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <div className="absolute right-3 top-3 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="dueDate">
            Due Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <input
              id="dueDate"
              type="date"
              className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <input
              id="isProjectTask"
              type="checkbox"
              className="h-4 w-4 text-green-500 dark:text-green-400 focus:ring-green-400 dark:focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
              checked={isProjectTask}
              onChange={(e) => {
                setIsProjectTask(e.target.checked);
                if (!e.target.checked) {
                  setProjectId('');
                } else if (projectIdFromQuery) {
                  setProjectId(projectIdFromQuery);
                }
              }}
            />
            <label className="ml-2 block text-gray-700 dark:text-gray-200 text-sm font-medium" htmlFor="isProjectTask">
              This is a project task
            </label>
          </div>
          
          {isProjectTask && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-md border border-gray-200 dark:border-gray-700">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="projectId">
                Associated Project *
              </label>
              <div className="relative">
                <Folder className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <select
                  id="projectId"
                  className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required={isProjectTask}
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {projects.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  You don't have any projects yet. Create a project first to assign this task.
                </p>
              )}
              
              {projectId && (
                <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                  This task will be associated with the selected project.
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2 flex justify-between">
            <span>Assignees</span>
            {!showMemberSearch && (
              <button 
                type="button" 
                onClick={() => setShowMemberSearch(true)}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm flex items-center"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add Assignee
              </button>
            )}
          </label>
          
          {showMemberSearch ? (
            <div className="mb-4">
              <MemberSearch 
                onSelect={handleAddAssignee}
                excludeIds={assignees.map(a => a.id)}
                placeholder="Search by email address..."
              />
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowMemberSearch(false)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          
          <MemberList 
            members={assignees}
            onRemove={handleRemoveAssignee}
            onAdd={() => setShowMemberSearch(true)}
            emptyMessage="No assignees selected"
          />
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            The first assignee will be the primary person responsible for this task.
          </p>
        </div>
        
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center mb-4">
            <Award className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200">Badge Reward</h3>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="badgeId">
              Award Badge on Completion
            </label>
            <div className="relative">
              <Award className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <select
                id="badgeId"
                className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
              >
                <option value="">No badge (optional)</option>
                {badges.map(badge => (
                  <option key={badge.id} value={badge.id}>{badge.title}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {badges.length === 0 && (
              <div className="mt-2 flex justify-between items-center">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  No badges available. Create badges to award for task completion.
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
          
          <div className="flex items-center">
            <input
              id="requireVerification"
              type="checkbox"
              className="h-4 w-4 text-purple-500 dark:text-purple-400 focus:ring-purple-400 dark:focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
              checked={requireVerification}
              onChange={(e) => setRequireVerification(e.target.checked)}
            />
            <label className="ml-2 block text-gray-700 dark:text-gray-200 text-sm" htmlFor="requireVerification">
              Require verification from task creator to award badge
            </label>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            When a task is completed, the assigned badge will be awarded to the user who completed it.
            {requireVerification && " The task creator must verify completion before the badge is awarded."}
          </p>
        </div>
        
        <div className="flex justify-between">
          <button
            type="submit"
            className="bg-green-600 dark:bg-green-700 text-white py-2 px-6 rounded-md hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 flex items-center shadow-sm"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Create Task
              </>
            )}
          </button>
          
          <button
            type="button"
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskCreateForm;