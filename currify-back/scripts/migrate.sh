#!/bin/sh
set -e

echo "Checking for failed migrations..."
npx prisma migrate resolve --applied 20250929134217_init --skip-generate 2>/dev/null || true
npx prisma migrate resolve --applied 20251006032649_add_scoring_system --skip-generate 2>/dev/null || true
npx prisma migrate resolve --applied 20250929232217_add_campaign_fields --skip-generate 2>/dev/null || true
npx prisma migrate resolve --applied 20251017145223_add_selection_process_system --skip-generate 2>/dev/null || true
npx prisma migrate resolve --applied 20260116213601_sync_schema_changes --skip-generate 2>/dev/null || true

echo "Running migrations..."
npx prisma migrate deploy
