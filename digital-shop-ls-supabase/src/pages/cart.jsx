import "../productList.css";
import useCartStore from "../store/cartStore";
import useStore from "../store/supaStore";
import BrowserWrapper from "../components/browserWrapper";
import DataGrid from "../components/DataGrid/index";
import { Link } from "react-router-dom";
import "../cart.css";
import PropTypes from "prop-types";

const Cart = () => {
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  const { items, updateCartItems } = useCartStore((state) => state);

  const removeCartItems = (product_id) => {
    const itemsClone = { ...items };
    delete itemsClone[product_id];
    updateCartItems(itemsClone);
  };

  const ActionsTemplate = ({ id }) => {
  return (
    <span onClick={() => removeCartItems(id)} className="edit-product">
      Remove
    </span>
  );
};

ActionsTemplate.propTypes = {
    id: PropTypes.number.isRequired,
  };

  const cartItems = Object.keys(items).map((e) => items[e]);

  return (
    <BrowserWrapper>
      <div className="cart-items">
        <DataGrid data={cartItems} ActionsTemplate={ActionsTemplate} />
        <div className="purchase-area">
          {isLoggedIn ? (
            <Link to={items.length === 0 ? "" : "/checkout"}>Continue to purchase</Link>
          ) : (
            <Link to="/login">Login to purchase</Link>
          )}
        </div>
      </div>
    </BrowserWrapper>
  );
};

export default Cart;