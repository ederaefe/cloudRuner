# Vercel Free-Tier Compute and Resource Optimization Runbook

## Overview
This project is engineered to operate indefinitely on Vercel's Hobby (Free) Tier with zero recurring compute charges and zero risk of hitting resource execution limits.

The Vercel Hobby tier imposes hard resource boundaries:
* Active CPU Time: 4 hours / month
* Provisioned Memory: 360 GB-hours / month
* Function Invocations: 1,000,000 / month
* Fast Data Transfer: 100 GB / month
* Build Execution Minutes: 6,000 minutes / month (max 1 concurrent build)
* Image Optimization: 5,000 source images / month
* Cron Jobs: 1 cron job / day

---

## 1. Zero-Compute Architecture Mandate
* **Pure Static Delivery**: The game engine runs 100% in the client browser (WebGL, Web Audio API, Web Workers).
* **No Serverless Functions**: Do not create `/api/*` routes or Node.js/Edge function handlers. Serving static assets through Vercel's Edge Network consumes 0 seconds of Active CPU Time and 0 GB-hours of Provisioned Memory.
* **No Server-Side Rendering (SSR)**: Avoid adding SSR frameworks (Next.js SSR, Nuxt SSR, SvelteKit SSR) that invoke backend compute on every HTTP request.

---

## 2. Build Policy: Development Stage vs. Release Stage

### Current Mode: Active Development (Unblocked)
During active development and local testing, builds must never be blocked or skipped.
* **Unblocked Deployments**: `ignoreCommand` is temporarily omitted from `vercel.json` so every push, preview deployment, and local test deploys unconditionally.
* **Instant Revalidation**: All static assets use `Cache-Control: public, max-age=0, must-revalidate` so redeployments are visible immediately in browsers without stale cache locks.

### Future Mode: Production Release (Build Conservation)
When the game is ready for public release, re-engage the build conservation mechanisms:
1. Re-add `"ignoreCommand": "bash scripts/vercel-ignore.sh"` to `vercel.json`.
2. Set `DEV_MODE=false` in `scripts/vercel-ignore.sh`.
3. Restore `Cache-Control: public, max-age=31536000, immutable` for `/js/*` and `/css/*` in `vercel.json` to conserve Fast Data Transfer bandwidth.

---

## 3. Fast Data Transfer and Edge Cache Maximization
Vercel caps Fast Data Transfer (origin egress) at 100 GB per month. Stale or missing cache headers force the CDN to repeatedly fetch assets from the origin.

* **Immutable Static Assets (`/js/*`, `/css/*`, `/assets/*`)**:
  Configured with `Cache-Control: public, max-age=31536000, immutable`. Once fetched, edge nodes and browsers cache them for up to one year.
* **HTML Shell (`/`, `/index.html`)**:
  Configured with `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400`. Users receive edge-cached content instantly while background revalidation ensures updates propagate smoothly.
* **Service Worker (`/service-worker.js`)**:
  Configured with `Cache-Control: public, max-age=0, must-revalidate`. Prevents browsers from locking onto outdated worker scripts while still allowing local asset interception.
* **Client-Side Cache-First Strategy**:
  `service-worker.js` intercepts runtime asset requests and serves them from the browser's Cache Storage. Returning players generate 0 network requests to Vercel.

---

## 4. State Persistence and Real-Time Networking
* **Client-Side Profile Storage**: High scores, currency, hangar skins, and equipment trees persist in browser `localStorage` and `IndexedDB`.
* **WebRTC Peer-to-Peer Multiplayer**: Multiplayer flight telemetry is coordinated via direct browser-to-browser WebRTC DataChannels (`PeerJS` CDN). Telemetry packets bypass Vercel entirely.
* **Third-Party BaaS for Global State**: If global leaderboards or cross-device cloud saves are introduced, connect directly from the client to free-tier BaaS providers (Supabase, Firebase, or Cloudflare Workers KV) instead of routing traffic through Vercel Serverless Functions.

---

## 5. Image and Asset Optimization Policy
* **Zero Vercel Image Optimization**: Do not route images through Next.js or Vercel Image Optimization endpoints (`/_vercel/image`), which eat into the 5,000 image free-tier cap.
* **Pre-Optimized Assets**: Export textures and UI assets as compressed WebP or SVG before committing to the repository.
* **Procedural Visuals**: Generate textures, canvas skins, and particle effects procedurally in WebGL/Canvas to keep asset transfer sizes minimal.

---

## Developer Verification Checklist
Before committing new features, verify compliance:
1. `vercel.json` syntax is valid JSON.
2. No files exist in `/api` or server-side directories.
3. Heavy assets are pre-compressed and placed in static directories.
4. `scripts/vercel-ignore.sh` has executable permissions (`chmod +x scripts/vercel-ignore.sh`).
