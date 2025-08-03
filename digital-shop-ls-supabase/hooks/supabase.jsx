// hooks/supabase.jsx a file that contains the supabase client instance that is used to interact with the supabase database. The supabase client instance is created using the createClient function from the @supabase/supabase-js package. The createClient function takes two arguments, the first argument is the Supabase URL and the second argument is the Supabase anonymous key. The Supabase URL and the Supabase anonymous key are used to authenticate the client with the Supabase database.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ylejufhvtxwocyqbhhfw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZWp1Zmh2dHh3b2N5cWJoaGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxOTMxNTUsImV4cCI6MjA2OTc2OTE1NX0.vtHFieJOjc4WCztbaEwjhN2ADfCbDxUL-glkliO5zYk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);