// hooks/supabase.jsx a file that contains the supabase client instance that is used to interact with the supabase database. The supabase client instance is created using the createClient function from the @supabase/supabase-js package. The createClient function takes two arguments, the first argument is the Supabase URL and the second argument is the Supabase anonymous key. The Supabase URL and the Supabase anonymous key are used to authenticate the client with the Supabase database.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);