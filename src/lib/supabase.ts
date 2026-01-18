import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eawumdjrcwvydvfejkwo.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhd3VtZGpyY3d2eWR2ZmVqa3dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Mjk4MjYsImV4cCI6MjA4NDMwNTgyNn0.QiU6xU41HPmkgEIAgjO_Nv5dV2jEpLdK11pTKTk10HY';

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };