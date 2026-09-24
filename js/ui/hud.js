/*
================================================================================
BARCH AERO-CANYON RACING - TACTICAL AVIATION RACING HUD & SPEED STREAKS
Real-time flight telemetry, stunt combo banners, and peripheral speed streaks
================================================================================
*/

import { CONFIG } from '../config.js';

export class RacingHUD {
    constructor() {
        this.speedTxt = document.getElementById('hud-speed');
        this.altTxt = document.getElementById('hud-alt');
        this.lapTxt = document.getElementById('hud-lap');
        this.posTxt = document.getElementById('position-badge');

        this.stuntBanner = document.getElementById('stunt-alert');
        this.stuntTitle = document.getElementById('stunt-title-txt');
        this.stuntBonus = document.getElementById('stunt-bonus-txt');
        this.stuntTimeout = null;

        // Task 50: Minimalist Top-Edge Compass Ribbon Canvas
        this.compassCanvas = document.getElementById('compass-ribbon-canvas');
        this.compassCtx = (this.compassCanvas && typeof this.compassCanvas.getContext === 'function') 
            ? this.compassCanvas.getContext('2d') 
            : null;

        // Task 35: Contextual Non-Blocking Notification Toast Stack
        this.toastStack = document.getElementById('hud-toast-stack');
        this.activeToasts = [];

        // Flight Assist HUD Buttons & Touch Indicators
        this.btnHudAuto = document.getElementById('btn-hud-auto');
        this.hudAutoLabel = document.getElementById('hud-auto-label');
        this.btnHudAlt = document.getElementById('btn-hud-alt');
        this.hudAltLabel = document.getElementById('hud-alt-hold-label');
        this.btnHudStop = document.getElementById('btn-hud-stop');
        this.btnHudAssist = document.getElementById('btn-hud-assist');
        this.hudAssistLabel = document.getElementById('hud-assist-label');

        this.btnTouchAuto = document.getElementById('btn-touch-auto');
        this.btnTouchAlt = document.getElementById('btn-touch-alt');
        this.btnTouchStop = document.getElementById('btn-touch-stop');
        this.btnTouchAssist = document.getElementById('btn-touch-assist');

        // Option C True Slow Roads Floating Telemetry References
        this.altSectorTxt = document.getElementById('hud-alt-sector');
        this.nitroArcBar = document.getElementById('nitro-arc-bar');
        this.flightStateEl = document.getElementById('hud-flight-state');
        this.flightStateTxt = document.getElementById('hud-flight-state-text');
    }

