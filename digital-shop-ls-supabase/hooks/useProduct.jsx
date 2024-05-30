import { useEffect } from "react";
import { supabase } from "./supabase";
import productStore from "../store/products";

const useProducts = () => {
  const setProductsList = productStore((state) => state.setProductsList);
  const SupaBase = supabase();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data: userData, error: userError } = await SupaBase.auth.getSession();
        if (userError) throw userError;

        const { session } = userData;

        const { data: productData, error: productError } = await SupaBase
          .from("products")
          .select()
          .eq("user_id", session?.user?.id);

        if (productError) throw productError;

        setProductsList(productData);
      } catch (e) {
        console.error("Error while fetching products list", e);
      }
    };

    fetchProducts();
  }, [setProductsList, SupaBase]); // Added dependencies

  return {}; // return an object or value if needed
};

export default useProducts;