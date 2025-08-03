// ResetPassword.jsx
import { useState } from 'react';
import { supabase } from '../store/supaStore';

const ResetPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleResetPassword = async () => {
        setIsLoading(true);
        setMessage('');
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'http://localhost:5173/update-password'
        });
        
        if (error) {
            console.error('Error resetting password:', error.message);
            setMessage(`Error: ${error.message}`);
        } else {
            console.log('Password reset link sent to:', email);
            setMessage('Password reset link sent! Check your email. The link will expire in 1 hour.');
        }
        
        setIsLoading(false);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
            <h2>Reset Password</h2>
            <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            <button 
                onClick={handleResetPassword}
                disabled={isLoading || !email}
                style={{ width: '100%', padding: '10px' }}
            >
                {isLoading ? 'Sending...' : 'Reset Password'}
            </button>
            {message && (
                <p style={{ marginTop: '10px', color: message.includes('Error') ? 'red' : 'green' }}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default ResetPassword;