/*
================================================================================
BARCH AERO-CANYON RACING - DESKTOP KEYBOARD & GAMEPAD CONTROLS
Full hotkey mapping and Gamepad API integration for desktop and HOTAS setups
================================================================================
*/

import { CONFIG } from '../config.js';

export class DesktopControls {
    constructor(inputManager) {
        this.input = inputManager;
        this.keys = {};
        this.gamepadIndex = null;
        this.filteredSteer = 0.0;
        this.canvas = null;
        this.isPointerLocked = false;
        this.mouseDelta = { x: 0, y: 0 };
        this.smoothedMouseDelta = { x: 0, y: 0 };
        this.mouseSmoothingRate = 14.0;
    }

    init(canvas = null) {
        this.canvas = canvas || (typeof document !== 'undefined' ? document.getElementById('viewport-canvas') : null);

        if (this.canvas) {
            this.canvas.addEventListener('click', () => {
                if (window._gameState === 'RACING' || window._gameState === 'DIVING' || window._gameState === 'GRID_STAGING') {
                    this.requestPointerLock();
                }
            });
        }

        if (typeof document !== 'undefined') {
            document.addEventListener('pointerlockchange', () => {
                this.isPointerLocked = (document.pointerLockElement === this.canvas);
                window.dispatchEvent(new CustomEvent('POINTER_LOCK_CHANGE', { detail: this.isPointerLocked }));
            });

            document.addEventListener('mousemove', (e) => {
                if (!this.isPointerLocked) return;
                this.mouseDelta.x += e.movementX;
                this.mouseDelta.y += e.movementY;
            });

            window.addEventListener('mousedown', (e) => {
                if (e.button === 0 && this.isPointerLocked) {
                    this.input.state.isNitroHeld = true;
                }
            });

            window.addEventListener('mouseup', (e) => {
                if (e.button === 0 && !this.keys[' ']) {
                    this.input.state.isNitroHeld = false;
                }
            });
        }

        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;

            // Browser key intercept: prevent default tab focus cycle
            if (e.key === 'Tab') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('TOGGLE_MENU'));
            }

            // Pause toggle with pointer lock release
            if (e.key === 'Escape' || key === 'p') {
                if (this.isPointerLocked && document.exitPointerLock) {
                    document.exitPointerLock();
                }
                window.dispatchEvent(new CustomEvent('TOGGLE_PAUSE'));
            }

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
            if (key === '[') {
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

    requestPointerLock() {
        if (!this.canvas) return;
        try {
            if (document.pointerLockElement !== this.canvas && typeof this.canvas.requestPointerLock === 'function') {
                this.canvas.requestPointerLock();
            }
        } catch (e) {
            // Non-blocking browser fallback
        }
    }

    exitPointerLock() {
        try {
            if (typeof document !== 'undefined' && document.exitPointerLock && document.pointerLockElement) {
                document.exitPointerLock();
            }
        } catch (e) {}
    }

    resetKeys() {
        this.keys = {};
        this.filteredSteer = 0.0;
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        this.smoothedMouseDelta.x = 0;
        this.smoothedMouseDelta.y = 0;
        if (this.input && this.input.state) {
            this.input.state.isNitroHeld = false;
            this.input.state.isKnifeEdgeHeld = false;
            this.input.state.forward = 0;
            this.input.state.steerYaw = 0;
            this.input.state.roll = 0;
            this.input.state.pitch = 0;
        }
    }

    update(dt = 0.016) {
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

        let keySteer = 0;
        if (this.keys['a'] || this.keys['arrowleft']) keySteer -= 1.0;
        if (this.keys['d'] || this.keys['arrowright']) keySteer += 1.0;

        // Exponential smoothing for progressive keyboard steering feel
        const effectiveDt = (typeof dt === 'number' && dt > 0) ? Math.min(dt, 0.1) : 0.016;
        const filterRate = CONFIG.FLIGHT?.KEYBOARD_STEER_FILTER ?? 12.0;
        const lerpAlpha = 1.0 - Math.exp(-filterRate * effectiveDt);
        this.filteredSteer += (keySteer - this.filteredSteer) * lerpAlpha;
        if (Math.abs(this.filteredSteer) < 0.001 && keySteer === 0) {
            this.filteredSteer = 0.0;
        }

        // Exponential smoothing for mouse deltas (Pointer Lock flight control)
        const mouseAlpha = 1.0 - Math.exp(-this.mouseSmoothingRate * effectiveDt);
        this.smoothedMouseDelta.x += (this.mouseDelta.x - this.smoothedMouseDelta.x) * mouseAlpha;
        this.smoothedMouseDelta.y += (this.mouseDelta.y - this.smoothedMouseDelta.y) * mouseAlpha;
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;

        yaw = this.filteredSteer;
        roll = this.filteredSteer;
        pitch = 0.0;

        if (this.isPointerLocked) {
            const sens = (window._mouseSensitivity !== undefined) ? window._mouseSensitivity : 0.0022;
            const mouseSteer = this.smoothedMouseDelta.x * sens * 14.0;
            yaw += mouseSteer;
            roll += mouseSteer;
            const invert = window._invertPitch ? -1 : 1;
            pitch += this.smoothedMouseDelta.y * sens * 12.0 * invert;
            this.smoothedMouseDelta.x *= Math.max(0, 1.0 - effectiveDt * 8.0);
            this.smoothedMouseDelta.y *= Math.max(0, 1.0 - effectiveDt * 8.0);
        }

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
                const rawAxis0 = gp.axes[0] || 0;
                const rawAxis1 = gp.axes[1] || 0;
                const axis0 = Math.abs(rawAxis0) > deadzone ? rawAxis0 : 0;
                const axis1 = Math.abs(rawAxis1) > deadzone ? rawAxis1 : 0;

                if (axis0 !== 0) {
                    const stickSign = Math.sign(axis0);
                    const stickMag = (Math.abs(axis0) - deadzone) / (1.0 - deadzone);
                    const curvedStick = stickSign * Math.pow(Math.max(0, stickMag), 1.25);
                    yaw = curvedStick;
                    roll = curvedStick;
                    this.filteredSteer = curvedStick;
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
