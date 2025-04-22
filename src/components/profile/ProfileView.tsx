import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { UserCircle, MapPin, Code, Flag, CalendarClock, Folder, CheckSquare, Package, Plus, Search, Calendar, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfileSetupForm from './ProfileSetupForm';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type Item = Database['public']['Tables']['items']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badges: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
  };
}

const ProfileView: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks' | 'inventory' | 'calendar' | 'badges'>('projects');

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        // Modified query to handle the case where no profile exists
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(); // Using maybeSingle() instead of single() to handle the no-rows case

        if (fetchError) {
          console.error('Error fetching profile:', fetchError);
          setError('Could not load profile information');
        } else {
          // data will be null if no profile exists
          setProfile(data);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    // Fetch user's projects
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .or(`created_by.eq.${user.id},team.cs.{${user.id}}`)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setProjectsLoading(false);
      }
    };
    
    // Fetch user's tasks
    const fetchTasks = async () => {
      try {
        setTasksLoading(true);
        const { data, error } = await supabase
          .from('tasks')
          .select('*, projects(title)')
          .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
          .order('due_date', { ascending: true })
          .order('priority', { ascending: false })
          .limit(5);
          
        if (error) throw error;
        
        setTasks(data || []);
      } catch (err) {
        console.error('Error fetching tasks:', err);
      } finally {
        setTasksLoading(false);
      }
    };
    
    // Fetch user's inventory items
    const fetchItems = async () => {
      try {
        setItemsLoading(true);
        const { data, error } = await supabase
          .from('items')
          .select('*, projects(title)')
          .eq('added_by', user.id)
          .order('updated_at', { ascending: false })
          .limit(5);
          
        if (error) throw error;
        
        setItems(data || []);
      } catch (err) {
        console.error('Error fetching inventory items:', err);
      } finally {
        setItemsLoading(false);
      }
    };
    
    // Fetch user's events
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        const { data, error } = await supabase
          .from('events')
          .select('*, projects(title)')
          .or(`created_by.eq.${user.id},attendees.cs.{${user.id}}`)
          .order('start_date', { ascending: true })
          .limit(5);
          
        if (error) throw error;
        
        setEvents(data || []);
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setEventsLoading(false);
      }
    };
    
    // Fetch user's badges
    const fetchUserBadges = async () => {
      try {
        setBadgesLoading(true);
        const { data, error } = await supabase
          .from('user_badges')
          .select(`
            id,
            badge_id,
            earned_at,
            badges (
              id,
              title,
              description,
              image_url
            )
          `)
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false });
          
        if (error) throw error;
        
        setUserBadges(data || []);
      } catch (err) {
        console.error('Error fetching user badges:', err);
      } finally {
        setBadgesLoading(false);
      }
    };

    fetchProfile();
    fetchProjects();
    fetchTasks();
    fetchItems();
    fetchEvents();
    fetchUserBadges();
  }, [user]);

  // Get status color for tasks
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

  // Get item type color
  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'needed_supply':
        return 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200';
      case 'owned_resource':
        return 'bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200';
      case 'borrowed_or_rental':
        return 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };
  
  // Format item type for display
  const formatItemType = (type: string) => {
    switch (type) {
      case 'needed_supply':
        return 'Needed Supply';
      case 'owned_resource':
        return 'Owned Resource';
      case 'borrowed_or_rental':
        return 'Borrowed/Rental';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 dark:border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md">
        {error}
      </div>
    );
  }

  // If no profile exists, show the profile setup form
  if (!profile) {
    return <ProfileSetupForm />;
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-700 to-green-600 dark:from-teal-900 dark:to-teal-800 h-32 relative"></div>
        
        <div className="px-6 py-4 relative">
          <div className="absolute -top-16 left-6 bg-white dark:bg-gray-800 p-1 rounded-full">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-teal-800 dark:to-teal-700 flex items-center justify-center">
                <UserCircle className="h-20 w-20 text-green-500 dark:text-teal-400" />
              </div>
            )}
          </div>
          
          <div className="mt-16 flex flex-col md:flex-row md:justify-between md:items-start">
            <div className="mb-6 md:mb-0">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{profile.name}</h1>
              
              <div className="flex items-center text-gray-500 dark:text-gray-400 mt-1">
                <MapPin className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
                <span>{profile.location || 'No location set'}</span>
              </div>
              
              <div className="flex items-center text-gray-500 dark:text-gray-400 mt-1">
                <CalendarClock className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
                <span>Joined {new Date(profile.joined_at).toLocaleDateString()}</span>
              </div>
              
              <div className="mt-4">
                <Link 
                  to="/profile/edit" 
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-sm"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {profile.skills && profile.skills.length > 0 && profile.skills.map((skill, index) => (
                <span 
                  key={index}
                  className="bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-sm flex items-center"
                >
                  <Code className="h-3 w-3 mr-1" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.short_term_mission && (
              <div>
                <h3 className="text-md font-medium text-gray-600 dark:text-gray-300 flex items-center">
                  <Flag className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                  Short-term Mission
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mt-1">
                  {profile.short_term_mission}
                </p>
              </div>
            )}
            
            {profile.long_term_mission && (
              <div>
                <h3 className="text-md font-medium text-gray-600 dark:text-gray-300 flex items-center">
                  <Flag className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                  Long-term Mission
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mt-1">
                  {profile.long_term_mission}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Activity Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap">
            <button
              className={`py-4 px-6 text-sm font-medium flex items-center ${
                activeTab === 'projects' 
                  ? 'border-b-2 border-green-600 dark:border-teal-500 text-green-600 dark:text-teal-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('projects')}
            >
              <Folder className="h-4 w-4 mr-2" />
              Projects ({projects.length})
            </button>
            <button
              className={`py-4 px-6 text-sm font-medium flex items-center ${
                activeTab === 'tasks' 
                  ? 'border-b-2 border-green-600 dark:border-teal-500 text-green-600 dark:text-teal-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('tasks')}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Tasks ({tasks.length})
            </button>
            <button
              className={`py-4 px-6 text-sm font-medium flex items-center ${
                activeTab === 'calendar' 
                  ? 'border-b-2 border-green-600 dark:border-teal-500 text-green-600 dark:text-teal-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('calendar')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Calendar ({events.length})
            </button>
            <button
              className={`py-4 px-6 text-sm font-medium flex items-center ${
                activeTab === 'inventory' 
                  ? 'border-b-2 border-green-600 dark:border-teal-500 text-green-600 dark:text-teal-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('inventory')}
            >
              <Package className="h-4 w-4 mr-2" />
              Inventory ({items.length})
            </button>
            <button
              className={`py-4 px-6 text-sm font-medium flex items-center ${
                activeTab === 'badges' 
                  ? 'border-b-2 border-green-600 dark:border-teal-500 text-green-600 dark:text-teal-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('badges')}
            >
              <Award className="h-4 w-4 mr-2" />
              Badges ({userBadges.length})
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Projects Tab Content */}
          {activeTab === 'projects' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                  <Folder className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  My Projects
                </h2>
                <Link 
                  to="/projects/new"
                  className="bg-green-600 dark:bg-teal-700 text-white text-sm py-1 px-3 rounded-md hover:bg-green-700 dark:hover:bg-teal-600 inline-flex items-center shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Project
                </Link>
              </div>
              
              {projectsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 dark:border-teal-500"></div>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Folder className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No projects yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Start your sustainability journey by creating your first project.</p>
                  <Link
                    to="/projects/new"
                    className="inline-flex items-center bg-green-600 dark:bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:hover:bg-teal-600 shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Project
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.slice(0, 6).map(project => (
                      <Link key={project.id} to={`/projects/${project.id}`} className="block">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-800 dark:text-gray-100">{project.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              project.property_status === 'owned_land' 
                                ? 'bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200' 
                                : 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200'
                            }`}>
                              {project.property_status === 'owned_land' ? 'Owned' : 'Potential'}
                            </span>
                          </div>
                          
                          {project.location && (
                            <div className="text-gray-600 dark:text-gray-300 text-sm mb-2 flex items-center">
                              <MapPin className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500" />
                              {project.location}
                            </div>
                          )}
                          
                          {project.category && (
                            <span className="inline-block bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs px-2 py-0.5 rounded-full mt-1">
                              {project.category}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  {projects.length > 6 && (
                    <div className="mt-4 text-center">
                      <Link to="/projects" className="text-blue-600 dark:text-blue-400 hover:underline">
                        See all projects ({projects.length})
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Tasks Tab Content */}
          {activeTab === 'tasks' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                  <CheckSquare className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                  My Tasks
                </h2>
                <Link 
                  to="/tasks/new"
                  className="bg-green-600 dark:bg-teal-700 text-white text-sm py-1 px-3 rounded-md hover:bg-green-700 dark:hover:bg-teal-600 inline-flex items-center shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Task
                </Link>
              </div>
              
              {tasksLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 dark:border-teal-500"></div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <CheckSquare className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No tasks yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Get organized by creating your first task.</p>
                  <Link
                    to="/tasks/new"
                    className="inline-flex items-center bg-green-600 dark:bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:hover:bg-teal-600 shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Task
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {tasks.map(task => (
                      <Link key={task.id} to={`/tasks/${task.id}`} className="block">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium text-gray-800 dark:text-gray-100">{task.title}</h3>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                                {formatStatus(task.status)}
                              </span>
                            </div>
                          </div>
                          
                          {task.description && (
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{task.description}</p>
                          )}
                          
                          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                            <div>
                              {task.due_date && (
                                <span className="flex items-center">
                                  <Calendar className="h-3.5 w-3.5 mr-1" />
                                  {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            
                            {task.projects && (
                              <span className="flex items-center">
                                <Folder className="h-3.5 w-3.5 mr-1" />
                                {(task.projects as any).title}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  {tasks.length > 5 && (
                    <div className="mt-4 text-center">
                      <Link to="/tasks" className="text-blue-600 dark:text-blue-400 hover:underline">
                        See all tasks
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Calendar Tab Content */}
          {activeTab === 'calendar' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                  My Calendar
                </h2>
                <Link 
                  to="/events/new"
                  className="bg-purple-600 dark:bg-purple-700 text-white text-sm py-1 px-3 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 inline-flex items-center shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add to Calendar
                </Link>
              </div>
              
              {eventsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500 dark:border-purple-400"></div>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No calendar items yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Start planning by adding events to your calendar.</p>
                  <Link
                    to="/events/new"
                    className="inline-flex items-center bg-purple-600 dark:bg-purple-700 text-white px-4 py-2 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add to Calendar
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {events.map(event => (
                      <Link key={event.id} to={`/events/${event.id}`} className="block">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium text-gray-800 dark:text-gray-100">{event.title}</h3>
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: event.color || (event.is_project_event ? '#4f46e5' : '#10b981') }}
                            ></div>
                          </div>
                          
                          <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm mb-2">
                            <Calendar className="h-4 w-4 mr-1.5 text-gray-400 dark:text-gray-500" />
                            <span>
                              {new Date(event.start_date).toLocaleDateString()}
                              {event.start_time && !event.all_day && (
                                <span className="ml-1">at {event.start_time}</span>
                              )}
                              {event.all_day && (
                                <span className="ml-1">(All day)</span>
                              )}
                            </span>
                          </div>
                          
                          {event.location && (
                            <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm mb-2">
                              <MapPin className="h-4 w-4 mr-1.5 text-gray-400 dark:text-gray-500" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          
                          {event.projects && (
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <Folder className="h-3.5 w-3.5 mr-1" />
                              {(event.projects as any).title}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  {events.length > 5 && (
                    <div className="mt-4 text-center">
                      <Link to="/calendar" className="text-blue-600 dark:text-blue-400 hover:underline">
                        See full calendar
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Inventory Tab Content */}
          {activeTab === 'inventory' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                  My Inventory
                </h2>
                <Link 
                  to="/inventory/new"
                  className="bg-green-600 dark:bg-teal-700 text-white text-sm py-1 px-3 rounded-md hover:bg-green-700 dark:hover:bg-teal-600 inline-flex items-center shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Link>
              </div>
              
              {itemsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 dark:border-teal-500"></div>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No inventory items yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Start tracking project resources by adding inventory items.</p>
                  <Link
                    to="/inventory/new"
                    className="inline-flex items-center bg-green-600 dark:bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:hover:bg-teal-600 shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(item => (
                      <Link key={item.id} to={`/inventory/${item.id}`} className="block">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-800 dark:text-gray-100 line-clamp-2">{item.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${getItemTypeColor(item.item_type)}`}>
                              {formatItemType(item.item_type)}
                            </span>
                          </div>
                          
                          {item.description && (
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">{item.description}</p>
                          )}
                          
                          {item.projects && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                              <Folder className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-gray-500" />
                              {(item.projects as any).title}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  {items.length > 6 && (
                    <div className="mt-4 text-center">
                      <Link to="/inventory" className="text-blue-600 dark:text-blue-400 hover:underline">
                        See all inventory items
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Badges Tab Content */}
          {activeTab === 'badges' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                  My Badges
                </h2>
                <Link 
                  to="/badges"
                  className="bg-purple-600 dark:bg-purple-700 text-white text-sm py-1 px-3 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 inline-flex items-center shadow-sm"
                >
                  <Award className="h-4 w-4 mr-1" />
                  View All Badges
                </Link>
              </div>
              
              {badgesLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500 dark:border-purple-400"></div>
                </div>
              ) : userBadges.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Award className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No badges earned yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Complete tasks that award badges to earn them and show off your achievements!</p>
                  <Link
                    to="/tasks"
                    className="inline-flex items-center bg-purple-600 dark:bg-purple-700 text-white px-4 py-2 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 shadow-sm"
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    View Available Tasks
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userBadges.slice(0, 6).map(userBadge => (
                      <Link key={userBadge.id} to={`/badges/${userBadge.badge_id}`} className="block">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-purple-200 dark:border-purple-700 p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-2">
                            {userBadge.badges.image_url ? (
                              <img 
                                src={userBadge.badges.image_url} 
                                alt={userBadge.badges.title} 
                                className="h-12 w-12 object-contain mr-3"
                              />
                            ) : (
                              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-3">
                                <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium text-gray-800 dark:text-gray-100">{userBadge.badges.title}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Earned on {new Date(userBadge.earned_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          {userBadge.badges.description && (
                            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mt-2">
                              {userBadge.badges.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  {userBadges.length > 6 && (
                    <div className="mt-4 text-center">
                      <Link to="/user-badges" className="text-blue-600 dark:text-blue-400 hover:underline">
                        See all badges ({userBadges.length})
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;