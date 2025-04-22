-- Create badges table if it doesn't exist
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

-- Create trigger for updated_at timestamp only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_badges_updated_at'
  ) THEN
    CREATE TRIGGER update_badges_updated_at
    BEFORE UPDATE ON badges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view all badges' AND tablename = 'badges'
  ) THEN
    DROP POLICY "Users can view all badges" ON badges;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can create badges' AND tablename = 'badges'
  ) THEN
    DROP POLICY "Users can create badges" ON badges;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update their own badges' AND tablename = 'badges'
  ) THEN
    DROP POLICY "Users can update their own badges" ON badges;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete their own badges' AND tablename = 'badges'
  ) THEN
    DROP POLICY "Users can delete their own badges" ON badges;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view all user badges' AND tablename = 'user_badges'
  ) THEN
    DROP POLICY "Users can view all user badges" ON user_badges;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can insert badges they''ve earned' AND tablename = 'user_badges'
  ) THEN
    DROP POLICY "Users can insert badges they've earned" ON user_badges;
  END IF;
END $$;

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

-- Configure storage for badge images
-- Enable RLS on storage buckets and objects
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create badges bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('badges', 'badges', true)
ON CONFLICT (id) DO 
  UPDATE SET public = true;

-- Create policies for storage buckets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow users to create badge bucket' AND tablename = 'buckets' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow users to create badge bucket"
    ON storage.buckets
    FOR INSERT
    TO authenticated
    WITH CHECK (id = 'badges');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow users to access badge bucket' AND tablename = 'buckets' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow users to access badge bucket"
    ON storage.buckets
    FOR SELECT
    TO authenticated
    USING (id = 'badges');
  END IF;
END $$;

-- Create policies for storage objects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow users to upload badge images' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow users to upload badge images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'badges'
      AND owner = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow users to read badge images' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow users to read badge images"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'badges');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow users to update badge images' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow users to update badge images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'badges'
      AND owner = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow users to delete badge images' AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow users to delete badge images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'badges'
      AND owner = auth.uid()
    );
  END IF;
END $$;