import "@syncfusion/ej2-layouts/styles/material.css";
import "@syncfusion/ej2-react-buttons/styles/material.css";
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-react-navigations/styles/material.css";
import "./wrapper.css";
import { Link, NavLink } from "react-router-dom";
import useStore from "../store/supaStore";
import useCartStore from "../store/cart";
import PropTypes from "prop-types";

const BrowserWrapper = ({ children }) => {
  const { isLoggedIn, firstName } = useStore((state) => state);
  const items = useCartStore((state) => state.items);
  
  return (
    <div className="wrapper">
      <header>
        <Link className="title" to="/" title="visit dashboard">
          Geva Digital Shop
        </Link>
        <div>
          {isLoggedIn ? (
            <span className="username">Hello {firstName}</span>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Login
            </NavLink>
          )}
          /  
          <NavLink
            to="/cart"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Cart ({Object.keys(items).length})
          </NavLink>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};

BrowserWrapper.propTypes = {
    children: PropTypes.node.isRequired,
    };

export default BrowserWrapper;