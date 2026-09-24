/*
================================================================================
BARCH AERO-CANYON RACING - UNIFIED FLIGHT DECK CALIBRATION RUNNER
Smoothly warms up shaders, GPU pipeline, and audio within the cinematic intro
================================================================================
*/

export class PreloadScreen {
    constructor(soundEngine, onComplete) {
        this.soundEngine = soundEngine;
        this.onComplete = onComplete;
        this.progress = 0;
        this.isComplete = false;

        this.initDOMElements();
    }

    initDOMElements() {
        this.barFill = document.getElementById('start-modal-bar-fill') || document.getElementById('preload-bar-fill');
        this.percentText = document.getElementById('start-modal-percent-txt') || document.getElementById('preload-percent-txt');
        this.statusText = document.getElementById('start-modal-status-txt') || document.getElementById('preload-status-txt');
        this.btnLaunch = document.getElementById('btn-launch-race');
    }

    updateProgress(targetPercent, statusMessage) {
        this.progress = Math.min(100, Math.max(this.progress, targetPercent));
        if (this.barFill) {
            this.barFill.style.width = `${this.progress}%`;
        }
        if (this.percentText) {
            this.percentText.textContent = `${Math.round(this.progress)}%`;
        }
        if (this.statusText && statusMessage) {
            this.statusText.textContent = statusMessage.toUpperCase();
        }
    }

    async runBootSequence(coordinator, renderer, scene, camera) {
        this.updateProgress(20, 'INITIALIZING HARDWARE PROFILES...');
        await new Promise(r => setTimeout(r, 60));

        // 1. Font verification
        this.updateProgress(45, 'VERIFYING AVIONICS & INTERFACE ASSETS...');
        if (document.fonts && document.fonts.ready) {
            try {
                await Promise.race([
                    document.fonts.ready,
                    new Promise(r => setTimeout(r, 400))
                ]);
            } catch (e) {
                // Non-blocking fallback
            }
        }

        // 2. WebGL Pipeline & Shader Warm-Up
        this.updateProgress(75, 'WARMING UP WEBLGL GEOMETRY & SHADER PIPELINE...');
        if (renderer && scene && camera) {
            try {
                renderer.compile(scene, camera);
            } catch (e) {
                // Non-blocking fallback
            }
        }
        await new Promise(r => setTimeout(r, 80));

        // 3. Audio engine readiness
        this.updateProgress(90, 'SYNTHESIZING PROCEDURAL AUDIO BUFFERS...');
        if (this.soundEngine && typeof this.soundEngine.init === 'function') {
            try {
                this.soundEngine.init();
            } catch (e) {}
        }
        await new Promise(r => setTimeout(r, 60));

        // 4. Calibration Ready State
        this.updateProgress(100, 'AVIONICS READY // PRESS LAUNCH TO ENGAGE');
        this.isComplete = true;

        if (this.btnLaunch) {
            this.btnLaunch.classList.add('ready-pulse');
            this.btnLaunch.disabled = false;
        }

        if (typeof this.onComplete === 'function') {
            this.onComplete();
        }
    }

    dismiss() {
        if (this.soundEngine && typeof this.soundEngine.unlockAudio === 'function') {
            this.soundEngine.unlockAudio();
            this.soundEngine.resume();
        }
        if (typeof this.onComplete === 'function') {
            this.onComplete();
        }
    }
}
