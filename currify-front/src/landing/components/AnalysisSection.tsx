import React from 'react';

const dimensions = [
  { label: 'Habilidades', value: '28 / 30', percent: 93.33 },
  { label: 'Experiencia', value: '23 / 25', percent: 92 },
  { label: 'Educación', value: '13 / 15', percent: 86.67 },
  { label: 'Fit cultural', value: '11 / 15', percent: 73.33 },
  { label: 'Logística', value: '10 / 10', percent: 100 },
  { label: 'Trayectoria', value: '5 / 5', percent: 100 },
];

const AnalysisSection: React.FC = () => (
  <section className="lp-analysis" id="analisis">
    <div className="lp-analysis__inner">
      <div className="lp-analysis__copy">
        <p className="lp-eyebrow lp-analysis__eyebrow">02 / CRITERIO, NO CAJA NEGRA</p>

        <h2 className="lp-display lp-analysis__title">
          Un número no cuenta
          <br />
          toda la historia.
        </h2>

        <p className="lp-analysis__lead">
          Entiende qué aporta cada perfil y qué necesitas confirmar antes de avanzar.
        </p>

        <div className="lp-analysis__rule" />

        <p className="lp-analysis__subhead">
          Seis dimensiones. Una lectura más completa.
        </p>
        <p className="lp-analysis__body">
          Habilidades, experiencia, educación, fit cultural, logística y trayectoria.
          Consulta el desglose junto a fortalezas y brechas.
        </p>
        <p className="lp-analysis__note">
          La compatibilidad orienta; no sustituye la evaluación humana ni garantiza ausencia
          de sesgo.
        </p>
      </div>

      <article className="lp-score-card">
        <div className="lp-score-card__top">
          <div className="lp-score-card__who">
            <h3 className="lp-score-card__name">Valentina Ríos</h3>
            <p className="lp-score-card__role">Product Designer · Ejemplo ilustrativo</p>
          </div>
          <div className="lp-score-card__score">
            <b>90</b>
            <small>DE 100</small>
          </div>
        </div>

        <div className="lp-analysis__rule" />

        {dimensions.map((dimension) => (
          <div className="lp-dim" key={dimension.label}>
            <div className="lp-dim__row">
              <span className="lp-dim__label">{dimension.label}</span>
              <span className="lp-dim__value">{dimension.value}</span>
            </div>
            <div className="lp-bar">
              <div
                className="lp-bar__fill"
                style={{ '--lp-value': `${dimension.percent}%` } as React.CSSProperties}
              />
            </div>
          </div>
        ))}

        <div className="lp-score-card__callout">
          <p className="lp-score-card__callout-label">PARA LA ENTREVISTA</p>
          <p className="lp-score-card__callout-text">
            Confirma el nivel de inglés y la experiencia liderando equipos.
          </p>
        </div>
      </article>
    </div>
  </section>
);

export default AnalysisSection;
