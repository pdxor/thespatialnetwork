import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Copy of the SQL from project_locations.sql to display in UI
const projectLocationsSql = `-- Create project_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#4f46e5',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_locations_project_id ON project_locations(project_id);

-- Add RLS policies for project_locations
ALTER TABLE project_locations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read project locations based on project access
CREATE POLICY "Users can view project locations if they can access the project" 
ON project_locations
FOR SELECT 
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE created_by = auth.uid() OR team::text[] @> ARRAY[auth.uid()::text]
  )
);

-- Policy to allow project owners to insert/update/delete locations
CREATE POLICY "Project owners can modify project locations" 
ON project_locations
FOR ALL 
USING (
  project_id IN (
    SELECT id FROM projects WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE created_by = auth.uid()
  )
);

-- Policy to allow team members to insert/update locations (but not delete)
CREATE POLICY "Team members can insert and update project locations" 
ON project_locations
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects 
    WHERE team::text[] @> ARRAY[auth.uid()::text]
  )
);

CREATE POLICY "Team members can update project locations" 
ON project_locations
FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE team::text[] @> ARRAY[auth.uid()::text]
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM projects 
    WHERE team::text[] @> ARRAY[auth.uid()::text]
  )
);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_project_locations_updated_at
BEFORE UPDATE ON project_locations
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
`;

// SQL for creating project_locations table (main version)
const createTableSQL = projectLocationsSql;

// SQL for creating project_locations table (simplified version without RLS)
const createSimpleTableSQL = `
CREATE TABLE IF NOT EXISTS project_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#4f46e5',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_locations_project_id ON project_locations(project_id);
`;

// SQL to check if a table exists
const checkTableSQL = `
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public'
  AND table_name = 'project_locations'
)`;

const DatabaseSetup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'info' | 'success' | 'error'} | null>(null);
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  // Check if project_locations table exists
  const checkTable = async () => {
    try {
      setIsLoading(true);
      setMessage({ text: "Checking database...", type: 'info' });

      const { data, error } = await supabase.rpc('pgcrypto', { sql: checkTableSQL });
      
      if (error) {
        console.error("Error checking table:", error);
        setMessage({ text: `Error checking database: ${error.message}`, type: 'error' });
        return;
      }
      
      const exists = data && data[0] && data[0].exists;
      setTableExists(exists);
      
      if (exists) {
        setMessage({ text: "Project locations table already exists", type: 'success' });
      } else {
        setMessage({ text: "Project locations table does not exist", type: 'info' });
      }
    } catch (err) {
      console.error("Exception checking table:", err);
      setMessage({ text: `Error checking database: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Run migration to create project_locations table
  const runMigration = async () => {
    try {
      setIsLoading(true);
      setMessage({ text: "Running database migration...", type: 'info' });

      // Execute the SQL using pgcrypto RPC function
      const { error } = await supabase.rpc('pgcrypto', { sql: createTableSQL });
      
      if (error) {
        console.error("Error running migration:", error);
        setMessage({ text: `Error creating project_locations table: ${error.message}`, type: 'error' });
        return;
      }
      
      setTableExists(true);
      setMessage({ text: "Successfully created project_locations table!", type: 'success' });
    } catch (err) {
      console.error("Exception running migration:", err);
      setMessage({ text: `Error creating project_locations table: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Run simple migration to create project_locations table (simplified version without RLS)
  const runSimpleMigration = async () => {
    try {
      setIsLoading(true);
      setMessage({ text: "Creating basic table without security policies...", type: 'info' });

      // Execute the SQL using pgcrypto RPC function
      const { error } = await supabase.rpc('pgcrypto', { sql: createSimpleTableSQL });
      
      if (error) {
        console.error("Error running simplified migration:", error);
        setMessage({ text: `Error creating table: ${error.message}`, type: 'error' });
        return;
      }
      
      setTableExists(true);
      setMessage({ text: "Successfully created basic project_locations table! Note: Security policies were not applied.", type: 'success' });
    } catch (err) {
      console.error("Exception running simplified migration:", err);
      setMessage({ text: `Error creating basic table: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Run check on component mount
  useEffect(() => {
    checkTable();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Project Locations Database Setup</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded-md ${
          message.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
          message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            Status: {tableExists === null ? 'Checking...' : tableExists ? 'Project locations table exists' : 'Project locations table does not exist'}
          </p>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={checkTable}
            disabled={isLoading}
            className="bg-blue-500 dark:bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
          >
            {isLoading ? 'Checking...' : 'Check Database'}
          </button>
          
          <button
            onClick={runMigration}
            disabled={isLoading || tableExists === true}
            className="bg-purple-600 dark:bg-purple-700 text-white py-2 px-4 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Project Locations Table'}
          </button>
          
          <button
            onClick={runSimpleMigration}
            disabled={isLoading || tableExists === true}
            className="bg-yellow-500 dark:bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-600 dark:hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Basic Table (No RLS)'}
          </button>
        </div>
        
        {!tableExists && (
          <div className="mt-6">
            <details className="border border-gray-200 dark:border-gray-700 rounded-md">
              <summary className="px-4 py-2 cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium">
                Manual Setup: Copy SQL to Run in Supabase SQL Editor
              </summary>
              <div className="p-4 bg-gray-900 text-gray-300 rounded-b-md overflow-auto max-h-96">
                <div className="text-sm mb-2 text-yellow-400">
                  ⚠️ This SQL is from your <code>src/migrations/project_locations.sql</code> migration file. Copy this and execute it in the Supabase SQL Editor.
                </div>
                <pre className="whitespace-pre-wrap text-sm overflow-auto">
                  {projectLocationsSql}
                </pre>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(projectLocationsSql);
                      setMessage({ text: "SQL copied to clipboard!", type: 'info' });
                      setTimeout(() => setMessage(null), 3000);
                    }}
                    className="bg-blue-500 dark:bg-blue-600 text-white text-sm py-1 px-3 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseSetup; 