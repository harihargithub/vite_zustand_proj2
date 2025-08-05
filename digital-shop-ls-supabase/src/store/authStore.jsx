// authStore.jsx a zustand store that stores the user authentication state and provides actions to login, logout, register, and reset the password. The store uses the supabase instance to interact with the Supabase database.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supaStore'


let authStore = (set) => ({
  isAuthenticated: false,
  user: null,
  initialize: async () => {
    // Try to restore user from Supabase session
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      set({ isAuthenticated: false, user: null });
      console.log('No active Supabase session');
    } else {
      set({ isAuthenticated: true, user: data.user });
      console.log('Restored user from Supabase session:', data.user);
    }
  },
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Error logging in:', error.message);
      return 'Invalid email or password';
    } else {
      set({ isAuthenticated: true, user: data.user });
      return 'Logged in successfully';
    }
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      set({ isAuthenticated: false, user: null });
    }
  },
  register: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('Error registering:', error.message);
    } else {
      set({ user: data.user });
    }
  },
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:5173/update-password'
    });
    if (error) {
      console.error('Error resetting password:', error.message);
    } else {
      console.log('Password reset email sent to:', email);
    }
  },
});

// persist the state with key "auth-store"
authStore = persist(authStore, { name: 'auth-store' });

// create the store
let useAuthStore = create(authStore);

export { useAuthStore };
export default useAuthStore;