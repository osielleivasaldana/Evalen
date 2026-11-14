import React, { useState } from 'react';

const faqs = [
  {
    q: '¿La IA decide a quién contratar?',
    a: 'No. Evalen organiza la información y presenta compatibilidad, fortalezas y brechas. Tu equipo decide quién avanza y a quién contratar.',
  },
  {
    q: '¿Qué archivos puedo subir?',
    a: 'PDF, DOC, DOCX, TXT y RTF de hasta 10 MB. Incluye OCR de respaldo cuando el documento no contiene suficiente texto extraíble.',
  },
  {
    q: '¿Cómo se calcula la compatibilidad?',
    a: 'El puntaje combina seis dimensiones con pesos definidos. La IA redacta el razonamiento; puedes revisar el desglose y contrastarlo con el CV.',
  },
  {
    q: '¿Quién puede ver la información?',
    a: 'Los permisos dependen del rol y de la etapa asignada. El evaluador técnico solo ve sus etapas y no accede a renta, modalidad ni auditoría.',
  },
  {
    q: '¿Qué incluye la prueba gratuita?',
    a: 'Starter incluye 3 créditos CV, 3 usos de Smart Fill y una campaña. Una reevaluación exitosa consume un crédito CV adicional.',
  },
];

const FAQSection: React.FC = () => {
  const [open, setOpen] = useState<boolean[]>(() => faqs.map(() => true));

  const toggle = (index: number) => {
    setOpen((current) =>
      current.map((value, position) => (position === index ? !value : value)),
    );
  };

  return (
    <section className="lp-faq" id="preguntas">
      <div className="lp-faq__inner">
        <div className="lp-faq__intro">
          <p className="lp-eyebrow">05 / ANTES DE EMPEZAR</p>
          <h2 className="lp-display">
            Preguntas claras.
            <br />
            Respuestas también.
          </h2>
          <p className="lp-faq__lead">
            Lo importante para entender qué hace Evalen y qué sigue en tus manos.
          </p>
        </div>

        <div className="lp-faq__list">
          {faqs.map((faq, index) => (
            <React.Fragment key={faq.q}>
              <div className={`lp-faq__item ${open[index] ? '' : 'is-closed'}`}>
                <button
                  type="button"
                  className="lp-faq__q"
                  id={`faq-question-${index}`}
                  aria-expanded={open[index]}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => toggle(index)}
                >
                  {faq.q}
                </button>
                <div
                  className="lp-faq__a"
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-question-${index}`}
                  aria-hidden={!open[index]}
                >
                  <div>
                    <p>{faq.a}</p>
                  </div>
                </div>
              </div>
              <div className="lp-faq__sep" />
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
