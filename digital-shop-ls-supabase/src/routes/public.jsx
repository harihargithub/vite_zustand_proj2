// public.jsx
import { Outlet } from 'react-router-dom';
import useStore from '../store/supaStore';

const Public = () => {
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  return isLoggedIn ? null : <Outlet />; // return the Outlet component if the user is not logged in else return null. The Outlet component is used to render the child routes of the current route. Here th Outlet components are the child routes of the public route. eg. /login, /signup, /forgot-password etc. 
};

export default Public;
