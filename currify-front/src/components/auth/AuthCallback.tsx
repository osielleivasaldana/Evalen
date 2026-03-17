import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

const AuthCallback: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            const params = new URLSearchParams(location.search);
            const token = params.get('token');
            const isNew = params.get('new') === 'true';

            if (token) {
                // Manually store token (since we don't have loginWithToken exposed yet, or we'll use a public method)
                // Ideally, apiService should have a method for this.
                // Assuming apiService.setToken(token) exists or we access localStorage directly if apiService allows.
                // Use apiService.setToken to update both the instance and localStorage
                apiService.setToken(token);

                // Trigger a profile fetch to ensure state is synced
                try {
                    await apiService.getProfile();
                    // Redirect based on 'new' flag
                    if (isNew) {
                        // TODO: Create/Redirect to Onboarding Wizard
                        navigate('/onboarding');
                    } else {
                        navigate('/dashboard');
                    }
                    // Force a reload or auth state update if AppRouter doesn't detect it automatically (AppRouter checks on mount)
                    // Better approach: Call a prop passed from AppRouter or Context (AuthenticationContext) if available.
                    // For now, reload is a brute-force safe way, but navigate should work if AppRouter re-checks or we update state higher up.
                    window.location.reload();
                } catch (error) {
                    console.error('Error fetching profile with new token', error);
                    navigate('/login?error=auth_failed');
                }
            } else {
                navigate('/login?error=no_token');
            }
        };

        handleCallback();
    }, [location, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Autenticando...</h2>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
        </div>
    );
};

export default AuthCallback;
