import React from 'react';

const MapView: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <iframe
        src="https://thespatialnetwork.com/spatialmesh/new-earth-5"
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