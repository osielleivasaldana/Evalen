import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FileText, Gear, Trophy, CheckCircle, Sparkle } from '@phosphor-icons/react';

// Mockup 1: CV extraction
const MockupCVExtractor: React.FC<{ isDark: boolean }> = () => (
  <div className="w-full h-full min-h-[280px] bg-slate-50 dark:bg-slate-950/40 p-5 font-sans text-sm flex flex-col">
    <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-2 mb-3">
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-xs">
        <FileText className="w-4 h-4 text-[#4f46e5]" />
        <span>cv-ana-maria.pdf</span>
      </div>
      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-[#4f46e5] font-bold text-xs">Escaneado</span>
    </div>

    <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-1 border border-slate-200 dark:border-white/10 rounded-lg p-3 bg-white dark:bg-slate-900 flex flex-col">
        <div className="w-16 h-2 bg-slate-300 dark:bg-slate-700 rounded mb-2" />
        <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
        <div className="space-y-1.5">
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="w-5/6 h-1.5 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="w-4/5 h-1.5 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2.5">
        <div className="p-3 rounded-lg border border-[#4f46e5]/20 bg-[#4f46e5]/5">
          <div className="text-xs text-[#4f46e5] dark:text-[#a5b4fc] mb-1">Datos de contacto</div>
          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">Ana María Alarcón</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">ana.alarcon@email.com</div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 flex-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Estructura extraída</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Experiencia</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">5 años</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Rol principal</span>
              <span className="font-bold text-[#4f46e5] dark:text-[#a5b4fc]">Backend Developer</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Confianza</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">94%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Mockup 2: campaign configuration
const MockupCampaignBuilder: React.FC<{ isDark: boolean }> = () => (
  <div className="w-full h-full min-h-[280px] bg-slate-50 dark:bg-slate-950/40 p-5 font-sans text-sm flex flex-col">
    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5 mb-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-[#4f46e5]/10 flex items-center justify-center text-[#4f46e5]">
          <Gear className="w-4 h-4" />
        </div>
        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Configuración de campaña</span>
      </div>
      <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs">Borrador</span>
    </div>

    <div className="space-y-3 flex-1">
      <div>
        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Puesto</label>
        <div className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200">
          Senior Python Developer
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Modalidad</label>
          <div className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            Remoto Global
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Experiencia mín.</label>
          <div className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            3 años
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Habilidades requeridas</label>
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
          {['Python', 'FastAPI', 'PostgreSQL', 'Docker'].map((tag) => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-500/10 text-[#4f46e5] dark:text-[#a5b4fc] font-medium text-xs">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>

    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5 flex justify-end">
      <span className="px-4 py-1.5 rounded-full bg-[#4f46e5] text-white font-bold text-xs shadow-sm">
        Iniciar evaluación
      </span>
    </div>
  </div>
);

// Mockup 3: leaderboard / ranking
const MockupSmartMatch: React.FC<{ isDark: boolean }> = () => (
  <div className="w-full h-full min-h-[280px] bg-slate-50 dark:bg-slate-950/40 p-5 font-sans text-sm flex flex-col">
    <div className="space-y-3">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-2">
        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold text-sm">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Clasificación de candidatos</span>
        </div>
        <span className="text-xs text-[#4f46e5] dark:text-[#a5b4fc] font-mono">3 evaluados</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-[#4f46e5]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-[#4f46e5] flex items-center justify-center font-bold text-xs">
              AA
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Ana María Alarcón</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Cumple todos los requisitos</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[#4f46e5]">96%</span>
            <span className="px-2 py-0.5 rounded bg-[#4f46e5]/10 text-[#4f46e5] text-xs font-bold">Top</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
              AP
            </div>
            <div>
              <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">Andrés Pérez</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Falta Docker</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-600 dark:text-slate-300">78%</span>
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">Apto</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs">
              LT
            </div>
            <div>
              <div className="font-bold text-slate-600 dark:text-slate-300 text-sm">Lucía Torres</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Faltan Python y FastAPI</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-400">45%</span>
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-bold">No</span>
          </div>
        </div>
      </div>
    </div>

    {/* Sin sesgos claim — raised from 9px footnote to a visible brand statement */}
    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5">
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#16a34a] dark:text-green-400">
        <CheckCircle weight="fill" className="w-4 h-4" />
        Sin sesgos de género ni edad en la puntuación
      </span>
    </div>
  </div>
);

type Step = {
  num: string;
  icon: React.ElementType;
  title: string;
  description: string;
  mockup: React.FC<{ isDark: boolean }>;
};

const steps: Step[] = [
  {
    num: '01',
    icon: FileText,
    title: 'Sube los currículums',
    description:
      'Sube CVs en PDF o Word. Evalen extrae automáticamente estructura, habilidades, experiencia laboral y formación — sin plantillas rígidas ni formularios redundantes. Pega la descripción del puesto en el paso 2 y observa.',
    mockup: MockupCVExtractor,
  },
  {
    num: '02',
    icon: Gear,
    title: 'Configura la campaña',
    description:
      'Define el título del puesto, la modalidad y las tecnologías necesarias. Evalen estructura los requisitos de tu campaña y prepara los criterios de evaluación listos para puntuar en segundos.',
    mockup: MockupCampaignBuilder,
  },
  {
    num: '03',
    icon: Trophy,
    title: 'Recibe el ranking',
    description:
      'Cada candidato obtiene un porcentaje de compatibilidad contra la campaña, con desglose por dimensión y veredicto claro. Tú decides a quién invitar; Evalen ordena y explica.',
    mockup: MockupSmartMatch,
  },
];

const GallerySection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section
      id="gallery"
      className="py-24 lg:py-32 relative bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-500"
      aria-labelledby="gallery-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto mb-20 text-center">
          <h2 id="gallery-heading" className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-4"
            style={{ textWrap: 'balance' } as React.CSSProperties}>
            Cómo funciona
          </h2>
          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            Tres pasos desde el CV suelto hasta un ranking ordenado, en minutos.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* vertical guide line, desktop only */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-slate-200 dark:via-white/[0.08] to-transparent"
          />

          <ol className="space-y-12 lg:space-y-24">
            {steps.map((step, i) => {
              const Mockup = step.mockup;
              const flip = i % 2 === 1;
              return (
                <li key={step.num} className="relative">
                  <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
                    {/* Copy column */}
                    <div className={`mb-6 lg:mb-0 ${flip ? 'lg:order-2' : 'lg:order-1'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#4f46e5] text-white font-black text-sm">
                          {step.num}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/10 flex items-center justify-center text-[#4f46e5]">
                          <step.icon weight="bold" className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3"
                        style={{ textWrap: 'balance' } as React.CSSProperties}>
                        {step.title}
                      </h3>
                      <p className={`leading-relaxed text-sm lg:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {step.description}
                      </p>
                    </div>

                    {/* Mockup column */}
                    <div className={`${flip ? 'lg:order-1' : 'lg:order-2'}`}>
                      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                        <Mockup isDark={isDark} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-16 lg:mt-24 text-center">
          <a
            href="/login?plan=free"
            className="group inline-flex items-center bg-[#4f46e5] text-white pl-5 pr-2 py-2 rounded-full text-sm font-bold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#4338ca] hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] active:scale-[0.98]"
          >
            <span className="mr-3">Probar conmis CVs</span>
            <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-px transition-all duration-300">
              <Sparkle weight="bold" className="w-4 h-4" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default GallerySection;