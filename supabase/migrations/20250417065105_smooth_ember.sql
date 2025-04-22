/*
  # Create badges storage bucket

  1. New Storage Bucket
    - `badges` - For storing badge images
  
  2. Security
    - Enable RLS on the bucket
    - Add policies for authenticated users to manage badge images
*/

-- Create the storage bucket for badge images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('badges', 'badges', true)
ON CONFLICT (id) DO 
  UPDATE SET public = true;

-- Create policies conditionally to avoid "already exists" errors
DO $$
BEGIN
  -- Check if the policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow users to read badge images'
  ) THEN
    CREATE POLICY "Allow users to read badge images"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'badges');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow users to upload badge images'
  ) THEN
    CREATE POLICY "Allow users to upload badge images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'badges' AND auth.uid() = owner);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow users to update badge images'
  ) THEN
    CREATE POLICY "Allow users to update badge images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'badges' AND auth.uid() = owner)
    WITH CHECK (bucket_id = 'badges' AND auth.uid() = owner);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow users to delete badge images'
  ) THEN
    CREATE POLICY "Allow users to delete badge images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'badges' AND auth.uid() = owner);
  END IF;
END $$;