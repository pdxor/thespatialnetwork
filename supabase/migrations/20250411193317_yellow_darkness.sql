/*
  # Add image_url to projects table

  1. Changes
    - Add image_url column to projects table to store project images
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add image_url column to projects table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN image_url TEXT DEFAULT NULL;
  END IF;
END $$;