import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';

interface AuthState {
  userId: string | null;
  engagementPoints: number;
  postsLikedToday: number;
  storiesViewedToday: number;
  epEarnedToday: number;
  setUserId: (userId: string | null) => void;
  initializeStats: () => Promise<void>;
  syncFromDatabase: () => Promise<void>;
  addPoints: (points: number, type: 'like' | 'story' | 'post') => Promise<number>;
}

/**
 * Store to handle user authentication state and engagement points tracking.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  engagementPoints: 0,
  postsLikedToday: 0,
  storiesViewedToday: 0,
  epEarnedToday: 0,

  setUserId: (userId) => set({ userId }),

  initializeStats: async () => {
    try {
      const today = new Date().toDateString();
      const lastReset = await SecureStore.getItemAsync('last_reset_date');
      
      if (lastReset !== today) {
        // Reset daily counters on a new day
        set({
          postsLikedToday: 0,
          storiesViewedToday: 0,
          epEarnedToday: 0,
        });
        await SecureStore.setItemAsync('last_reset_date', today);
      }
    } catch (error) {
      console.error('[AuthStore] Failed to initialize stats:', error);
    }
  },

  syncFromDatabase: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        set({ 
          engagementPoints: data.engagement_points || 0,
          userId: data.id || get().userId
        });
      }
    } catch (error) {
      console.error('[AuthStore] Failed to sync from database:', error);
    }
  },

  addPoints: async (points: number, type: 'like' | 'story' | 'post') => {
    const currentState = get();
    const newTotal = (currentState.engagementPoints || 0) + points;
    const newDaily = (currentState.epEarnedToday || 0) + points;
    
    const updates: Partial<AuthState> = {
      engagementPoints: newTotal,
      epEarnedToday: newDaily,
    };

    if (type === 'like') updates.postsLikedToday = (currentState.postsLikedToday || 0) + 1;
    if (type === 'story') updates.storiesViewedToday = (currentState.storiesViewedToday || 0) + 1;

    set(updates);
    return newTotal;
  },
}));

export default useAuthStore;