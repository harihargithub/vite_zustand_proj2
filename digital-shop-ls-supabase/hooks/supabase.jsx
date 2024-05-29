// hooks/supabase.jsx
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uyqzpgmjgigdwiygoagg.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cXpwZ21qZ2lnZHdpeWdvYWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQyNzQ4NzcsImV4cCI6MjAxOTg1MDg3N30.VZReJ6rNWwwuIQOP9usjFaESlMzhahy970-AGM8SnF0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);