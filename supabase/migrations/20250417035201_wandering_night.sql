/*
  # Add Badge Quests System

  1. New Tables
    - `badge_quests` - Stores badge quest definitions
    - `badge_quest_tasks` - Links tasks to badge quests
  
  2. Changes
    - Add quest_id to badges table to associate badges with quests
    - Add progress tracking for badge quests
  
  3. Security
    - Enable RLS on new tables
    - Add appropriate policies for badge quest management
*/

-- Create badge_quests table
CREATE TABLE IF NOT EXISTS badge_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
  required_tasks_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create badge_quest_tasks table to link tasks to quests
CREATE TABLE IF NOT EXISTS badge_quest_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES badge_quests(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quest_id, task_id)
);

-- Create user_quest_progress table to track user progress
CREATE TABLE IF NOT EXISTS user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES badge_quests(id) ON DELETE CASCADE,
  completed_tasks UUID[] DEFAULT '{}',
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, quest_id)
);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_badge_quests_updated_at
BEFORE UPDATE ON badge_quests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_quest_progress_updated_at
BEFORE UPDATE ON user_quest_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE badge_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_quest_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_progress ENABLE ROW LEVEL SECURITY;

-- Badge Quests RLS Policies
CREATE POLICY "Users can view all badge quests"
  ON badge_quests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create badge quests"
  ON badge_quests
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own badge quests"
  ON badge_quests
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own badge quests"
  ON badge_quests
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Badge Quest Tasks RLS Policies
CREATE POLICY "Users can view all badge quest tasks"
  ON badge_quest_tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert badge quest tasks"
  ON badge_quest_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    quest_id IN (
      SELECT id FROM badge_quests
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete badge quest tasks"
  ON badge_quest_tasks
  FOR DELETE
  TO authenticated
  USING (
    quest_id IN (
      SELECT id FROM badge_quests
      WHERE created_by = auth.uid()
    )
  );

-- User Quest Progress RLS Policies
CREATE POLICY "Users can view their own quest progress"
  ON user_quest_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own quest progress"
  ON user_quest_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own quest progress"
  ON user_quest_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS badge_quests_created_by_idx ON badge_quests(created_by);
CREATE INDEX IF NOT EXISTS badge_quests_badge_id_idx ON badge_quests(badge_id);
CREATE INDEX IF NOT EXISTS badge_quest_tasks_quest_id_idx ON badge_quest_tasks(quest_id);
CREATE INDEX IF NOT EXISTS badge_quest_tasks_task_id_idx ON badge_quest_tasks(task_id);
CREATE INDEX IF NOT EXISTS user_quest_progress_user_id_idx ON user_quest_progress(user_id);
CREATE INDEX IF NOT EXISTS user_quest_progress_quest_id_idx ON user_quest_progress(quest_id);