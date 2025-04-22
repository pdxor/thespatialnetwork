/*
  # Add assignees to tasks table

  1. Changes
    - Add assignees column to tasks table to store multiple assignees
    - Update RLS policies to allow assignees to view and update tasks
  
  2. Security
    - Maintain existing RLS policies
    - Add new policies for assignees
*/

-- Add assignees column to tasks table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'assignees'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN assignees UUID[] DEFAULT NULL;
  END IF;
END $$;

-- Update RLS policies for tasks to include assignees
DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view their own tasks or tasks for projects they're a" ON tasks;
DROP POLICY IF EXISTS "Users can view their own tasks or tasks for projects they're associated with" ON tasks;

-- Create a new policy for viewing tasks
CREATE POLICY "Users can view tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    auth.uid() = ANY(assignees) OR
    (project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid() OR auth.uid() = ANY(team)
    ))
  );

-- Update policy for updating tasks
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON tasks;

CREATE POLICY "Users can update tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    auth.uid() = ANY(assignees) OR
    (project_id IN (
      SELECT id FROM projects
      WHERE created_by = auth.uid() OR auth.uid() = ANY(team)
    ))
  );