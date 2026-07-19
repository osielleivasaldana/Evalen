import React, { useState } from 'react';
import { ArrowRight, FileText, Play, Sparkle, Check } from '@phosphor-icons/react';
import DemoModal from './DemoModal';

const SAMPLE_FILE = {
  name: 'cv-ana-maria-alarcon.pdf',
  sizeLabel: '312 KB',
  candidate: 'Ana María Alarcón',
  role: 'Backend Developer',
};

const HeroSection: React.FC = () => {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section
      className="relative pt-32 pb-20 lg:pb-32 overflow-hidden min-h-[100dvh] flex items-center bg-[#ffffff] dark:bg-[#0f172a] transition-colors duration-500"
      aria-label="Hero con demostración de Evalen"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-12">
          {/* Left: copy & actions */}
          <div className="flex-1 text-center lg:text-left lg:max-w-[50%]">
            <h1
              className="text-[clamp(2.5rem,5.5vw,4rem)] font-black tracking-tight leading-[1.05] text-slate-900 dark:text-slate-50 mb-6 max-w-xl"
              style={{ textWrap: 'balance' } as React.CSSProperties}
            >
              Reclutamiento inteligente{' '}
              <span className="text-[#4f46e5] dark:text-[#a5b4fc]">en segundos</span>, no en semanas.
            </h1>

            <p className="text-lg mb-8 max-w-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Sube un currículum y Evalen extrae contacto, experiencia, formación y habilidades,
              luego puntúa al candidato contra tu campaña. Mira el flujo completo en la demo de
              la derecha.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="group inline-flex items-center justify-center bg-[#4f46e5] text-white pl-6 pr-2.5 py-2.5 rounded-full text-base font-bold transition-all duration-300 hover:bg-[#4338ca] hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5]"
              >
                <Play weight="fill" className="w-4 h-4 mr-2" />
                <span className="mr-3">Ver demo en vivo</span>
                <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-px transition-all duration-300">
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </span>
              </button>
              <a
                href="#gallery"
                className="inline-flex items-center justify-center border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-full text-base font-semibold transition-all duration-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-slate-300 dark:hover:border-white/[0.15]"
              >
                Cómo funciona
              </a>
            </div>

            <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
              La demo muestra el flujo completo con un CV real — sin costo, sin login.
            </p>
          </div>

          {/* Right: preview card teasing the demo */}
          <div className="flex-1 w-full max-w-[460px] lg:max-w-[45%]">
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="group w-full text-left rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden hover:shadow-[0_24px_60px_rgba(79,70,229,0.12)] dark:hover:shadow-[0_24px_60px_rgba(79,70,229,0.15)] transition-all duration-500 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5]"
              aria-label="Abrir demostración del parser de CVs"
            >
              {/* Window chrome */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-950/40">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">Evalen · CV Analyzer</div>
                <div className="w-10" />
              </div>

              {/* Card body — single glance of the demo */}
              <div className="p-6 space-y-4">
                {/* CV file preview */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-950/40">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
                    <FileText weight="fill" className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                      {SAMPLE_FILE.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {SAMPLE_FILE.sizeLabel} · PDF · Backend Developer
                    </p>
                  </div>
                </div>

                {/* Two-line summary of demo steps */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="w-6 h-6 rounded-full bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center text-[10px] font-bold flex-shrink-0">01</span>
                    <span>Ver el CV original</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="w-6 h-6 rounded-full bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center text-[10px] font-bold flex-shrink-0">02</span>
                    <span>Extracción de todos los campos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="w-6 h-6 rounded-full bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center text-[10px] font-bold flex-shrink-0">03</span>
                    <span>Campaña y criterios del puesto</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="w-6 h-6 rounded-full bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center text-[10px] font-bold flex-shrink-0">04</span>
                    <span>Scoring con desglose por dimensión</span>
                  </div>
                </div>

                {/* Teaser metrics */}
                <div className="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="6" fill="transparent" />
                        <circle
                          cx="40" cy="40" r="34"
                          className="stroke-[#4f46e5]"
                          strokeWidth="6"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 34}
                          strokeDashoffset={2 * Math.PI * 34 - (2 * Math.PI * 34 * 96) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-xs font-black text-slate-900 dark:text-slate-100">96</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#4f46e5] dark:text-[#a5b4fc]">Score final</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">Strong fit</div>
                    </div>
                  </div>
                  <div className="flex-1 text-xs text-slate-400 dark:text-slate-500">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Check className="w-3 h-3 text-[#16a34a]" />
                      <span>2 años experiencia</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#16a34a]" />
                      <span>5 habilidades match exacto</span>
                    </div>
                  </div>
                </div>

                {/* CTA hint */}
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#4f46e5] dark:text-[#a5b4fc] pt-2 group-hover:gap-3 transition-all">
                  <Sparkle weight="fill" className="w-4 h-4" />
                  <span>Ver el flujo completo</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
};

export default HeroSection;