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

            // Flight Assist, Altitude Hold, Autopilot & Hover Stop toggles
            if (key === 'j') {
                const state = this.input.toggleFlyAssist();
                if (window._showAssistAlert) window._showAssistAlert('FLY ASSIST', state ? 'STABILIZATION ON' : 'ASSIST OFF');
            }
            if (key === 'h') {
                const currentY = window._playerDrone ? window._playerDrone.position.y : null;
                const state = this.input.toggleAltitudeHold(currentY);
                if (window._showAssistAlert) window._showAssistAlert('ALTITUDE HOLD', state ? `LOCKED: ${this.input.state.targetAltitude}M` : 'ALT HOLD DISENGAGED');
            }
            if (key === 't' || key === '[') {
                const target = this.input.adjustTargetAltitude(5);
                if (window._showAssistAlert) window._showAssistAlert('TARGET ALTITUDE', `${target} METERS (+5M)`);
            }
            if (key === 'g' || key === ']') {
                const target = this.input.adjustTargetAltitude(-5);
                if (window._showAssistAlert) window._showAssistAlert('TARGET ALTITUDE', `${target} METERS (-5M)`);
            }
            if (key === 'o' || key === 'u') {
                const state = this.input.toggleAutopilot();
                if (window._showAssistAlert) window._showAssistAlert('AUTOPILOT HAND-OFF', state ? 'CO-PILOT ENGAGED' : 'MANUAL CONTROL RESTORED');
            }
            if (key === 'b') {
                const state = this.input.toggleHoverStop();
                if (window._showAssistAlert) window._showAssistAlert('VTOL HOVER STOP', state ? 'FULL STOP AIRBRAKE ENGAGED' : 'HOVER BRAKE RELEASED');
            }
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

        window.addEventListener('blur', () => this.resetKeys());
    }

    resetKeys() {
        this.keys = {};
        if (this.input && this.input.state) {
            this.input.state.isNitroHeld = false;
            this.input.state.isKnifeEdgeHeld = false;
            this.input.state.forward = 0;
            this.input.state.steerYaw = 0;
            this.input.state.roll = 0;
            this.input.state.pitch = 0;
        }
    }

    update() {
        let fwd = 0;
        let yaw = 0;
        let roll = 0;
        let pitch = 0;

        // Responsive keyboard hovercar mapping (W = throttle, S = brake/reverse, A/D = car steer)
        if (this.keys['w'] || this.keys['arrowup']) {
            fwd += 1.0;
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            fwd -= 0.8;
        }
        if (this.keys['shift']) {
            fwd += 0.4;
        }

        // Auto-release Hover Stop if pilot commands forward thrust
        if (fwd > 0.1 && this.input.state.hoverStopActive) {
            this.input.state.hoverStopActive = false;
            if (window._showAssistAlert) window._showAssistAlert('VTOL HOVER STOP', 'THROTTLE RESUMED');
        }

        if (this.keys['a'] || this.keys['arrowleft']) { yaw -= 1.0; roll -= 1.0; }
        if (this.keys['d'] || this.keys['arrowright']) { yaw += 1.0; roll += 1.0; }

        pitch = 0.0; // Pitch clamped to 0 for level windshield hovercar

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
                // Axes: 0 is Left Stick X (Yaw), 1 is Left Stick Y (Throttle/Brake)
                const deadzone = 0.12;
                const axis0 = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
                const axis1 = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;

                if (axis0 !== 0) {
                    yaw = axis0;
                    roll = axis0;
                }
                if (axis1 !== 0) {
                    fwd = -axis1; // Direct throttle/reverse from stick Y
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

    // Task 44: Gamepad Dual-Motor Haptic Vibration
    playHapticRumble(duration = 180, strong = 0.5, weak = 0.3) {
        if (this.gamepadIndex !== null && navigator.getGamepads) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp && gp.vibrationActuator && typeof gp.vibrationActuator.playEffect === 'function') {
                try {
                    gp.vibrationActuator.playEffect('dual-rumble', {
                        startDelay: 0,
                        duration: duration,
                        weakMagnitude: weak,
                        strongMagnitude: strong
                    });
                } catch (e) {}
            }
        }
    }
}
