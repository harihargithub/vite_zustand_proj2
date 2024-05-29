// ResetPassword.jsx
import { useState } from 'react';
import { supabase } from '../store/supaStore';

const ResetPassword = () => {
    const [email, setEmail] = useState('');

    const handleResetPassword = async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, 'http://localhost:5173/update-password');
        if (error) {
            console.error('Error resetting password:', error.message);
        } else {
            console.log('Password reset link sent to:', email);
        }
    };

    return (
        <div>
            <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={handleResetPassword}>Reset Password</button>
        </div>
    );
};

export default ResetPassword;