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
      {/* Column headers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 pt-6 pb-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#4f46e5]/10 dark:bg-[#4f46e5]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-base">📄</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Currículum de ejemplo</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              CV real de una candidata que aplica al puesto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#4f46e5]/10 dark:bg-[#4f46e5]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-base">💼</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Vacante de ejemplo</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Descripción del cargo al que postula la candidata
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 min-h-0">
        {/* ── Columna izquierda: CV renderizado como PDF ── */}
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

        {/* ── Columna derecha: Publicación real del puesto ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex-1">
            {/* Header de la publicacion */}
            <div className="bg-gradient-to-r from-[#4f46e5] to-[#6366f1] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{c.titulo}</h3>
                  <p className="text-sm text-white/80 mt-0.5">{c.empresa}</p>
                </div>
                <span className="text-[10px] font-semibold text-white/90 bg-white/15 px-2.5 py-1 rounded-full whitespace-nowrap">
                  Publicación activa
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-320px)]">
              {/* Meta info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Briefcase className="w-4 h-4 text-[#4f46e5]" weight="duotone" />
                  {c.modalidad}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-[#4f46e5]" weight="duotone" />
                  Mín. {c.experiencia_minima} de experiencia
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <GraduationCap className="w-4 h-4 text-[#4f46e5]" weight="duotone" />
                  {c.nivel_educacion}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Globe className="w-4 h-4 text-[#4f46e5]" weight="duotone" />
                  {c.idiomas.join(' · ')}
                </span>
              </div>

              {/* Descripción del puesto */}
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {c.descripcion}
                </p>
              </div>

              {/* Requisitos */}
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">Requisitos</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.habilidades_requeridas.map((h, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#4f46e5] text-white">
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Deseables */}
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">Deseable</p>
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

          {/* Explicación + CTA */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/[0.08] px-5 py-3 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Al iniciar la demo, Evalen analizará el CV, extraerá los datos estructurados,
              los comparará con los requisitos del puesto y generará una evaluación de
              compatibilidad con desglose por dimensión — todo el proceso que ocurriría
              con una postulación real.
            </p>
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
    </div>
  );
};

export default DemoInputPhase;
