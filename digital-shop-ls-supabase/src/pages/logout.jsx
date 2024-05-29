import React from 'react';
import useStore from '../store/supaStore';
import { supabase } from '../../hooks/supabase';

const Logout = () => {
  const logout = useStore((state) => state.logout);
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  const [isLogoutComplete, setIsLogoutComplete] = React.useState(false);

  const handleLogout = async () => {
    console.log('handleLogout called');
    await logout();
    console.log('Logged out');

    // Log the user out of Supabase
    await supabase.auth.signOut();

    // Wait a bit before checking the user's status
    setTimeout(() => {
      // Check if the user is logged out
      const user = supabase.auth.user;
      if (!user) {
        console.log('User is logged out');
      } else {
        console.log('User is logged in');
      }

      // Update the state indicating that logout is complete
      setIsLogoutComplete(true);
    }, 1000);
  };

  return isLoggedIn ? (
    <>
      <button onClick={handleLogout}>Confirm Logout</button>
      {isLogoutComplete && <div>Logout complete</div>}
    </>
  ) : null;
};

export default Logout;
