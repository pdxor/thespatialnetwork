import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import MapView from './MapView';
import DatabaseSetup from './DatabaseSetup';
import { supabase } from '../../lib/supabase';

const MapPage: React.FC = () => {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  
  // Check if project_locations table exists
  useEffect(() => {
    const checkTableExists = async () => {
      try {
        const { error } = await supabase
          .from('project_locations')
          .select('count')
          .limit(1);
          
        if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
          setNeedsSetup(true);
        } else {
          setNeedsSetup(false);
        }
      } catch (err) {
        console.error('Error checking table:', err);
        setNeedsSetup(true);
      }
    };
    
    checkTableExists();
  }, []);
  
  return (
    <>
      <Helmet>
        <title>Project Map | The Spatial Network</title>
      </Helmet>
      <div className="h-full">
        {needsSetup === true && (
          <div className="mb-4">
            <h1 className="text-2xl font-bold mb-4">Setup Required</h1>
            <p className="mb-4">The project locations database table needs to be created before using the map.</p>
            <DatabaseSetup />
          </div>
        )}
        {needsSetup === false && <MapView />}
        {needsSetup === null && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <span className="ml-3">Checking database setup...</span>
          </div>
        )}
      </div>
    </>
  );
};

export default MapPage; 