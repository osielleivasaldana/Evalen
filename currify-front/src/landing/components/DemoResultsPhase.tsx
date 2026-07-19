import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Warning,
  EnvelopeSimple,
  Phone,
  MapPin,
  LinkedinLogo,
  GithubLogo,
  Sparkle,
  User,
  Briefcase,
  GraduationCap,
  Code,
  Globe,
} from '@phosphor-icons/react';
import { useReducedMotion } from 'motion/react';
import { SAMPLE, isSkillMatch } from './demo-data';

const CIRCLE_SIZE = 128;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DemoResultsPhase: React.FC = () => {
  const { extraction: ex, scoring: sc, campaign: ca } = SAMPLE;
  const prefersReduced = useReducedMotion();
  const [animated, setAnimated] = useState(prefersReduced);

  useEffect(() => {
    if (prefersReduced) {
      setAnimated(true);
      return;
    }
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [prefersReduced]);

  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * sc.overall_score) / 100;
  const scoreColor =
    sc.overall_score >= 90 ? '#10b981' : sc.overall_score >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Left: Scoring (1/3) */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#ea580c] to-[#dc2626] px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkle className="h-6 w-6" weight="fill" />
                  Análisis de Compatibilidad
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Score circle */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-32 h-32 mb-4 relative">
                    <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} className="-rotate-90" aria-hidden="true">
                      <circle
                        cx={CIRCLE_SIZE / 2}
                        cy={CIRCLE_SIZE / 2}
                        r={RADIUS}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      <circle
                        cx={CIRCLE_SIZE / 2}
                        cy={CIRCLE_SIZE / 2}
                        r={RADIUS}
                        fill="none"
                        stroke={scoreColor}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={animated ? offset : CIRCUMFERENCE}
                        style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className={`text-4xl font-bold ${
                          sc.overall_score >= 90
                            ? 'text-green-700 dark:text-green-400'
                            : sc.overall_score >= 70
                            ? 'text-orange-700 dark:text-orange-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {sc.overall_score}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">de 100</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {sc.recommendation_label}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                    {sc.summary}
                  </p>
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Desglose de Evaluación
                  </h3>
                  {sc.breakdown.map((b) => (
                    <div key={b.dim} className="space-y-1 group relative">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {b.label}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {b.score}/100
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ease-out ${
                            b.score >= 90
                              ? 'bg-green-500'
                              : b.score >= 70
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                          }`}
                          style={{
                            width: animated ? `${b.score}%` : '0%',
                            transitionDelay: '200ms',
                          }}
                        />
                      </div>
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1 left-0 -translate-y-full bg-slate-900 dark:bg-slate-700 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-10 pointer-events-none">
                        {b.matchTooltip}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Strengths */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" weight="fill" />
                    Fortalezas
                  </h3>
                  <ul className="space-y-2">
                    {sc.strengths.map((st, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Gaps */}
                {sc.gaps.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                      <Warning className="w-5 h-5 text-orange-600" weight="fill" />
                      Áreas de Mejora
                    </h3>
                    <ul className="space-y-2">
                      {sc.gaps.map((g, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Extraction (2/3) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Contacto */}
            <InfoCard
              title="Contacto"
              gradient="from-[#4f46e5] to-[#6366f1]"
              icon={<User className="w-5 h-5" weight="fill" />}
            >
              <div className="grid grid-cols-2 gap-3">
                <InfoItem
                  icon={<User className="w-4 h-4" weight="duotone" />}
                  label="Nombre"
                  value={ex.contacto.nombre_completo}
                />
                <InfoItem
                  icon={<EnvelopeSimple className="w-4 h-4" weight="duotone" />}
                  label="Email"
                  value={ex.contacto.email}
                />
                <InfoItem
                  icon={<Phone className="w-4 h-4" weight="duotone" />}
                  label="Teléfono"
                  value={ex.contacto.telefono}
                />
                <InfoItem
                  icon={<MapPin className="w-4 h-4" weight="duotone" />}
                  label="Ubicación"
                  value={ex.contacto.ubicacion}
                />
                <InfoItem
                  icon={<LinkedinLogo className="w-4 h-4" weight="duotone" />}
                  label="LinkedIn"
                  value={ex.contacto.linkedin}
                />
                <InfoItem
                  icon={<GithubLogo className="w-4 h-4" weight="duotone" />}
                  label="GitHub"
                  value={ex.contacto.github}
                />
              </div>
            </InfoCard>

            {/* Resumen */}
            <InfoCard
              title="Resumen Profesional"
              gradient="from-[#2563eb] to-[#3b82f6]"
              icon={<Sparkle className="w-5 h-5" weight="fill" />}
            >
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {ex.resumen_profesional.resumen}
              </p>
            </InfoCard>

            {/* Experiencia */}
            <InfoCard
              title="Experiencia Laboral"
              gradient="from-[#0891b2] to-[#06b6d4]"
              icon={<Briefcase className="w-5 h-5" weight="fill" />}
            >
              <div className="space-y-4">
                {ex.experiencia_laboral.map((exp, i) => (
                  <div key={i} className="border-l-2 border-[#0891b2]/30 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {exp.cargo}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {exp.empresa} · {exp.ubicacion}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {exp.periodo}
                      </p>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {exp.responsabilidades.map((r, j) => (
                        <li
                          key={j}
                          className="text-xs text-slate-600 dark:text-slate-400 flex gap-1.5"
                        >
                          <span className="text-slate-300 dark:text-slate-600 mt-1">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </InfoCard>

            {/* Habilidades */}
            <InfoCard
              title="Habilidades"
              gradient="from-[#d97706] to-[#f59e0b]"
              icon={<Code className="w-5 h-5" weight="fill" />}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Técnicas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ex.habilidades.tecnicas.map((h, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          isSkillMatch(h)
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700'
                            : 'bg-[#eef2ff] dark:bg-[#4f46e5]/20 text-[#4f46e5] dark:text-[#a5b4fc]'
                        }`}
                      >
                        {h}
                        {isSkillMatch(h) && (
                          <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">
                            ✓ Match
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Blandas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ex.habilidades.blandas.map((h, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </InfoCard>

            {/* Idiomas */}
            <InfoCard
              title="Idiomas"
              gradient="from-[#9333ea] to-[#a855f7]"
              icon={<Globe className="w-5 h-5" weight="fill" />}
            >
              <div className="flex flex-wrap gap-2">
                {ex.habilidades.idiomas.map((idioma, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2"
                  >
                    <Globe className="w-4 h-4 text-[#9333ea]" weight="duotone" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {idioma.idioma}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {idioma.nivel}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
};

interface InfoCardProps {
  title: string;
  gradient: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, gradient, icon, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden">
    <div className={`bg-gradient-to-r ${gradient} px-6 py-3`}>
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        {icon} {title}
      </h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2.5">
    <span className="text-[#4f46e5] dark:text-[#a5b4fc] flex-shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{value}</p>
    </div>
  </div>
);

export default DemoResultsPhase;
