import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { Building2, Cpu, FlaskConical, Database, Cloud } from 'lucide-react';

const companies = [
  { name: 'TechCorp', icon: Building2 },
  { name: 'Innovatech', icon: Cpu },
  { name: 'FutureLabs', icon: FlaskConical },
  { name: 'DataPro', icon: Database },
  { name: 'CloudSoft', icon: Cloud },
];

const LogoCloud: React.FC = React.memo(() => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <section
      ref={ref}
      className={`py-16 relative overflow-hidden transition-all duration-500 ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p
          className={`text-center text-sm font-medium uppercase tracking-widest mb-10 ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          Empresas que confían en Evalen
        </p>

        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {companies.map((company, index) => {
            const Icon = company.icon;
            return (
              <div
                key={index}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 cursor-default group ${
                  isDark
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/60'
                }`}
              >
                <Icon className="w-6 h-6 transition-transform group-hover:scale-110" />
                <span className="text-lg font-bold tracking-tight">{company.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

export default LogoCloud;
