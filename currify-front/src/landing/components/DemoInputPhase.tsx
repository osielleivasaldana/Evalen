import React from 'react';
import { Briefcase, Clock, GraduationCap, Globe, Sparkle, Target } from '@phosphor-icons/react';
import { SAMPLE, isSkillMatch } from './demo-data';

interface DemoInputPhaseProps {
  onStart: () => void;
}

const DemoInputPhase: React.FC<DemoInputPhaseProps> = ({ onStart }) => {
  const { extraction: e, campaign: c } = SAMPLE;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 min-h-0">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 font-serif text-slate-800 dark:text-slate-200 space-y-5">
            <div className="text-center border-b border-slate-200 dark:border-white/[0.08] pb-4 mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 uppercase tracking-wider">
                {e.contacto.nombre_completo}
              </h2>
              <p className="text-base font-semibold text-[#4f46e5] dark:text-[#a5b4fc] mt-1">
                {e.titular_profesional.titular}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {e.contacto.ubicacion} · {e.contacto.telefono} · {e.contacto.email}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Extracto Profesional</h3>
              <p className="text-sm leading-relaxed">{e.resumen_profesional.resumen}</p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Experiencia Laboral</h3>
              {e.experiencia_laboral.map((exp, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{exp.cargo}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{exp.empresa} · {exp.ubicacion}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2">{exp.periodo}</p>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {exp.responsabilidades.map((r, j) => (
                      <li key={j} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                        <span className="text-slate-300 dark:text-slate-600 mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Formación</h3>
              {e.formacion_academica.map((f, i) => (
                <div key={i}>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{f.titulo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{f.institucion} · {f.periodo}</p>
                  {f.detalle && <p className="text-xs text-slate-500 dark:text-slate-400 italic">{f.detalle}</p>}
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Habilidades Técnicas</h3>
              <div className="flex flex-wrap gap-1.5">
                {e.habilidades.tecnicas.map((h, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                      isSkillMatch(h)
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {h}
                    {isSkillMatch(h) && <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">✓</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-gradient-to-br from-[#eef2ff] to-white dark:from-[#1e1b4b] dark:to-slate-900 rounded-xl border border-[#4f46e5]/20 dark:border-[#a5b4fc]/20 p-6 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-[#4f46e5]" weight="fill" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{c.titulo}</h3>
              <span className="ml-auto text-[10px] font-semibold text-[#4f46e5] dark:text-[#a5b4fc] bg-[#4f46e5]/10 dark:bg-[#4f46e5]/20 px-2 py-0.5 rounded-full">Campaña</span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Briefcase className="w-4 h-4 text-[#4f46e5]" />
                  <span>{c.modalidad}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-[#4f46e5]" />
                  <span>Mín. {c.experiencia_minima}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <GraduationCap className="w-4 h-4 text-[#4f46e5]" />
                  <span className="truncate">{c.nivel_educacion}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Globe className="w-4 h-4 text-[#4f46e5]" />
                  <span>{c.idiomas.join(' · ')}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Requeridas</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.habilidades_requeridas.map((h, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#4f46e5] text-white">
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Deseables</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.habilidades_deseables.map((h, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#9333ea] text-[#9333ea] dark:text-[#d8b4fe] dark:border-[#d8b4fe]">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="group w-full inline-flex items-center justify-center gap-2 bg-[#4f46e5] text-white px-6 py-3 rounded-xl text-base font-bold transition-all duration-300 hover:bg-[#4338ca] hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5]"
          >
            <Sparkle className="w-5 h-5" weight="fill" />
            Iniciar demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoInputPhase;