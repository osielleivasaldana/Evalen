import React from 'react';

const items = [
  {
    title: '01 / Menos lectura repetitiva',
    desc: 'Extracción de CVs con apoyo de IA',
  },
  {
    title: '02 / Más contexto para decidir',
    desc: 'Compatibilidad explicada por dimensión',
  },
  {
    title: '03 / Un equipo conectado',
    desc: 'Etapas, responsables y feedback',
  },
];

const BenefitsStrip: React.FC = () => (
  <section className="lp-strip" id="producto">
    <div className="lp-strip__inner">
      {items.map((item) => (
        <div className="lp-strip__item" key={item.title}>
          <p className="lp-strip__title">{item.title}</p>
          <p className="lp-strip__desc">{item.desc}</p>
        </div>
      ))}
    </div>
  </section>
);

export default BenefitsStrip;
