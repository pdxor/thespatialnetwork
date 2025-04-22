import React from 'react';
import { Database } from '../../types/supabase';
import { MapPin, Users, Calendar, Tag, Leaf, Image as ImageIcon } from 'lucide-react';

type Project = Database['public']['Tables']['projects']['Row'];

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const [imageError, setImageError] = React.useState(false);

  // Format date
  const formattedDate = new Date(project.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Get guild badges (max 3)
  const displayedGuilds = project.guilds?.slice(0, 3) || [];
  const remainingGuilds = project.guilds && project.guilds.length > 3 
    ? project.guilds.length - 3 
    : 0;

  // Get image URL from project or use placeholder
  const getProjectImage = () => {
    // If image error occurred or no image_url, use placeholder
    if (imageError || !project.image_url) {
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
    }
    
    return project.image_url;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageError(true);
    // No need to manually set src as React will re-render with placeholder
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:translate-y-[-4px] border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      <div className="h-48 overflow-hidden relative">
        <img 
          src={getProjectImage()} 
          alt={project.title} 
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className={`text-xs font-semibold inline-block py-1 px-2.5 rounded-full ${
            project.property_status === 'owned_land' 
              ? 'text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/60' 
              : 'text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/60'
          }`}>
            {project.property_status === 'owned_land' ? 'Owned Land' : 'Potential Property'}
          </span>
        </div>
      </div>
      
      <div className="p-5 flex-grow">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 line-clamp-2">{project.title}</h2>
        
        {project.location && (
          <div className="flex items-center text-gray-600 dark:text-gray-300 mb-3">
            <MapPin className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm">{project.location}</span>
          </div>
        )}
        
        <div className="flex items-center text-gray-600 dark:text-gray-300 mb-4">
          <Calendar className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm">Created {formattedDate}</span>
        </div>
        
        {project.guilds && project.guilds.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {displayedGuilds.map((guild, index) => (
                <span key={index} className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2.5 py-1 rounded-full flex items-center">
                  <Tag className="h-3 w-3 mr-1" />
                  {guild.length > 20 ? guild.substring(0, 20) + '...' : guild}
                </span>
              ))}
              {remainingGuilds > 0 && (
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1 rounded-full">
                  +{remainingGuilds} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <Users className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm">
              {project.team && project.team.length > 0 
                ? `${project.team.length + 1} members` 
                : "1 member"}
            </span>
          </div>
          
          <div className="flex items-center text-green-600 dark:text-cyan-400 font-medium text-sm">
            <Leaf className="h-4 w-4 mr-1" />
            View Details
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;