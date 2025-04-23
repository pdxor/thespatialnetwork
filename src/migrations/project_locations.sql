-- Create project_locations table if it doesn't exist
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