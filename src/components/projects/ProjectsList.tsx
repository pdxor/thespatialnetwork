import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import ProjectCard from './ProjectCard';
import { Loader2, Plus, Search, Filter, X, Leaf, Sparkles } from 'lucide-react';
import { generateWithOpenAI } from '../../lib/openai';

type Project = Database['public']['Tables']['projects']['Row'];

const ProjectsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'owned_land' | 'potential_property'>('all');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      try {
        // Fetch projects where the user is either the creator or a team member
        let query = supabase
          .from('projects')
          .select('*')
          .or(`created_by.eq.${user.id},team.cs.{${user.id}}`)
          .order('updated_at', { ascending: false });
        
        const { data, error } = await query;

        if (error) {
          console.error('Error fetching projects:', error);
          setError('Could not load projects');
        } else {
          setProjects(data || []);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  // Filter and search projects
  const filteredProjects = projects.filter(project => {
    // Apply status filter
    if (filterStatus !== 'all' && project.property_status !== filterStatus) {
      return false;
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        project.title.toLowerCase().includes(query) ||
        (project.location && project.location.toLowerCase().includes(query)) ||
        (project.category && project.category.toLowerCase().includes(query)) ||
        (project.values_mission_goals && project.values_mission_goals.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  const handleGenerateImage = async (project: Project) => {
    if (!user) return;
    
    setSelectedProject(project);
    setGeneratingImage(true);
    
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
        setProjects(prevProjects => 
          prevProjects.map(p => 
            p.id === project.id ? { ...p, image_url: response } : p
          )
        );
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
      setSelectedProject(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-green-500 dark:text-teal-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Your Projects</h1>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search projects..."
              className="pl-10 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-teal-500 focus:border-green-500 dark:focus:border-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          <div className="relative flex-grow sm:flex-grow-0">
            <Filter className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <select
              className="pl-10 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-teal-500 focus:border-green-500 dark:focus:border-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 shadow-sm appearance-none pr-10"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">All Properties</option>
              <option value="owned_land">Owned Land</option>
              <option value="potential_property">Potential Property</option>
            </select>
            <div className="absolute right-3 top-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          <Link
            to="/projects/new"
            className="flex items-center justify-center bg-gradient-to-r from-green-600 to-green-500 dark:from-teal-700 dark:to-teal-600 text-white px-5 py-2.5 rounded-lg hover:from-green-700 hover:to-green-600 dark:hover:from-teal-600 dark:hover:to-teal-500 transition-all duration-200 shadow-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-1.5" />
            New Project
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-10 text-center border border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 bg-green-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Leaf className="h-10 w-10 text-green-600 dark:text-cyan-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3">No projects yet</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">Get started by creating your first sustainable project and begin your journey toward regenerative living!</p>
          <Link
            to="/projects/new"
            className="inline-flex items-center bg-gradient-to-r from-green-600 to-green-500 dark:from-teal-700 dark:to-teal-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-600 dark:hover:from-teal-600 dark:hover:to-teal-500 transition-all duration-200 shadow-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Project
          </Link>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">No matching projects</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Try adjusting your search or filters</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('all');
            }}
            className="inline-flex items-center bg-gray-600 dark:bg-gray-700 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors shadow-sm font-medium"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="relative group">
              <Link to={`/projects/${project.id}`}>
                <ProjectCard project={project} />
              </Link>
              {!project.image_url && (
                <button
                  onClick={() => handleGenerateImage(project)}
                  disabled={generatingImage}
                  className="absolute top-2 right-2 bg-purple-600 dark:bg-purple-700 text-white p-2 rounded-full hover:bg-purple-700 dark:hover:bg-purple-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Generate AI image"
                >
                  {generatingImage && selectedProject?.id === project.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsList;