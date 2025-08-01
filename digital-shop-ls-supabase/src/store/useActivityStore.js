import { create } from 'zustand';

export const useActivityStore = create((set) => ({
  activityList: [],
  isLoading: false,

  searchActivities: async (params) => {
    set({ isLoading: true });

    try {
      // Fetch all activities and filter on client side for better search functionality
      const res = await fetch(`http://localhost:3001/activities`);
      const data = await res.json();

      // Filter results on client side for case-insensitive partial matching
      const filtered = data.filter(activity => 
        activity.name.toLowerCase().includes(params.keyword.toLowerCase())
      );

      set({ activityList: filtered });
    } catch (err) {
      console.error('Search failed:', err);
      set({ activityList: [] });
    } finally {
      set({ isLoading: false });
    }
  },
}));