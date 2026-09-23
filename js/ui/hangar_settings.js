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
        this.updateHangarUI();
    }

    loadProfile() {
        const defaultProfile = {
            credits: 600,
            selectedSkinId: 'SAR_ORANGE',
            unlockedSkins: ['SAR_ORANGE'],
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
                invertPitch: false
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

        // Mode and Sector selector buttons
        document.querySelectorAll('.mode-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-select-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedMode = btn.dataset.mode;
            });
        });

        document.querySelectorAll('.sector-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.sector-card-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedSectorId = parseInt(btn.dataset.sector, 10);
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

    openHangar() {
        this.updateHangarUI();
        if (this.hangarModal) this.hangarModal.classList.remove('hidden');
    }

    closeHangar() {
        if (this.hangarModal) this.hangarModal.classList.add('hidden');
    }

    openSettings() {
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

                const card = document.createElement('div');
                card.className = `skin-card ${isSelected ? 'selected' : ''}`;
                card.innerHTML = `
                    <div class="skin-color-preview" style="background: #${skin.accentColor.toString(16).padStart(6, '0')};"></div>
                    <div class="skin-name">${skin.name}</div>
                    <button class="skin-action-btn ${isUnlocked ? 'unlocked' : 'locked'}">
                        ${isSelected ? 'EQUIPPED' : (isUnlocked ? 'EQUIP' : `${skin.cost} CR`)}
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
