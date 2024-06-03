//cartStore.jsx under src/store folder
import { create } from "zustand";
import { persist } from "zustand/middleware";

let store = (set) => ({
  items: {},
  setCartItems: (item) => {
    console.log('Item to add to cart:', item); // Add this line
    set((state) => {
      const newItems = { ...state.items, ...item };
      console.log('Cart items in store after setting:', newItems);
      return { items: newItems };
    });
  },
  
  updateCartItems: (items) => set(() => ({ items })),
  resetCart: () => set(() => ({ items: {} })),
});

store = persist(store, { name: "user-cart" });

let useCartStore = create(store);

console.log('Cart items in store after creating:', useCartStore.getState().items);

export default useCartStore;