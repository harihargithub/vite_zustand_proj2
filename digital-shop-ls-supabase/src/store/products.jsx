//products.jsx under src/store folder
import { create } from "zustand";

let store = (set) => ({
  productsList: [],
  setProductsList: (productsList) => set(() => ({ productsList })),
});

//create the store
let productStore = create(store);

export default productStore;