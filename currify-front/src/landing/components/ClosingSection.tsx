import React from 'react';
import { formatNumber, type LandingPlan } from '../hooks/usePlans';

interface ClosingSectionProps {
  plans: LandingPlan[];
}

const ClosingSection: React.FC<ClosingSectionProps> = ({ plans }) => {
  const free = plans.find((plan) => plan.tier === 'FREE');

  return (
    <section className="lp-closing">
      <div className="lp-closing__inner">
        <p className="lp-eyebrow lp-closing__eyebrow">MENOS RUIDO. MÁS CRITERIO.</p>

        <div className="lp-closing__row">
          <h2 className="lp-closing__title">
            La próxima gran
            <br />
            conversación
            <br />
            empieza aquí.
          </h2>

          <div className="lp-closing__aside">
            <p className="lp-closing__text">
              Trae el cargo. Trae los CVs.
              <br />
              El criterio sigue siendo tuyo.
            </p>

            <a className="lp-closing__cta" href="/login?plan=free">
              Crear mi primera campaña →
            </a>

            <p className="lp-closing__note">
              {free
                ? `Starter · ${formatNumber(free.cvCredits)} créditos CV · ${
                    free.campaignLimit === 1
                      ? '1 campaña'
                      : `${formatNumber(free.campaignLimit)} campañas`
                  }`
                : 'Starter · 3 créditos CV · 1 campaña'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClosingSection;
