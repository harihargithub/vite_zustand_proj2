//productAdd.jsx under src/pages folder
import "@syncfusion/ej2-layouts/styles/material.css";
import "@syncfusion/ej2-react-inputs/styles/material.css";
import "@syncfusion/ej2-react-buttons/styles/material.css";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { useState, useRef, useEffect } from "react";
import "../../src/productAdd.css"
import TextEditor from "../components/TextEditor";
import { supabase } from "../../hooks/supabase";
import Toast from "../components/toast";
import productStore from "../store/products";
import { useBotProtection, useFormProtection } from "../hooks/useBotProtection";

const ProductAdd = () => {
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productThumbnail, setProductThumbnail] = useState("");
  const [productOffering, setProductOffering] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "error",
  });
  const productDescriptionRef = useRef();
  const SupaBase = supabase;
  const { productsList, setProductsList } = productStore((state) => state);

  // Bot protection hooks
  const { checkProtection } = useBotProtection({
    endpoint: '/api/products/add',
    method: 'POST',
    autoCheck: true,
    onBlocked: () => {
      setToast({
        message: "Access denied. Suspicious activity detected.",
        show: true,
        type: "error",
      });
    }
  });

  const { protectFormSubmission, initFormTiming } = useFormProtection('product-add');

  // Initialize form timing for bot detection
  useEffect(() => {
    initFormTiming();
  }, []);

  const handleClick = async () => {
    if (isSubmitting) return; // Prevent double submission
    
    try {
      setIsSubmitting(true);

      // Bot protection check
      const protectionResult = await protectFormSubmission({
        productName,
        productPrice,
        productThumbnail,
        productOffering,
        productDescription: productDescriptionRef.current?.value
      }, '/api/products/add');

      if (!protectionResult.success) {
        setToast({
          message: protectionResult.message || "Security check failed. Please try again.",
          show: true,
          type: "error",
        });
        return;
      }

      const { data, error: userError } = await SupaBase.auth.getSession();
      const { session } = data;

      // Check user role from user_roles table
      if (session?.user?.id) {
        const { data: userRole, error: roleError } = await SupaBase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (roleError && roleError.code !== 'PGRST116') {
          console.error('Error checking user role:', roleError);
          setToast({
            message: "Error checking user permissions. Please try again.",
            show: true,
            type: "error",
          });
          return;
        }

        // Prevent users with the 'staff' role from adding products
        if (userRole?.role === 'staff') {
          setToast({
            message: "Staff members are not allowed to add products.",
            show: true,
            type: "error",
          });
          return;
        }
      }

      // Proceed with adding a product if the user is not a 'staff' member
      const productDetails = productDescriptionRef.current.value;
      
      if (productName && productPrice && productThumbnail && productDetails && productOffering) {
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

        if (productError) {
          console.error("Product creation error:", productError);
          setToast({
            message: "Failed to add product. Please try again.",
            show: true,
            type: "error",
          });
          return;
        }

        setProductsList([...productsList, ...newProduct]);

        setToast({
          message: "Successfully added a product",
          show: true,
          type: "success",
        });

        resetState();
      } else {
        setToast({
          message: "Please fill in all required fields.",
          show: true,
          type: "error",
        });
      }
    } catch (e) {
      console.error("An error occurred", e);
      setToast({
        message: "An unexpected error occurred. Please try again.",
        show: true,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
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
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : 'Save'}
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