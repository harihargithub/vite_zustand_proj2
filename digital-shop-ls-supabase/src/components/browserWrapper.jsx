// browserWrapper.jsx under src/components folder that contains the BrowserWrapper component that is used to wrap the main content of the application. The BrowserWrapper component contains the header and main content of the application. The header contains the title of the application and the user's name if the user is logged in. The BrowserWrapper component also contains the children prop that is used to render the child components of the BrowserWrapper component. The BrowserWrapper component also contains the login and cart links that are used to navigate to the login and cart pages respectively. The BrowserWrapper component uses the useStore and useCartStore hooks to get the isLoggedIn, firstName, and items values from the store. The BrowserWrapper component also uses the Link and NavLink components from the react-router-dom library to create the links to the login and cart pages. The BrowserWrapper component also uses the PropTypes library to define the prop types of the BrowserWrapper component. wrapper class is used to style the BrowserWrapper component and it is defined in the wrapper.css file. 
import "@syncfusion/ej2-layouts/styles/material.css";
import "@syncfusion/ej2-react-buttons/styles/material.css";
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-react-navigations/styles/material.css";
import "../wrapper.css";
import { Link, NavLink } from "react-router-dom";
import useStore from "../store/supaStore";
import useCartStore from "../store/cartStore";
import PropTypes from "prop-types";

const BrowserWrapper = ({ children }) => {
  const { isLoggedIn, firstName } = useStore((state) => state);
  const items = useCartStore((state) => state.items);
  
  return (
    <div className="wrapper">
      <header>
        <Link className="title" to="/" title="visit dashboard">
          HSVJ Digital Shop
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