// authStore.jsx a zustand store that stores the user authentication state and provides actions to login, logout, register, and reset the password. The store uses the supabase instance to interact with the Supabase database.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import supabase from './supaStore'


let authStore = (set) => ({
  isAuthenticated: false,
  user: null,
  login: async (email, password) => {
    const { user, error } = await supabase.auth.signIn({ email, password });
    if (error) {
      console.error('Error logging in:', error.message);
      return 'Invalid email or password';
    } else {
      set({ isAuthenticated: true, user });
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
    const { user, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('Error registering:', error.message);
    } else {
      set({ user });
    }
  },
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, 'http://localhost:5173/update-password');
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

export default useAuthStore;