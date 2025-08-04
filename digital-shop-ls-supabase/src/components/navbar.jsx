// Navbar.jsx
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import './navbar.css';

const Navbar = () => {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Digital Shop</Link>
      </div>
      
      <div className="navbar-menu">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/browse" className="nav-link">Browse</Link>
            <Link to="/dashboard/billing" className="nav-link">Billing</Link>
            <Link to="/dashboard/usage-analytics" className="nav-link">Analytics</Link>
            <Link to="/dashboard/resource-distribution" className="nav-link">API Status</Link>
            {user?.role === 'admin' && (
              <Link to="/dashboard/admin" className="nav-link admin">Admin Panel</Link>
            )}
            <Link to="/logout" className="nav-link logout">Logout</Link>
          </>
        ) : (
          <>
            <Link to="/browse" className="nav-link">Browse</Link>
            <Link to="/register" className="nav-link">Register</Link>
            <Link to="/login" className="nav-link">Login</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
