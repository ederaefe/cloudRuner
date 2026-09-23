/*
================================================================================
BARCH AERO-CANYON RACING - DESKTOP KEYBOARD & GAMEPAD CONTROLS
Full hotkey mapping and Gamepad API integration for desktop and HOTAS setups
================================================================================
*/

export class DesktopControls {
    constructor(inputManager) {
        this.input = inputManager;
        this.keys = {};
        this.gamepadIndex = null;
    }

    init() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;

            // Stunt one-shots
            if (key === 'q') this.input.state.stuntRollLeft = true;
            if (key === 'e') this.input.state.stuntRollRight = true;
            if (key === 'x') this.input.state.isCobraTriggered = true;
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
        });

        window.addEventListener('gamepadconnected', (e) => {
            console.info('Flight Gamepad connected:', e.gamepad.id);
            this.gamepadIndex = e.gamepad.index;
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            if (this.gamepadIndex === e.gamepad.index) {
                this.gamepadIndex = null;
            }
        });
    }

    update() {
        let fwd = 0;
        let yaw = 0;
        let roll = 0;
        let pitch = 0;

        // Responsive keyboard flight mapping (Forward cruise with intuitive pitch & banking)
        if (this.keys['w'] || this.keys['arrowup']) {
            fwd += 1.0;
            pitch -= 1.0; // Nose down / dive
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            fwd -= 0.6;
            pitch += 1.0; // Nose up / climb
        }
        if (this.keys['shift']) {
            fwd += 0.6;
        }

        if (this.keys['a'] || this.keys['arrowleft']) { yaw -= 1.0; roll -= 1.0; }
        if (this.keys['d'] || this.keys['arrowright']) { yaw += 1.0; roll += 1.0; }

        // Dedicated pitch override keys (R/F or PageUp/PageDown)
        if (this.keys['r'] || this.keys['pageup']) pitch += 1.0;
        if (this.keys['f'] || this.keys['pagedown']) pitch -= 1.0;

        if (this.keys[' ']) {
            this.input.state.isNitroHeld = true;
        } else {
            this.input.state.isNitroHeld = false;
        }

        this.input.state.isKnifeEdgeHeld = !!this.keys['c'];

        // Gamepad API check
        if (this.gamepadIndex !== null && navigator.getGamepads) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // Axes: 0 is Left Stick X (Yaw), 1 is Left Stick Y (Pitch)
                const deadzone = 0.12;
                const axis0 = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
                const axis1 = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;

                if (axis0 !== 0) {
                    yaw = axis0;
                    roll = axis0;
                }
                if (axis1 !== 0) {
                    pitch = -axis1;
                }

                // Triggers / Buttons
                const rTrigger = gp.buttons[7] ? gp.buttons[7].value : 0; // RT Throttle
                const lTrigger = gp.buttons[6] ? gp.buttons[6].value : 0; // LT Brake
                if (rTrigger > 0.1) fwd = rTrigger;
                if (lTrigger > 0.1) fwd = -lTrigger;

                // Nitro on 'A' button (0) or RB (5)
                if (gp.buttons[0]?.pressed || gp.buttons[5]?.pressed) {
                    this.input.state.isNitroHeld = true;
                }

                // Stunts on LB / RB / B
                if (gp.buttons[4]?.pressed) this.input.state.stuntRollLeft = true;
                if (gp.buttons[1]?.pressed) this.input.state.isKnifeEdgeHeld = true;
                if (gp.buttons[2]?.pressed) this.input.state.isCobraTriggered = true;
            }
        }

        if (window._invertPitch) {
            pitch = -pitch;
        }

        this.input.state.forward = fwd;
        this.input.state.steerYaw = yaw;
        this.input.state.roll = roll;
        this.input.state.pitch = pitch;
    }
}