    showToast(message, type = 'info', duration = 2200) {
        if (!this.toastStack) return;
        const toast = document.createElement('div');
        toast.className = `toast-msg toast-${type}`;
        toast.textContent = message;
        this.toastStack.appendChild(toast);
        this.activeToasts.push(toast);

        while (this.activeToasts.length > 2) {
            const old = this.activeToasts.shift();
            if (old && old.parentNode) old.parentNode.removeChild(old);
        }

        if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(() => toast.classList.add('visible'));
        } else {
            toast.classList.add('visible');
        }

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
                const idx = this.activeToasts.indexOf(toast);
                if (idx !== -1) this.activeToasts.splice(idx, 1);
            }, 300);
        }, duration);
    }

    updateCompass(drone, targets = []) {
        if (!this.compassCtx || !drone || !drone.group) return;
        const ctx = this.compassCtx;
        const isMobile = (typeof window !== 'undefined' && window.innerWidth <= 768);
        const expectedW = isMobile ? 180 : 260;
        const expectedH = isMobile ? 24 : 28;
        if (this.compassCanvas.width !== expectedW) this.compassCanvas.width = expectedW;
        if (this.compassCanvas.height !== expectedH) this.compassCanvas.height = expectedH;
        const w = expectedW;
        const h = expectedH;

        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(7, 17, 31, 0.75)';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

        const euler = new THREE.Euler().setFromQuaternion(drone.group.quaternion, 'YXZ');
        let headingDeg = ((-euler.y * 180 / Math.PI) % 360 + 360) % 360;

        const pixelsPerDeg = isMobile ? 1.05 : 1.4;
        const centerX = w / 2;

        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let relDeg = -80; relDeg <= 80; relDeg += 10) {
            const absDeg = ((Math.round(headingDeg + relDeg) % 360) + 360) % 360;
            const x = centerX + relDeg * pixelsPerDeg;

            if (absDeg % 90 === 0) {
                const cardinal = absDeg === 0 ? 'N' : absDeg === 90 ? 'E' : absDeg === 180 ? 'S' : 'W';
                ctx.fillStyle = '#00ffff';
                ctx.fillText(cardinal, x, h / 2 - 2);
                ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
                ctx.fillRect(x - 0.5, h - 6, 1, 6);
            } else if (absDeg % 30 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillText(`${absDeg.toString().padStart(3, '0')}`, x, h / 2 - 2);
                ctx.fillRect(x - 0.5, h - 5, 1, 5);
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(x - 0.5, h - 3, 1, 3);
            }
        }

        ctx.strokeStyle = '#F4A426';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, h);
        ctx.stroke();

        if (Array.isArray(targets)) {
            targets.forEach(tgt => {
                if (!tgt || !tgt.position) return;
                const dx = tgt.position.x - drone.position.x;
                const dz = tgt.position.z - drone.position.z;
                const targetAngle = (Math.atan2(dx, dz) * 180 / Math.PI + 360) % 360;
                let diff = (targetAngle - headingDeg + 540) % 360 - 180;
                if (Math.abs(diff) <= 80) {
                    const pinX = centerX + diff * pixelsPerDeg;
                    ctx.fillStyle = tgt.color || '#E8580A';
                    ctx.beginPath();
                    ctx.arc(pinX, h - 4, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }

    showStuntAlert(title, bonus) {
        if (!this.stuntBanner) return;
        this.stuntTitle.textContent = title;
        this.stuntBonus.textContent = bonus;
        this.stuntBanner.classList.add('active');

        if (this.stuntTimeout) clearTimeout(this.stuntTimeout);
        this.stuntTimeout = setTimeout(() => {
            this.stuntBanner.classList.remove('active');
        }, 1400);
    }

    update(drone, currentLap, positionRank, totalRacers, isDrafting, totalLaps = null, isWingmanActive = false) {
        // Telemetry readout
        if (this.speedTxt) {
            this.speedTxt.textContent = Math.round(drone.speedKmh);
        }
        if (this.altTxt) {
            this.altTxt.textContent = Math.round(drone.position.y);
        }
        if (this.altSectorTxt && drone && drone.position) {
            const y = drone.position.y;
            if (y > 550) {
                this.altSectorTxt.textContent = 'STRATOSPHERE';
            } else if (y > 220) {
                this.altSectorTxt.textContent = 'UPPER MESOSPHERE';
            } else if (y > 60) {
                this.altSectorTxt.textContent = 'CANOPY SKYWAY';
            } else {
                this.altSectorTxt.textContent = 'DOWNTOWN CANYONS';
            }
        }
        if (this.lapTxt) {
            const maxLaps = totalLaps || (CONFIG.TRACK?.LAPS_TO_WIN || 2);
            this.lapTxt.textContent = `${currentLap} / ${maxLaps}`;
        }
        if (this.posTxt) {
            const suffix = positionRank === 1 ? 'ST' : (positionRank === 2 ? 'ND' : (positionRank === 3 ? 'RD' : 'TH'));
            this.posTxt.textContent = `${positionRank}${suffix}`;
        }

        // Nitro gauge & Delicate curved arc
        const maxNitro = drone.nitroMaxCapacity || (CONFIG.NITRO?.MAX_CAPACITY || 100);
        const nitroPct = Math.min(100, Math.max(0, Math.round((drone.nitroAmount / maxNitro) * 100)));

        if (this.nitroArcBar) {
            this.nitroArcBar.style.width = `${nitroPct}%`;
        }

        // Task 50: Minimalist Top-Edge Compass Ribbon Update
        if (this.compassCanvas) {
            this.updateCompass(drone);
        }

        // Flight Assist HUD & Touch Sync
        const st = (typeof window !== 'undefined' && window._inputManager) ? window._inputManager.state : null;
        if (st) {
            if (this.btnHudAuto) {
                this.btnHudAuto.classList.toggle('active', !!st.autopilotEnabled);
            }
            if (this.hudAutoLabel) {
                this.hudAutoLabel.textContent = st.autopilotEnabled ? 'AUTOPILOT: ON [O]' : 'AUTOPILOT [O]';
            }
            if (this.btnTouchAuto) {
                this.btnTouchAuto.classList.toggle('active', !!st.autopilotEnabled);
            }

            if (this.btnHudAlt) {
                this.btnHudAlt.classList.toggle('active', !!st.altitudeHoldEnabled);
            }
            if (this.hudAltLabel) {
                const alt = Math.round(st.targetAltitude || (drone?.position?.y || 15));
                this.hudAltLabel.textContent = st.altitudeHoldEnabled ? `ALT HOLD: ${alt}M [H]` : 'ALT HOLD: OFF [H]';
            }
            if (this.btnTouchAlt) {
                this.btnTouchAlt.classList.toggle('active', !!st.altitudeHoldEnabled);
            }

            if (this.btnHudStop) {
                this.btnHudStop.classList.toggle('active', !!st.hoverStopActive);
            }
            if (this.btnTouchStop) {
                this.btnTouchStop.classList.toggle('active', !!st.hoverStopActive);
            }

            if (this.btnHudAssist) {
                this.btnHudAssist.classList.toggle('active', !!st.flyAssistEnabled);
            }
            if (this.hudAssistLabel) {
                this.hudAssistLabel.textContent = st.flyAssistEnabled ? 'ASSIST: ON [J]' : 'ASSIST: OFF [J]';
            }
            if (this.btnTouchAssist) {
                this.btnTouchAssist.classList.toggle('active', !!st.flyAssistEnabled);
            }
        }

        // True Slow Roads Center Bottom Flight State Indicator (AUTODRIVE / MANUAL)
        if (this.flightStateEl && this.flightStateTxt) {
            const isAuto = (drone && drone.isAutopilot) || (st && st.autopilotEnabled);
            this.flightStateTxt.textContent = isAuto ? 'AUTODRIVE' : 'MANUAL';
            if (this.flightStateEl.classList && typeof this.flightStateEl.classList.toggle === 'function') {
                this.flightStateEl.classList.toggle('manual', !isAuto);
            }
        }
    }

    showCountdown(text, isDive = false) {
        if (!this.countdownEl) {
            this.countdownEl = document.getElementById('hud-countdown');
        }
        if (!this.countdownEl) return;
        if (this.currentCountdownText === text && !this.countdownEl.classList.contains('hidden')) {
            return;
        }
        this.currentCountdownText = text;
        this.countdownEl.textContent = text;
        this.countdownEl.classList.remove('hidden');
        this.countdownEl.classList.toggle('dive-go', isDive);
        this.countdownEl.classList.remove('pulse-anim');
        if (typeof this.countdownEl.offsetWidth === 'number') {
            void this.countdownEl.offsetWidth;
        }
        this.countdownEl.classList.add('pulse-anim');
    }

    hideCountdown() {
        if (!this.countdownEl) {
            this.countdownEl = document.getElementById('hud-countdown');
        }
        if (this.countdownEl) {
            this.countdownEl.classList.add('hidden');
            this.countdownEl.classList.remove('pulse-anim', 'dive-go');
            this.currentCountdownText = null;
        }
    }
}
