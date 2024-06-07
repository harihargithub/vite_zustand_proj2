//Wrapper.jsx under src/components folder
import "@syncfusion/ej2-layouts/styles/material.css";
import "@syncfusion/ej2-react-buttons/styles/material.css";
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-react-navigations/styles/material.css";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import "../wrapper.css";
import { Link, NavLink } from "react-router-dom";
import { SidebarComponent } from "@syncfusion/ej2-react-navigations";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import useStore from "../store/supaStore";

const Wrapper = ({ children }) => {
  const navigate = useNavigate();
  const { firstName } = useStore((state) => state);

 const handleLogout = () => {
    navigate("/logout");
  }

  return (
    <div className="wrapper">
      <header>
        <Link className="title" to="/dashboard" title="visit dashboard">
          HSVJ Digital Shop
        </Link>
        <span className="username">Hi {firstName}</span>
      </header>
      <main>
        <SidebarComponent id="default-sidebar" className="e-card sidebar">
          <nav>
            <ul className="menu">
              <li>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard/manage-products"
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  Manage Products
                </NavLink>
              </li>
            </ul>
          </nav>
          <ButtonComponent
            cssClass="e-danger e-block"
            onClick={handleLogout}
            style={{ fontSize: "1.2em" }}
          >
            Logout
          </ButtonComponent>
        </SidebarComponent>
        <section className="e-card" id="main-area">
          {children}
        </section>
      </main>
    </div>
  );
};

Wrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Wrapper;
