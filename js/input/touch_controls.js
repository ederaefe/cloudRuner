/*
================================================================================
BARCH AERO-CANYON RACING - MOBILE TOUCH CONTROLS
Virtual multi-touch flight joystick, dedicated stunt buttons, and haptics
================================================================================
*/

export class TouchControls {
    constructor(inputManager) {
        this.input = inputManager;
        this.container = document.getElementById('touch-controls');
        this.stickZone = document.getElementById('touch-stick-zone');
        this.stickKnob = document.getElementById('touch-stick-knob');

        this.stickPointerId = null;
        this.stickCenterX = 0;
        this.stickCenterY = 0;
        this.stickRadius = 65;

        this.lastTapTime = 0;
    }

    init() {
        if (!this.container) return;
        this.container.style.display = 'block';

        // Suppress browser context menu on touch controls (prevents long-press freezes)
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());

        this.bindStickEvents();
        this.bindActionButtons();

        // Fail-safe release on blur or touch interruption
        window.addEventListener('blur', () => this.releaseAll());
        window.addEventListener('touchcancel', () => this.releaseAll());
    }

    releaseAll() {
        if (this.stickPointerId !== null) {
            this.stickPointerId = null;
            if (this.stickKnob) {
                this.stickKnob.style.transform = 'translate(-50%, -50%)';
            }
            this.input.state.steerYaw = 0;
            this.input.state.forward = 0;
            this.input.state.roll = 0;
        }
        this.input.state.isNitroHeld = false;
        this.input.state.isKnifeEdgeHeld = false;
    }

    vibrate(pattern = 15) {
        if (window._hapticEnabled === false) return;
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                // Ignore silent failure on non-supported touch devices
            }
        }
    }

    bindStickEvents() {
        if (!this.stickZone) return;

        this.stickZone.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.stickPointerId === null) {
                this.stickPointerId = e.pointerId;
                try {
                    this.stickZone.setPointerCapture(e.pointerId);
                } catch (err) {}

                const rect = this.stickZone.getBoundingClientRect();
                this.stickCenterX = rect.left + rect.width / 2;
                this.stickCenterY = rect.top + rect.height / 2;
                this.stickRadius = rect.width / 2 || 65;

                this.updateStick(e.clientX, e.clientY);
                this.vibrate(10);
            }
        });

        const onPointerMove = (e) => {
            if (this.stickPointerId === e.pointerId) {
                e.preventDefault();
                this.updateStick(e.clientX, e.clientY);
            }
        };

        const releaseStick = (e) => {
            if (this.stickPointerId !== null && (this.stickPointerId === e.pointerId || e.type === 'lostpointercapture' || e.type === 'pointercancel')) {
                e.preventDefault();
                try {
                    if (this.stickZone.hasPointerCapture(this.stickPointerId)) {
                        this.stickZone.releasePointerCapture(this.stickPointerId);
                    }
                } catch (err) {}
                this.stickPointerId = null;
                if (this.stickKnob) {
                    this.stickKnob.style.transform = 'translate(-50%, -50%)';
                }
                this.input.state.steerYaw = 0;
                this.input.state.forward = 0;
                this.input.state.roll = 0;
            }
        };

        this.stickZone.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointermove', onPointerMove);

        this.stickZone.addEventListener('pointerup', releaseStick);
        this.stickZone.addEventListener('pointercancel', releaseStick);
        this.stickZone.addEventListener('lostpointercapture', releaseStick);
        window.addEventListener('pointerup', releaseStick);
        window.addEventListener('pointercancel', releaseStick);
    }

    updateStick(clientX, clientY) {
        let dx = clientX - this.stickCenterX;
        let dy = clientY - this.stickCenterY;
        const dist = Math.hypot(dx, dy);

        if (dist > this.stickRadius && dist > 0) {
            dx = (dx / dist) * this.stickRadius;
            dy = (dy / dist) * this.stickRadius;
        }

        if (this.stickKnob) {
            this.stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }

        const radius = this.stickRadius || 65;
        const nx = dx / radius;
        const ny = dy / radius;

        // Steering: X controls Yaw and Roll; Y controls forward thrust / brake
        this.input.state.steerYaw = nx;
        this.input.state.roll = nx;
        this.input.state.forward = -ny; // Up is forward thrust
    }

    bindActionButtons() {
        const btnBoost = document.getElementById('btn-touch-boost');
        const btnRollL = document.getElementById('btn-touch-roll-l');
        const btnRollR = document.getElementById('btn-touch-roll-r');
        const btnKnife = document.getElementById('btn-touch-knife');
        const btnCobra = document.getElementById('btn-touch-cobra');

        const bindHold = (btn, onDown, onUp) => {
            if (!btn) return;
            let activePointerId = null;

            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                activePointerId = e.pointerId;
                try {
                    btn.setPointerCapture(e.pointerId);
                } catch (err) {}
                onDown();
                this.vibrate(18);
            });

            const release = (e) => {
                if (activePointerId !== null && (activePointerId === e.pointerId || e.type === 'lostpointercapture' || e.type === 'pointercancel')) {
                    e.preventDefault();
                    try {
                        if (btn.hasPointerCapture(activePointerId)) {
                            btn.releasePointerCapture(activePointerId);
                        }
                    } catch (err) {}
                    activePointerId = null;
                    onUp();
                }
            };

            btn.addEventListener('pointerup', release);
            btn.addEventListener('pointercancel', release);
            btn.addEventListener('lostpointercapture', release);
            window.addEventListener('pointerup', release);
            window.addEventListener('pointercancel', release);
        };

        if (btnBoost) {
            bindHold(btnBoost, 
                () => { this.input.state.isNitroHeld = true; }, 
                () => { this.input.state.isNitroHeld = false; }
            );
        }

        if (btnKnife) {
            bindHold(btnKnife, 
                () => { this.input.state.isKnifeEdgeHeld = true; }, 
                () => { this.input.state.isKnifeEdgeHeld = false; }
            );
        }

        if (btnRollL) {
            btnRollL.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.input.state.stuntRollLeft = true;
                this.vibrate([15, 20, 15]);
            });
        }

        if (btnRollR) {
            btnRollR.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.input.state.stuntRollRight = true;
                this.vibrate([15, 20, 15]);
            });
        }

        if (btnCobra) {
            btnCobra.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.input.state.isCobraTriggered = true;
                this.vibrate([25, 30, 25]);
            });
        }
    }
}
