import React from 'react';

const steps = [
  {
    num: '01',
    title: 'Define el cargo.',
    text:
      'Crea la campaña y sus requisitos. Smart Fill te ayuda con un borrador que puedes revisar.',
    detail: ['Cargo / Product Designer', 'Modalidad / Híbrida'],
  },
  {
    num: '02',
    title: 'Reúne los perfiles.',
    text:
      'Sube currículums o comparte el enlace público para recibir postulaciones en tu campaña.',
    detail: ['PDF · DOC · DOCX · TXT · RTF', 'Hasta 10 MB por archivo'],
  },
  {
    num: '03',
    title: 'Revisa y conversa.',
    text:
      'Compara el ranking, consulta fortalezas y brechas e inicia el proceso con tu equipo.',
    detail: ['Análisis → Entrevista → Decisión', 'Responsables en cada etapa'],
  },
];

const HowItWorksSection: React.FC = () => (
  <section className="lp-how" id="como-funciona">
    <div className="lp-how__inner">
      <p className="lp-eyebrow">01 / ASÍ FUNCIONA</p>

      <div className="lp-how__head">
        <h2 className="lp-display lp-how__head-copy">
          Del primer CV
          <br />
          a la próxima conversación.
        </h2>
        <p className="lp-how__head-text">
          Sin redactar instrucciones para una IA. Empieza con el cargo y conserva el control
          de cada paso.
        </p>
      </div>

      <div className="lp-steps">
        {steps.map((step, index) => (
          <article className={`lp-step lp-step--${index + 1}`} key={step.num}>
            <p className="lp-step__num">{step.num}</p>
            <div className="lp-step__rule" />
            <h3 className="lp-step__title">{step.title}</h3>
            <p className="lp-step__text">{step.text}</p>
            <p className="lp-step__detail">
              {step.detail.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
