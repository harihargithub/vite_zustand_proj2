// hooks/auth.jsx a file that contains the useAuth hook that provides functions to sign up and log in a user. The useAuth hook uses the supabase client instance to interact with the Supabase database. The useAuth hook returns the signupData, loginData, and error states that can be used to display the signup and login data and any errors that occur during the signup and login process.
import { supabase } from '../hooks/supabase'; // Import supabase as a named export
import useStore from '../src/store/supaStore';
import { useState } from 'react';


const useAuth = () => {
  const [signupData, setSignupData] = useState(null);
  const [loginData, setLoginData] = useState(null);
  const [error, setError] = useState(null);

  const setUserState = useStore((state) => state.setUserState);

  const signup = async (email, password, firstName, lastName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            firstName,
            lastName,
          },
        },
      });
      if (!error) {
        setSignupData(data);
      } else {
        setError(error);
      }
    } catch (e) {
      console.error('Error while creating an user please try agaiin!');
      setError(e);
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error) {
        const { session, user } = data;
        setLoginData(data);
        setUserState({
          isLoggedIn: true,
          email: user.email,
          firstName: user.user_metadata.firstName,
          lastName: user.user_metadata.lastName,
          accessToken: session.access_token,
        });
      } else {
        setError(error);
      }
    } catch (error) {
      console.error('Invalid credenntials', error);
      setError(error);
    }
  };

  return { login, loginData, signup, signupData, error };
};

export default useAuth;
