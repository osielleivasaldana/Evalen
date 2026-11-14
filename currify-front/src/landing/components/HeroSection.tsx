import React, { useMemo, useState } from 'react';
import portrait from '../assets/hero-portrait.png';

type TabKey = 'ranking' | 'proceso' | 'todos';

interface Candidate {
  id: string;
  name: string;
  role: string;
  score: number;
  stage: 'entrevista' | 'revision' | 'nuevo';
  reason: string;
}

const candidates: Candidate[] = [
  {
    id: 'valentina',
    name: 'Valentina Ríos',
    role: 'Diseño de producto · 6 años',
    score: 90,
    stage: 'entrevista',
    reason:
      'Experiencia en productos B2B y sistemas de diseño. Inglés por confirmar en entrevista.',
  },
  {
    id: 'andres',
    name: 'Andrés Peña',
    role: 'Diseño UX/UI · 4 años',
    score: 82,
    stage: 'revision',
    reason:
      'Portafolio sólido en investigación y prototipado. Falta validar experiencia con equipos de datos.',
  },
  {
    id: 'lucia',
    name: 'Lucía Fernández',
    role: 'Diseño de producto · 3 años',
    score: 71,
    stage: 'nuevo',
    reason:
      'Buena base en diseño de producto y handoff. Falta evidencia de liderazgo en proyectos complejos.',
  },
];

const tabs: { key: TabKey; label: string }[] = [
  { key: 'ranking', label: 'Ranking' },
  { key: 'proceso', label: 'En proceso' },
  { key: 'todos', label: 'Todos' },
];

const HeroSection: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('ranking');

  const visible = useMemo(() => {
    if (tab === 'proceso') {
      return candidates.filter((candidate) => candidate.stage !== 'nuevo');
    }
    return candidates;
  }, [tab]);

  const highlighted = visible[0];

  return (
    <section className="lp-hero">
      <div className="lp-hero__inner">
        <div className="lp-hero__message">
          <p className="lp-eyebrow lp-hero__eyebrow">SELECCIÓN CON IA. DECISIÓN HUMANA.</p>

          <h1 className="lp-hero__title">
            <span className="lp-hero__title-l1">Menos CVs por leer.</span>
            <span className="lp-hero__title-l2">Más personas por conocer.</span>
          </h1>

          <p className="lp-hero__sub">
            Convierte currículums en un ranking con razones claras. Compara perfiles y lleva
            cada candidatura hasta la entrevista, con tu equipo.
          </p>

          <div className="lp-hero__actions">
            <a className="lp-btn lp-btn--primary" href="/login?plan=free">
              Evaluar mis primeros 3 CVs →
            </a>
            <a
              className="lp-btn lp-btn--ghost"
              href="#como-funciona"
              onClick={(event) => {
                event.preventDefault();
                document
                  .getElementById('como-funciona')
                  ?.scrollIntoView({ behavior: 'auto', block: 'start' });
              }}
            >
              Ver cómo funciona
            </a>
          </div>

          <p className="lp-hero__note">3 CVs gratis · Una campaña para empezar</p>
        </div>

        <div className="lp-hero__media">
          <div className="lp-portrait">
            <img
              className="lp-portrait__img"
              src={portrait}
              alt="Retrato editorial de una persona"
            />
            <p className="lp-portrait__chip">El potencial no cabe en un PDF.</p>
          </div>

          <div className="lp-ranking">
            <div className="lp-ranking__bar">
              <span className="lp-ranking__bar-left">evalen / campañas</span>
              <span className="lp-ranking__bar-right">EJEMPLO ILUSTRATIVO</span>
            </div>
            <div className="lp-ranking__sep" />

            <div className="lp-ranking__body">
              <p className="lp-ranking__title">Product Designer</p>
              <p className="lp-ranking__sub">
                12 candidaturas · Ordenadas por compatibilidad
              </p>

              <div className="lp-ranking__tabs" role="tablist" aria-label="Vistas del ranking">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.key}
                    className={`lp-ranking__tab ${tab === item.key ? 'is-active' : ''}`}
                    onClick={() => setTab(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="lp-ranking__sep" />

              {visible.map((candidate, index) => (
                <React.Fragment key={candidate.id}>
                  <div className="lp-cand">
                    <span className="lp-cand__rank">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="lp-cand__profile">
                      <span className="lp-cand__name">{candidate.name}</span>
                      <span className="lp-cand__role">{candidate.role}</span>
                    </div>
                    <div className="lp-cand__score">
                      <b>{candidate.score}</b>
                      <small>/ 100</small>
                    </div>
                  </div>

                  {index === 0 && highlighted && (
                    <div className="lp-reason">
                      <p className="lp-reason__label">POR QUÉ ESTE PERFIL</p>
                      <p className="lp-reason__text">{highlighted.reason}</p>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="lp-ranking__sep" />
            <div className="lp-ranking__foot">El análisis orienta. Tu equipo decide.</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
