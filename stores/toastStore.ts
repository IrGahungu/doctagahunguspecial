import { create } from 'zustand';

interface ToastState {
  isVisible: boolean;
  message: string;
  showToast: (message: string, duration?: number) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  isVisible: false,
  message: '',
  showToast: (message, duration = 3000) => {
    set({ isVisible: true, message });
    setTimeout(() => set({ isVisible: false, message: '' }), duration);
  },
  hideToast: () => set({ isVisible: false, message: '' }),
}));

export default useToastStore;