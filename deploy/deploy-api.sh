#!/usr/bin/env bash
# Run on the EC2 host from the repository root: ./deploy/deploy-api.sh
set -euo pipefail

git pull --ff-only
# Only the API and the shared package are needed on the server. Dev dependencies are
# included because the build (esbuild) and the seed/admin scripts (tsx) use them.
npm ci -w @lp/api -w @lp/shared
cd apps/api
npm run typecheck
npm run build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
sleep 2
curl -fsS http://127.0.0.1:5000/api/health && echo " ← API healthy"
