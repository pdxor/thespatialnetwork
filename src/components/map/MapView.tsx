import React from 'react';
import { Database } from '../../types/supabase';

type Project = Database['public']['Tables']['projects']['Row'];

interface MapViewProps {
  projects: Project[];
}

const MapView: React.FC<MapViewProps> = ({ projects }) => {
  // Create the project choices string in the format "ProjectA:123,ProjectB:456"
  const projectChoices = projects
    .map(project => `${project.title}:${project.id}`)
    .join(',');

  const iframeUrl = `https://thespatialnetwork.com/spatialmesh/new-earth-5?project_choices=${encodeURIComponent(projectChoices)}`;

  return (
    <div style={{ width: '100%', height: '85vh' }}>
      <iframe
        src={iframeUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="Spatial Network Map"
        allow="fullscreen"
      />
    </div>
  );
};

export default MapView; 