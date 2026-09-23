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
            isCobraTriggered: false
        };
    }

    resetStuntFlags() {
        this.state.stuntRollLeft = false;
        this.state.stuntRollRight = false;
        this.state.isCobraTriggered = false;
    }

    getState() {
        return this.state;
    }
}
