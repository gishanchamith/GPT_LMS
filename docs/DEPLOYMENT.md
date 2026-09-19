# Deployment

```
Browser → Vercel (Next.js, apps/web) → rewrite /api/* → Nginx + certbot on EC2 → PM2 → Express (apps/api) → MongoDB Atlas
```

## 1. MongoDB Atlas

1. Create a cluster and a database user.
2. **Network Access**: allow the EC2 Elastic IP (plus your own IP while developing or seeding from
   your machine). If the API can't connect with an "SSL alert number 80" error, your IP isn't on
   this list.
3. Copy the connection string and **add the database name** after `.net/`, e.g.
   `mongodb+srv://USER:PASS@cluster.xxxx.mongodb.net/GPT_LMS?retryWrites=true&w=majority`.
   Without it, data goes into Atlas's default `test` database. Atlas clusters are replica sets, so
   the transactional cascade delete works.

## 2. API on EC2 (Ubuntu)

```bash
# Node 22 + PM2 + Nginx + certbot
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx git
sudo npm i -g pm2

git clone <repo-url> GPT_LMS && cd GPT_LMS
cp apps/api/.env.example apps/api/.env   # fill in: see "Production .env" below
npm ci -w @lp/api -w @lp/shared          # dev deps included: esbuild builds, tsx runs scripts
npm run build -w @lp/api                 # → apps/api/dist/server.js

npm run create-superadmin -w @lp/api     # idempotent; needs SUPERADMIN_* (password ≥8 chars)
npm run seed -w @lp/api -- --small --yes # optional demo data; WIPES users, courses, enrollments,
                                         # categories and audit logs in that database
npm run ai:check -w @lp/api              # optional: one tiny OpenAI request to confirm the key

cd apps/api && pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
```

### Production `.env` (`apps/api/.env`)

| Variable                               | Production value                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                             | `production`                                                                                      |
| `MONGODB_URI`                          | Atlas string including `/GPT_LMS`                                                                 |
| `JWT_SECRET`                           | 48+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_ORIGIN`                        | Your Vercel URL                                                                                   |
| `TRUST_PROXY`                          | `2` (Vercel + Nginx)                                                                              |
| `OPENAI_API_KEY`                       | The key on **one line** (about 160 characters)                                                    |
| `AI_RATE_LIMIT`, `AI_GUEST_RATE_LIMIT` | Lower them if your OpenAI quota is small (defaults 10 and 5 per 15 min)                           |
| `SUPERADMIN_*`                         | Real email and a strong password                                                                  |

Nginx: copy [`deploy/nginx/api.conf`](../deploy/nginx/api.conf) to `/etc/nginx/sites-available/`,
set `server_name`, enable it, then:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.example.com     # HTTPS + auto-renewal
```

EC2 security group: allow 80 and 443 from anywhere and 22 from your IP only. Port 5000 stays
closed, because Nginx reaches the API on localhost.

Later deploys: `./deploy/deploy-api.sh` (pull, install, type-check, build, `pm2 startOrReload`,
health check). The API reads `.env` only at start, so restart it after changing `.env`
(`pm2 restart lp-api --update-env`).

## 3. Frontend on Vercel

1. Import the repository and set **Root Directory** to `apps/web` (Vercel detects Next.js and
   installs the workspace from the repo root).
2. Environment variables:
   - `API_URL` = `https://api.example.com` (no trailing slash)
   - `NEXT_PUBLIC_DEMO_MODE` = `true` shows the demo-account buttons on the login page; set it to
     `false` to hide them.
3. Deploy. Add the Vercel URL to the API's `CLIENT_ORIGIN` (only needed for direct cross-origin
   calls, since the browser normally goes through the rewrite).

## Alternative: everything on one EC2 instance

Instead of Vercel, the website can run on the same instance as the API. Nginx sends `/api/` to
Express (port 5000) and everything else to Next.js (port 3000). Only Nginx sits in front of the API,
so use `TRUST_PROXY=1`, and set `CLIENT_ORIGIN` to the site's own `https://` URL.

On a t3.micro (1 GB RAM), add swap before building, or `next build` runs out of memory:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

```bash
npm ci                                                   # whole workspace
printf "API_URL=http://127.0.0.1:5000\nNEXT_PUBLIC_DEMO_MODE=true\n" > apps/web/.env.production
npm run build -w @lp/api
NODE_OPTIONS=--max-old-space-size=1536 npm run build -w @lp/web

(cd apps/api && pm2 start ecosystem.config.cjs)
(cd apps/web && pm2 start ecosystem.config.cjs)
pm2 save && pm2 startup                                  # run the command it prints

sudo cp deploy/nginx/lms.conf /etc/nginx/sites-available/   # set server_name first
sudo ln -s /etc/nginx/sites-available/lms.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d <host>
```

**No domain yet?** `<ip-with-dashes>.sslip.io` (for example `16-16-111-216.sslip.io`) resolves to
that IP, and certbot can issue a certificate for it. HTTPS is required because in production
the auth cookie is `secure`, so logins don't stick over plain HTTP. Allocate an **Elastic IP** first;
otherwise the public IP, and with it the hostname, changes whenever the instance stops.

## 4. Verify

- `https://<vercel-app>/api/health` →
  `{"success":true,"data":{"status":"ok","db":"connected","clientIp":"…"}}`. `clientIp` should be
  **your** public IP. If it shows an AWS or Vercel address, `TRUST_PROXY` is wrong and every
  visitor would share one rate-limit bucket.
- `https://<vercel-app>/api/docs/` → Swagger UI.
- The API log shows `AI recommendations enabled (model: …)`.
- Log in as each seeded role in a private window, and try the AI advisor once as a guest.
