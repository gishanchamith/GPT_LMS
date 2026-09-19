# Deployment

The live site, **https://learnhub.mrt.lk**, runs on a single AWS free-tier EC2 instance:

```
Browser → Cloudflare DNS (learnhub.mrt.lk) → Elastic IP → Nginx + Let's Encrypt on EC2
            ├─ /api/*          → PM2 → Express (apps/api, port 5000) → MongoDB Atlas, OpenAI
            └─ everything else → PM2 → Next.js (apps/web, port 3000)
```

Section 6 describes the alternative split setup: the website on Vercel and only the API on EC2.

## 1. MongoDB Atlas

1. Create a cluster and a database user.
2. **Network Access**: allow the server's Elastic IP, plus your own IP while developing or seeding
   from your machine. If the API can't connect and the log shows "SSL alert number 80", your IP
   isn't on this list.
3. Copy the connection string and **add the database name** after `.net/`, e.g.
   `mongodb+srv://USER:PASS@cluster.xxxx.mongodb.net/GPT_LMS?retryWrites=true&w=majority`.
   Without it, data goes into Atlas's default `test` database. Atlas clusters are replica sets, so
   the transactional cascade delete works.

## 2. AWS: instance, IP and firewall

| Setting        | Value                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| Instance       | Ubuntu 26.04 LTS, **t3.micro** (free tier), 20 GB disk (the install uses about 6.5 GB) |
| Key pair       | Download the `.pem`; connect with `ssh -i key.pem ubuntu@<ip>`                         |
| **Elastic IP** | Allocate one and **associate it with the instance**                                    |
| Security group | Inbound **22** from your IP only, **80** and **443** from `0.0.0.0/0`. Nothing else    |

Without an Elastic IP, the public IP changes every time the instance stops, which breaks DNS and
the certificate. An Elastic IP costs nothing while it's attached to a running instance, but AWS
bills for one that's allocated and not attached. Ports 5000 and 3000 stay closed, because Nginx
reaches both apps on localhost.

## 3. Server setup (once)

```bash
# 2 GB swap: a t3.micro has 1 GB of RAM, which isn't enough for `next build`
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Node 22, PM2, Nginx, certbot
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx git
sudo npm i -g pm2

git clone <repo-url> GPT_LMS && cd GPT_LMS
npm ci --no-audit --no-fund
```

### API `.env` (`apps/api/.env`)

Copy your local file up with `scp -i key.pem apps/api/.env ubuntu@<ip>:GPT_LMS/apps/api/.env`
(then `chmod 600` it), or start from `.env.example`. Production values:

| Variable                               | Production value                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                             | `production` (makes the auth cookie `secure`, so the site **must** be served over HTTPS)          |
| `MONGODB_URI`                          | Atlas string including `/GPT_LMS`                                                                 |
| `JWT_SECRET`                           | 48+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_ORIGIN`                        | The site's own URL(s), comma-separated, e.g. `https://learnhub.mrt.lk`                            |
| `TRUST_PROXY`                          | `1` (Nginx is the only proxy)                                                                     |
| `OPENAI_API_KEY`                       | The key on **one line** (about 160 characters)                                                    |
| `AI_RATE_LIMIT`, `AI_GUEST_RATE_LIMIT` | Lower them if your OpenAI quota is small (defaults 10 and 5 per 15 min)                           |
| `SUPERADMIN_*`, `SEED_PASSWORD`        | Real email and strong passwords: the demo-account buttons are on a public login page              |

### Website `.env` (`apps/web/.env.production`)

```bash
printf "API_URL=http://127.0.0.1:5000\nNEXT_PUBLIC_DEMO_MODE=true\n" > apps/web/.env.production
```

`API_URL` is read at build time, when `next.config.ts` sets up the `/api/*` rewrite. Set
`NEXT_PUBLIC_DEMO_MODE=false` to hide the demo-account buttons.

### Build, data and processes

```bash
npm run build -w @lp/api                                          # → apps/api/dist/server.js
NODE_OPTIONS=--max-old-space-size=1536 npm run build -w @lp/web   # takes a few minutes on a t3.micro

npm run create-superadmin -w @lp/api       # idempotent; needs SUPERADMIN_* (password ≥8 chars)
npm run seed -w @lp/api -- --small --yes   # optional demo data; WIPES users, courses, enrollments,
                                           # categories and audit logs in that database
npm run ai:check -w @lp/api                # optional: one tiny OpenAI request to confirm the key

(cd apps/api && pm2 start ecosystem.config.cjs)    # lp-api
(cd apps/web && pm2 start ecosystem.config.cjs)    # lp-web
pm2 save && pm2 startup                            # run the command it prints: restart on reboot
```

