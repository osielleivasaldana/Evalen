import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AuthCallback: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { setUser, checkAuth } = useAuth();

    useEffect(() => {
        const handleCallback = async () => {
            const params = new URLSearchParams(location.search);
            const token = params.get('token');
            const isNew = params.get('new') === 'true';
            const state = params.get('state');

            if (state) {
                try {
                    const stateData = JSON.parse(atob(state));
                    if (stateData.plan) {
                        sessionStorage.setItem('selectedPlan', stateData.plan);
                    }
                } catch (e) {
                    console.error('Error parsing OAuth state', e);
                }
            }

            if (token) {
                apiService.setToken(token);

                try {
                    const profile = await apiService.getProfile();
                    setUser(profile);

                    const selectedPlan = sessionStorage.getItem('selectedPlan');
                    
                    if (isNew) {
                        if (selectedPlan === 'pro') {
                            navigate('/checkout');
                        } else {
                            navigate('/onboarding');
                        }
                    } else {
                        if (selectedPlan === 'pro') {
                            navigate('/checkout');
                        } else {
                            navigate('/dashboard');
                        }
                    }
                } catch (error) {
                    console.error('Error fetching profile with new token', error);
                    navigate('/login?error=auth_failed');
                }
            } else {
                navigate('/login?error=no_token');
            }
        };

        handleCallback();
    }, [location, navigate, setUser]);

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
