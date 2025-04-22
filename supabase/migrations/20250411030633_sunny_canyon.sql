/*
  # Add assignees to items table

  1. Changes
    - Add assignees column to items table to store multiple assignees
    - Update RLS policies to allow assignees to view and update items
  
  2. Security
    - Maintain existing RLS policies
    - Add new policies for assignees
*/

-- Add assignees column to items table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'assignees'
  ) THEN
    ALTER TABLE public.items ADD COLUMN assignees UUID[] DEFAULT NULL;
  END IF;
END $$;

-- Update RLS policies for items to include assignees
DROP POLICY IF EXISTS "Users can view items" ON items;
DROP POLICY IF EXISTS "Users can view their own items or items for projects they're a" ON items;
DROP POLICY IF EXISTS "Users can view their own items or items for projects they're associated with" ON items;

-- Create a new policy for viewing items
CREATE POLICY "Users can view items"
  ON items
  FOR SELECT
  TO authenticated
  USING (
    added_by = auth.uid() OR
    auth.uid() = ANY(assignees) OR
    (project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid() OR auth.uid() = ANY(team)
    )) OR
    (associated_task_id IN (
      SELECT id FROM tasks
      WHERE created_by = auth.uid() OR assigned_to = auth.uid() OR auth.uid() = ANY(assignees)
    ))
  );

-- Update policy for updating items
DROP POLICY IF EXISTS "Users can update items" ON items;
DROP POLICY IF EXISTS "Users can update their items" ON items;

CREATE POLICY "Users can update items"
  ON items
  FOR UPDATE
  TO authenticated
  USING (
    added_by = auth.uid() OR
    auth.uid() = ANY(assignees) OR
    (project_id IN (
      SELECT id FROM projects
      WHERE created_by = auth.uid() OR auth.uid() = ANY(team)
    ))
  );