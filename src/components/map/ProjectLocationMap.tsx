import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Viewer, Entity, Scene, Globe, ScreenSpaceEvent } from 'resium';
import { Cartesian3, Color, Ion, createWorldTerrainAsync, SceneMode, HeightReference, ScreenSpaceEventHandler } from 'cesium';
import { supabase } from '../../lib/supabase';

// Set your Cesium ion access token
Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlOWE0OTdlNS1mMzFlLTQwOWQtOGZhOC04NzNjYmJjMzA0NDAiLCJpZCI6MTY2OTM3LCJpYXQiOjE2OTQ5Njg1NTR9.SAt_q9E4JGiAWfnYUKHNgjLlfFqyEnel8GQIEuPPJfk';

interface ProjectLocation {
  id: string;
  project_id: string;
  latitude: number;
  longitude: number;
  description: string;
  color: string;
}

interface ProjectLocationMapProps {
  projectId?: string;
  locations?: ProjectLocation[];
  editable?: boolean;
  height?: string;
  onLocationSelect?: (location: ProjectLocation) => void;
  onLocationAdd?: (latitude: number, longitude: number) => void;
  markerColor?: string;
  initialLatitude?: number;
  initialLongitude?: number;
}

const ProjectLocationMap: React.FC<ProjectLocationMapProps> = ({
  projectId,
  locations: propLocations,
  editable = false,
  height = '400px',
  onLocationSelect,
  onLocationAdd,
  markerColor = '#4f46e5',
  initialLatitude,
  initialLongitude,
}) => {
  const [projectLocations, setProjectLocations] = useState<ProjectLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  // Fetch project locations from database if no locations provided
  useEffect(() => {
    if (propLocations) {
      setProjectLocations(propLocations);
      setIsLoading(false);
      return;
    }
    
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    
    const fetchProjectLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('project_locations')
          .select('*')
          .eq('project_id', projectId);
          
        if (error) throw error;
        
        setProjectLocations(data || []);
      } catch (err) {
        console.error('Error fetching project locations:', err);
        setError('Failed to load project locations');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjectLocations();
  }, [projectId, propLocations]);

  // Set up the screen space event handler for map clicks
  useEffect(() => {
    if (viewerRef.current && editable && isAdding) {
      console.log("Setting up ScreenSpaceEventHandler");
      
      // Create a new handler for the canvas
      const handler = new ScreenSpaceEventHandler(viewerRef.current.canvas);
      
      // Add the left click event
      handler.setInputAction((click: any) => {
        console.log("Map clicked for location selection");
        
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
              console.log("Used pickPosition for location selection", !!cartesian);
            }
          } catch (e) {
            console.warn("pickPosition failed, falling back to alternative method", e);
          }
          
          // Method 2: globe.pick with ray
          if (!cartesian && camera) {
            try {
              const ray = camera.getPickRay(position);
              if (ray && scene.globe) {
                cartesian = scene.globe.pick(ray, scene);
                console.log("Used pick method for location selection", !!cartesian);
              }
            } catch (e) {
              console.warn("pick failed, falling back to alternative method", e);
            }
          }
          
          // Method 3: rayIntersection
          if (!cartesian && camera) {
            try {
              const ray = camera.getPickRay(position);
              if (ray && scene.globe) {
                cartesian = scene.globe.rayIntersection(ray);
                console.log("Used rayIntersection for location selection", !!cartesian);
              }
            } catch (e) {
              console.warn("rayIntersection failed", e);
            }
          }
          
          // If we have a position, update the form
          if (cartesian) {
            const cartographic = ellipsoid.cartesianToCartographic(cartesian);
            const longitude = (cartographic.longitude * 180 / Math.PI);
            const latitude = (cartographic.latitude * 180 / Math.PI);
            
            console.log(`Selected location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            
            if (onLocationAdd) {
              onLocationAdd(latitude, longitude);
              setIsAdding(false);
            }
          } else {
            console.warn("Could not determine position from click");
          }
        } catch (err) {
          console.error("Error handling map click:", err);
        }
      }, 0); // ScreenSpaceEventType.LEFT_CLICK = 0
      
      // Clean up the handler when component unmounts or isAdding changes
      return () => {
        console.log("Destroying ScreenSpaceEventHandler");
        handler.destroy();
      };
    }
  }, [isAdding, editable, onLocationAdd]);

  const handleAddLocation = () => {
    setIsAdding(true);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
  };

  if (isLoading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Default to first location, or provided coordinates, or default to a generic location
  const defaultLatitude = initialLatitude || (projectLocations.length > 0 ? projectLocations[0].latitude : 37.7749);
  const defaultLongitude = initialLongitude || (projectLocations.length > 0 ? projectLocations[0].longitude : -122.4194);

  return (
    <div className="relative" style={{ height }}>
      <Viewer 
        full 
        requestRenderMode={false}
        maximumRenderTimeChange={Infinity}
        ref={(ref) => {
          if (ref?.cesiumElement) {
            viewerRef.current = ref.cesiumElement;
          }
        }}
      >
        <Scene 
          mode={SceneMode.SCENE3D}
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
              color: Color.fromCssColorString(location.color || markerColor),
              outlineColor: Color.WHITE,
              outlineWidth: 2,
              heightReference: HeightReference.CLAMP_TO_GROUND
            }}
            billboard={{
              image: '/marker-pin.svg',
              verticalOrigin: 1, // BOTTOM
              scale: 0.5,
              color: Color.fromCssColorString(location.color || markerColor),
              heightReference: HeightReference.CLAMP_TO_GROUND
            }}
            label={{ 
              text: location.description || 'Project Location',
              font: '14px sans-serif',
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 2,
              style: 0, // FILL_AND_OUTLINE
              pixelOffset: new Cartesian3(0, -30, 0),
              showBackground: true,
              backgroundColor: Color.fromCssColorString(location.color || markerColor).withAlpha(0.7),
              horizontalOrigin: 0, // CENTER
              verticalOrigin: 0, // CENTER
              heightReference: HeightReference.CLAMP_TO_GROUND
            }}
            onClick={() => onLocationSelect && onLocationSelect(location)}
          />
        ))}
        
        {/* Display a temporary marker at specified position */}
        {initialLatitude && initialLongitude && projectLocations.length === 0 && (
          <Entity
            position={Cartesian3.fromDegrees(initialLongitude, initialLatitude, 0)}
            point={{ 
              pixelSize: 15, 
              color: Color.fromCssColorString(markerColor),
              outlineColor: Color.WHITE,
              outlineWidth: 2,
              heightReference: HeightReference.CLAMP_TO_GROUND
            }}
            billboard={{
              image: '/marker-pin.svg',
              verticalOrigin: 1, // BOTTOM
              scale: 0.5,
              color: Color.fromCssColorString(markerColor),
              heightReference: HeightReference.CLAMP_TO_GROUND
            }}
          />
        )}
      </Viewer>
      
      {editable && (
        <div className="absolute top-2 right-2 z-10">
          {isAdding ? (
            <button
              onClick={handleCancelAdd}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md shadow-md"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handleAddLocation}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md shadow-md"
            >
              Add Location
            </button>
          )}
        </div>
      )}
      
      {isAdding && (
        <div className="absolute top-2 left-2 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md z-10 max-w-xs">
          <div className="text-center">
            <p className="font-medium text-blue-600 dark:text-blue-400">Click anywhere on the globe to set location</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectLocationMap; 