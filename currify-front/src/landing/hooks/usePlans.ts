import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

export type PlanTierKey = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface LandingPlan {
  tier: PlanTierKey;
  name: string;
  description: string;
  price: number;
  campaignLimit: number;
  cvCredits: number;
  smartFillCredits: number;
  features: string[];
}

const TIERS: PlanTierKey[] = ['FREE', 'PRO', 'ENTERPRISE'];

/**
 * Valores de respaldo equivalentes a la configuración sembrada en la API.
 * Se usan solo si `GET /plans` no está disponible, para que el layout nunca salte.
 */
const FALLBACK_PLANS: LandingPlan[] = [
  {
    tier: 'FREE',
    name: 'Starter',
    description: 'Ideal para probar la magia.',
    price: 0,
    campaignLimit: 1,
    cvCredits: 3,
    smartFillCredits: 3,
    features: [],
  },
  {
    tier: 'PRO',
    name: 'EvalenPro',
    description: 'Para equipos de RR.HH. que buscan escalar.',
    price: 19990,
    campaignLimit: 999,
    cvCredits: 999,
    smartFillCredits: 999,
    features: [],
  },
  {
    tier: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Para grandes corporativos.',
    price: -1,
    campaignLimit: 9999,
    cvCredits: 9999,
    smartFillCredits: 9999,
    features: [],
  },
];

const asNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeTier = (raw: any): PlanTierKey | null => {
  const tier = String(raw?.tier ?? '').toUpperCase();
  if (TIERS.includes(tier as PlanTierKey)) return tier as PlanTierKey;
  const name = String(raw?.name ?? '').toLowerCase();
  if (name.includes('enterprise')) return 'ENTERPRISE';
  if (name.includes('pro')) return 'PRO';
  if (name.includes('starter') || name.includes('free')) return 'FREE';
  return null;
};

const normalizePlan = (raw: any): LandingPlan | null => {
  const tier = normalizeTier(raw);
  if (!tier) return null;
  const fallback = FALLBACK_PLANS.find((plan) => plan.tier === tier) as LandingPlan;

  return {
    tier,
    name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name : fallback.name,
    description:
      typeof raw?.description === 'string' && raw.description.trim()
        ? raw.description
        : fallback.description,
    price: asNumber(raw?.price, fallback.price),
    campaignLimit: asNumber(raw?.campaignLimit, fallback.campaignLimit),
    cvCredits: asNumber(raw?.cvCredits, fallback.cvCredits),
    smartFillCredits: asNumber(raw?.smartFillCredits, fallback.smartFillCredits),
    features: Array.isArray(raw?.features) ? raw.features.filter((f: unknown) => typeof f === 'string') : [],
  };
};

export const formatPrice = (price: number): string => {
  if (price < 0) return 'A medida';
  if (price === 0) return '$0';
  return `$${price.toLocaleString('es-CL')}`;
};

export const formatNumber = (value: number): string => value.toLocaleString('es-CL');

export const planCtaHref = (tier: PlanTierKey): string =>
  `/login?plan=${tier.toLowerCase()}`;

export function usePlans(): LandingPlan[] {
  const [plans, setPlans] = useState<LandingPlan[]>(FALLBACK_PLANS);

  useEffect(() => {
    let alive = true;
    const getPlans = (apiService as any)?.getPlans;

    if (typeof getPlans !== 'function') return undefined;

    Promise.resolve(getPlans.call(apiService))
      .then((data: any) => {
        if (!alive || !Array.isArray(data) || data.length === 0) return;

        const normalized = data
          .map(normalizePlan)
          .filter((plan): plan is LandingPlan => plan !== null);

        if (normalized.length === 0) return;

        const merged = TIERS.map(
          (tier) =>
            normalized.find((plan) => plan.tier === tier) ??
            (FALLBACK_PLANS.find((plan) => plan.tier === tier) as LandingPlan),
        );

        setPlans(merged);
      })
      .catch(() => {
        /* Silencioso: el fallback mantiene el layout intacto. */
      });

    return () => {
      alive = false;
    };
  }, []);

  return plans;
}
