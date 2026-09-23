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

        // Ambient Synthwave Radio Station (Task 41)
        this.synthOsc1 = null;
        this.synthOsc2 = null;
        this.synthFilter = null;
        this.synthGain = null;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            this.ctx = new AudioContextClass();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.setupTurbine();
            this.setupWindBuffer();
            this.setupAmbientRadio();
            this.setupMediaSession();
            this.enabled = true;
        } catch (e) {
            console.warn('Web Audio synthesis initialization failed:', e);
        }
    }

    setupMediaSession() {
        // Task 42: Native OS Media Session API
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: 'Aero-Canyon Circuit',
                    artist: 'BARCH VTOL Synthesizer',
                    album: 'Aero-Canyon Racing Soundtrack'
                });
                navigator.mediaSession.setActionHandler('play', () => this.resume());
                navigator.mediaSession.setActionHandler('pause', () => {
                    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
                });
            } catch (e) {}
        }
    }

    setupAmbientRadio() {
        if (!this.ctx) return;
        try {
            // Task 41: Ambient Synthwave Radio Station
            this.synthOsc1 = this.ctx.createOscillator();
            this.synthOsc2 = this.ctx.createOscillator();
            this.synthFilter = this.ctx.createBiquadFilter();
            this.synthGain = this.ctx.createGain();

            this.synthOsc1.type = 'sawtooth';
            this.synthOsc2.type = 'sawtooth';
            this.synthOsc1.frequency.setValueAtTime(55.0, this.ctx.currentTime); // A1 note
            this.synthOsc2.frequency.setValueAtTime(55.35, this.ctx.currentTime); // Chorus detune

            this.synthFilter.type = 'lowpass';
            this.synthFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
            this.synthFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

            this.synthGain.gain.setValueAtTime(0.09, this.ctx.currentTime);

            this.synthOsc1.connect(this.synthFilter);
            this.synthOsc2.connect(this.synthFilter);
            this.synthFilter.connect(this.synthGain);
            this.synthGain.connect(this.masterGain);

            this.synthOsc1.start();
            this.synthOsc2.start();
        } catch (e) {}
    }

    resume() {
        if (!this.ctx) {
            this.init();
        }
        if (this.ctx && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted')) {
            try {
                const res = this.ctx.resume();
                if (res && typeof res.catch === 'function') {
                    res.catch(() => {});
                }
            } catch (e) {
                // Ignore silent browser autoplay restriction
            }
        }
    }

    toggle() {
        if (!this.ctx) {
            this.init();
            this.resume();
            return this.enabled;
        }
        this.enabled = !this.enabled;
        if (this.masterGain && this.ctx) {
            try {
                this.masterGain.gain.setValueAtTime(this.enabled ? 0.8 : 0.0, this.ctx.currentTime);
            } catch (e) {}
        }
        if (this.enabled) {
            this.resume();
        }
        return this.enabled;
    }

    setMasterVolume(val) {
        if (!this.ctx || !this.masterGain) return;
        const clamped = Math.max(0, Math.min(1, Number(val) || 0));
        try {
            this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
        } catch (e) {}
    }

    unlockAudio() {
        const unlock = () => {
            this.init();
            this.resume();
            if (this.ctx) {
                try {
                    // 1-sample silent buffer guarantees iOS Web Audio unlocking
                    const buffer = this.ctx.createBuffer(1, 1, 22050);
                    const source = this.ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(this.ctx.destination);
                    source.start(0);
                } catch (e) {}
            }
            ['touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
                window.removeEventListener(evt, unlock, true);
            });
        };
        ['touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
            window.addEventListener(evt, unlock, { once: true, capture: true });
        });
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
        if (!this.enabled || !this.ctx) {
            if (this.engineGain && this.ctx) {
                try { this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime); } catch (e) {}
            }
            if (this.windGain && this.ctx) {
                try { this.windGain.gain.setValueAtTime(0, this.ctx.currentTime); } catch (e) {}
            }
            return;
        }
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

        // Modulate ambient synthwave radio station cutoff with speed
        if (this.synthFilter) {
            const synthCutoff = 280 + (speedKmh / 320) * 1250;
            this.synthFilter.frequency.setTargetAtTime(synthCutoff, now, 0.12);
        }
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

    playBoostIgnite(isStage3 = false) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = isStage3 ? 'sawtooth' : 'triangle';
        const startFreq = isStage3 ? 600 : 380;
        const peakFreq = isStage3 ? 1200 : 720;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.45);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isStage3 ? 2800 : 1600, now);

        gain.gain.setValueAtTime(isStage3 ? 0.38 : 0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.5);
    }

    playCountdownPip(isFinal = false) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isFinal ? 'sawtooth' : 'sine';
        const startFreq = isFinal ? 880 : 440;
        const endFreq = isFinal ? 1320 : 550;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + (isFinal ? 0.25 : 0.12));

        gain.gain.setValueAtTime(isFinal ? 0.35 : 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.45 : 0.22));

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + (isFinal ? 0.45 : 0.22));
    }

    playLaunchSpool() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 1.2);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 1.4);
    }

    playSectorUnlockChime() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        notes.forEach((freq, idx) => {
            const noteTime = now + idx * 0.08;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteTime);

            gain.gain.setValueAtTime(0.2, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(noteTime);
            osc.stop(noteTime + 0.45);
        });
    }

    playVictoryFanfare(isFinalCampaignClimax = false) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Gracefully dampen background engine spool to emphasize the musical resolution
        if (this.engineGain) {
            this.engineGain.gain.setTargetAtTime(0.01, now, 0.2);
        }
        if (this.windGain) {
            this.windGain.gain.setTargetAtTime(0.01, now, 0.2);
        }

        // Chord progression: Root -> Subdominant -> Dominant -> Tonic Octave
        // Rich synth voices using detuned dual oscillators (sawtooth filtered + triangle sub)
        const chords = isFinalCampaignClimax
            ? [
                { time: 0.0, freqs: [220.00, 277.18, 329.63], duration: 0.8 }, // A maj
                { time: 0.8, freqs: [246.94, 293.66, 369.99], duration: 0.8 }, // B min
                { time: 1.6, freqs: [293.66, 369.99, 440.00], duration: 1.0 }, // D maj
                { time: 2.6, freqs: [329.63, 415.30, 493.88], duration: 1.2 }, // E maj (Dominant)
                { time: 3.8, freqs: [440.00, 554.37, 659.25, 880.00], duration: 3.2 } // A maj Triumph Octave
              ]
            : [
                { time: 0.0, freqs: [261.63, 329.63, 392.00], duration: 0.6 }, // C maj
                { time: 0.5, freqs: [349.23, 440.00, 523.25], duration: 0.6 }, // F maj
                { time: 1.0, freqs: [392.00, 493.88, 587.33], duration: 0.8 }, // G maj
                { time: 1.7, freqs: [523.25, 659.25, 783.99], duration: 1.8 }  // C maj Octave
              ];

        chords.forEach(chord => {
            const chordStartTime = now + chord.time;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, chordStartTime);
            filter.frequency.exponentialRampToValueAtTime(3200, chordStartTime + 0.15);
            filter.frequency.exponentialRampToValueAtTime(600, chordStartTime + chord.duration);
            filter.connect(this.masterGain);

            chord.freqs.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = isFinalCampaignClimax ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(freq, chordStartTime);

                // Subtle organic pitch detuning
                osc.detune.setValueAtTime((Math.random() - 0.5) * 8, chordStartTime);

                gain.gain.setValueAtTime(0.001, chordStartTime);
                gain.gain.linearRampToValueAtTime(0.18 / chord.freqs.length, chordStartTime + 0.06);
                gain.gain.exponentialRampToValueAtTime(0.001, chordStartTime + chord.duration);

                osc.connect(gain);
                gain.connect(filter);

                osc.start(chordStartTime);
                osc.stop(chordStartTime + chord.duration);
            });
        });
    }
}
