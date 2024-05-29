// UpdatePassword.jsx
import { useState } from 'react';
import {supabase} from '../store/supaStore';

const UpdatePassword = () => {
    const [password, setPassword] = useState('');

    const handleUpdatePassword = async () => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            console.error('Error updating password:', error.message);
        } else {
            console.log('Password updated successfully');
        }
    };

    return (
        <div>
            <input
                type="password"
                placeholder="Your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleUpdatePassword}>Update Password</button>
        </div>
    );
};

export default UpdatePassword;