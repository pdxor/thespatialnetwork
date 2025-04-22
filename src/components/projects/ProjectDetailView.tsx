import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  Users, 
  CalendarClock, 
  Edit, 
  Trash2,
  CircleDot,
  Droplets,
  Sprout,
  Zap,
  Building2,
  Target,
  AlertTriangle,
  FileText,
  CheckSquare,
  Package,
  Plus,
  UserPlus,
  Calendar,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  DollarSign
} from 'lucide-react';
import BusinessPlanGenerator from './BusinessPlanGenerator';
import ProjectMembersModal from './ProjectMembersModal';
import { generateWithOpenAI } from '../../lib/openai';
import { useAuth } from '../../context/AuthContext';
import BudgetTracker from '../inventory/BudgetTracker';

type Project = Database['public']['Tables']['projects']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type InventoryItem = Database['public']['Tables']['items']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

const ProjectDetailView: React.FC<{ projectId?: string }> = ({ projectId: propProjectId }) => {
  const { id: paramProjectId } = useParams();
  const projectId = propProjectId === ':id' ? paramProjectId : propProjectId;
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isProjectComplete, setIsProjectComplete] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'budget'>('overview');

  useEffect(() => {
    if (!projectId) return;

    const fetchProjectData = async () => {
      try {
        // Fetch project
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) {
          console.error('Error fetching project:', error);
          setError('Could not load project information');
        } else {
          setProject(data);
          // Check if project is at least 90% complete
          checkProjectCompletion(data);
          
          // Fetch related tasks
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('updated_at', { ascending: false })
            .limit(5);
            
          if (tasksError) {
            console.error('Error fetching tasks:', tasksError);
          } else {
            setTasks(tasksData || []);
          }
          
          // Fetch related inventory items
          const { data: itemsData, error: itemsError } = await supabase
            .from('items')
            .select('*')
            .eq('project_id', projectId)
            .order('updated_at', { ascending: false })
            .limit(5);
            
          if (itemsError) {
            console.error('Error fetching inventory items:', itemsError);
          } else {
            setItems(itemsData || []);
          }
          
          // Fetch related events
          const { data: eventsData, error: eventsError } = await supabase
            .from('events')
            .select('*')
            .eq('project_id', projectId)
            .order('start_date', { ascending: true })
            .limit(5);
            
          if (eventsError) {
            console.error('Error fetching events:', eventsError);
          } else {
            setEvents(eventsData || []);
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  // Check if project is at least 90% complete
  const checkProjectCompletion = (projectData: Project) => {
    // Define important fields to check for completion
    const requiredFields = [
      projectData.title,
      projectData.location,
      projectData.values_mission_goals,
      projectData.zone_0,
      projectData.zone_1,
      projectData.zone_2,
      projectData.zone_3,
      projectData.zone_4,
      projectData.water,
      projectData.soil,
      projectData.power,
    ];

    // Count non-empty fields
    const filledFields = requiredFields.filter(field => field && field.trim() !== '').length;
    
    // Check for array fields
    let arrayFieldsCount = 0;
    let filledArrayFields = 0;
    
    if (projectData.guilds) {
      arrayFieldsCount++;
      if (projectData.guilds.length > 0) filledArrayFields++;
    }
    
    if (projectData.structures) {
      arrayFieldsCount++;
      if (projectData.structures.length > 0) filledArrayFields++;
    }
    
    // Calculate total completion percentage
    const totalFields = requiredFields.length + arrayFieldsCount;
    const completedFields = filledFields + filledArrayFields;
    const completionPercentage = (completedFields / totalFields) * 100;
    
    // Project is considered complete if at least 90% of fields are filled
    setIsProjectComplete(completionPercentage >= 90);
  };

  const handleDelete = async () => {
    if (!project) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);
        
      if (error) {
        throw error;
      }
      
      // Navigate back to projects list
      navigate('/projects');
      
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project');
      setDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!user || !project) return;
    
    setGeneratingImage(true);
    setError(null);
    
    try {
      // Generate a prompt based on project details
      const imagePrompt = `A beautiful, realistic landscape image for a permaculture project called "${project.title}" ${project.location ? `located in ${project.location}` : ''}. The image should show a sustainable landscape with natural elements.`;
      
      const response = await generateWithOpenAI({
        userId: user.id,
        prompt: imagePrompt,
        fieldName: 'projectImage',
        maxTokens: 100
      });
      
      // The response should be a URL to an image
      if (response && response.startsWith('http')) {
        // Update the project with the new image URL
        const { error: updateError } = await supabase
          .from('projects')
          .update({ image_url: response })
          .eq('id', project.id);
          
        if (updateError) {
          throw updateError;
        }
        
        // Update the local state
        setProject(prev => prev ? { ...prev, image_url: response } : null);
      } else {
        throw new Error("Failed to generate image URL");
      }
    } catch (err) {
      console.error('Error generating image:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to generate image. Please try again.');
      }
    } finally {
      setGeneratingImage(false);
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

  if (!project) {
    return (
      <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 p-4 rounded-md">
        Project not found. It may have been deleted or you don't have access.
      </div>
    );
  }

  // Format dates
  const createdDate = new Date(project.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const updatedDate = new Date(project.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get project image URL
  const getProjectImage = () => {
    // If project has an image_url, use it
    if (project.image_url) {
      return project.image_url;
    }
    
    // Otherwise use a placeholder based on project ID
    const placeholderImages = [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80'
    ];
    
    // Use project id to consistently get the same image for a project
    const index = project.id.charCodeAt(0) % placeholderImages.length;
    return placeholderImages[index];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 transform transition-all duration-300 ease-in-out">
            <div className="flex items-center text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <h3 className="text-xl font-bold">Delete Project</h3>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-300">Are you sure you want to delete "{project.title}"? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(false)}
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
                    Delete Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showMembersModal && (
        <ProjectMembersModal 
          projectId={project.id} 
          onClose={() => setShowMembersModal(false)} 
        />
      )}
      
      <div className="relative">
        <div className="h-56 bg-gradient-to-r from-green-700 to-green-600 dark:from-teal-900 dark:to-teal-800 relative flex items-center justify-center overflow-hidden">
          {project.image_url && (
            <img 
              src={project.image_url} 
              alt={project.title}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          <h1 className="text-4xl font-bold text-white relative z-10 px-6 text-center">{project.title}</h1>
          <div className="absolute top-4 right-4 flex space-x-2">
            {!project.image_url && (
              <button 
                className="bg-white bg-opacity-20 text-white p-2 rounded-lg hover:bg-opacity-30 transition-colors"
                onClick={handleGenerateImage}
                disabled={generatingImage}
                title="Generate AI image"
              >
                {generatingImage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
              </button>
            )}
            <button 
              className="bg-white bg-opacity-20 text-white p-2 rounded-lg hover:bg-opacity-30 transition-colors"
              onClick={() => navigate(`/projects/edit/${project.id}`)}
            >
              <Edit className="h-5 w-5" />
            </button>
            <button 
              className="bg-white bg-opacity-20 text-white p-2 rounded-lg hover:bg-opacity-30 transition-colors"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-b-2 border-green-500 dark:border-green-400 text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`py-4 px-6 font-medium text-sm flex items-center ${
              activeTab === 'budget'
                ? 'border-b-2 border-green-500 dark:border-green-400 text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Budget
          </button>
        </nav>
      </div>
      
      <div className="p-8">
        {activeTab === 'overview' && (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className={`text-sm font-semibold inline-block py-1.5 px-3 rounded-full ${
                project.property_status === 'owned_land' 
                  ? 'text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/60' 
                  : 'text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/60'
              }`}>
                {project.property_status === 'owned_land' ? 'Owned Land' : 'Potential Property'}
              </span>
              
              {project.category && (
                <span className="text-sm font-semibold inline-block py-1.5 px-3 rounded-full text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/60">
                  {project.category}
                </span>
              )}
              
              <button
                onClick={() => setShowMembersModal(true)}
                className="text-sm font-semibold inline-block py-1.5 px-3 rounded-full text-purple-800 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/60 flex items-center hover:bg-purple-200 dark:hover:bg-purple-800/60 transition-colors"
              >
                <Users className="h-3.5 w-3.5 mr-1.5" />
                {project.team && project.team.length > 0 
                  ? `${project.team.length + 1} Members` 
                  : "Manage Team"}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              <div className="col-span-2">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Project Overview</h2>
                
                {project.location && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300 mb-3">
                    <MapPin className="h-5 w-5 mr-2 text-green-600 dark:text-teal-500" />
                    <span>{project.location}</span>
                  </div>
                )}
                
                <div className="flex items-center text-gray-600 dark:text-gray-300 mb-6">
                  <CalendarClock className="h-5 w-5 mr-2 text-green-600 dark:text-teal-500" />
                  <span>Created on {createdDate} • Last updated {updatedDate}</span>
                </div>
                
                {project.values_mission_goals && (
                  <div className="mb-8 bg-gray-50 dark:bg-gray-700/30 p-6 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Values, Mission & Goals</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{project.values_mission_goals}</p>
                  </div>
                )}
                
                {project.funding_needs && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Funding Needs</h3>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
                      <p className="text-gray-700 dark:text-gray-300">{project.funding_needs}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Guilds
                  </h3>
                  
                  {project.guilds && project.guilds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {project.guilds.map((guild, index) => (
                        <span key={index} className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-sm px-3 py-1.5 rounded-full">
                          {guild}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No guilds defined yet</p>
                  )}
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/30 p-6 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-green-600 dark:text-teal-500" />
                    Team Members
                  </h3>
                  
                  {project.team && project.team.length > 0 ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowMembersModal(true)}
                        className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between shadow-sm"
                      >
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-green-600 dark:text-teal-500" />
                          {project.team.length + 1} Team Members
                        </span>
                        <span className="text-green-600 dark:text-teal-500 text-sm">View All</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-gray-500 dark:text-gray-400 mb-3">No team members yet</p>
                      <button
                        onClick={() => setShowMembersModal(true)}
                        className="w-full flex items-center justify-center px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-green-600 dark:text-teal-500 shadow-sm"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Team Members
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Calendar Section */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                  <Calendar className="h-6 w-6 mr-2 text-purple-600 dark:text-purple-400" />
                  Calendar
                </h2>
                <Link
                  to={`/projects/${project.id}/calendar`}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-sm font-medium"
                >
                  View Calendar
                </Link>
              </div>
              
              {events.length > 0 || tasks.filter(t => t.due_date).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {events.slice(0, 3).map(event => (
                    <Link key={event.id} to={`/events/${event.id}`} className="block">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 h-full">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-gray-800 dark:text-gray-100">{event.title}</h3>
                          <span className={`text-xs px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200`}>
                            Event
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{event.description}</p>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                          {new Date(event.start_date).toLocaleDateString()} 
                          {event.start_time && (
                            <span className="ml-1">
                              at {event.start_time}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  {tasks.filter(t => t.due_date).slice(0, 3 - Math.min(events.length, 3)).map(task => (
                    <Link key={task.id} to={`/tasks/${task.id}`} className="block">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 h-full">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-gray-800 dark:text-gray-100">{task.title}</h3>
                          <span className={`text-xs px-2.5 py-1 rounded-full ${getStatusColor(task.status)}`}>
                            {formatStatus(task.status)}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{task.description}</p>
                        )}
                        {task.due_date && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  
                  <Link
                    to={`/events/new?project_id=${project.id}`}
                    className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5 h-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border-dashed"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Plus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Add to Calendar</span>
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-lg text-center border border-gray-200 dark:border-gray-700 border-dashed">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No calendar items yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Start planning your project timeline by adding events or tasks with due dates</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      to={`/events/new?project_id=${project.id}`}
                      className="inline-flex items-center px-5 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors shadow-sm font-medium"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Event
                    </Link>
                    <Link
                      to={`/tasks/new?project_id=${project.id}`}
                      className="inline-flex items-center px-5 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm font-medium"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Task
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* Tasks Section */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                  <CheckSquare className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                  Tasks
                </h2>
                <Link
                  to={`/projects/${project.id}/tasks`}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-sm font-medium"
                >
                  View All Tasks
                </Link>
              </div>
              
              {tasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {tasks.slice(0, 3).map(task => (
                    <Link key={task.id} to={`/tasks/${task.id}`} className="block">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 h-full">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-gray-800 dark:text-gray-100">{task.title}</h3>
                          <span className={`text-xs px-2.5 py-1 rounded-full ${getStatusColor(task.status)}`}>
                            {formatStatus(task.status)}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{task.description}</p>
                        )}
                        {task.due_date && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  <Link
                    to={`/tasks/new?project_id=${project.id}`}
                    className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5 h-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border-dashed"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Add New Task</span>
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-lg text-center border border-gray-200 dark:border-gray-700 border-dashed">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No tasks yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Start organizing your project by creating tasks</p>
                  <Link
                    to={`/tasks/new?project_id=${project.id}`}
                    className="inline-flex items-center px-5 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm font-medium"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create First Task
                  </Link>
                </div>
              )}
            </div>
            
            {/* Inventory Section */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                  <Package className="h-6 w-6 mr-2 text-green-600 dark:text-green-400" />
                  Inventory
                </h2>
                <Link
                  to={`/projects/${project.id}/inventory`}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-sm font-medium"
                >
                  View All Items
                </Link>
              </div>
              
              {items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.slice(0, 3).map(item => (
                    <Link key={item.id} to={`/inventory/${item.id}`} className="block">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 h-full">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-gray-800 dark:text-gray-100">{item.title}</h3>
                          <span className={`text-xs px-2.5 py-1 rounded-full ${getItemTypeColor(item.item_type)}`}>
                            {formatItemType(item.item_type)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{item.description}</p>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {getQuantityLabel(item)}
                        </div>
                        {item.price !== null && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                            <DollarSign className="h-3 w-3 mr-0.5" />
                            {formatCurrency(item.price, item.price_currency || 'USD')}
                            {item.estimated_price && <span className="ml-1">(est.)</span>}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  <Link
                    to={`/inventory/new?project_id=${project.id}`}
                    className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5 h-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border-dashed"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Plus className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">Add New Item</span>
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-lg text-center border border-gray-200 dark:border-gray-700 border-dashed">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No inventory items yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Start tracking your project resources by adding inventory items</p>
                  <Link
                    to={`/inventory/new?project_id=${project.id}`}
                    className="inline-flex items-center px-5 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors shadow-sm font-medium"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add First Item
                  </Link>
                </div>
              )}
            </div>
            
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-5">Permaculture Zones</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {project.zone_0 && (
                  <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-lg shadow-sm border border-red-200 dark:border-red-800/30">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                      <CircleDot className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
                      Zone 0 - House/Main Building
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">{project.zone_0}</p>
                  </div>
                )}
                
                {project.zone_1 && (
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-lg shadow-sm border border-orange-200 dark:border-orange-800/30">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                      <CircleDot className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                      Zone 1 - Frequent Attention
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">{project.zone_1}</p>
                  </div>
                )}
                
                {project.zone_2 && (
                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-6 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-800/30">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                      <CircleDot className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                      Zone 2 - Regular Attention
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">{project.zone_2}</p>
                  </div>
                )}
                
                {project.zone_3 && (
                  <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-lg shadow-sm border border-green-200 dark:border-green-800/30">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                      <CircleDot className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                      Zone 3 - Occasional Attention
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">{project.zone_3}</p>
                  </div>
                )}
                
                {project.zone_4 && (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800/30">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                      <CircleDot className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                      Zone 4 - Semi-Wild Areas
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">{project.zone_4}</p>
                  </div>
                )}
                
                {!project.zone_0 && !project.zone_1 && !project.zone_2 && !project.zone_3 && !project.zone_4 && (
                  <div className="col-span-2 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 border-dashed text-center">
                    <p className="text-gray-500 dark:text-gray-400">No zone information provided yet</p>
                    <Link 
                      to={`/projects/edit/${project.id}`}
                      className="inline-flex items-center mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Add zone information
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-5">Infrastructure</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {project.water && (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-700">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                      <Droplets className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                      Water Systems
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">{project.water}</p>
                  </div>
                )}
                
                {project.soil && (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:border-green-200 dark:hover:border-green-700">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                      <Sprout className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                      Soil Management
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">{project.soil}</p>
                  </div>
                )}
                
                {project.power && (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:border-yellow-200 dark:hover:border-yellow-700">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
                      <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                      Power Systems
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">{project.power}</p>
                  </div>
                )}
                
                {project.structures && project.structures.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:border-purple-200 dark:hover:border-purple-700">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                      <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
                      Structures
                    </h3>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                      {project.structures.map((structure, index) => (
                        <li key={index}>{structure}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {!project.water && !project.soil && !project.power && (!project.structures || project.structures.length === 0) && (
                  <div className="col-span-3 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 border-dashed text-center">
                    <p className="text-gray-500 dark:text-gray-400">No infrastructure information provided yet</p>
                    <Link 
                      to={`/projects/edit/${project.id}`}
                      className="inline-flex items-center mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Add infrastructure information
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* Business Plan Generator */}
            <BusinessPlanGenerator project={project} visible={isProjectComplete} />
            
            {/* If project is not complete enough, show message */}
            {!isProjectComplete && (
              <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-4">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Business Plan Generation
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Complete at least 90% of your project details to unlock the business plan generator.
                  This will create a comprehensive business plan you can download and share.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30">
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    <strong>Tip:</strong> Fill in all zone information, infrastructure details, and add at least a few guilds and structures to reach the 90% threshold.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        
        {activeTab === 'budget' && (
          <BudgetTracker projectId={project.id} />
        )}
      </div>
    </div>
  );
};

// Helper functions for task status colors and formatting
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

// Helper functions for inventory item type colors and formatting
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

const formatItemType = (type: string) => {
  switch (type) {
    case 'needed_supply':
      return 'Needed';
    case 'owned_resource':
      return 'Owned';
    case 'borrowed_or_rental':
      return 'Borrowed';
    default:
      return type;
  }
};

const getQuantityLabel = (item: InventoryItem) => {
  if (item.item_type === 'needed_supply' && item.quantity_needed !== null) {
    return `Needed: ${item.quantity_needed} ${item.unit || 'units'}`;
  }
  if (item.item_type === 'owned_resource' && item.quantity_owned !== null) {
    return `Owned: ${item.quantity_owned} ${item.unit || 'units'}`;
  }
  if (item.item_type === 'borrowed_or_rental' && item.quantity_borrowed !== null) {
    return `Borrowed: ${item.quantity_borrowed} ${item.unit || 'units'}`;
  }
  return '';
};

// Format currency
const formatCurrency = (amount: number | null, currency: string = 'USD') => {
  if (amount === null) return '';
  
  const currencySymbols: {[key: string]: string} = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
    JPY: '¥'
  };
  
  const symbol = currencySymbols[currency] || '$';
  
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default ProjectDetailView;