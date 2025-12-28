import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '@/types';

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  cartCount: number;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  clearItems: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartCount: 0,

      addToCart: (product, quantity = 1) => {
        const existingItem = get().items.find(
          (item) => item.product.id === product.id
        );

        let updatedItems;
        if (existingItem) {
          updatedItems = get().items.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          updatedItems = [...get().items, { product, quantity }];
        }

        // Filter out items with zero or negative quantity
        updatedItems = updatedItems.filter(item => item.quantity > 0);

        set({
          items: updatedItems,
          cartCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        });
      },

      removeFromCart: (productId) => {
        const updatedItems = get().items.filter(
          (item) => item.product.id !== productId
        );
        set({
          items: updatedItems,
          cartCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        });
      },

      clearItems: () => {
        set({ items: [], cartCount: 0 });
      },
    }),
    {
      name: 'cart-storage', // Unique name for the storage item
      storage: createJSONStorage(() => AsyncStorage), // Use AsyncStorage for React Native
      // Only persist the 'items' array. 'cartCount' will be recalculated on load.
      partialize: (state) => ({ items: state.items }),
      // This function runs after the state is rehydrated from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.cartCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
        }
      },
    }
  )
);
