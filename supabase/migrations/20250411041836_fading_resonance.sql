/*
  # Create events table

  1. New Table
    - `events` table for storing project and personal events
    - Supports recurring events, all-day events, and event attendees
    - Includes color coding for calendar visualization
  
  2. Security
    - Enable RLS on the events table
    - Add policies for CRUD operations
    - Link to existing auth system
*/

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN NOT NULL DEFAULT true,
  location TEXT,
  is_project_event BOOLEAN NOT NULL DEFAULT false,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  attendees UUID[],
  color TEXT,
  recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_pattern TEXT,
  recurring_end_date DATE
);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Events RLS Policies
CREATE POLICY "Users can view their own events or events for projects they're a member of"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    auth.uid() = ANY(attendees) OR
    (project_id IN (
      SELECT id FROM projects
      WHERE created_by = auth.uid() OR auth.uid() = ANY(team)
    ))
  );

CREATE POLICY "Users can insert events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own events or events for projects they're a member of"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    auth.uid() = ANY(attendees) OR
    (project_id IN (
      SELECT id FROM projects
      WHERE created_by = auth.uid() OR auth.uid() = ANY(team)
    ))
  );

CREATE POLICY "Users can delete their own events or events for projects they created"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    (project_id IN (
      SELECT id FROM projects
      WHERE created_by = auth.uid()
    ))
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS events_start_date_idx ON events(start_date);
CREATE INDEX IF NOT EXISTS events_project_id_idx ON events(project_id);
CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by);