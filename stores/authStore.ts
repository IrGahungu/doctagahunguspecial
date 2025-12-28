import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  setUserId: (userId: string | null) => void;
}

/**
 * A simple store to hold the current user's session ID.
 */
export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  setUserId: (userId) => set({ userId }),
}));

export default useAuthStore;