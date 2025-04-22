/*
  # Add badges system

  1. New Tables
    - `badges` - Stores badge definitions with images, titles, and descriptions
    - `user_badges` - Tracks which users have earned which badges
  
  2. Changes
    - Add badge_id to tasks table to associate tasks with badges
    - Add completion_verification field to tasks table
  
  3. Security
    - Enable RLS on new tables
    - Add appropriate policies for badge management
*/

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_badges table to track earned badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Add badge_id to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS completion_verification BOOLEAN DEFAULT false;

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_badges_updated_at
BEFORE UPDATE ON badges
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Badges RLS Policies
CREATE POLICY "Users can view all badges"
  ON badges
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create badges"
  ON badges
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own badges"
  ON badges
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own badges"
  ON badges
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- User Badges RLS Policies
CREATE POLICY "Users can view all user badges"
  ON user_badges
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert badges they've earned"
  ON user_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tasks
      WHERE 
        tasks.id = task_id AND
        tasks.created_by = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS badges_created_by_idx ON badges(created_by);
CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS user_badges_badge_id_idx ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS tasks_badge_id_idx ON tasks(badge_id);