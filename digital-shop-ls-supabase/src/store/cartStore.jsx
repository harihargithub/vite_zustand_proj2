//cartStore.jsx under src/store folder
import { create } from "zustand";
import { persist } from "zustand/middleware";

let store = (set) => ({
  items: {},
  setCartItems: (item) =>
	set((state) => ({ items: { ...state.items, ...item } })),
  updateCartItems: (items) => set(() => ({ items })),
  resetCart: () => set(() => ({ items: {} })),
});

//persist the state with key "randomKey"
store = persist(store, { name: "user-cart" });

//create the store
let useCartStore = create(store);

export default useCartStore;