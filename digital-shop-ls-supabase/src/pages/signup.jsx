//signup.jsx
import '@syncfusion/ej2-layouts/styles/material.css';
import '@syncfusion/ej2-react-inputs/styles/material.css';
import '@syncfusion/ej2-react-buttons/styles/material.css';
import '../App.css';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { useState, useCallback, useEffect } from 'react';
import { debounce } from 'lodash';
import Toast from '../components/toast';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/auth';

const Signup = () => {
  console.log('signup component is being rendered');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [passwordMatching, setPasswordMatching] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'error',
  });
  const { signup, signupData } = useAuth();

  // helper function that checks email using regex
  const isValidEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  function isPasswordValid(password) {
    // Check if password is alphanumeric and has a minimum length of 6
    return /^[a-z0-9]{6,}$/i.test(password);
  }

  // function to validate email
  const validateEmail = useCallback((text) => {
    const debounced = debounce(() => {
      if (!!text && !isValidEmail(text)) {
        setInvalidEmail(true);
      } else {
        setInvalidEmail(false);
      }
    }, 1000);
    debounced();
  }, []);

  const handleEmailChange = useCallback((text) => {
    setEmail(text);
    const debounced = debounce(() => {
      const isValid = isValidEmail(text);
      setInvalidEmail(!isValid);
    }, 1000);
    debounced();
  }, []);

  useEffect(() => {
    console.log('Signup useEffect called, signupData:');
    validateEmail(email);
  }, [email, validateEmail]);

  // monitor change of re-entered password
  useEffect(() => {
    // if both the passwords mismatch, update the state to show error
    if (password && repassword && password !== repassword) {
      setPasswordMatching(false);
    } else {
      setPasswordMatching(true);
    }
  }, [repassword, password]);

  // on signup
  const handleSubmit = () => {
    console.log('signup button clicked');
    // if the required fields are empty
    if (!firstName || !lastName || !email || !password) {
      // show toast message
      setToast({
        message: 'Required fields are missing',
        show: true,
        type: 'error',
      });
    } else if (!isPasswordValid(password)) {
      // show toast message
      setToast({
        message: 'Password must be alphanumeric and have a minimum length of 6',
        show: true,
        type: 'error',
      });
    } else {
      // initiate signup
      signup(email, password, firstName, lastName);
    }
  };

  // monitor the change in data after signup
  useEffect(() => {
    // if user is successfully authenticated
    if (signupData?.user?.role === 'authenticated') {
      // show toast message
      setToast({
        message: 'Successfully signed up',
        show: true,
        type: 'success',
      });

      // and redirect to the login page
      setTimeout(() => {
        navigate('/Login');
      }, 2000);
    }
  }, [signupData, navigate]);

  return (
    <div className="control-pane">
      <div className="control-section card-control-section basic_card_layout">
        <div className="e-card-resize-container">
          <div className="row">
            <div className="row card-layout">
              <div className="col-xs-6 col-sm-6 col-lg-6 col-md-6">
                <div className="e-card" id="basic_card">
                  <div className="e-card-header">
                    <div className="e-card-header-caption">
                      <div className="e-card-title">
                        Welcome to HSVJ Digital Shop
                      </div>
                      <div className="e-card">
                        <h1 className="e-card-sub-title">
                          Signup to sell any digital product
                        </h1>
                      </div>
                    </div>
                  </div>
                  <div className="e-card-content input-container">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                    />
                    {invalidEmail && (
                      <span style={{ color: 'red' }}>
                        Please enter a valid email.
                      </span>
                    )}
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <input
                      type="password"
                      placeholder="Re-enter Password"
                      value={repassword}
                      onChange={(e) => setRepassword(e.target.value)}
                    />
                  </div>
                  {repassword && !passwordMatching && (
                    <span className="text-center" style={{ color: 'red' }}>
                      Entered passwords does not match
                    </span>
                  )}
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
                      Signup
                    </ButtonComponent>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast.show && (
        <Toast
          errorMessage={toast.message}
          type={toast.type}
          onClose={() => {
            console.log('toast onClose called');
            setToast({
              show: false,
              message: '',
              type: 'error',
            });
          }}
        />
      )}
      <span className="text-center" style={{ marginTop: '1em' }}>
        Already have an account? <Link to="/Login">login</Link>
      </span>
    </div>
  );
};

export default Signup;
