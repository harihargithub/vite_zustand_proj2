// cart.jsx
import "../productList.css";
import useCartStore from "../store/cartStore";
import useStore from "../store/supaStore";
import BrowserWrapper from "../components/browserWrapper";
import DataGrid from "../components/DataGrid/index";
import { Link } from "react-router-dom";
import "../cart.css";
import PropTypes from "prop-types";
import { supabase } from '../../hooks/supabase';
import { useEffect } from "react";

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

  console.log('Cart items before passing to DataGrid:', cartItems);

  useEffect(() => {
    console.log(supabase.auth.user);
  }, []);

  return (
    <BrowserWrapper>
      <div className="cart-items">
        <DataGrid data={cartItems} ActionsTemplate={ActionsTemplate} />
        <div className="purchase-area">
          {isLoggedIn ? (
            <div>
              <Link to="/browse">Continue to Purchase</Link>
              {Object.keys(items).length > 0 && <Link to="/app/checkout">Checkout</Link>}
            </div>
          ) : (
            <Link to="/login">Login to purchase</Link>
          )}
        </div>
      </div>
    </BrowserWrapper>
  );
};

export default Cart;