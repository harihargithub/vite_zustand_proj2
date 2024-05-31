import "../productList.css";

import { Link } from "react-router-dom";
import useProducts from "../../hooks/useProduct";
import productStore from "../store/products";
import useCartStore from "../store/cartStore";
import DataGrid from "../components/DataGrid/index";
import BrowserWrapper from "../components/browserWrapper";

const Browse = () => {
  useProducts();
  const productsList = productStore((state) => state.productsList);
  const setCartItems = useCartStore((state) => state.setCartItems);

  const addProductToCart = (product) => {
    setCartItems({ [product.id]: product });
  };

  const ActionsTemplate = (e) => {
    return (
      <span>
        <span onClick={() => addProductToCart(e)} className="edit-product">
          Add to cart
        </span>
        / 
        <Link to={`/product/${e.id}`} title={`preview ${e.Name}`}>
          Preview
        </Link>
      </span>
    );
  };

  return (
    <BrowserWrapper>
      <div className="product-list">
        <DataGrid data={productsList} ActionsTemplate={ActionsTemplate} />
      </div>
    </BrowserWrapper>
  );
};

export default Browse;