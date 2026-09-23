/*
================================================================================
BARCH AERO-CANYON RACING - ALL-IN-ONE CUSTOMIZATIONS SIDEBAR
Unified slide-out drawer managing skins, upgrades, sectors, modes, and controls
================================================================================
*/

import { CONFIG } from '../config.js';

export class CustomizationSidebar {
    constructor(hangarManager, controlsGuide, onSkinChange, onSectorChange, onModeChange) {
        this.hangarManager = hangarManager;
        this.controlsGuide = controlsGuide;
        this.onSkinChange = onSkinChange;
        this.onSectorChange = onSectorChange;
        this.onModeChange = onModeChange;

        this.isOpen = false;
        this.activeTab = 'hangar';

        this.initDOMElements();
        this.bindEvents();
        this.renderAll();
    }

    initDOMElements() {
        this.sidebar = document.getElementById('customization-sidebar');
        this.backdrop = document.getElementById('sidebar-backdrop');
        this.btnToggle = document.getElementById('btn-toggle-sidebar');
        this.btnClose = document.getElementById('btn-close-sidebar');

        // Sidebar Header Info
        this.creditsDisplay = document.getElementById('sidebar-credits-txt');
        this.rankDisplay = document.getElementById('sidebar-rank-txt');

        // Tab Navigation
        this.navButtons = document.querySelectorAll('.sidebar-nav-btn');
        this.tabPanels = document.querySelectorAll('.sidebar-tab-panel');

        // Container Elements
        this.skinsContainer = document.getElementById('sidebar-skins-list');
        this.upgradesContainer = document.getElementById('sidebar-upgrades-list');
        this.sectorsContainer = document.getElementById('sidebar-sectors-list');
        this.modesContainer = document.getElementById('sidebar-modes-list');

        // Action Buttons
        this.btnOpenAcademy = document.getElementById('sidebar-btn-academy');
    }

