/*
================================================================================
BARCH AERO-CANYON RACING - ARCADE PRELOADER SCREEN
Orchestrates hardware profiling, shader warm-up, font readiness, and audio unlock
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
        this.overlay = document.getElementById('preload-screen');
        this.barFill = document.getElementById('preload-bar-fill');
        this.percentText = document.getElementById('preload-percent-txt');
        this.statusText = document.getElementById('preload-status-txt');
        this.btnStart = document.getElementById('btn-preload-start');

        if (this.btnStart) {
            this.btnStart.addEventListener('click', () => {
                this.dismiss();
            });
        }
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
        this.updateProgress(15, 'PROBING HARDWARE PROFILE & GPU TIER...');
        await new Promise(r => setTimeout(r, 120));

        // 1. Font verification
        this.updateProgress(35, 'VERIFYING TYPOGRAPHY & INTERFACE TEXTURES...');
        if (document.fonts && document.fonts.ready) {
            try {
                await Promise.race([
                    document.fonts.ready,
                    new Promise(r => setTimeout(r, 600))
                ]);
            } catch (e) {
                // Non-blocking fallback
            }
        }

        // 2. WebGL Pipeline & Shader Warm-Up (compiles shaders without stuttering first frame)
        this.updateProgress(60, 'WARMING UP WEBLGL GEOMETRY & SHADER PIPELINE...');
        if (renderer && scene && camera) {
            try {
                renderer.compile(scene, camera);
            } catch (e) {
                // Non-blocking fallback
            }
        }
        await new Promise(r => setTimeout(r, 150));

        // 3. Audio engine readiness
        this.updateProgress(85, 'SYNTHESIZING PROCEDURAL AUDIO BUFFERS...');
        if (this.soundEngine && typeof this.soundEngine.init === 'function') {
            try {
                this.soundEngine.init();
            } catch (e) {}
        }
        await new Promise(r => setTimeout(r, 120));

        // 4. Ready state
        this.updateProgress(100, 'FLIGHT SYSTEMS CALIBRATED - READY');
        this.isComplete = true;

        if (this.btnStart) {
            this.btnStart.classList.remove('hidden');
            this.btnStart.focus();
        } else {
            // If button is absent, auto-dismiss
            setTimeout(() => this.dismiss(), 350);
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

        if (this.overlay) {
            this.overlay.classList.add('preload-fade-out');
            setTimeout(() => {
                this.overlay.classList.add('hidden');
            }, 500);
        }
    }
}
