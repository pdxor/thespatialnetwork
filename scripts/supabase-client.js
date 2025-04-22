import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config(); // loads from .env into process.env

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
