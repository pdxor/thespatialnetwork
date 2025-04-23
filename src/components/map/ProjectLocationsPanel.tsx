import React from 'react';
import { MapPin, Plus, Edit2, Trash2, X, Check, Info } from 'lucide-react';
import { Database } from '../../types/supabase';

type Project = Database['public']['Tables']['projects']['Row'];

interface ProjectLocation {
  id: string;
  project_id: string;
  project_title: string;
  latitude: number;
  longitude: number;
  description: string;
  color: string;
}

interface ProjectLocationsPanelProps {
  projectLocations: ProjectLocation[];
  selectedLocation: ProjectLocation | null;
  projects: Project[];
  isAdding: boolean;
  isEditing: boolean;
  newLocation: Partial<ProjectLocation>;
  error: string | null;
  success: string | null;
  defaultColors: string[];
  onSelectLocation: (location: ProjectLocation) => void;
  onAddLocation: () => void;
  onCancelEdit: () => void;
  onSaveLocation: () => void;
  onDeleteLocation: (id: string) => void;
  onEditLocation: (location: ProjectLocation) => void;
  onUpdateNewLocation: (updates: Partial<ProjectLocation>) => void;
}

const ProjectLocationsPanel: React.FC<ProjectLocationsPanelProps> = ({
  projectLocations,
  selectedLocation,
  projects,
  isAdding,
  isEditing,
  newLocation,
  error,
  success,
  defaultColors,
  onSelectLocation,
  onAddLocation,
  onCancelEdit,
  onSaveLocation,
  onDeleteLocation,
  onEditLocation,
  onUpdateNewLocation,
}) => {
  return (
    <div className="w-1/4 bg-white dark:bg-gray-800 p-4 overflow-y-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
        <MapPin className="h-6 w-6 mr-2 text-purple-600 dark:text-purple-400" />
        Project Map
      </h1>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 dark:border-green-600 text-green-700 dark:text-green-300 p-4 rounded-md mb-4">
          {success}
        </div>
      )}
      
      <div className="mb-6">
        <button
          className="bg-purple-600 dark:bg-purple-700 text-white py-2 px-4 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 flex items-center shadow-sm"
          onClick={onAddLocation}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Project Location
        </button>
      </div>
      
      {(isAdding || isEditing) && (
        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-md border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {isAdding ? 'Add New Location' : 'Edit Location'}
          </h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="projectId">
              Project *
            </label>
            <select
              id="projectId"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
              value={newLocation.project_id || ''}
              onChange={(e) => onUpdateNewLocation({ project_id: e.target.value })}
              required
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.title}</option>
              ))}
            </select>
            {projects.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                You don't have any projects yet. Create a project first.
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
              value={newLocation.description || ''}
              onChange={(e) => onUpdateNewLocation({ description: e.target.value })}
              placeholder="Enter a description for this location"
              rows={3}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="color">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {defaultColors.map(colorOption => (
                <button
                  key={colorOption}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${newLocation.color === colorOption ? 'border-gray-800 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => onUpdateNewLocation({ color: colorOption })}
                />
              ))}
              <input
                type="color"
                value={newLocation.color || '#4f46e5'}
                onChange={(e) => onUpdateNewLocation({ color: e.target.value })}
                className="w-8 h-8 rounded-full cursor-pointer"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center">
              <div className="w-1/2">
                <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
                  value={newLocation.latitude || 0}
                  onChange={(e) => onUpdateNewLocation({ latitude: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="w-1/2 ml-2">
                <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
                  value={newLocation.longitude || 0}
                  onChange={(e) => onUpdateNewLocation({ longitude: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 flex items-center">
              <Info className="h-4 w-4 mr-1" />
              {isAdding ? 'Click on the map to set a location' : 'You can adjust coordinates directly'}
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              className="bg-purple-600 dark:bg-purple-700 text-white py-2 px-4 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 flex items-center"
              onClick={onSaveLocation}
            >
              <Check className="h-4 w-4 mr-2" />
              {isAdding ? 'Add Location' : 'Save Changes'}
            </button>
            <button
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
              onClick={onCancelEdit}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Project Locations</h2>
        {projectLocations.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No project locations yet</p>
        ) : (
          <div className="space-y-2">
            {projectLocations.map(location => (
              <div 
                key={location.id} 
                className={`p-3 rounded-md border cursor-pointer ${selectedLocation?.id === location.id ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                onClick={() => onSelectLocation(location)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-2" 
                      style={{ backgroundColor: location.color }}
                    />
                    <span className="font-medium">{location.project_title}</span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLocation(location);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLocation(location.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {location.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {location.description}
                  </p>
                )}
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectLocationsPanel; 