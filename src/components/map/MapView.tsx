import React, { useState, useEffect, useCallback } from 'react';
import { Viewer, Entity, CameraFlyTo, Scene, Globe } from 'resium';
import { Cartesian3, Color, Ion, createWorldTerrainAsync, IonResource, SceneMode, DistanceDisplayCondition } from 'cesium';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import ProjectLocationsPanel from './ProjectLocationsPanel';
import DatabaseSetup from './DatabaseSetup';

// Set your Cesium ion access token
Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlOWE0OTdlNS1mMzFlLTQwOWQtOGZhOC04NzNjYmJjMzA0NDAiLCJpZCI6MTY2OTM3LCJpYXQiOjE2OTQ5Njg1NTR9.SAt_q9E4JGiAWfnYUKHNgjLlfFqyEnel8GQIEuPPJfk';

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

const defaultColors = [
  '#4f46e5', // Indigo
  '#10b981', // Emerald
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6366f1', // Blue
];

const MapView: React.FC = () => {
  const [projectLocations, setProjectLocations] = useState<ProjectLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<ProjectLocation | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newLocation, setNewLocation] = useState<Partial<ProjectLocation>>({
    latitude: 0,
    longitude: 0,
    description: '',
    color: defaultColors[0],
    project_id: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects');
      }
    };
    
    fetchProjects();
  }, []);

  // Fetch project locations
  useEffect(() => {
    const fetchProjectLocations = async () => {
      try {
        // First check if the table exists
        const { error: tableCheckError } = await supabase
          .from('project_locations')
          .select('count')
          .limit(1);
          
        if (tableCheckError && tableCheckError.message.includes("relation") && tableCheckError.message.includes("does not exist")) {
          setError('Project locations table does not exist. Please run the migration script.');
          console.error('Project locations table does not exist:', tableCheckError);
          return;
        }
        
        // Try a simpler query first
        const { data, error } = await supabase
          .from('project_locations')
          .select(`
            id,
            project_id,
            latitude,
            longitude,
            description,
            color
          `);
          
        if (error) throw error;
        
        // Fetch project titles separately if needed
        const locations = await Promise.all(
          (data || []).map(async (item) => {
            let projectTitle = 'Unknown Project';
            
            if (item.project_id) {
              const { data: projectData } = await supabase
                .from('projects')
                .select('title')
                .eq('id', item.project_id)
                .single();
                
              if (projectData) {
                projectTitle = projectData.title;
              }
            }
            
            return {
              id: item.id,
              project_id: item.project_id,
              project_title: projectTitle,
              latitude: item.latitude,
              longitude: item.longitude,
              description: item.description || '',
              color: item.color || defaultColors[0],
            };
          })
        );
        
        setProjectLocations(locations);
      } catch (err) {
        console.error('Error fetching project locations:', err);
        setError('Failed to load project locations');
      }
    };
    
    fetchProjectLocations();
  }, []);

  const handleAddLocation = () => {
    setIsAdding(true);
    setSelectedLocation(null);
    setNewLocation({
      latitude: 0,
      longitude: 0,
      description: '',
      color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
      project_id: projects.length > 0 ? projects[0].id : '',
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setIsEditing(false);
    setNewLocation({
      latitude: 0,
      longitude: 0,
      description: '',
      color: defaultColors[0],
      project_id: '',
    });
  };

  const handleMapClick = useCallback((movement: any) => {
    if (!isAdding) return;
    
    try {
      // Safe access to scene and position
      if (!movement || !movement.position) return;
      
      // Get camera position for alternative method if pickPosition fails
      const camera = movement.scene?.camera;
      const ellipsoid = movement.scene?.globe?.ellipsoid;
      
      if (!ellipsoid) return;
      
      let cartesian;
      
      // Try pickPosition first (more accurate when terrain is loaded)
      try {
        if (movement.scene?.pickPosition) {
          cartesian = movement.scene.pickPosition(movement.position);
        }
      } catch (e) {
        console.warn("pickPosition failed, falling back to alternative method", e);
      }
      
      // Fallback if pickPosition fails or is unavailable
      if (!cartesian && camera && movement.endPosition) {
        const ray = camera.getPickRay(movement.endPosition);
        if (ray) {
          cartesian = movement.scene.globe.pick(ray, movement.scene);
        }
      }
      
      // Another fallback if needed
      if (!cartesian && camera) {
        const ray = camera.getPickRay(movement.position);
        if (ray) {
          cartesian = movement.scene.globe.rayIntersection(ray);
        }
      }
      
      // If we have a position, update the form
      if (cartesian) {
        const cartographic = ellipsoid.cartesianToCartographic(cartesian);
        const longitude = (cartographic.longitude * 180 / Math.PI);
        const latitude = (cartographic.latitude * 180 / Math.PI);
        
        setNewLocation(prev => ({
          ...prev,
          latitude,
          longitude,
        }));
        
        console.log(`Selected location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      } else {
        console.warn("Could not determine position from click");
      }
    } catch (err) {
      console.error("Error handling map click:", err);
    }
  }, [isAdding]);

  const handleSaveLocation = async () => {
    if (!newLocation.project_id || !newLocation.latitude || !newLocation.longitude) {
      setError('Please select a project and click on the map to set location');
      return;
    }
    
    try {
      setError(null);
      
      if (isEditing && selectedLocation) {
        // Update existing location
        const { error } = await supabase
          .from('project_locations')
          .update({
            project_id: newLocation.project_id,
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            description: newLocation.description,
            color: newLocation.color,
          })
          .eq('id', selectedLocation.id);
          
        if (error) throw error;
        
        setSuccess('Location updated successfully!');
        
        // Update local state
        setProjectLocations(prev => 
          prev.map(loc => 
            loc.id === selectedLocation.id 
              ? {
                  ...loc,
                  project_id: newLocation.project_id!,
                  latitude: newLocation.latitude!,
                  longitude: newLocation.longitude!,
                  description: newLocation.description || '',
                  color: newLocation.color || defaultColors[0],
                }
              : loc
          )
        );
      } else {
        // Create new location
        const { data, error } = await supabase
          .from('project_locations')
          .insert({
            project_id: newLocation.project_id,
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            description: newLocation.description || '',
            color: newLocation.color,
          })
          .select('id')
          .single();
          
        if (error) throw error;
        
        setSuccess('Location added successfully!');
        
        // Update local state with the new project title
        const project = projects.find(p => p.id === newLocation.project_id);
        setProjectLocations(prev => [
          ...prev,
          {
            id: data.id,
            project_id: newLocation.project_id!,
            project_title: project?.title || 'Unknown Project',
            latitude: newLocation.latitude!,
            longitude: newLocation.longitude!,
            description: newLocation.description || '',
            color: newLocation.color || defaultColors[0],
          }
        ]);
      }
      
      // Reset form
      setIsAdding(false);
      setIsEditing(false);
      setNewLocation({
        latitude: 0,
        longitude: 0,
        description: '',
        color: defaultColors[0],
        project_id: '',
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving location:', err);
      setError('Failed to save location');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      try {
        const { error } = await supabase
          .from('project_locations')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        setProjectLocations(prev => prev.filter(location => location.id !== id));
        setSelectedLocation(null);
        setSuccess('Location deleted successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } catch (err) {
        console.error('Error deleting location:', err);
        setError('Failed to delete location');
      }
    }
  };

  const handleEditLocation = (location: ProjectLocation) => {
    setIsEditing(true);
    setIsAdding(false);
    setSelectedLocation(location);
    setNewLocation({
      project_id: location.project_id,
      latitude: location.latitude,
      longitude: location.longitude,
      description: location.description,
      color: location.color,
    });
  };

  const handleUpdateNewLocation = (updates: Partial<ProjectLocation>) => {
    setNewLocation(prev => ({
      ...prev,
      ...updates
    }));
  };

  return (
    <div className="h-screen flex flex-col">
      {error && error.includes('table does not exist') && (
        <div className="p-4">
          <DatabaseSetup />
        </div>
      )}
      <div className="flex flex-1">
        <ProjectLocationsPanel 
          projectLocations={projectLocations}
          selectedLocation={selectedLocation}
          projects={projects}
          isAdding={isAdding}
          isEditing={isEditing}
          newLocation={newLocation}
          error={error}
          success={success}
          defaultColors={defaultColors}
          onSelectLocation={setSelectedLocation}
          onAddLocation={handleAddLocation}
          onCancelEdit={handleCancel}
          onSaveLocation={handleSaveLocation}
          onDeleteLocation={handleDeleteLocation}
          onEditLocation={handleEditLocation}
          onUpdateNewLocation={handleUpdateNewLocation}
        />
        
        <div className="w-3/4 relative">
          <Viewer full onClick={handleMapClick}>
            <Scene mode={SceneMode.SCENE3D} />
            <Globe enableLighting={true} terrainProvider={createWorldTerrainAsync()} />
            
            {projectLocations.map((location) => (
              <Entity
                key={location.id}
                position={Cartesian3.fromDegrees(location.longitude, location.latitude, 0)}
                point={{ 
                  pixelSize: 15, 
                  color: Color.fromCssColorString(location.color),
                  outlineColor: Color.WHITE,
                  outlineWidth: 2,
                  heightReference: 0 // CLAMP_TO_GROUND
                }}
                billboard={{
                  image: '/marker-pin.svg', // Use a simple local image instead
                  verticalOrigin: 1, // BOTTOM
                  scale: 0.5,
                  color: Color.fromCssColorString(location.color)
                }}
                label={{ 
                  text: location.project_title,
                  font: '14px sans-serif',
                  fillColor: Color.WHITE,
                  outlineColor: Color.BLACK,
                  outlineWidth: 2,
                  style: 0, // FILL_AND_OUTLINE
                  pixelOffset: new Cartesian3(0, -30, 0),
                  showBackground: true,
                  backgroundColor: Color.fromCssColorString(location.color).withAlpha(0.7),
                  horizontalOrigin: 0, // CENTER
                  verticalOrigin: 0, // CENTER
                  distanceDisplayCondition: new DistanceDisplayCondition(0, 5000000)
                }}
                onClick={() => setSelectedLocation(location)}
              />
            ))}
            
            {selectedLocation && (
              <CameraFlyTo
                destination={Cartesian3.fromDegrees(
                  selectedLocation.longitude,
                  selectedLocation.latitude,
                  10000
                )}
                duration={1.5}
              />
            )}
          </Viewer>
        </div>
      </div>
    </div>
  );
};

export default MapView; 