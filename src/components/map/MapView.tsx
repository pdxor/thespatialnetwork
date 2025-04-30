import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Viewer, Entity, CameraFlyTo, Scene, Globe, ScreenSpaceEvent } from 'resium';
import { Cartesian3, Color, Ion, createWorldTerrainAsync, IonResource, SceneMode, DistanceDisplayCondition, ScreenSpaceEventHandler, HeightReference } from 'cesium';
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
  const viewerRef = useRef<any>(null);
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
    console.log("Map clicked:", { isAdding, movementType: typeof movement });
    if (!isAdding) {
      console.log("Not in adding mode - ignoring click");
      return;
    }
    
    try {
      // Handle different event types (onClick vs ScreenSpaceEvent)
      let position = movement.position;
      let scene = movement.scene;
      
      // ScreenSpaceEvent provides position and endPosition directly
      if (!position && movement.endPosition) {
        console.log("Got endPosition instead of position");
        position = movement.endPosition;
      }
      
      // Check for valid movement object
      if (!position) {
        console.log("Invalid movement object, no position:", movement);
        return;
      }
      
      // Try to get scene from viewerRef if not available in the event
      if (!scene && viewerRef.current) {
        console.log("Using viewerRef to get scene");
        scene = viewerRef.current.scene;
      }
      
      if (!scene) {
        console.log("No scene available");
        return;
      }
      
      // Get camera and ellipsoid
      const camera = scene.camera;
      const ellipsoid = scene.globe?.ellipsoid;
      
      console.log("Camera and ellipsoid:", { 
        hasCamera: !!camera, 
        hasEllipsoid: !!ellipsoid,
        position
      });
      
      if (!ellipsoid) return;
      
      let cartesian;
      
      // Try pickPosition first (more accurate when terrain is loaded)
      try {
        if (scene.pickPosition) {
          cartesian = scene.pickPosition(position);
          console.log("Used pickPosition method:", !!cartesian);
        }
      } catch (e) {
        console.warn("pickPosition failed, falling back to alternative method", e);
      }
      
      // Fallback if pickPosition fails or is unavailable
      if (!cartesian && camera) {
        const ray = camera.getPickRay(position);
        if (ray && scene.globe) {
          cartesian = scene.globe.pick(ray, scene);
          console.log("Used pick method:", !!cartesian);
        }
      }
      
      // Another fallback if needed
      if (!cartesian && camera) {
        const ray = camera.getPickRay(position);
        if (ray && scene.globe) {
          cartesian = scene.globe.rayIntersection(ray);
          console.log("Used rayIntersection method:", !!cartesian);
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
  }, [isAdding, viewerRef]);

  const handleSaveLocation = async () => {
    if (!newLocation.project_id || !newLocation.latitude || !newLocation.longitude) {
      setError('Please select a project and click on the map to set location');
      return;
    }
    
    try {
      setError(null);
      
      // Ensure we're using the correct coordinates format for storage
      const locationData = {
        project_id: newLocation.project_id,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        description: newLocation.description || '',
        color: newLocation.color || defaultColors[0],
      };
      
      if (isEditing && selectedLocation) {
        // Update existing location
        const { error } = await supabase
          .from('project_locations')
          .update(locationData)
          .eq('id', selectedLocation.id);
          
        if (error) throw error;
        
        setSuccess('Location updated successfully!');
        
        // Update local state
        setProjectLocations(prev => 
          prev.map(loc => 
            loc.id === selectedLocation.id 
              ? {
                  ...loc,
                  project_id: locationData.project_id,
                  latitude: locationData.latitude,
                  longitude: locationData.longitude,
                  description: locationData.description,
                  color: locationData.color,
                }
              : loc
          )
        );
      } else {
        // Create new location
        const { data, error } = await supabase
          .from('project_locations')
          .insert(locationData)
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
            project_id: locationData.project_id,
            project_title: project?.title || 'Unknown Project',
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            description: locationData.description,
            color: locationData.color,
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

  // Set up the screen space event handler directly
  useEffect(() => {
    if (viewerRef.current && isAdding) {
      console.log("Setting up ScreenSpaceEventHandler");
      
      // Create a new handler for the canvas
      const handler = new ScreenSpaceEventHandler(viewerRef.current.canvas);
      
      // Add the left click event
      handler.setInputAction((click: any) => {
        console.log("Direct click via ScreenSpaceEventHandler", click);
        
        if (!isAdding) return;
        
        try {
          const scene = viewerRef.current.scene;
          const position = click.position || click.endPosition;
          
          if (!position || !scene) {
            console.log("Invalid click position or scene");
            return;
          }
          
          const camera = scene.camera;
          const ellipsoid = scene.globe?.ellipsoid;
          
          if (!camera || !ellipsoid) {
            console.log("No camera or ellipsoid");
            return;
          }
          
          // Try all methods to get cartesian coordinates
          let cartesian = null;
          
          // Method 1: pickPosition
          try {
            if (scene.pickPosition) {
              cartesian = scene.pickPosition(position);
              console.log("Direct handler: Used pickPosition", !!cartesian);
            }
          } catch (e) {
            console.warn("Direct handler: pickPosition failed", e);
          }
          
          // Method 2: globe.pick with ray
          if (!cartesian) {
            try {
              const ray = camera.getPickRay(position);
              if (ray && scene.globe) {
                cartesian = scene.globe.pick(ray, scene);
                console.log("Direct handler: Used pick", !!cartesian);
              }
            } catch (e) {
              console.warn("Direct handler: pick failed", e);
            }
          }
          
          // Method 3: rayIntersection
          if (!cartesian) {
            try {
              const ray = camera.getPickRay(position);
              if (ray && scene.globe) {
                cartesian = scene.globe.rayIntersection(ray);
                console.log("Direct handler: Used rayIntersection", !!cartesian);
              }
            } catch (e) {
              console.warn("Direct handler: rayIntersection failed", e);
            }
          }
          
          // If we found a position, update the form
          if (cartesian) {
            const cartographic = ellipsoid.cartesianToCartographic(cartesian);
            
            // Sample the terrain height at this position if possible
            if (scene.terrainProvider && !scene.terrainProvider.hasOwnProperty('availability')) {
              try {
                // Request the exact terrain height at this position
                const promise = scene.sampleHeight(cartographic);
                if (promise) {
                  promise.then((height: number) => {
                    console.log("Got terrain height:", height);
                    // Use the sampled height
                    cartographic.height = height;
                  }).catch(() => {
                    console.log("Failed to get terrain height, using default");
                  });
                }
              } catch (e) {
                console.warn("Error sampling terrain height:", e);
              }
            }
            
            const longitude = (cartographic.longitude * 180 / Math.PI);
            const latitude = (cartographic.latitude * 180 / Math.PI);
            
            setNewLocation(prev => ({
              ...prev,
              latitude,
              longitude,
            }));
            
            console.log(`Direct handler: Selected location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          } else {
            console.warn("Direct handler: Could not determine position from click");
          }
        } catch (err) {
          console.error("Direct handler: Error processing click", err);
        }
      }, 0); // ScreenSpaceEventType.LEFT_CLICK = 0
      
      // Clean up the handler when component unmounts or isAdding changes
      return () => {
        console.log("Destroying ScreenSpaceEventHandler");
        handler.destroy();
      };
    }
  }, [isAdding]);

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
          <Viewer 
            full 
            requestRenderMode={false}
            maximumRenderTimeChange={Infinity}
            ref={(ref) => {
              if (ref?.cesiumElement) {
                viewerRef.current = ref.cesiumElement;
                console.log("Cesium viewer initialized", viewerRef.current);
              }
            }}
          >
            <Scene 
              mode={SceneMode.SCENE3D}
              debugShowFramesPerSecond={true}
            />
            <Globe 
              enableLighting={true} 
              terrainProvider={createWorldTerrainAsync()} 
            />
            
            {projectLocations.map((location) => (
              <Entity
                key={location.id}
                position={Cartesian3.fromDegrees(location.longitude, location.latitude, 0)}
                point={{ 
                  pixelSize: 15, 
                  color: Color.fromCssColorString(location.color),
                  outlineColor: Color.WHITE,
                  outlineWidth: 2,
                  heightReference: HeightReference.CLAMP_TO_GROUND
                }}
                model={location.color !== '#ef4444' ? undefined :{
                  uri: './biotekt.glb',
                  scale: 0.5,
                  minimumPixelSize: 128,
                  maximumScale: 20000,
                  heightReference: HeightReference.CLAMP_TO_GROUND
                }}
                billboard={location.color === '#ef4444' ? undefined :{
                  image: '/marker-pin.svg',
                  verticalOrigin: 1, // BOTTOM
                  scale: 0.5,
                  color: Color.fromCssColorString(location.color),
                  heightReference: HeightReference.CLAMP_TO_GROUND
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
                  distanceDisplayCondition: new DistanceDisplayCondition(0, 5000000),
                  heightReference: HeightReference.CLAMP_TO_GROUND
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
          
          {isAdding && (
            <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md z-10 max-w-xs">
              <div className="text-center">
                <p className="font-medium text-blue-600 dark:text-blue-400">Click anywhere on the globe to set location</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView; 