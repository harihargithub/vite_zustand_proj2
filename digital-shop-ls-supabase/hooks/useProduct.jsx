//useProduct.jsx under hooks folder that contains the useProducts hook that fetches the products list from the Supabase database and sets the products list in the products store. The useProducts hook uses the supabase client instance to interact with the Supabase database. The useProducts hook returns an empty object or value if needed because it only fetches the products list and sets the products list in the products store so it does not need to return anything.
import { supabase } from "./supabase";
import productStore from "../src/store/products";
import { useEffect, useState } from "react";

const useProducts = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const setProductsList = productStore((state) => state.setProductsList);
  const SupaBase = supabase;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data: userData, error: userError } = await SupaBase.auth.getSession();
        if (userError) throw userError;

        const { session } = userData;

        const { data: productData, error: productError } = await SupaBase
          .schema("shop") // <-- explicitly set schema
          .from("products")
          .select()
          .eq("user_id", session?.user?.id);
        console.log("Current user ID:", session?.user?.id);
        if (productError) throw productError;

        setProductsList(productData);
        console.log('Data fetched:', productData); // Log the data here
      } catch (e) {
        console.error("Error while fetching products list", e);
        setError(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [setProductsList, SupaBase]); // Added dependencies

  return { loading, error }; // return loading state and error
};

export default useProducts;