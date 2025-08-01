import PropTypes from 'prop-types';
import "@syncfusion/ej2-layouts/styles/material.css";
import "@syncfusion/ej2-react-inputs/styles/material.css";
import "@syncfusion/ej2-react-buttons/styles/material.css";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { useState, useRef, useEffect } from "react";
import "../../src/productAdd.css";
import TextEditor from "../../src/components/TextEditor";
import { supabase } from "../../hooks/supabase"
import Toast from "../components/toast"
import { useParams } from 'react-router-dom';

const ProductEdit = () => {
  const { id } = useParams();
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
      } else {
        const {
          product_name,
          product_price,
          product_thumbnail,
          product_offering,
          product_details,
        } = data;

        console.log('fetched product:', data)

        setProductName(product_name);
        setProductPrice(product_price);
        setProductThumbnail(product_thumbnail);
        setProductOffering(product_offering);
        productDescriptionRef.current.value = product_details;
      }
    };

    fetchProduct();
  }, [id]);

  const handleClick = async () => {
  const productDetails = productDescriptionRef.current.value;
  const { error } = await SupaBase
    .from('products')
    .update({
      product_name: productName,
      product_price: productPrice,
      product_thumbnail: productThumbnail,
      product_offering: productOffering,
      product_details: productDetails,
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating product:', error);
    setToast({
      show: true,
      message: 'Error updating product',
      type: 'error',
    });
  } else {
    setToast({
      show: true,
      message: 'Product updated successfully',
      type: 'success',
    });
  }
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
      className="e-info save-btn e-block e-large"
      onClick={handleClick}
    >
      Update
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

ProductEdit.propTypes = {
    product: PropTypes.object.isRequired,
  };

// To address the warning, you need to either provide the required `product` prop to `ProductEdit` or make the prop optional if it's not always required. 
// Assuming `product` prop is not always required, you can make it optional by removing `.isRequired`:

ProductEdit.propTypes = {
  product: PropTypes.object,
};

export default ProductEdit;