import React from 'react';
import interview from '../assets/interview.png';

const stages = [
  { num: '01', status: 'Completada', title: 'Revisión', owner: 'Reclutamiento', state: 'done' },
  { num: '02', status: 'En curso', title: 'Entrevista', owner: 'Equipo de talento', state: 'now' },
  { num: '03', status: 'Pendiente', title: 'Evaluación técnica', owner: 'Equipo de diseño', state: 'pending' },
  { num: '04', status: 'Pendiente', title: 'Decisión', owner: 'Hiring manager', state: 'pending' },
];

const tools = [
  {
    title: 'Entrevistas con contexto',
    text:
      'Genera una guía por etapa y registra notas por pregunta, sin compartir las notas de otras etapas.',
  },
  {
    title: 'Decisiones con trazabilidad',
    text:
      'Consulta quién avanzó una candidatura y el feedback de rechazo. El historial queda registrado.',
  },
];

const ProcessSection: React.FC = () => (
  <section className="lp-process" id="proceso">
    <div className="lp-process__inner">
      <div className="lp-process__top">
        <div className="lp-process__copy">
          <p className="lp-eyebrow">03 / DEL ANÁLISIS A LA DECISIÓN</p>
          <h2 className="lp-display">
            El siguiente paso
            <br />
            lo da tu equipo.
          </h2>
          <p className="lp-process__lead">
            Asigna responsables, prepara entrevistas y conserva el contexto. Cada avance y
            cada rechazo dejan un registro.
          </p>
        </div>

        <div className="lp-process__photo">
          <img src={interview} alt="Dos personas conversando durante una entrevista" />
        </div>
      </div>

      <div className="lp-process-card">
        <div className="lp-process-card__head">
          <p className="lp-process-card__title">Proceso / Valentina Ríos</p>
          <p className="lp-process-card__tag">EJEMPLO ILUSTRATIVO</p>
        </div>

        <div className="lp-stages">
          {stages.map((stage) => (
            <div
              className={`lp-stage ${stage.state === 'now' ? 'is-active' : ''}`}
              key={stage.num}
            >
              <div className="lp-stage__meta">
                <span className="lp-stage__num">{stage.num}</span>
                <span
                  className={`lp-stage__status ${
                    stage.state === 'done'
                      ? 'lp-stage__status--done'
                      : stage.state === 'now'
                        ? 'lp-stage__status--now'
                        : ''
                  }`}
                >
                  {stage.status}
                </span>
              </div>
              <p className="lp-stage__title">{stage.title}</p>
              <p className="lp-stage__owner">{stage.owner}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-process__tools">
        {tools.map((tool) => (
          <div className="lp-process__tool" key={tool.title}>
            <p className="lp-process__tool-title">{tool.title}</p>
            <p className="lp-process__tool-text">{tool.text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ProcessSection;