    bindEvents() {
        if (this.btnToggle) {
            this.btnToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        }

        if (this.btnClose) {
            this.btnClose.addEventListener('click', (e) => {
                e.preventDefault();
                this.close();
            });
        }

        if (this.backdrop) {
            this.backdrop.addEventListener('click', () => {
                this.close();
            });
        }

        if (this.btnOpenAcademy && this.controlsGuide) {
            this.btnOpenAcademy.addEventListener('click', () => {
                this.close();
                this.controlsGuide.open();
            });
        }

        // Tab Navigation
        if (this.navButtons) {
            this.navButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.dataset.tab;
                    this.switchTab(tab);
                });
            });
        }

        // Keyboard Shortcut: TAB to toggle sidebar
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.renderAll();
        if (this.sidebar) this.sidebar.classList.add('open');
        if (this.backdrop) this.backdrop.classList.add('visible');
    }

    close() {
        this.isOpen = false;
        if (this.sidebar) this.sidebar.classList.remove('open');
        if (this.backdrop) this.backdrop.classList.remove('visible');
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        if (this.navButtons) {
            this.navButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
        }
        if (this.tabPanels) {
            this.tabPanels.forEach(p => p.classList.toggle('active', p.id === `sidebar-tab-${tabName}`));
        }
    }

    renderAll() {
        this.renderHeader();
        this.renderSkins();
        this.renderUpgrades();
        this.renderSectors();
        this.renderModes();
    }

    renderHeader() {
        const profile = this.hangarManager.profile;
        if (this.creditsDisplay) {
            this.creditsDisplay.textContent = `${profile.credits} CR`;
        }
        if (this.rankDisplay) {
            this.rankDisplay.textContent = profile.isCampaignComplete ? 'APEX ACE' : `SECTOR 0${profile.campaignProgress}`;
        }
    }

    renderSkins() {
        if (!this.skinsContainer) return;
        this.skinsContainer.innerHTML = '';
        const profile = this.hangarManager.profile;

        CONFIG.SKINS.forEach(skin => {
            const isUnlocked = profile.unlockedSkins.includes(skin.id);
            const isSelected = profile.selectedSkinId === skin.id;

            let actionLabel = 'EQUIP';
            if (isSelected) actionLabel = 'EQUIPPED';
            else if (!isUnlocked && skin.isCampaignExclusive) actionLabel = 'APEX TROPHY';
            else if (!isUnlocked) actionLabel = `${skin.cost} CR`;

            const card = document.createElement('div');
            card.className = `sidebar-skin-item ${isSelected ? 'selected' : ''} ${skin.isCampaignExclusive ? 'trophy' : ''}`;
            card.innerHTML = `
                <div class="sidebar-skin-color" style="background: #${skin.accentColor.toString(16).padStart(6, '0')};"></div>
                <div style="flex:1;">
                    <div class="sidebar-skin-title">${skin.name}</div>
                    <div class="sidebar-skin-status">${isSelected ? 'ACTIVE AIRFRAME' : (isUnlocked ? 'READY TO FLY' : (skin.isCampaignExclusive ? 'CAMPAIGN CLIMAX' : `${skin.cost} CREDITS`))}</div>
                </div>
                <button class="sidebar-action-btn ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'active' : ''}" data-tooltip="${isSelected ? 'Airframe currently equipped' : (isUnlocked ? 'Equip this VTOL skin' : (skin.isCampaignExclusive ? 'Complete Sector 4 Climax to unlock' : `Purchase for ${skin.cost} Credits`))}">
                    ${actionLabel}
                </button>
            `;

            const btn = card.querySelector('.sidebar-action-btn');
            btn.addEventListener('click', () => {
                if (isSelected) return;
                if (isUnlocked) {
                    profile.selectedSkinId = skin.id;
                    this.hangarManager.saveProfile();
                    this.hangarManager.updateHangarUI();
                    this.renderAll();
                    if (this.onSkinChange) this.onSkinChange(skin);
                } else if (skin.isCampaignExclusive) {
                    card.classList.add('shake-anim');
                    setTimeout(() => card.classList.remove('shake-anim'), 400);
                } else if (profile.credits >= skin.cost) {
                    profile.credits -= skin.cost;
                    profile.unlockedSkins.push(skin.id);
                    profile.selectedSkinId = skin.id;
                    this.hangarManager.saveProfile();
                    this.hangarManager.updateHangarUI();
                    this.renderAll();
                    if (this.onSkinChange) this.onSkinChange(skin);
                }
            });

            this.skinsContainer.appendChild(card);
        });
    }

    renderUpgrades() {
        if (!this.upgradesContainer) return;
        this.upgradesContainer.innerHTML = '';
        const profile = this.hangarManager.profile;

        Object.keys(CONFIG.UPGRADES).forEach(key => {
            const uCfg = CONFIG.UPGRADES[key];
            const currentLevel = profile.upgrades[key] || 1;
            const cost = Math.round(uCfg.baseCost * Math.pow(uCfg.costMultiplier, currentLevel - 1));
            const isMax = currentLevel >= uCfg.maxLevel;
            const percent = (currentLevel / uCfg.maxLevel) * 100;

            const item = document.createElement('div');
            item.className = 'sidebar-upgrade-item';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-weight:800; font-size:12px;">${uCfg.name.toUpperCase()}</span>
                    <span style="font-size:11px; color:#88aacc; font-weight:700;">LVL ${currentLevel} / ${uCfg.maxLevel}</span>
                </div>
                <div class="sidebar-meter-track">
                    <div class="sidebar-meter-fill" style="width: ${percent}%;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                    <span style="font-size:11px; color:#aaccff;">+${uCfg.stepValue} ${uCfg.unit} per level</span>
                    <button class="sidebar-upgrade-btn ${isMax ? 'maxed' : ''}">
                        ${isMax ? 'MAX' : `UPGRADE (${cost} CR)`}
                    </button>
                </div>
            `;

            const btn = item.querySelector('.sidebar-upgrade-btn');
            btn.addEventListener('click', () => {
                if (!isMax && profile.credits >= cost) {
                    profile.credits -= cost;
                    profile.upgrades[key] = currentLevel + 1;
                    this.hangarManager.saveProfile();
                    this.hangarManager.updateHangarUI();
                    this.renderAll();
                }
            });

            this.upgradesContainer.appendChild(item);
        });
    }

    renderSectors() {
        if (!this.sectorsContainer) return;
        this.sectorsContainer.innerHTML = '';
        const profile = this.hangarManager.profile;

        CONFIG.SECTORS.forEach(sec => {
            const isUnlocked = !sec.requiredSectorId || (profile.campaignProgress >= sec.id);
            const isSelected = this.hangarManager.selectedSectorId === sec.id;
            const isCleared = profile.campaignProgress > sec.id || (sec.id === 4 && profile.isCampaignComplete);

            const card = document.createElement('div');
            card.className = `sidebar-sector-item ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''} ${sec.isClimax ? 'climax' : ''}`;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:900; font-size:13px; color:#ffffff;">0${sec.id}. ${sec.name.toUpperCase()}</span>
                    <span class="sidebar-sector-badge ${sec.isClimax ? 'climax' : (isCleared ? 'cleared' : (isUnlocked ? 'ready' : 'locked'))}">
                        ${sec.isClimax ? 'CLIMAX' : (isCleared ? 'CLEARED' : (isUnlocked ? 'AVAILABLE' : 'LOCKED'))}
                    </span>
                </div>
                <div style="font-size:11px; color:#88aacc; margin:3px 0;">${sec.subtitle}</div>
                <div style="font-size:10px; color:#00ffff; font-weight:700;">${sec.laps} LAPS | ${sec.payloads} FREIGHT NODES</div>
            `;

            card.addEventListener('click', () => {
                if (!isUnlocked) {
                    card.classList.add('shake-anim');
                    setTimeout(() => card.classList.remove('shake-anim'), 400);
                    return;
                }
                this.hangarManager.selectedSectorId = sec.id;
                this.hangarManager.updateSectorSelectionUI();
                this.renderSectors();
                if (this.onSectorChange) this.onSectorChange(sec.id);
            });

            this.sectorsContainer.appendChild(card);
        });
    }

    renderModes() {
        if (!this.modesContainer) return;
        this.modesContainer.innerHTML = '';

        const modes = [
            { id: CONFIG.MODES.CIRCUIT_RACE, title: 'CIRCUIT GRAND PRIX', desc: 'Checkpoint racing against 3 autonomous AI rivals.' },
            { id: CONFIG.MODES.EXTRACTION_SOLO, title: 'CARGO SOLO', desc: 'Rooftop magnetic freight winch extraction against the clock.' },
            { id: CONFIG.MODES.EXTRACTION_VERSUS, title: 'CARGO VERSUS AI', desc: 'Competitive cargo recovery race against rival interceptors.' },
            { id: CONFIG.MODES.TEAMWORK_COOP, title: 'TEAMWORK SQUAD', desc: 'Fly tactical escort with AI Wingman ECHO-01 and boost tethering.' }
        ];

        modes.forEach(m => {
            const isSelected = this.hangarManager.selectedMode === m.id;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `sidebar-mode-card ${isSelected ? 'selected' : ''}`;
            btn.innerHTML = `
                <div style="font-weight:900; font-size:12px; color:#ffffff;">${m.title}</div>
                <div style="font-size:11px; color:#88aacc; margin-top:2px;">${m.desc}</div>
            `;

            btn.addEventListener('click', () => {
                this.hangarManager.selectedMode = m.id;
                document.querySelectorAll('.mode-select-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.mode === m.id);
                });
                this.renderModes();
                if (this.onModeChange) this.onModeChange(m.id);
            });

            this.modesContainer.appendChild(btn);
        });
    }
}
