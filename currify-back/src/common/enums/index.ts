// Enums centralizados para evitar problemas de resolución en tiempo de ejecución

export enum WorkType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  INTERNSHIP = 'INTERNSHIP'
}

export enum Modality {
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
  ON_SITE = 'ON_SITE'
}

export enum Duration {
  INDEFINITE = 'INDEFINITE',
  FIXED_TERM = 'FIXED_TERM',
  PROJECT = 'PROJECT'
}

export enum Currency {
  CLP = 'CLP',
  USD = 'USD',
  EUR = 'EUR',
  UF = 'UF'
}

// Re-export enums from Prisma to ensure type compatibility
import { CampaignStatus } from '@prisma/client';
export { CampaignStatus };

// Valores de enums de Prisma duplicados como constantes
// para evitar problemas de resolución en tiempo de ejecución
export const PROCESSING_STATUS_VALUES = ['PENDING', 'COMPLETED', 'ERROR'] as const;
export const CAMPAIGN_STATUS_VALUES = ['DRAFT', 'ACTIVE', 'CLOSED'] as const;
