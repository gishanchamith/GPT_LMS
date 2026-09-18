# Deployment

```
Browser → Vercel (Next.js, apps/web) → rewrite /api/* → Nginx + certbot on EC2 → PM2 → Express (apps/api) → MongoDB Atlas
```

## 1. MongoDB Atlas

1. Create a cluster and a database user.
2. **Network Access**: allow only the EC2 Elastic IP (plus your own IP temporarily if you seed from
   your machine).
3. Copy the connection string and include a database name, e.g.
   `mongodb+srv://USER:PASS@cluster.xxxx.mongodb.net/learning-platform?retryWrites=true&w=majority`.
   Atlas clusters are replica sets, so the transactional cascade delete works.

## 2. API on EC2 (Ubuntu)

```bash
# Node 22 + PM2 + Nginx + certbot
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx git
sudo npm i -g pm2

git clone <repo-url> learning-platform && cd learning-platform
cp apps/api/.env.example apps/api/.env   # fill in: NODE_ENV=production, MONGODB_URI, JWT_SECRET,
                                         # CLIENT_ORIGIN, OPENAI_API_KEY, SUPERADMIN_*
npm ci -w @lp/api -w @lp/shared          # dev deps included: esbuild builds, tsx runs scripts
npm run build -w @lp/api                 # → apps/api/dist/server.js

npm run create-superadmin -w @lp/api     # idempotent
npm run seed -w @lp/api -- --yes         # optional demo data; wipes the database, so it
                                         # refuses to run on a remote DB without --yes

cd apps/api && pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
```

Nginx: copy [`deploy/nginx/api.conf`](../deploy/nginx/api.conf) to `/etc/nginx/sites-available/`,
set `server_name`, enable it, then:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.example.com     # HTTPS + auto-renewal
```

EC2 security group: allow 80 and 443 from anywhere and 22 from your IP only. Port 5000 stays
closed, because Nginx reaches the API on localhost.

Later deploys: `./deploy/deploy-api.sh` (pull, install, `pm2 startOrReload`, health check).

## 3. Frontend on Vercel

1. Import the repository and set **Root Directory** to `apps/web` (Vercel detects Next.js and
   installs the workspace from the repo root).
2. Environment variables:
   - `API_URL` = `https://api.example.com` (no trailing slash)
   - `NEXT_PUBLIC_DEMO_MODE` = `true` shows the demo-account buttons on the login page; set it to
     `false` to hide them.
3. Deploy. Add the Vercel URL to the API's `CLIENT_ORIGIN` (only needed for direct cross-origin
   calls, since the browser normally goes through the rewrite).

## 4. Verify

- In `apps/api/.env` on the server set `TRUST_PROXY=2` (Vercel + Nginx), restart, then open
  `https://<vercel-app>/api/health` from your own machine: `clientIp` should be **your** public IP.
  If it shows an AWS/Vercel address instead, the proxy count is wrong and every visitor would
  share one rate-limit bucket.

- `https://<vercel-app>/api/health` → `{"success":true,"data":{"status":"ok","db":"connected"}}`
- `https://<vercel-app>/api/docs/` → Swagger UI
- Log in as each seeded role in a private window.
