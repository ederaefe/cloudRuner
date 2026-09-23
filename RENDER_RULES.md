# Render Free-Tier Compute and Resource Optimization Runbook

## Overview
This project is engineered to operate indefinitely on Render's Static Sites Free Tier with zero recurring compute charges, no cold starts, and zero risk of hitting server execution boundaries.

Render provides permanent hosting for static sites backed by an edge-distributed Content Delivery Network (CDN):
* **Compute Cost**: $0 (Static sites serve pre-built client assets without dedicated container runtimes).
* **Cold Starts / Spin-Down**: None (Unlike Render Web Services which spin down on inactivity, static sites are permanently served from the global CDN).
* **Monthly Included Outbound Bandwidth**: 100 GB / month per workspace ($0.15/GB overage).
* **Monthly Included Build Minutes**: 500 pipeline minutes / month per workspace ($5 per 1,000 minutes overage).
* **Custom Domains**: Free automated TLS/SSL certification via Let's Encrypt with DDoS mitigation.

---

## 1. Zero-Compute Architecture Mandate
* **Pure Static Delivery**: The game engine runs 100% in the client browser (WebGL, Web Audio API, Web Workers).
* **No Serverless / Backend Endpoints**: Do not create `/api/*` endpoints, Dockerfiles, or backend server runtimes (Node.js, Python, Go) for game delivery. Serving purely static files consumes 0 CPU compute hours and 0 GB-hours of memory.
* **No Server-Side Rendering (SSR)**: Avoid adding SSR frameworks (Next.js SSR, Nuxt SSR, SvelteKit SSR) that require backend servers to render pages on HTTP requests.

---

## 2. Blueprint Infrastructure-as-Code (`render.yaml`)
The project utilizes Render's declarative Blueprint specification to ensure repeatable, version-controlled deployments.

Key Blueprint settings in `render.yaml`:
```yaml
services:
  - type: web
    name: barch-aero-canyon
    runtime: static
    buildCommand: ""
    staticPublishPath: .
    autoDeployTrigger: commit
```
* **`type: web` + `runtime: static`**: Instructs Render to provision an edge-cached static distribution rather than spinning up containerized compute instances.
* **`staticPublishPath: .`**: Serves static HTML, CSS, JavaScript, and asset files directly from the repository root without requiring a compiler or intermediate output folder.
* **`buildCommand: ""`**: Bypasses build compilation commands, completing deployments in seconds and consuming almost zero build pipeline minutes.

---

## 3. Build Conservation & Build Filters
Render accounts for build time against the workspace's 500 monthly pipeline minutes. To preserve this quota:

* **Native Build Filters (`buildFilter.ignoredPaths`)**:
  Configured in `render.yaml` to prevent automatic deploys when changes only affect documentation, local test suites, IDE configuration, or scripts:
  ```yaml
  buildFilter:
    ignoredPaths:
      - .antigravity/**
      - .cursorrules
      - .vscode/**
      - "*.md"
      - scripts/**
  ```
* **No Heavy Compilers**: Code runs natively as ES modules (`type="module"`), avoiding bundlers (Webpack, Vite, Rollup) and minimizing build time to mere file synchronizations.

---

## 4. Bandwidth and Edge Cache Strategy
Render caps free workspace outbound egress at 100 GB per month. Stale or missing cache headers force the CDN to repeatedly fetch assets from the origin.

### Current Mode: Active Development (Unblocked)
During active development and local testing:
* **Headers**: `Cache-Control: public, max-age=0, must-revalidate` is applied to all assets in `render.yaml` so developer updates and hotfixes reflect immediately without stale edge locks.

### Future Mode: Production Release (Bandwidth Conservation)
When the game reaches stable release:
1. In `render.yaml`, adjust static asset paths (`/js/*`, `/css/*`) to:
   ```yaml
   - path: /js/*
     name: Cache-Control
     value: public, max-age=31536000, immutable
   - path: /css/*
     name: Cache-Control
     value: public, max-age=31536000, immutable
   ```
2. Keep `/index.html` and `/service-worker.js` with `public, max-age=0, must-revalidate` to ensure version handoffs remain instantaneous.
3. Leverage the client-side Service Worker (`service-worker.js`), which caches runtime assets in browser `CacheStorage`, generating 0 network requests to Render for returning players.

---

## 5. Security Headers and SPA Routing
Render injects security and routing configurations at the edge network layer via `render.yaml`:

### HTTP Response Headers
* `X-Content-Type-Options: nosniff`: Prevents MIME-sniffing vulnerabilities.
* `X-Frame-Options: DENY`: Prevents unauthorized framing / clickjacking.
* `Referrer-Policy: strict-origin-when-cross-origin`: Restricts referrer data leakage on cross-origin requests.
* `Cache-Control: public, max-age=0, must-revalidate`: Controlled edge and browser caching.

### Single Page Application (SPA) Rewrites
Render evaluates physical assets first. If no file matches the request path, it falls through to the declarative rewrite routes:
```yaml
routes:
  - type: rewrite
    source: /boost
    destination: /index.html
  - type: rewrite
    source: /teamwork-preview
    destination: /index.html
  - type: rewrite
    source: /*
    destination: /index.html
```
This guarantees direct access to clean deep-link URLs (`/boost`, `/teamwork-preview`) without 404 routing errors.

---

## 6. State Persistence and Real-Time Networking
* **Client-Side Profile Storage**: High scores, currency, hangar skins, and equipment trees persist in browser `localStorage` and `IndexedDB`.
* **WebRTC Peer-to-Peer Multiplayer**: Multiplayer flight telemetry is coordinated via direct browser-to-browser WebRTC DataChannels (`PeerJS` CDN). Telemetry packets bypass Render entirely.
* **Third-Party BaaS for Global State**: If global leaderboards or cross-device cloud saves are introduced, connect directly from the client to free-tier BaaS providers (Supabase, Firebase, or Cloudflare Workers KV) instead of routing traffic through Render backend servers.

---

## 7. Image and Asset Optimization Policy
* **Pre-Optimized Assets**: Export textures and UI assets as compressed WebP or SVG before committing to the repository.
* **Procedural Visuals**: Generate textures, canvas skins, and particle effects procedurally in WebGL/Canvas to keep asset transfer sizes minimal.

---

## Step-by-Step Deployment to Render

### Option A: Automatic Blueprint Deployment (Recommended)
1. Commit and push the repository (including `render.yaml`) to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** and select **Blueprint**.
3. Connect your repository. Render will automatically detect `render.yaml` and configure the static site, security headers, SPA rewrite rules, and build filters.
4. Click **Apply**. Render will deploy the site and assign a default `https://<service-name>.onrender.com` URL.

### Option B: Manual Static Site Creation via Dashboard
1. In the [Render Dashboard](https://dashboard.render.com), click **New +** and select **Static Site**.
2. Connect your Git repository.
3. Configure the following fields:
   * **Name**: `barch-aero-canyon`
   * **Branch**: `main` (or default branch)
   * **Build Command**: *(leave empty)*
   * **Publish Directory**: `.`
4. Click **Create Static Site**.
5. Under **Settings > Redirects/Rewrites**, add a Rewrite from `/*` to `/index.html`.
6. Under **Settings > Headers**, add the security and cache headers specified in `render.yaml`.

---

## Developer Verification Checklist
Before committing new features, verify compliance:
1. `render.yaml` is syntactically valid YAML.
2. No files exist in server-side directories or contain backend execution logic.
3. Heavy assets are pre-compressed and placed in static directories.
4. Engine test suite passes: `node scripts/test_engine.mjs`.
