// private.jsx
import { Outlet, Navigate } from 'react-router-dom';
import useStore from '../store/supaStore';

const Private = () => {
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
};

export default Private;
