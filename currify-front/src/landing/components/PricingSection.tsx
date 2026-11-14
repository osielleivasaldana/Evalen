import React from 'react';
import {
  formatNumber,
  formatPrice,
  planCtaHref,
  type LandingPlan,
  type PlanTierKey,
} from '../hooks/usePlans';

interface PricingSectionProps {
  plans: LandingPlan[];
}

const caption = (plan: LandingPlan): string => {
  if (plan.tier === 'FREE') return 'Para empezar';
  if (plan.tier === 'PRO') return 'CLP · Precio de referencia';
  return 'Condiciones según tu equipo';
};

/**
 * Copy del diseño. Los precios, créditos y límites salen de `GET /plans`;
 * el nombre y la descripción se mantienen fieles al frame de Figma.
 */
const PLAN_COPY: Record<PlanTierKey, { name: string; description: string }> = {
  FREE: { name: 'Starter', description: 'Para conocer el flujo de Evalen.' },
  PRO: { name: 'Pro', description: 'Para una selección recurrente.' },
  ENTERPRISE: { name: 'Enterprise', description: 'Para necesidades de mayor volumen.' },
};

const ctaLabel = (tier: PlanTierKey): string => {
  if (tier === 'FREE') return 'Empezar gratis →';
  if (tier === 'PRO') return 'Elegir Pro →';
  return 'Consultar Enterprise →';
};

const campaignLabel = (limit: number): string =>
  limit === 1 ? '1 campaña' : `Hasta ${formatNumber(limit)} campañas`;

const PricingSection: React.FC<PricingSectionProps> = ({ plans }) => (
  <section className="lp-plans" id="planes">
    <div className="lp-plans__inner">
      <p className="lp-eyebrow">04 / PLANES PARA TU RITMO</p>

      <h2 className="lp-display">
        Empieza con 3 CVs.
        <br />
        Crece con tu equipo.
      </h2>

      <p className="lp-plans__lead">
        Prueba el flujo completo antes de ampliar tu capacidad.
      </p>

      <div className="lp-plans__grid">
        {plans.map((plan) => {
          const featured = plan.tier === 'PRO';
          const outline = plan.tier === 'ENTERPRISE';
          const copy = PLAN_COPY[plan.tier];

          return (
            <article
              className={`lp-plan ${featured ? 'lp-plan--featured' : ''}`}
              key={plan.tier}
            >
              <div className="lp-plan__head">
                <h3 className="lp-plan__name">{copy.name}</h3>
                {featured && <span className="lp-plan__badge">PARA EQUIPOS</span>}
              </div>

              <p className="lp-plan__desc">{copy.description}</p>

              <div className="lp-plan__price">
                <b>{formatPrice(plan.price)}</b>
                <small>{caption(plan)}</small>
              </div>

              <div className="lp-plan__rule" />

              <ul className="lp-plan__features">
                <li>✓&nbsp;&nbsp;{formatNumber(plan.cvCredits)} créditos para CVs</li>
                <li>✓&nbsp;&nbsp;{formatNumber(plan.smartFillCredits)} usos de Smart Fill</li>
                <li>✓&nbsp;&nbsp;{campaignLabel(plan.campaignLimit)}</li>
              </ul>

              <p className="lp-plan__common">
                Análisis por dimensiones y gestión del proceso de selección.
              </p>

              <a
                className={`lp-plan__cta ${outline ? 'lp-plan__cta--outline' : ''}`}
                href={planCtaHref(plan.tier)}
              >
                {ctaLabel(plan.tier)}
              </a>
            </article>
          );
        })}
      </div>

      <p className="lp-plans__note">
        Una subida de CV consume 1 crédito; una reevaluación exitosa también. Precios y
        límites de referencia según la configuración documentada; confirmar antes de
        publicar.
      </p>
    </div>
  </section>
);

export default PricingSection;
