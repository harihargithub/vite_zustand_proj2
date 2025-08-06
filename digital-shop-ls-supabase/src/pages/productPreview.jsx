//productPreview.jsx under src/pages folder
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../hooks/supabase";
import "@syncfusion/ej2-layouts/styles/material.css";
import "@syncfusion/ej2-react-buttons/styles/material.css";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import "../productPreview.css";
import useStore from "../store/supaStore";
import useCartStore from "../store/cartStore";
import { useNavigate } from "react-router-dom";

const ProductPreview = () => {
  const params = useParams();
  const [product, setProduct] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  const setCartItems = useCartStore((state) => state.setCartItems);
  const cartItems = useCartStore((state) => state.cartItems);
  const SupaBase = supabase;

  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: productData, error: productError } = await SupaBase
        .from("shop.products")
        .select()
        .eq("id", params.id);

      if (productError) {
        console.error('Error fetching product:', productError);
        throw productError;
      }

      console.log('Fetched product data:', productData);

      const product = productData.length ? productData[0] : {};
      if (product.product_thumbnail) {
        product.product_thumbnail = product.product_thumbnail.replace(/^"|"$/g, ''); // Remove leading and trailing double quotes
      }

      setProduct(product);

    } catch (e) {
      console.error(`There was an error while fetching the product with the id: ${params.id}`, e);
    }
    setIsLoading(false);
  }, [params.id, SupaBase]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const isProductFetched = Object.keys(product).length > 0;

  const userMetaData = product?.user_details?.user_metadata;
  const userName = `${userMetaData?.firstName || ''} ${userMetaData?.lastName || ''}`;

  const navigate = useNavigate();

  const handleAddToCart = () => {
    console.log(supabase.auth.user);
    console.log('Product to add to cart:', product);
    const newItems = { ...cartItems, [product.id]: product };
    console.log('Cart items after adding:', newItems);
    console.log(supabase.auth.user);
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
            <img src={product.product_thumbnail} alt={product.product_name} onError={(e) => console.error('Image error:', e)} />
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




