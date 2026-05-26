import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
  PlusCircleIcon,

  UsersIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface NavBarProps {
  onLogout?: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!apiService.isAuthenticated()) return;
      try {
        const [profile, plansData] = await Promise.all([
          apiService.getProfile(),
          apiService.getPlans()
        ]);
        console.log('[NavBar] Profile Loaded:', profile);
        console.log('[NavBar] Plan:', profile.plan); // Debug Plan
        console.log('[NavBar] Plans Loaded:', plansData);
        setUserRole(profile.role);
        setUserProfile(profile);
        setPlans(plansData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    if (onLogout) {
      onLogout();
    } else {
      navigate('/login');
    }
  };

  const campaignLimit = userProfile?.campaignLimit ?? 1;
  const currentActiveCampaigns = userProfile?.activeCampaignsCount ?? 0;
  const isCampaignLimitReached = currentActiveCampaigns >= campaignLimit;

  const menuItems = [
    { label: 'Dashboard', icon: Squares2X2Icon, href: '/dashboard' },
    // Only ADMIN and RECRUITER can create campaigns - Locked if limit reached
    ...(userRole === 'ADMIN' || userRole === 'RECRUITER' ? [{
      label: 'Nueva Campaña',
      icon: isCampaignLimitReached ? LockClosedIcon : PlusCircleIcon,
      href: isCampaignLimitReached ? '#' : '/create-campaign',
      onClick: isCampaignLimitReached ? () => alert(`🔒 Límite de campañas alcanzado (${campaignLimit}). Mejora a PRO para campañas ilimitadas.`) : undefined
    }] : []),
    // ADMIN and RECRUITER can manage users
    ...(userRole === 'ADMIN' || userRole === 'RECRUITER' ? [{ label: 'Gestionar Usuarios', icon: UsersIcon, href: '/admin/users' }] : []),
    // OWNER can manage entire system
    ...(userRole === 'OWNER' ? [{ label: 'Panel Propietario', icon: Squares2X2Icon, href: '/owner/dashboard' }] : []),
  ];

  // Find current plan configurations
  const userPlanTier = userProfile?.plan || 'FREE';
  const matchedPlan = plans.find(
    (p) => p.tier.toUpperCase() === userPlanTier.toUpperCase()
  );

  const planName = matchedPlan?.name || (userPlanTier.toUpperCase() === 'PRO' ? 'EvalenPro' : 'Starter');
  const maxCredits = matchedPlan?.cvCredits ?? (userPlanTier.toUpperCase() === 'PRO' ? 999 : 3);
  const remainingCredits = userProfile?.cvCredits ?? maxCredits;
  const usedCredits = Math.max(0, maxCredits - remainingCredits);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            <svg width="140" height="36" viewBox="0 0 180 48" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="evalen-gradient-nav" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#4F6BF6' }} />
                  <stop offset="100%" style={{ stopColor: '#8B5CF6' }} />
                </linearGradient>
              </defs>
              {/* E con gradiente */}
              <path d="M0 8 L0 40 L24 40 L24 35 L6 35 L6 26 L20 26 L20 21 L6 21 L6 13 L24 13 L24 8 Z" fill="url(#evalen-gradient-nav)" />
              {/* Corte diagonal (transparente para fondo claro) */}
              <path d="M18 8 L24 8 L6 40 L0 40 Z" fill="#ffffff" />
              {/* Wordmark */}
              <text x="30" y="34" fontFamily="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontSize="28" fontWeight="700" fill="#18181b" letterSpacing="-1">valen</text>
            </svg>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    } else {
                      navigate(item.href);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${item.href === '#' ? 'text-slate-400 bg-slate-50 cursor-not-allowed' : 'text-gray-700 hover:bg-blue-500 hover:text-white'}`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Credits Badge - Dynamic based on active plan manager configuration */}
          {userRole !== 'OWNER' && (
            <div
              onClick={() => navigate('/pricing')}
              className="hidden md:flex items-center gap-2 mr-4 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full shadow-sm cursor-pointer transition-all hover:bg-indigo-50 hover:shadow-md hover:border-indigo-200 group"
              title={maxCredits >= 999 ? `Tu Plan: ${planName}` : 'Mejora tu plan para más créditos'}
            >
              <span className={`font-bold ${maxCredits >= 999 || remainingCredits > 0 ? 'text-emerald-500' : 'text-red-500'} ${maxCredits < 999 ? 'animate-pulse group-hover:scale-110 transition-transform' : ''}`}>⚡</span>
              <span className={`text-xs font-bold transition-colors ${maxCredits >= 999 || remainingCredits > 0 ? 'text-slate-600' : 'text-red-500'}`}>
                {maxCredits >= 999
                  ? `Ilimitados en el plan ${planName}`
                  : `${usedCredits}/${maxCredits} Usados en el plan ${planName}`}
              </span>
            </div>
          )}

          {/* Upgrade Button - Visible for Free/Starter Plan */}
          {userRole !== 'OWNER' && userProfile?.plan?.toUpperCase() === 'FREE' && (
            <button
              onClick={() => navigate('/pricing')}
              className="hidden md:flex items-center gap-2 mr-4 px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.7)] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20"
            >
              ✨ Mejorar Plan
            </button>
          )}

          {/* User Menu - Desktop */}
          <div className="hidden md:block">
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                <UserCircleIcon className="w-6 h-6" />
              </Menu.Button>

              <Transition
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={`${active ? 'bg-gray-100' : ''
                            } flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700`}
                        >
                          <UserCircleIcon className="w-5 h-5 text-blue-600" />
                          Mi Perfil
                        </button>
                      )}
                    </Menu.Item>
                    <div className="border-t border-gray-100" />
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={`${active ? 'bg-red-50' : ''
                            } flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600`}
                        >
                          <ArrowRightOnRectangleIcon className="w-5 h-5" />
                          Cerrar Sesión
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    navigate(item.href);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg"
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
            <div className="border-t border-gray-200 my-2" />
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
