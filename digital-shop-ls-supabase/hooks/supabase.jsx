// hooks/supabase.jsx a file that contains the supabase client instance that is used to interact with the supabase database. The supabase client instance is created using the createClient function from the @supabase/supabase-js package. The createClient function takes two arguments, the first argument is the Supabase URL and the second argument is the Supabase anonymous key. The Supabase URL and the Supabase anonymous key are used to authenticate the client with the Supabase database.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uyqzpgmjgigdwiygoagg.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cXpwZ21qZ2lnZHdpeWdvYWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQyNzQ4NzcsImV4cCI6MjAxOTg1MDg3N30.VZReJ6rNWwwuIQOP9usjFaESlMzhahy970-AGM8SnF0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);