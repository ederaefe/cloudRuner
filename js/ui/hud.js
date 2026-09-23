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

        this.nitroFill = document.getElementById('nitro-fill-bar');
        this.nitroValTxt = document.getElementById('nitro-val-txt');

        this.stuntBanner = document.getElementById('stunt-alert');
        this.stuntTitle = document.getElementById('stunt-title-txt');
        this.stuntBonus = document.getElementById('stunt-bonus-txt');
        this.stuntTimeout = null;

        // Speed lines canvas
        this.speedLinesCanvas = document.getElementById('speed-lines-canvas');
        this.slCtx = this.speedLinesCanvas ? this.speedLinesCanvas.getContext('2d') : null;
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.particles = [];
        this.initSpeedParticles();
    }

    resizeCanvas() {
        if (!this.speedLinesCanvas) return;
        this.speedLinesCanvas.width = window.innerWidth;
        this.speedLinesCanvas.height = window.innerHeight;
    }

    initSpeedParticles() {
        this.particles = [];
        const count = 50;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                len: 10 + Math.random() * 40,
                speed: 15 + Math.random() * 30
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
        if (this.lapTxt) {
            const maxLaps = totalLaps || (CONFIG.TRACK?.LAPS_TO_WIN || 2);
            this.lapTxt.textContent = `${currentLap} / ${maxLaps}`;
        }
        if (this.posTxt) {
            const suffix = positionRank === 1 ? 'ST' : (positionRank === 2 ? 'ND' : (positionRank === 3 ? 'RD' : 'TH'));
            this.posTxt.textContent = `${positionRank}${suffix}`;
        }

        // Nitro gauge
        if (this.nitroFill) {
            const maxNitro = drone.nitroMaxCapacity || CONFIG.NITRO.MAX_CAPACITY;
            const nitroPct = Math.round((drone.nitroAmount / maxNitro) * 100);
            this.nitroFill.style.width = `${Math.min(100, Math.max(0, nitroPct))}%`;

            this.nitroFill.classList.remove('stage2', 'stage3');
            if (drone.nitroStage === 3) {
                this.nitroFill.classList.add('stage3');
            } else if (drone.nitroStage === 2) {
                this.nitroFill.classList.add('stage2');
            }

            if (this.nitroValTxt) {
                if (drone.nitroStage === 3) {
                    this.nitroValTxt.textContent = 'HYPER-OVERDRIVE';
                    this.nitroValTxt.style.color = '#00ffff';
                } else if (drone.nitroStage === 2) {
                    this.nitroValTxt.textContent = 'AFTERBURNER';
                    this.nitroValTxt.style.color = '#E8580A';
                } else if (isWingmanActive && isDrafting) {
                    this.nitroValTxt.textContent = 'TEAMWORK TETHER';
                    this.nitroValTxt.style.color = '#00e5ff';
                } else if (isDrafting) {
                    this.nitroValTxt.textContent = 'SLIPSTREAM DRAFTING';
                    this.nitroValTxt.style.color = '#F4A426';
                } else {
                    this.nitroValTxt.textContent = `${nitroPct}%`;
                    this.nitroValTxt.style.color = 'rgba(255, 255, 255, 0.85)';
                }
            }
        }

        // Draw radial speed lines during high speed / Nitro
        this.renderSpeedLines(drone.speedKmh, drone.nitroStage);
    }

    renderSpeedLines(speedKmh, nitroStage) {
        if (!this.slCtx || !this.speedLinesCanvas) return;
        const w = this.speedLinesCanvas.width;
        const h = this.speedLinesCanvas.height;
        const cx = w / 2;
        const cy = h / 2;

        this.slCtx.clearRect(0, 0, w, h);

        const threshold = 145.0;
        if (speedKmh < threshold) {
            this.speedLinesCanvas.style.opacity = '0';
            return;
        }

        const intensity = Math.min(1.0, (speedKmh - threshold) / (CONFIG.FLIGHT.STAGE3_BOOST_SPEED - threshold));
        this.speedLinesCanvas.style.opacity = `${0.2 + intensity * 0.8}`;

        this.slCtx.strokeStyle = (nitroStage === 3) ? 'rgba(0, 255, 255, 0.8)' : (nitroStage === 2 ? 'rgba(244, 164, 38, 0.65)' : 'rgba(255, 255, 255, 0.35)');
        this.slCtx.lineWidth = (nitroStage === 3) ? 2.5 : (nitroStage === 2 ? 2.0 : 1.2);

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dist = Math.hypot(dx, dy) || 1.0;

            // Move outward towards periphery
            p.x += (dx / dist) * p.speed * intensity;
            p.y += (dy / dist) * p.speed * intensity;

            // Tail line pointing back to screen center
            this.slCtx.beginPath();
            this.slCtx.moveTo(p.x, p.y);
            this.slCtx.lineTo(p.x - (dx / dist) * p.len * intensity, p.y - (dy / dist) * p.len * intensity);
            this.slCtx.stroke();

            // Reset when leaving screen
            if (p.x < 0 || p.x > w || p.y < 0 || p.y > h || isNaN(p.x)) {
                p.x = cx + (Math.random() - 0.5) * (w * 0.5);
                p.y = cy + (Math.random() - 0.5) * (h * 0.5);
            }
        }
    }
}
