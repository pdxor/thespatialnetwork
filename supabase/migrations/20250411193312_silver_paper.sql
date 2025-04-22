/*
  # Create projects storage bucket

  1. New Storage Bucket
    - `projects` - For storing project images
  
  2. Security
    - Enable RLS on the bucket
    - Add policies for authenticated users to manage their own files
*/

-- Create the storage bucket for project images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('projects', 'projects', false)
ON CONFLICT (id) DO 
  UPDATE SET public = false;

-- Create policy to allow authenticated users to select project images
CREATE POLICY select_project_images
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'projects' AND (auth.uid() = owner OR owner IS NULL));

-- Create policy to allow authenticated users to insert their own project images
CREATE POLICY insert_project_images
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'projects' AND auth.uid() = owner);

-- Create policy to allow authenticated users to update their own project images
CREATE POLICY update_project_images
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'projects' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'projects' AND auth.uid() = owner);

-- Create policy to allow authenticated users to delete their own project images
CREATE POLICY delete_project_images
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'projects' AND auth.uid() = owner);