## 4. Domain and HTTPS

### DNS (Cloudflare)

Add an **A** record: name `learnhub` (or `@` for the bare domain), IPv4 address = the Elastic IP,
proxy status **DNS only** (grey cloud). Check it with `nslookup learnhub.mrt.lk`.

**No domain?** `<ip-with-dashes>.sslip.io` (for example `16-16-111-216.sslip.io`) already resolves
to that IP and works with certbot. The live server answers on both names.

### Nginx and certificate

Set `server_name` in [`deploy/nginx/lms.conf`](../deploy/nginx/lms.conf), then:

```bash
sudo cp deploy/nginx/lms.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/lms.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d learnhub.mrt.lk -d 16-16-111-216.sslip.io --redirect
sudo certbot renew --dry-run               # renewal runs automatically from certbot.timer
```

Certbot adds the HTTPS server block and the HTTP → HTTPS redirect to the installed file. The
copy in `deploy/` stays the plain-HTTP starting point. To add a hostname later, add it to
`server_name` and run certbot again with every name plus `--expand`.

### Cloudflare proxy (orange cloud), optional

Before switching the record to **Proxied**:

1. Set **SSL/TLS** mode to **Full (strict)**. "Flexible" causes an endless redirect loop, because
   Nginx already redirects HTTP to HTTPS.
2. Make Nginx take the visitor IP from Cloudflare. Otherwise every request appears to come from a
   Cloudflare address, and all visitors share one rate-limit bucket. In the `server` block, add
   `real_ip_header CF-Connecting-IP;` and one `set_real_ip_from <range>;` line for each range in
   [Cloudflare's IP list](https://www.cloudflare.com/ips/). Keep `TRUST_PROXY=1`.

## 5. Verify

- `https://learnhub.mrt.lk/api/health` →
  `{"success":true,"data":{"status":"ok","db":"connected","clientIp":"…"}}`. `clientIp` must be
  **your** public IP. If it shows `127.0.0.1`, an AWS address or a Cloudflare address, the proxy
  settings are wrong and every visitor would share one rate-limit bucket.
- `https://learnhub.mrt.lk/api/docs/` → Swagger UI.
- `pm2 logs lp-api --lines 20` shows `AI recommendations enabled (model: …)`.
- Log in as each seeded role in a private window, and try the AI advisor once as a guest.

### Later deploys

```bash
cd ~/GPT_LMS && bash deploy/deploy.sh   # pull, install, type-check, build both apps, reload PM2, health checks
```

The API reads `.env` only at startup, so restart it after changing `.env`:
`pm2 restart lp-api --update-env`. Changing `apps/web/.env.production` needs a web rebuild.

Useful commands: `pm2 ls`, `pm2 logs lp-api`, `pm2 logs lp-web`, `sudo nginx -t`,
`sudo certbot certificates`.

## 6. Alternative: website on Vercel, API on EC2

Use this setup to spread load or to use Vercel's CDN. The API server is set up as above (only
`apps/api` is built), with these differences:

- Nginx: use [`deploy/nginx/api.conf`](../deploy/nginx/api.conf) with an API hostname, e.g.
  `api.example.com`, and run certbot for that name.
- API `.env`: `TRUST_PROXY=2` (the Vercel rewrite plus Nginx), and `CLIENT_ORIGIN` = the Vercel URL.
- Later API deploys: `bash deploy/deploy-api.sh`.
- Vercel: import the repository and set **Root Directory** to `apps/web`. Set the environment
  variables `API_URL=https://api.example.com` (no trailing slash) and `NEXT_PUBLIC_DEMO_MODE`.

The browser still talks only to the Vercel origin, and `/api/*` is rewritten to the API, so the
auth cookie stays first-party. One trade-off: with `TRUST_PROXY=2`, someone calling the API
hostname directly could forge `X-Forwarded-For` to get around the IP-based limits. Restricting
Nginx to Vercel's traffic would close that gap.
