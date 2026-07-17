# VNR Keys — Dockerized Dual-Environment Deployment

## Where files go in your repo

```
vnr-keys/
├── backend/
│   ├── Dockerfile              ← new
│   ├── .dockerignore           ← new
│   └── ...existing backend code
├── frontend/
│   ├── Dockerfile              ← new
│   ├── nginx.conf              ← new
│   ├── .dockerignore           ← new
│   └── ...existing frontend code
├── docker-compose.prod.yml     ← new (repo root)
├── docker-compose.dev.yml      ← new (repo root)
├── .gitignore                  ← merge with existing
└── .github/workflows/
    ├── deploy-prod.yml         ← new
    └── deploy-dev.yml          ← new
```

`nginx-host-config/*.conf` are **not** part of the repo — they go directly on
the server at `/etc/nginx/sites-available/`, since that Nginx is managing SSL
and routing for all your VJ apps, not just this one.

## How the branch → URL mapping works.

| Branch | Workflow | GitHub Environment | Containers | Host ports | Public URL |
|---|---|---|---|---|---|
| `main` | `deploy-prod.yml` | `keys-prod` | `vnrkeys-*-prod` | 6200 (frontend), 6203 (backend) | `keys.vjstartup.com` |
| `dev` | `deploy-dev.yml` | `keys-dev` | `vnrkeys-*-dev` | 6210 (frontend), 6213 (backend) | `dev-keys.vjstartup.com` |

Push to `main` → only `deploy-prod.yml` fires (it's scoped to that branch) →
rebuilds and restarts only the `-prod` containers. Push to `dev` → only
`deploy-dev.yml` fires → only the `-dev` containers move. They never touch
each other since they use separate container names, separate Docker
networks, and separate host ports.

## One-time setup on the server

1. Confirm your self-hosted runner is registered and picks up jobs from this
   repo (`Settings → Actions → Runners`). If BETA/GAMMA has multiple runners
   and you want this repo pinned to one specific box, add a label, e.g.:
   ```yaml
   runs-on: [self-hosted, gamma]
   ```
   in both workflow files.
2. Confirm Docker + Docker Compose v2 are installed and the runner's user can
   run `docker` without `sudo` (it's already set up this way for your other
   apps, so this should already be true on GAMMA/BETA).
3. Drop the two files from `nginx-host-config/` into
   `/etc/nginx/sites-available/`, symlink them into `sites-enabled/`, then run
   `sudo certbot --nginx -d keys.vjstartup.com` and
   `sudo certbot --nginx -d dev-keys.vjstartup.com` to issue SSL and let
   certbot finish wiring the `443` blocks.
4. `sudo nginx -t && sudo systemctl reload nginx`

## GitHub Environments → Secrets

You said you already created `keys-dev` and `keys-prod` environments — add
these secrets to **each one separately** (values will differ between dev and
prod, e.g. different Mongo databases, different Google OAuth client if you
use separate ones):

**Backend:**
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL` — e.g. `https://keys.vjstartup.com` / `https://dev-keys.vjstartup.com`
- `BACKEND_URL` — e.g. `https://keys.vjstartup.com/api` / `https://dev-keys.vjstartup.com/api`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `EMAIL_FROM_NAME`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Frontend (Vite build-time — baked into the JS bundle, not runtime env):**
- `VITE_APP_NAME`
- `VITE_APP_VERSION`
- `VITE_API_URL` — e.g. `https://keys.vjstartup.com/api` / `https://dev-keys.vjstartup.com/api`
- `VITE_FRONTEND_URL` — e.g. `https://keys.vjstartup.com` / `https://dev-keys.vjstartup.com`
- `VITE_SOCKET_URL` — e.g. `https://keys.vjstartup.com` / `https://dev-keys.vjstartup.com` (socket.io upgrades at `/socket.io/`, not a separate port)

Since your host Nginx proxies `/api/` to the backend on the *same* domain,
you don't need a separate API subdomain — `VITE_API_URL` just points at
`/api` on the same origin. That also sidesteps CORS entirely for normal
requests, since browser calls stay same-origin.

## The Google OAuth gotcha (given your ActiGen/NewsFlow history)

Since this app uses `passport-google-oauth20`, go to the Google Cloud
Console → your OAuth client → and add **both**:
- Authorized JavaScript origins: `https://keys.vjstartup.com` and `https://dev-keys.vjstartup.com`
- Authorized redirect URIs: whatever your passport callback route resolves
  to on each domain, e.g. `https://keys.vjstartup.com/api/auth/google/callback`
  and `https://dev-keys.vjstartup.com/api/auth/google/callback`

Missing the dev domain here is the single most common cause of
`origin_mismatch` — it's worth double-checking before your first dev deploy.

## Why the backend `PORT` is set to `5000` internally

Your existing `.env` has `PORT=6203`, but that was presumably chosen back
when the app ran bare-metal on that port. Inside Docker, the *container*
port and the *host* port are decoupled — the compose files fix the
container-internal port at `5000` for both dev and prod (so the backend code
itself doesn't need to know or care which environment it's in), and only the
host-side mapping differs (`6203:5000` for prod, `6213:5000` for dev). Just
make sure your backend actually reads `process.env.PORT` on startup rather
than a hardcoded `6203`.

## First deploy checklist

1. Add all secrets above to both `keys-dev` and `keys-prod` GitHub Environments.
2. Merge these Docker/workflow files into `main` (or open a PR and merge).
3. Push to `dev` first — watch the Action run, then check:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   docker compose -f docker-compose.dev.yml logs -f backend
   ```
4. Hit `https://dev-keys.vjstartup.com` and confirm login/API calls work
   before touching `main`.
5. Once dev is verified, merge into `main` to trigger the prod deploy.

## Common failure points to check if something breaks

- **502 from Nginx** → container isn't up yet or crashed; `docker compose ps`
  and `docker compose logs backend` on the server.
- **Blank frontend / API calls failing** → check the built bundle actually
  has the right `VITE_API_URL` baked in (`docker exec -it vnrkeys-frontend-prod sh` then
  `grep -r "VITE_API_URL" /usr/share/nginx/html/assets/*.js` won't literally
  show the var name post-build, but you can grep for your domain string to
  confirm it's not still pointing at `localhost`).
- **origin_mismatch on Google login** → see the OAuth section above.
- **Socket.io not connecting** → confirm the `/socket.io/` location block
  made it into the live Nginx config (`nginx -T | grep -A5 socket.io`).
