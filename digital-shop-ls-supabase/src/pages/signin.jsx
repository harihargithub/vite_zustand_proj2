import '@syncfusion/ej2-layouts/styles/material.css';
import '@syncfusion/ej2-react-inputs/styles/material.css';
import '@syncfusion/ej2-react-buttons/styles/material.css';
import '../signin.css';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { useState, useCallback } from 'react';
import { debounce } from 'lodash';
import Toast from '../components/toast';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/auth';

const Login = () => {
  // eslint-disable-next-line no-unused-vars
  const { login, loginData } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // helper function that checks email using regex
  const isValidEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  // function to validate email
  const validateEmail = useCallback((text) => {
    if (!!text && !isValidEmail(text)) {
      setInvalidEmail(true);
    } else {
      setInvalidEmail(false);
    }
  }, []);

  const debouncedValidateEmail = debounce(validateEmail, 1000);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    debouncedValidateEmail(e.target.value);
  };

  const handleSubmit = () => {
    if (!email || !password) {
      setShowToast(true);
    } else {
      login(email, password);
      console.log('logged in with:', email, password);
    }
  };

  return (
    <div className="e-card login-container">
      <h1 className="text-center">Welcome to HKS Digital Shop</h1>
      <h2 className="text-center">Login to continue</h2>
      <div className="field-area">
        <label htmlFor="email"></label>
        <input
          className="e-input"
          type="email"
          placeholder="Your email*..."
          name="email"
          id="email"
          onChange={handleEmailChange}
          value={email}
          required
        />
        {invalidEmail && (
          <p className="error">Please enter a valid email address</p>
        )}
      </div>
      <div className="field-area">
        <label htmlFor="password"></label>
        <input
          className="e-input"
          type="password"
          placeholder="Your password*..."
          name="password"
          id="password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          required
        />
      </div>
      <div
        style={{
          width: '120px',
          margin: '20px auto 0 auto',
        }}
      >
        <ButtonComponent
          cssClass="e-success e-block"
          type="submit"
          onClick={handleSubmit}
          style={{ fontSize: '1.2em' }}
        >
          Login
        </ButtonComponent>
      </div>
      {showToast && (
        <Toast
          errorMessage={'Please enter valid credentials'}
          type={'error'}
          onClose={() => {
            setShowToast(false);
          }}
        />
      )}
      <span className="text-center" style={{ marginTop: '1em' }}>
        Do not have an account? <Link to="/signup">signUp</Link>
      </span>
      <span className="text-center" style={{ marginTop: '1em' }}>
        Forgot your password? <Link to="/reset-password">Reset Password</Link>
      </span>
    </div>
  );
};

export default Login;
