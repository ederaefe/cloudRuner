/*
================================================================================
BARCH AERO-CANYON RACING - PROCEDURAL WEB AUDIO SYNTHESIZER (SILENCED)
Audio subsystem decommissioned per user directive (silent mode enabled)
All methods provide non-throwing, zero-allocation safe stubs
================================================================================
*/

export class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        // Mock gain node to preserve tests expecting sound.masterGain
        this.masterGain = {
            gain: {
                value: 0.0,
                _value: 0.0,
                setValueAtTime: () => {},
                setTargetAtTime: () => {},
                exponentialRampToValueAtTime: () => {},
                linearRampToValueAtTime: () => {}
            },
            connect: () => {},
            disconnect: () => {}
        };
        this.engineOsc = null;
        this.engineSubOsc = null;
        this.engineFilter = null;
        this.engineGain = null;
        this.windNode = null;
        this.windFilter = null;
        this.windGain = null;
        this.synthOsc1 = null;
        this.synthOsc2 = null;
        this.synthFilter = null;
        this.synthGain = null;
    }

    init() {
        // Audio synthesis permanently muted per user directive: zero AudioContext initialization
        this.enabled = true;
        if (this.masterGain && this.masterGain.gain) {
            this.masterGain.gain.value = 0.0;
            this.masterGain.gain._value = 0.0;
        }
    }

    setupMediaSession() {
        // No-op stub
    }

    setupAmbientRadio() {
        // No-op stub
    }

    resume() {
        // No-op stub
    }

    toggle() {
        // Toggle flag for UI/settings status while remaining permanently silenced
        this.enabled = !this.enabled;
        if (this.masterGain && this.masterGain.gain) {
            this.masterGain.gain.value = 0.0;
        }
        return this.enabled;
    }

    setMasterVolume(val) {
        // Silenced
        if (this.masterGain && this.masterGain.gain) {
            this.masterGain.gain.value = 0.0;
        }
    }

    unlockAudio() {
        // No-op stub
    }

    setupTurbine() {
        // No-op stub
    }

    setupWindBuffer() {
        // No-op stub
    }

    updateTelemetry(speedKmh, throttleRatio, isNitroActive, isStage3) {
        // No-op stub - zero CPU synthesis
    }

    playGateChime() {
        // Silenced stub
    }

    playStuntSuccess() {
        // Silenced stub
    }

    playNearMiss() {
        // Silenced stub
    }

    playBoostIgnite(isStage3 = false) {
        // Silenced stub
    }

    playCountdownPip(isFinal = false) {
        // Silenced stub
    }

    playLaunchSpool() {
        // Silenced stub
    }

    playSectorUnlockChime() {
        // Silenced stub
    }

    playVictoryFanfare(isFinalCampaignClimax = false) {
        // Silenced stub
    }
}
