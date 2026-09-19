#!/usr/bin/env bash
# Single-server deploy (website + API on one EC2 host).
# Run on the server from the repository root: bash deploy/deploy.sh
# For the split setup (website on Vercel), use deploy-api.sh instead.
set -euo pipefail

git pull --ff-only
npm ci --no-audit --no-fund
npm run typecheck -w @lp/api
npm run build -w @lp/api
# A t3.micro has 1 GB of RAM: the web build needs swap plus a larger heap limit.
NODE_OPTIONS=--max-old-space-size=1536 NEXT_TELEMETRY_DISABLED=1 npm run build -w @lp/web

(cd apps/api && pm2 startOrReload ecosystem.config.cjs --update-env)
(cd apps/web && pm2 startOrReload ecosystem.config.cjs --update-env)
pm2 save

sleep 5
curl -fsS http://127.0.0.1:5000/api/health && echo " ← API healthy"
curl -fsS -o /dev/null http://127.0.0.1:3000/ && echo "Website healthy"
