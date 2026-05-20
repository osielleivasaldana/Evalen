import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const OnboardingWizard: React.FC = () => {
    const navigate = useNavigate();
    const { user, setUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const [formData, setFormData] = useState({
        company: '',
        companySize: '',
    });

    useEffect(() => {
        const loadUser = async () => {
            try {
                const profile = await apiService.getProfile();
                setUserName(profile.name.split(' ')[0]);
                if (profile.onboardingCompleted) {
                    navigate('/dashboard', { replace: true });
                }
            } catch (e) {
                console.error(e);
            }
        };
        loadUser();
    }, [navigate]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const profile = await apiService.getProfile();
            await apiService.updateUser(profile.id, {
                company: formData.company,
                companySize: formData.companySize,
                onboardingCompleted: true
            });

            // Update AuthContext directly — no reload needed
            if (user) {
                setUser({
                    ...user,
                    company: formData.company,
                    onboardingCompleted: true,
                });
            }

            // Redirect to Pricing
            navigate('/pricing');
        } catch (error) {
            console.error('Onboarding failed', error);
            alert('Error saving profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isValid = formData.company && formData.companySize;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-jakarta">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/30 rounded-full blur-[100px] animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/30 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
            </div>

            <div className="relative z-10 w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-8 sm:p-10">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        ¡Te damos la bienvenida, {userName}!
                    </h1>
                    <p className="text-gray-500 text-lg">
                        Ayúdanos a configurar tu espacio de trabajo.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Campo 1: Nombre de la empresa */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre de la empresa</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Ej: Evalen Tech"
                                value={formData.company}
                                onChange={(e) => handleChange('company', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-400 text-gray-900"
                            />
                        </div>
                    </div>

                    {/* Campo 2: Tamaño del equipo */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Tamaño del equipo</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['1-10', '11-50', '51-200', '200+'].map((size) => (
                                <button
                                    key={size}
                                    onClick={() => handleChange('companySize', size)}
                                    className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${formData.companySize === size
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                                        : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-10">
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid || loading}
                        className={`w-full flex justify-center items-center px-8 py-4 rounded-xl font-bold shadow-lg text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${!isValid || loading
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-500/30'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Guardando...
                            </span>
                        ) : 'Continuar a Planes'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default OnboardingWizard;
