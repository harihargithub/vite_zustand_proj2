// UpdatePassword.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../store/supaStore';

const UpdatePassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Handle the auth callback when user clicks the email link
        const handleAuthCallback = async () => {
            // Check if there's an error in the URL (like expired token)
            const hashParams = new URLSearchParams(location.hash.substring(1));
            const error = hashParams.get('error');
            
            if (error) {
                if (error === 'access_denied') {
                    setMessage('Password reset link has expired. Please request a new one.');
                    setTimeout(() => {
                        navigate('/reset-password');
                    }, 3000);
                    return;
                }
            }

            // Check for valid session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                setMessage('Invalid or expired reset link. Please request a new one.');
                setTimeout(() => {
                    navigate('/reset-password');
                }, 3000);
            }
        };

        handleAuthCallback();
    }, [location, navigate]);

    const handleUpdatePassword = async () => {
        if (password !== confirmPassword) {
            setMessage('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setMessage('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        setMessage('');

        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            console.error('Error updating password:', error.message);
            setMessage(`Error: ${error.message}`);
        } else {
            setMessage('Password updated successfully!');
            // Sign out the user after password update
            await supabase.auth.signOut();
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        }

        setIsLoading(false);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
            <h2>Update Password</h2>
            
            {message && (
                <p style={{ 
                    marginTop: '10px', 
                    marginBottom: '15px',
                    color: message.includes('Error') || message.includes('Invalid') || message.includes('expired') ? 'red' : 'green' 
                }}>
                    {message}
                </p>
            )}

            <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            <button 
                onClick={handleUpdatePassword}
                disabled={isLoading || !password || !confirmPassword}
                style={{ width: '100%', padding: '10px' }}
            >
                {isLoading ? 'Updating...' : 'Update Password'}
            </button>
        </div>
    );
};

export default UpdatePassword;