/*
================================================================================
BARCH AERO-CANYON RACING - HANGAR LOADOUT & SETTINGS MANAGER
Handles drone skins, stat upgrades, settings, level selection, and localStorage
================================================================================
*/

import { CONFIG } from '../config.js';

const STORAGE_KEY = 'barch_player_profile_v1';

export class HangarSettingsManager {
    constructor(coordinator, soundEngine, onSkinChanged, onStartGame) {
        this.coordinator = coordinator;
        this.sound = soundEngine;
        this.onSkinChanged = onSkinChanged;
        this.onStartGame = onStartGame;

        this.profile = this.loadProfile();
        this.selectedMode = CONFIG.MODES.CIRCUIT_RACE;
        this.selectedSectorId = 1;

        this.initDOMElements();
        this.bindEvents();
        this.updateSectorSelectionUI();
        this.updateHangarUI();
    }

    loadProfile() {
        const defaultProfile = {
            credits: 600,
            selectedSkinId: 'SAR_ORANGE',
            unlockedSkins: ['SAR_ORANGE'],
            campaignProgress: 1, // Highest sector unlocked (1 to 4)
            isCampaignComplete: false,
            sectorRecords: {}, // sectorId -> { time, rating, mode }
            upgrades: {
                turbineSpeed: 1,
                winchRadius: 1,
                hullArmor: 1,
                nitroCapacity: 1
            },
            settings: {
                tierOverride: 'AUTO',
                masterVolume: 0.8,
                engineVolume: 0.8,
                hapticEnabled: true,
                invertPitch: false,
                deadzone: 0.12,
                sensitivity: 1.0
            }
        };

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return { ...defaultProfile, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to read from localStorage:', e);
        }
        return defaultProfile;
    }

