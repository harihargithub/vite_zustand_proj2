// productPreview.jsx under src/pages folder
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../hooks/supabase";
import "@syncfusion/ej2-layouts/styles/material.css";
import "@syncfusion/ej2-react-buttons/styles/material.css";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import "../productPreview.css"
import useStore from "../store/supaStore";
import useCartStore from "../store/cartStore"; // import the cart store
import { useNavigate } from "react-router-dom";

const ProductPreview = () => {
  const params = useParams();
  const [product, setProduct] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  const setCartItems = useCartStore((state) => state.setCartItems); // get the setCartItems function from the cart store
  const cartItems = useCartStore((state) => state.cartItems); // get the cartItems from the cart store
  const SupaBase = supabase;

  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: productData, error: productError } = await SupaBase
        .from("products")
        .select()
        .eq("id", params.id);

      if (productError) {
        throw productError;
      }

      setProduct(productData.length ? productData[0] : {});
    } catch (e) {
      console.error(`There was an error while fetching the product with the id:
        ${params.id}`, e);
    }
    setIsLoading(false);
  }, [params.id, SupaBase]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const isProductFetched = Object.keys(product).length > 0;

  const userMetaData = product?.user_details?.user_metadata;
  const userName = `${userMetaData?.firstName} ${userMetaData?.lastName}`;

  const navigate = useNavigate(); // add this line

  const handleAddToCart = () => {
    console.log('Product to add to cart:', product);
    const newItems = { ...cartItems, [product.id]: product };
    console.log('Cart items after adding:', newItems);
    setCartItems(newItems);
    navigate('/dashboard/cart');
  };

  return (
  <div className="product-preview">
    {isLoading ? (
      <h1>Loading...</h1>
    ) : isProductFetched ? (
      <div>
        <section className="e-card section-left">
          <h2>Name: {product.product_name}</h2>
          <h2>Price: ${product.product_price}</h2>
          <h3>Seller: {userName}</h3>
          <img src={product.product_thumbnail} alt={product.product_name} />
          <p>Offering: {product.product_offering}</p>
          {isLoggedIn && (
            <ButtonComponent className="e-success" onClick={handleAddToCart}>
              Add to Cart
            </ButtonComponent>
          )}
        </section>
      </div>
    ) : (
      <h1>No Product found</h1>
    )}
  </div>
);
};

export default ProductPreview;