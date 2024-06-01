import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../hooks/supabase";
import "@syncfusion/ej2-layouts/styles/material.css";
import "@syncfusion/ej2-react-buttons/styles/material.css";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import "../productPreview.css"
import useStore from "../store/supaStore";

const ProductPreview = () => {
  const params = useParams();
  const [product, setProduct] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const isLoggedIn = useStore((state) => state.isLoggedIn);
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

  return (
    <div className="product-preview">
      {isLoading ? (
        <h1>Loading...</h1>
      ) : isProductFetched ? (
        <div>
          <div className="hero-image e-card">
            <img src={product.product_thumbnail} alt={product.product_name} />
          </div>
          <div className="product-details">
            <section className="e-card section-right">
              <h1>
                {product.product_name} | From: {userName}
              </h1>
              <div
                dangerouslySetInnerHTML={{ __html: product.product_details }}
              ></div>
            </section>
            <section className="e-card section-left">
              <h2>Price: ${product.product_price}</h2>
              {!isLoggedIn && (
                <ButtonComponent className="e-success">
                  Purchase
                </ButtonComponent>
              )}
            </section>
          </div>
        </div>
      ) : (
        <h1>No Product found</h1>
      )}
    </div>
  );
};

export default ProductPreview;