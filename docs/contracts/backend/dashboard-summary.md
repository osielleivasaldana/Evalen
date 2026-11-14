# Dashboard — GET /api/dashboard/summary

**Última actualización:** 23 Julio 2026
**Autoridad:** Backend Architect

## Descripción

Endpoint unificado que agrega todas las métricas, campañas con funnel, cola de decisiones y top candidates para la página principal del Dashboard.

## Seguridad

- **Guard:** `JwtAuthGuard` (Passport.js JWT)
- **Multi-Tenant:** Filtro automático por alcance del usuario (creator, responsibleId, o misma compañía)
- **No requiere rol específico:** Cualquier usuario autenticado puede acceder

## Request

```
GET /api/dashboard/summary
Authorization: Bearer <jwt_token>
```

## Response — `200 OK`

```typescript
{
  stats: {
    activeCampaigns: number;     // Campañas en estado ACTIVE
    evaluatedCVs: number;        // Candidates con processingStatus COMPLETED
    inInterview: number;         // Candidates con candidateStatus IN_PROCESS
    timeSavedHours: number;      // Math.round(evaluatedCVs * 0.5 * 10) / 10
    draftCampaigns: number;      // Campañas en estado DRAFT
    closedCampaigns: number;     // Campañas en estado COMPLETED
    weeklyNewCVs: number;        // Candidates creados en últimos 7 días
    weeklyIncrease: number;      // % de aumento semanal (redondeado)
  },
  campaigns: Array<{
    id: string;
    title: string;
    description: string;
    status: CampaignStatus;      // DRAFT | ACTIVE | PAUSED | COMPLETED
    modality: string;            // REMOTE | HYBRID | ON_SITE | ''
    location: string;
    createdAt: string;           // ISO 8601
    candidateCount: number;      // Total candidates en la campaña
    funnel: {
      review: number;            // candidateStatus = NEW
      interview: number;         // candidateStatus = IN_PROCESS
      offer: number;             // Otros estados
      hired: number;             // candidateStatus = SELECTED
    };
  }>;
  decisionQueue: Array<{
    id: string;
    name: string;
    initials: string;            // 2 letras mayúsculas
    campaignTitle: string;
    campaignId: string;
    matchScore: number;          // overallScore del scoring
    recommendation: string;      // Ej: "FUERTE", "RECOMENDADO"
    summary: string;
    photoUrl?: string;           // Siempre undefined (no implementado en schema)
  }>;
  topCandidates: Array<{
    id: string;
    name: string;
    initials: string;
    photoUrl?: string;
    role: string;                // Desde structuredData.titular_profesional
    experience: string;          // Desde structuredData.experiencia_laboral[0]
    campaignTitle: string;
    campaignId: string;
    matchScore: number;
    status: CandidateStatus;
    stageLabel: string;          // Mapeo español: En revisión, En entrevista, etc.
    dimensions: Array<{
      label: string;             // Stack, Experiencia, Educación, etc.
      score: number;             // Valor normalizado (0-10)
      maxScore: number;          // Siempre 10
    }>;
    summary: string;
  }>;
}
```

### Errors

| Código | Significado |
|--------|-------------|
| `401`  | JWT inválido, expirado o ausente |
| `500`  | Error interno del servidor |

## Data Scope (Multi-Tenant)

El endpoint filtra campañas usando el mismo `accessWhere` que `CampaignsService.findAll`:

```
OR:
  - userId (el usuario creó la campaña)
  - stageTemplates.some.responsibleId == userId (es responsable de etapa)
  - user.company == userCompany (misma compañía, si aplica)
```

## Queries Internas (5 paralelas vía Prisma)

1. **Campaign counts** — 4 counts: total, active, draft, closed
2. **Campaigns with funnel** — `findMany` con candidates agrupados por candidateStatus
3. **Decision queue** — Candidates NEW + scoringStatus CURRENT, ordenados por score DESC (top 20)
4. **Top candidates** — Candidates con overallScore >= 60 + scoringStatus CURRENT, ordenados por score DESC (top 20)
5. **Weekly stats** — Candidates creados en ventanas de 7 y 14 días, más conteos de procesados/en entrevista
