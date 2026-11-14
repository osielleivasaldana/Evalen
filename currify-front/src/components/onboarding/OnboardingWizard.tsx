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
    const [isDark, setIsDark] = useState(() => {
        try {
            const t = localStorage.getItem('evalen-theme');
            if (t === 'dark') return true;
            if (t === 'light') return false;
            return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
        } catch { return false; }
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
    }, [isDark]);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const profile = await apiService.getProfile();
                setUserName(profile.name.split(' ')[0]);
                if (profile.role === 'OWNER') {
                    navigate('/owner/dashboard', { replace: true });
                } else if (profile.onboardingCompleted) {
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

            if (user) {
                setUser({
                    ...user,
                    company: formData.company,
                    onboardingCompleted: true,
                });
            }

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
        <div className="min-h-screen flex items-center justify-center bg-ev-paper text-ev-ink font-sans antialiased [text-rendering:optimizeLegibility] relative overflow-hidden dark:bg-[#0E1813] dark:text-[#F1EBDC]">
            {/* film grain overlay */}
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 bg-grain opacity-[0.05] mix-blend-multiply dark:mix-blend-overlay dark:opacity-[0.06]" />

            <div className="relative z-10 w-full max-w-lg bg-ev-card rounded-2xl shadow-card-lg-evalen border border-ev-line p-8 sm:p-10 dark:bg-[#16241C] dark:border-[rgba(241,235,220,.13)] dark:shadow-[0_22px_48px_-28px_rgba(0,0,0,.7)]">
                {/* step indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <span className="h-1.5 w-8 rounded-full bg-ev-green dark:bg-[#5BAE88]" />
                    <span className="h-1.5 w-24 rounded-full bg-ev-line dark:bg-[rgba(241,235,220,.13)]" />
                    <span className="h-1.5 w-8 rounded-full bg-ev-line dark:bg-[rgba(241,235,220,.13)]" />
                </div>

                <div className="text-center mb-8">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] uppercase text-ev-green dark:text-[#5BAE88]">
                        <span className="h-2 w-2 rounded-full bg-ev-cta dark:bg-[#FF6A38]" />
                        Paso 2 de 3
                    </span>
                    <h1 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.08] tracking-tight text-ev-ink dark:text-[#F1EBDC]">
                        Configura tu espacio
                    </h1>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-ev-ink2 dark:text-[#AAB6A8]">
                        Hola <span className="font-semibold text-ev-ink dark:text-[#F1EBDC]">{userName}</span>, cuéntanos de tu equipo.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* company name */}
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ev-ink2 dark:text-[#AAB6A8]">Nombre de la empresa</label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ev-ink3 dark:text-[#7E8C7E]">
                                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="19" rx="2.5" /><path d="M9 3v6h6V3M7 12h2M12 12h2M17 12h2M7 16h2M12 16h2M17 16h2" /></svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Ej: Evalen Tech"
                                value={formData.company}
                                onChange={(e) => handleChange('company', e.target.value)}
                                className="w-full rounded-xl border border-ev-line2 bg-ev-card py-3 pl-11 pr-4 text-[15px] text-ev-ink placeholder:text-ev-ink3/80 transition focus:border-ev-green focus:outline-none focus:ring-2 focus:ring-ev-green/25 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC] dark:placeholder:text-[#7E8C7E]/80 dark:focus:border-[#5BAE88]"
                            />
                        </div>
                    </div>

                    {/* company size */}
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ev-ink2 dark:text-[#AAB6A8]">Tamaño del equipo</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['1-10', '11-50', '51-200', '200+'].map((size) => (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => handleChange('companySize', size)}
                                    className={`py-3 px-4 rounded-xl border-2 font-medium transition-all font-sans text-[15px] ${formData.companySize === size
                                        ? 'border-ev-green bg-ev-greentint text-ev-green shadow-sm dark:border-[#5BAE88] dark:bg-[#1C3329] dark:text-[#5BAE88]'
                                        : 'border-ev-line2 bg-ev-card text-ev-ink2 hover:border-ev-ink/30 hover:bg-ev-paper2 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#AAB6A8] dark:hover:border-[rgba(241,235,220,.4)] dark:hover:bg-[#13201A]'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid || loading}
                        className={`group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] font-semibold shadow-cta-evalen transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ev-cta focus-visible:ring-offset-2 focus-visible:ring-offset-ev-paper dark:focus-visible:ring-offset-[#0E1813] ${!isValid || loading
                            ? 'bg-ev-line2 text-ev-ink3 cursor-not-allowed shadow-none dark:bg-[rgba(241,235,220,.13)] dark:text-[#7E8C7E]'
                            : 'bg-ev-cta text-ev-ctatext hover:bg-ev-ctah dark:bg-[#FF6A38] dark:text-[#10231A] dark:hover:bg-[#FF8455]'
                            }`}
                    >
                        {loading ? (
                            <svg className="h-[18px] w-[18px] animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity=".3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                        ) : (
                            <svg className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        )}
                        <span>{loading ? 'Guardando…' : 'Continuar a planes'}</span>
                    </button>
                </div>

                <p className="mt-4 text-center font-mono text-[11px] text-ev-ink3 dark:text-[#7E8C7E]">
                    Puedes cambiar estos datos después en Configuración.
                </p>
            </div>

            {/* theme fab */}
            <button type="button" onClick={() => setIsDark(p => !p)} aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} title="Cambiar tema"
                className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-ev-line2 bg-ev-card text-ev-ink shadow-soft-evalen transition hover:-translate-y-0.5 dark:border-[rgba(241,235,220,.26)] dark:bg-[#16241C] dark:text-[#F1EBDC]">
                <svg className={`h-[19px] w-[19px] ${isDark ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
                <svg className={`h-[19px] w-[19px] ${isDark ? '' : 'hidden'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            </button>
        </div>
    );
};

export default OnboardingWizard;
