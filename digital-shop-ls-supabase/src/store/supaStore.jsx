//src/supaStore.jsx a zustand store that stores the user state and provides actions to update the user state and logout the user.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// import { createClient } from '@supabase/supabase-js';
import { supabase as importedSupabase } from '../../hooks/supabase';

export const supabase = importedSupabase; // export the supabase instance

let store = (set) => ({
  supabase,
  isLoggedIn: false,
  email: '',
  firstName: '',
  lastName: '',
  accessToken: '',
  setUserState: ({ isLoggedIn, email, firstName, lastName, accessToken }) =>
    set(() => ({ isLoggedIn, email, firstName, lastName, accessToken })),
  logout: async () => {
    console.log('logout action called');
    set({ isLoggedIn: false });

    // Log out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }

    // Update the state indicating that the user is logged out
    set({ isLoggedIn: false });
  },
});

//persist the state with key "randomKey" ie. the state will be stored in the local storage with the key "randomKey"
store = persist(store, { name: 'user-supaStore' });

//create the store
let useStore = create(store);

export default useStore;