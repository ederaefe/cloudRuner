/*
================================================================================
BARCH AERO-CANYON RACING - PROCEDURAL WEB AUDIO SYNTHESIZER
Generates turbine whine, aerodynamic wind buffeting, sonic crackles, and chimes
================================================================================
*/

export class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = false;

        // Sound nodes
        this.masterGain = null;
        this.engineOsc = null;
        this.engineSubOsc = null;
        this.engineFilter = null;
        this.engineGain = null;

        this.windNode = null;
        this.windFilter = null;
        this.windGain = null;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.setupTurbine();
            this.setupWindBuffer();
            this.enabled = true;
        } catch (e) {
            console.warn('Web Audio synthesis initialization failed:', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setupTurbine() {
        // High-pitched turbine blade spool
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(220, this.ctx.currentTime);

        // Sub-bass engine rumble
        this.engineSubOsc = this.ctx.createOscillator();
        this.engineSubOsc.type = 'triangle';
        this.engineSubOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

        this.engineOsc.connect(this.engineFilter);
        this.engineSubOsc.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        this.engineOsc.start();
        this.engineSubOsc.start();
    }

    setupWindBuffer() {
        // 2-second looped white-noise buffer for aerodynamic air sheer
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        this.windNode = this.ctx.createBufferSource();
        this.windNode.buffer = noiseBuffer;
        this.windNode.loop = true;

        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.Q.value = 2.5;
        this.windFilter.frequency.setValueAtTime(600, this.ctx.currentTime);

        this.windGain = this.ctx.createGain();
        this.windGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

        this.windNode.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.masterGain);

        this.windNode.start();
    }

    updateTelemetry(speedKmh, throttleRatio, isNitroActive, isStage3) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Modulate turbine pitch with speed and throttle
        const basePitch = 180 + (speedKmh / 320) * 850 + (throttleRatio * 200);
        this.engineOsc.frequency.setTargetAtTime(basePitch, now, 0.08);
        this.engineSubOsc.frequency.setTargetAtTime(basePitch * 0.25, now, 0.08);

        // Open filter on high speed and nitro
        const filterCutoff = 400 + (speedKmh / 320) * 2200 + (isNitroActive ? 1500 : 0);
        this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.08);

        // Adjust wind sheer noise
        const windFreq = 300 + (speedKmh / 320) * 2400;
        const windVolume = Math.min(0.28, (speedKmh / 320) * 0.25);
        this.windFilter.frequency.setTargetAtTime(windFreq, now, 0.08);
        this.windGain.gain.setTargetAtTime(windVolume, now, 0.08);

        // Turbine gain boost
        const targetEngineGain = isStage3 ? 0.18 : (isNitroActive ? 0.14 : 0.08);
        this.engineGain.gain.setTargetAtTime(targetEngineGain, now, 0.08);
    }

    playGateChime() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.18);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    playStuntSuccess() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1040, now + 0.15);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playNearMiss() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}
