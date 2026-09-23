/*
================================================================================
BARCH AERO-CANYON RACING - DEVICE COORDINATOR
Probes client hardware, determines performance tier, and orchestrates modules
================================================================================
*/

import { CONFIG } from './config.js';

export class Coordinator {
    constructor() {
        this.queryParams = this.parseQueryParams();
        this.pilotId = this.loadOrCreatePilotId();
        this.seed = this.queryParams.seed || (CONFIG.PROCEDURAL && CONFIG.PROCEDURAL.DEFAULT_SEED) || 'BARCH-ALPHA';
        this.skyline = this.queryParams.sky || 'EVENING_GLOOMY';
        this.isBenchmark = this.queryParams.benchmark === '1';
        this.profile = this.probeHardware();
        this.tier = this.resolveTier();
        this.qoeLog = [];
        this.wakeLockSentinel = null;
        this.initServiceWorker();
        this.initWakeLock();
    }

    loadOrCreatePilotId() {
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                let id = localStorage.getItem('barch_pilot_session_id');
                if (!id) {
                    id = 'PILOT-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                    localStorage.setItem('barch_pilot_session_id', id);
                }
                return id;
            } catch (e) {
                // Ignore storage restriction
            }
        }
        return 'PILOT-ACE';
    }

    updateSessionUrl(seed, sky, mode) {
        if (typeof window === 'undefined' || !window.history || !window.location) return;
        const currentParams = new URLSearchParams(window.location.search);
        if (seed) currentParams.set('seed', seed);
        if (sky) currentParams.set('sky', sky);
        if (mode) currentParams.set('mode', mode);
        currentParams.set('pilot', this.pilotId);
        const newUrl = `${window.location.pathname}?${currentParams.toString()}${window.location.hash || ''}`;
        try {
            window.history.replaceState(null, '', newUrl);
        } catch (e) {
            // Silently fallback if origin sandboxed
        }
    }

    async copySessionUrl() {
        if (typeof window === 'undefined' || !window.location) return false;
        const url = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(url);
                return true;
            } catch (e) {
                // Clipboard permission denied
            }
        }
        return false;
    }

    // Task 57: Dedicated .aeroghost file export and import pipeline
    exportGhostFile(snapshots, sectorId, lapTime = 0) {
        if (typeof document === 'undefined') return null;
        const ghostPayload = {
            format: 'BARCH_AERO_GHOST_V1',
            version: 1,
            pilotId: this.pilotId,
            sectorId: sectorId,
            seed: this.seed,
            lapTime: lapTime,
            exportedAt: new Date().toISOString(),
            snapshots: snapshots || []
        };

        const jsonStr = JSON.stringify(ghostPayload);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.pilotId}_SEC0${sectorId}_${this.seed}.aeroghost`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return a.download;
    }

    static parseGhostFile(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data && data.format === 'BARCH_AERO_GHOST_V1' && Array.isArray(data.snapshots)) {
                return data;
            }
        } catch (e) {
            console.warn('Invalid .aeroghost file contents:', e);
        }
        return null;
    }

    parseQueryParams() {
        if (typeof window === 'undefined' || !window.location) return {};
        const params = {};
        const search = window.location.search;
        if (search) {
            const pairs = search.substring(1).split('&');
            for (let i = 0; i < pairs.length; i++) {
                const parts = pairs[i].split('=');
                if (parts[0]) {
                    params[decodeURIComponent(parts[0])] = parts[1] ? decodeURIComponent(parts[1]) : '1';
                }
            }
        }
        return params;
    }

    probeHardware() {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
        const cores = navigator.hardwareConcurrency || 4;
        const memory = navigator.deviceMemory || 4; // GB estimate
        
        let gpuRenderer = 'unknown';
        let isLowPowerGpu = false;
        
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
                    if (gpuRenderer.includes('mali') || gpuRenderer.includes('powervr') || gpuRenderer.includes('intel') || gpuRenderer.includes('adreno 3') || gpuRenderer.includes('adreno 50')) {
                        isLowPowerGpu = true;
                    }
                }
            }
        } catch (e) {
            console.warn('WebGL hardware probe error:', e);
        }

        const isMobileScreen = window.innerWidth <= 768 || window.innerHeight <= 500;

        return {
            isTouch,
            isMobileScreen,
            cores,
            memory,
            gpuRenderer,
            isLowPowerGpu,
            pixelRatio: window.devicePixelRatio || 1.0,
            hasGamepad: 'getGamepads' in navigator
        };
    }

    resolveTier() {
        // Query param override: ?tier=1 | 2 | 3
        if (this.queryParams && this.queryParams.tier) {
            const forcedTier = parseInt(this.queryParams.tier, 10);
            if (CONFIG.TIERS[forcedTier]) {
                console.info('Coordinator: Forcing Hardware Tier via query param:', forcedTier);
                return CONFIG.TIERS[forcedTier];
            }
        }

        const p = this.profile;

        // Tier 1: Budget Mobile / Ultra-low-power GPU
        if (p.isMobileScreen && (p.isLowPowerGpu || p.cores <= 4 || p.memory <= 2)) {
            return CONFIG.TIERS[1];
        }

        // Tier 2: Mid-range / Modern Smartphones & Tablets
        if (p.isTouch || p.isMobileScreen || p.isLowPowerGpu || p.cores < 8) {
            return CONFIG.TIERS[2];
        }

        // Tier 3: High-end Desktop & Gaming Rigs
        return CONFIG.TIERS[3];
    }

    async initWakeLock() {
        if ('wakeLock' in navigator && typeof document !== 'undefined') {
            try {
                this.wakeLockSentinel = await navigator.wakeLock.request('screen');
                document.addEventListener('visibilitychange', async () => {
                    if (this.wakeLockSentinel !== null && document.visibilityState === 'visible') {
                        this.wakeLockSentinel = await navigator.wakeLock.request('screen');
                    }
                });
            } catch (err) {
                // WakeLock might be disallowed by power policy
            }
        }
    }

    recordQoE(metric, value) {
        if (this.qoeLog.length > 200) {
            this.qoeLog.shift();
        }
        this.qoeLog.push({
            timestamp: Date.now(),
            metric,
            value
        });
    }

    getDiagnostics() {
        return {
            tier: this.tier.name,
            seed: this.seed,
            profile: this.profile,
            qoeSnapshots: this.qoeLog.length
        };
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
            navigator.serviceWorker.register('./service-worker.js')
                .then((reg) => {
                    console.info('PWA Service Worker registered for offline playability:', reg.scope);
                })
                .catch((err) => {
                    console.warn('Service Worker registration skipped or blocked:', err);
                });
        }
    }
}
