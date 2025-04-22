# Supabase Data Export

Created: 2025-04-09T18:49:18.582Z

## Files
- profiles.json: ✅ 6 rows
- projects.json: ✅ 6 rows
- project_members.json: ✅ 0 rows
- notification_settings.json: ✅ 0 rows
- notification_logs.json: ✅ 0 rows
- api_keys.json: ✅ 4 rows
- business_plans.json: ✅ 3 rows
- tasks.json: ✅ 1 rows
- items.json: ✅ 4 rows
- schema.json: Simplified schema information
- export-summary.json: Export summary

## Migration Instructions

### Option 1: Importing via Supabase Dashboard
1. Go to the Supabase Dashboard of your new project
2. Navigate to the Table Editor for each table
3. Use the "Import" button to upload the respective JSON files

### Option 2: Using Supabase CLI (on your local machine)
1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Initialize Supabase for your project locally: `supabase init`
4. Link to your remote project: `supabase link --project-ref your-project-ref`
5. Create a SQL migration that inserts this data
6. Apply the migration: `supabase db push`

### Option 3: Programmatic Import
Use the Supabase JavaScript client to insert the data from these files into your new database.

> Note: You will also need to recreate custom functions, triggers, and policies in your new Supabase project.
