//productAdd.jsx under src/pages folder
import "@syncfusion/ej2-layouts/styles/material.css";
import "@syncfusion/ej2-react-inputs/styles/material.css";
import "@syncfusion/ej2-react-buttons/styles/material.css";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { useState, useRef } from "react";
import "../../src/productAdd.css"
import TextEditor from "../components/TextEditor";
import { supabase } from "../../hooks/supabase";
import Toast from "../components/toast";
import productStore from "../store/products";

const ProductAdd = () => {
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productThumbnail, setProductThumbnail] = useState("");
  const [productOffering, setProductOffering] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "error",
  });
  const productDescriptionRef = useRef();
  const SupaBase = supabase;
  const { productsList, setProductsList } = productStore((state) => state);

  const handleClick = async () => {
    try {
      const productDetails = productDescriptionRef.current.value;
      if (
        productName ||
        productPrice ||
        productThumbnail ||
        productDetails ||
        productOffering
      ) {
        const { data, error: userError } = await SupaBase.auth.getSession();
        const { session } = data;

        const { data: newProduct, error: productError } = await SupaBase
          .from("products")
          .insert({
            product_name: productName,
            product_price: productPrice,
            product_thumbnail: productThumbnail,
            product_details: productDetails,
            product_offering: productOffering,
            user_details: session?.user,
            user_id: session?.user?.id,
          })
          .select();

        setProductsList([...productsList, ...newProduct]);

        setToast({
          message: "Successfully added a product",
          show: true,
          type: "success",
        });

        resetState();
      } else {
        console.log("Product detials missing");
      }
    } catch (e) {
      console.error("An error occurred", e);
    }
  };

  const resetState = () => {
    setProductName("");
    setProductPrice("");
    setProductThumbnail("");
    setProductOffering("");
    productDescriptionRef.current.value = "";
  };

  return (
    <div>
      <div className="row">
        <div className="field-area">
          <label htmlFor="product-name">Name *</label>
          <input
            className="e-input"
            type="text"
            placeholder="product name..."
            name="product-name"
            id="product-name"
            onChange={(e) => setProductName(e.target.value)}
            value={productName}
            required
          />
        </div>

        <div className="field-area">
          <label htmlFor="product-price">Price *</label>
          <input
            className="e-input"
            type="number"
            placeholder="product price..."
            name="product-price"
            id="product-price"
            onChange={(e) => setProductPrice(e.target.value)}
            value={productPrice}
            required
          />
        </div>

        <div className="field-area">
          <label htmlFor="product-thumbnail">Product URL *</label>
          <input
            className="e-input"
            type="url"
            placeholder="product thumbnail url..."
            name="product-thumbnail"
            id="product-thumbnail"
            onChange={(e) => setProductThumbnail(e.target.value)}
            value={productThumbnail}
            required
          />
        </div>

        <div className="field-area">
          <label htmlFor="product-offering">Product offering *</label>
          <input
            className="e-input"
            type="url"
            placeholder="product offering"
            name="product-offering"
            id="product-offering"
            onChange={(e) => setProductOffering(e.target.value)}
            value={productOffering}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="product-description" className="product-desc">
          Brief description
        </label>
        <TextEditor id="product-description" ref={productDescriptionRef} />
      </div>

      <ButtonComponent
        className="e-success save-btn e-block e-large"
        onClick={handleClick}
      >
        Save
      </ButtonComponent>
      {toast.show && (
        <Toast
          errorMessage={toast.message}
          type={toast.type}
          onClose={() => {
            setToast({
              show: false,
              message: "",
              type: "error",
            });
          }}
        />
      )}
    </div>
  );
};

export default ProductAdd;