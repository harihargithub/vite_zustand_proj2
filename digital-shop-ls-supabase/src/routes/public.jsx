// public.jsx
import { Outlet } from 'react-router-dom';
import useStore from '../store/supaStore';

const Public = () => {
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  return isLoggedIn ? null : <Outlet />;
};

export default Public;