    saveProfile() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
        } catch (e) {
            console.warn('Failed to write to localStorage:', e);
        }
    }

    getUpgradedStats() {
        const u = this.profile.upgrades;
        const cfg = CONFIG.UPGRADES;

        return {
            maxSpeed: cfg.turbineSpeed.baseValue + (u.turbineSpeed - 1) * cfg.turbineSpeed.stepValue,
            winchRadius: cfg.winchRadius.baseValue + (u.winchRadius - 1) * cfg.winchRadius.stepValue,
            hullMax: cfg.hullArmor.baseValue + (u.hullArmor - 1) * cfg.hullArmor.stepValue,
            nitroMax: cfg.nitroCapacity.baseValue + (u.nitroCapacity - 1) * cfg.nitroCapacity.stepValue
        };
    }

    initDOMElements() {
        this.hangarModal = document.getElementById('hangar-modal');
        this.settingsModal = document.getElementById('settings-modal');
        this.pauseModal = document.getElementById('pause-modal');
        this.creditsDisplay = document.getElementById('hangar-credits-txt');
        this.skinCardsContainer = document.getElementById('skin-cards-list');
        this.upgradeCardsContainer = document.getElementById('upgrade-cards-list');
        this.sectorContainer = document.getElementById('sector-selection-list');
    }

    bindEvents() {
        // Hangar open/close buttons
        const btnOpenHangar = document.getElementById('btn-open-hangar');
        const btnCloseHangar = document.getElementById('btn-close-hangar');
        const btnOpenSettings = document.getElementById('btn-open-settings');
        const btnCloseSettings = document.getElementById('btn-close-settings');
        const btnPause = document.getElementById('btn-pause-game');
        const btnResume = document.getElementById('btn-resume-game');

        if (btnOpenHangar) btnOpenHangar.addEventListener('click', () => this.openHangar());
        if (btnCloseHangar) btnCloseHangar.addEventListener('click', () => this.closeHangar());
        if (btnOpenSettings) btnOpenSettings.addEventListener('click', () => this.openSettings());
        if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => this.closeSettings());

        if (btnPause) btnPause.addEventListener('click', () => this.openPause());
        if (btnResume) btnResume.addEventListener('click', () => this.closePause());

        // Settings elements binding
        const sliderVol = document.getElementById('slider-master-vol');
        const chkHaptic = document.getElementById('chk-haptic');
        const chkInvertPitch = document.getElementById('chk-invert-pitch');
        const selectTier = document.getElementById('setting-graphics-tier');

        // Apply loaded settings to globals
        window._hapticEnabled = this.profile.settings?.hapticEnabled !== false;
        window._invertPitch = this.profile.settings?.invertPitch === true;
        if (this.sound && this.profile.settings?.masterVolume !== undefined) {
            this.sound.setMasterVolume(this.profile.settings.masterVolume);
        }

        if (sliderVol) {
            sliderVol.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.profile.settings.masterVolume = val;
                if (this.sound) this.sound.setMasterVolume(val);
            });
        }

        if (chkHaptic) {
            chkHaptic.addEventListener('change', (e) => {
                this.profile.settings.hapticEnabled = e.target.checked;
                window._hapticEnabled = e.target.checked;
            });
        }

        if (chkInvertPitch) {
            chkInvertPitch.addEventListener('change', (e) => {
                this.profile.settings.invertPitch = e.target.checked;
                window._invertPitch = e.target.checked;
            });
        }

        if (selectTier) {
            selectTier.addEventListener('change', (e) => {
                this.profile.settings.tierOverride = e.target.value;
            });
        }

        const sliderDeadzone = document.getElementById('slider-deadzone');
        const txtValDeadzone = document.getElementById('txt-val-deadzone');
        const sliderSensitivity = document.getElementById('slider-sensitivity');
        const txtValSensitivity = document.getElementById('txt-val-sensitivity');

        window._stickDeadzone = this.profile.settings?.deadzone !== undefined ? this.profile.settings.deadzone : 0.12;
        window._stickSensitivity = this.profile.settings?.sensitivity !== undefined ? this.profile.settings.sensitivity : 1.0;

        if (sliderDeadzone) {
            sliderDeadzone.value = window._stickDeadzone;
            if (txtValDeadzone) txtValDeadzone.textContent = Number(window._stickDeadzone).toFixed(2);
            sliderDeadzone.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.profile.settings.deadzone = val;
                window._stickDeadzone = val;
                if (txtValDeadzone) txtValDeadzone.textContent = val.toFixed(2);
                this.saveProfile();
            });
        }

        if (sliderSensitivity) {
            sliderSensitivity.value = window._stickSensitivity;
            if (txtValSensitivity) txtValSensitivity.textContent = `${Number(window._stickSensitivity).toFixed(1)}x`;
            sliderSensitivity.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.profile.settings.sensitivity = val;
                window._stickSensitivity = val;
                if (txtValSensitivity) txtValSensitivity.textContent = `${val.toFixed(1)}x`;
                this.saveProfile();
            });
        }

        // Mode selector buttons
        document.querySelectorAll('.mode-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-select-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedMode = btn.dataset.mode;
            });
        });

        // Keyboard ESC for Pause
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.pauseModal && !this.pauseModal.classList.contains('hidden')) {
                    this.closePause();
                } else if (window._gameState === 'RACING') {
                    this.openPause();
                }
            }
        });
    }

    updateSectorSelectionUI() {
        if (!this.sectorContainer) return;
        this.sectorContainer.innerHTML = '';

        CONFIG.SECTORS.forEach(sec => {
            const isUnlocked = !sec.requiredSectorId || (this.profile.campaignProgress >= sec.id);
            const isSelected = this.selectedSectorId === sec.id;
            const isCleared = this.profile.campaignProgress > sec.id || (sec.id === 4 && this.profile.isCampaignComplete);
            const record = this.profile.sectorRecords ? this.profile.sectorRecords[sec.id] : null;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `sector-card-btn ${isSelected ? 'active' : ''} ${!isUnlocked ? 'locked' : ''} ${sec.isClimax ? 'climax-sector' : ''}`;
            if (!btn.dataset) btn.dataset = {};
            btn.dataset.sector = sec.id;

            let badgeHtml = '';
            if (sec.isClimax) {
                badgeHtml = `<span class="sector-badge climax-badge">FINAL PROTOCOL</span>`;
            } else if (isCleared) {
                const gradeTxt = record?.grade ? ` [${record.grade}]` : '';
                badgeHtml = `<span class="sector-badge cleared-badge">SECURED${gradeTxt}</span>`;
            } else if (!isUnlocked) {
                badgeHtml = `<span class="sector-badge locked-badge">LOCKED</span>`;
            }

            let lockNoticeHtml = '';
            if (!isUnlocked) {
                lockNoticeHtml = `<div class="sector-req-txt">REQUIRES: SECTOR 0${sec.requiredSectorId} SECURED</div>`;
            } else if (record?.bestTime) {
                lockNoticeHtml = `<div class="sector-record-txt">BEST TIME: ${record.bestTime.toFixed(2)}s | GRADE: ${record.grade || 'A'}</div>`;
            }

            btn.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <div class="sector-card-title">${sec.id < 10 ? '0' + sec.id : sec.id}. ${sec.name.toUpperCase()}</div>
                    ${badgeHtml}
                </div>
                <div class="sector-card-sub">${sec.subtitle}</div>
                ${lockNoticeHtml}
            `;

            btn.addEventListener('click', () => {
                if (!isUnlocked) {
                    if (window._hapticEnabled && navigator.vibrate) navigator.vibrate([40, 60, 40]);
                    btn.classList.add('shake-anim');
                    setTimeout(() => btn.classList.remove('shake-anim'), 400);
                    return;
                }
                document.querySelectorAll('.sector-card-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedSectorId = sec.id;
            });

            this.sectorContainer.appendChild(btn);
        });
    }

    recordSectorResult(sectorId, resultData) {
        if (!this.profile.sectorRecords) this.profile.sectorRecords = {};
        const existing = this.profile.sectorRecords[sectorId];
        if (!existing || (resultData.bestTime && resultData.bestTime < existing.bestTime)) {
            this.profile.sectorRecords[sectorId] = resultData;
        }

        let unlockedNext = false;
        if (sectorId >= this.profile.campaignProgress && this.profile.campaignProgress < CONFIG.SECTORS.length) {
            this.profile.campaignProgress = sectorId + 1;
            unlockedNext = true;
        }

        if (sectorId === 4) {
            this.profile.isCampaignComplete = true;
            if (!this.profile.unlockedSkins.includes('APEX_PROTO')) {
                this.profile.unlockedSkins.push('APEX_PROTO');
            }
        }

        this.saveProfile();
        this.updateSectorSelectionUI();
        this.updateHangarUI();

        return {
            unlockedNext,
            newProgress: this.profile.campaignProgress,
            isCampaignComplete: this.profile.isCampaignComplete
        };
    }

    openHangar() {
        this.updateHangarUI();
        if (this.hangarModal) this.hangarModal.classList.remove('hidden');
    }

    closeHangar() {
        if (this.hangarModal) this.hangarModal.classList.add('hidden');
    }

    openSettings() {
        const sliderVol = document.getElementById('slider-master-vol');
        const chkHaptic = document.getElementById('chk-haptic');
        const chkInvertPitch = document.getElementById('chk-invert-pitch');
        const selectTier = document.getElementById('setting-graphics-tier');

        if (sliderVol && this.profile.settings?.masterVolume !== undefined) {
            sliderVol.value = this.profile.settings.masterVolume;
        }
        if (chkHaptic && this.profile.settings?.hapticEnabled !== undefined) {
            chkHaptic.checked = this.profile.settings.hapticEnabled;
        }
        if (chkInvertPitch && this.profile.settings?.invertPitch !== undefined) {
            chkInvertPitch.checked = this.profile.settings.invertPitch;
        }
        if (selectTier && this.profile.settings?.tierOverride) {
            selectTier.value = this.profile.settings.tierOverride;
        }

        if (this.settingsModal) this.settingsModal.classList.remove('hidden');
    }

    closeSettings() {
        if (this.settingsModal) this.settingsModal.classList.add('hidden');
        this.saveProfile();
    }

    openPause() {
        window._gameState = 'PAUSED';
        if (this.pauseModal) this.pauseModal.classList.remove('hidden');
    }

    closePause() {
        window._gameState = 'RACING';
        if (this.pauseModal) this.pauseModal.classList.add('hidden');
    }

    updateHangarUI() {
        if (this.creditsDisplay) {
            this.creditsDisplay.textContent = this.profile.credits;
        }

        // Render Skin Cards
        if (this.skinCardsContainer) {
            this.skinCardsContainer.innerHTML = '';
            CONFIG.SKINS.forEach(skin => {
                const isUnlocked = this.profile.unlockedSkins.includes(skin.id);
                const isSelected = this.profile.selectedSkinId === skin.id;

                let btnLabel = '';
                if (isSelected) {
                    btnLabel = 'EQUIPPED';
                } else if (isUnlocked) {
                    btnLabel = 'EQUIP';
                } else if (skin.isCampaignExclusive) {
                    btnLabel = 'APEX TROPHY';
                } else {
                    btnLabel = `${skin.cost} CR`;
                }

                const card = document.createElement('div');
                card.className = `skin-card ${isSelected ? 'selected' : ''} ${skin.isCampaignExclusive ? 'campaign-skin' : ''}`;
                card.innerHTML = `
                    <div class="skin-color-preview" style="background: #${skin.accentColor.toString(16).padStart(6, '0')};"></div>
                    <div class="skin-name">${skin.name}${skin.isCampaignExclusive ? ' <span style="color:#ffc400; font-size:10px;">[TROPHY]</span>' : ''}</div>
                    <button class="skin-action-btn ${isUnlocked ? 'unlocked' : (skin.isCampaignExclusive ? 'campaign-locked' : 'locked')}">
                        ${btnLabel}
                    </button>
                `;

                const actionBtn = card.querySelector('.skin-action-btn');
                actionBtn.addEventListener('click', () => {
                    if (isSelected) return;
                    if (isUnlocked) {
                        this.profile.selectedSkinId = skin.id;
                        this.saveProfile();
                        this.updateHangarUI();
                        if (this.onSkinChanged) this.onSkinChanged(skin);
                    } else if (skin.isCampaignExclusive) {
                        if (window._hapticEnabled && navigator.vibrate) navigator.vibrate([30, 40, 30]);
                        card.classList.add('shake-anim');
                        setTimeout(() => card.classList.remove('shake-anim'), 400);
                    } else if (this.profile.credits >= skin.cost) {
                        this.profile.credits -= skin.cost;
                        this.profile.unlockedSkins.push(skin.id);
                        this.profile.selectedSkinId = skin.id;
                        this.saveProfile();
                        this.updateHangarUI();
                        if (this.onSkinChanged) this.onSkinChanged(skin);
                    }
                });

                this.skinCardsContainer.appendChild(card);
            });
        }

        // Render Upgrades
        if (this.upgradeCardsContainer) {
            this.upgradeCardsContainer.innerHTML = '';
            Object.keys(CONFIG.UPGRADES).forEach(key => {
                const uCfg = CONFIG.UPGRADES[key];
                const currentLevel = this.profile.upgrades[key] || 1;
                const cost = Math.round(uCfg.baseCost * Math.pow(uCfg.costMultiplier, currentLevel - 1));
                const isMax = currentLevel >= uCfg.maxLevel;

                const item = document.createElement('div');
                item.className = 'upgrade-item';
                item.innerHTML = `
                    <div style="flex: 1;">
                        <div style="font-weight: 800; font-size: 13px;">${uCfg.name}</div>
                        <div style="font-size: 11px; color: #88aacc;">LVL ${currentLevel}/${uCfg.maxLevel}</div>
                    </div>
                    <button class="upgrade-btn ${isMax ? 'maxed' : ''}">
                        ${isMax ? 'MAXED' : `${cost} CR`}
                    </button>
                `;

                const btn = item.querySelector('.upgrade-btn');
                btn.addEventListener('click', () => {
                    if (!isMax && this.profile.credits >= cost) {
                        this.profile.credits -= cost;
                        this.profile.upgrades[key] = currentLevel + 1;
                        this.saveProfile();
                        this.updateHangarUI();
                    }
                });

                this.upgradeCardsContainer.appendChild(item);
            });
        }
    }
}
