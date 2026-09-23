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

        // Speed lines are now handled by 3D particle system
    }
}
