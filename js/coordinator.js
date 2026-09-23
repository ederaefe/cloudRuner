/*
================================================================================
BARCH AERO-CANYON RACING - DEVICE COORDINATOR
Probes client hardware, determines performance tier, and orchestrates modules
================================================================================
*/

import { CONFIG } from './config.js';

export class Coordinator {
    constructor() {
        this.profile = this.probeHardware();
        this.tier = this.resolveTier();
        this.initServiceWorker();
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
