/*
================================================================================
BARCH AERO-CANYON RACING - UNIFIED INPUT BUS
Controller-agnostic flight state manager bridging touch, keyboard, and gamepad
================================================================================
*/

export class InputManager {
    constructor() {
        this.state = {
            forward: 0.0,       // -1.0 (reverse/brake) to 1.0 (forward throttle)
            steerYaw: 0.0,      // -1.0 (left) to 1.0 (right)
            pitch: 0.0,         // -1.0 (down) to 1.0 (up)
            roll: 0.0,          // -1.0 (bank left) to 1.0 (bank right)
            vertical: 0.0,      // -1.0 (descend) to 1.0 (ascend)
            strafe: 0.0,        // -1.0 (strafe left) to 1.0 (strafe right)

            // Stunt & Nitro Action Flags
            isNitroHeld: false,
            stuntRollLeft: false,
            stuntRollRight: false,
            isKnifeEdgeHeld: false,
            isCobraTriggered: false,

            // Flight Assist, Altitude Hold, Autopilot & Hover Stop
            flyAssistEnabled: true,
            altitudeHoldEnabled: false,
            targetAltitude: 35.0,
            autopilotEnabled: false,
            hoverStopActive: false
        };
    }

    resetStuntFlags() {
        this.state.stuntRollLeft = false;
        this.state.stuntRollRight = false;
        this.state.isCobraTriggered = false;
    }

    toggleFlyAssist() {
        this.state.flyAssistEnabled = !this.state.flyAssistEnabled;
        return this.state.flyAssistEnabled;
    }

    toggleAltitudeHold(currentAlt = null) {
        this.state.altitudeHoldEnabled = !this.state.altitudeHoldEnabled;
        if (this.state.altitudeHoldEnabled && Number.isFinite(currentAlt)) {
            this.state.targetAltitude = Math.round(currentAlt);
        }
        return this.state.altitudeHoldEnabled;
    }

    adjustTargetAltitude(delta) {
        this.state.targetAltitude = Math.max(8, Math.min(280, Math.round(this.state.targetAltitude + delta)));
        return this.state.targetAltitude;
    }

    toggleAutopilot(drone = null) {
        this.state.autopilotEnabled = !this.state.autopilotEnabled;
        if (this.state.autopilotEnabled) {
            this.state.hoverStopActive = false; // Disengage stop if autopilot turned on
        }
        const activeDrone = drone || (typeof window !== 'undefined' ? window._playerDrone : null);
        if (activeDrone) {
            activeDrone.isAutopilot = this.state.autopilotEnabled;
            activeDrone.autopilotBlend = this.state.autopilotEnabled ? 1.0 : 0.0;
        }
        return this.state.autopilotEnabled;
    }

    toggleHoverStop(drone = null) {
        this.state.hoverStopActive = !this.state.hoverStopActive;
        if (this.state.hoverStopActive) {
            this.state.autopilotEnabled = false; // Disengage autopilot if stop engaged
            const activeDrone = drone || (typeof window !== 'undefined' ? window._playerDrone : null);
            if (activeDrone) {
                activeDrone.isAutopilot = false;
                activeDrone.autopilotBlend = 0.0;
            }
        }
        return this.state.hoverStopActive;
    }

    getState() {
        return this.state;
    }
}
