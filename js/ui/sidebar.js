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
        this.manualContainer = document.getElementById('sidebar-manual-content');
        this.settingsContainer = document.getElementById('sidebar-settings-content');
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
        this.renderManual();
        this.renderSettings();
        this.renderSkins();
        this.renderUpgrades();
        this.renderSectors();
        this.renderModes();
    }

    renderManual() {
        if (!this.manualContainer) return;
        this.manualContainer.innerHTML = `
            <div class="manual-card">
                <div class="manual-title">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/></svg>
                    AUTOPILOT HAND-OFF MODE <span class="manual-key">O</span> <span class="manual-key">U</span>
                </div>
                <div class="manual-desc">
                    Hands-off autonomous navigation. When engaged, the browser navigates the spline track, hits checkpoint gates, avoids skyscrapers, and modulates throttle and boost. Touching manual steering immediately overrides.
                </div>
            </div>

            <div class="manual-card">
                <div class="manual-title">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="8 7 12 3 16 7"/><polyline points="8 17 12 21 16 17"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    FIXED ALTITUDE HOLD <span class="manual-key">H</span> (ADJUST: <span class="manual-key">T</span>/<span class="manual-key">G</span> or <span class="manual-key">[</span>/<span class="manual-key">]</span>)
                </div>
                <div class="manual-desc">
                    Locks elevation to current or target altitude with PD thrust damping. Step target altitude up/down by 5 meters using hotkeys or the in-flight HUD step buttons.
                </div>
            </div>

            <div class="manual-card">
                <div class="manual-title">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><rect x="9" y="9" width="6" height="6" fill="currentColor"/></svg>
                    VTOL HOVER STOP AIRBRAKE <span class="manual-key">B</span>
                </div>
                <div class="manual-desc">
                    Emergency full stop. Dumps forward momentum to 0 km/h rapidly, articulates tilt-nacelles to 90 degrees vertical hover, extends landing gear, and locks 3D station-keeping. Applying throttle immediately resumes flight.
                </div>
            </div>

            <div class="manual-card">
                <div class="manual-title">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/><polyline points="9 12 11 14 15 10"/></svg>
                    FLIGHT ASSIST & AUTO-LEVELING <span class="manual-key">J</span>
                </div>
                <div class="manual-desc">
                    Active roll and pitch stabilization dampens oversteer and restores wings level when controls are released. Includes soft building facade proximity deflection.
                </div>
            </div>

            <div class="manual-card">
                <div class="manual-title">FLIGHT KINEMATICS & OVERDRIVE</div>
                <div class="manual-desc">
                    <span class="manual-key">W</span> / <span class="manual-key">S</span> Throttle & Pitch<br>
                    <span class="manual-key">A</span> / <span class="manual-key">D</span> Steer & Banking Roll<br>
                    <span class="manual-key">SPACE</span> Afterburner & Hyper-Overdrive<br>
                    <span class="manual-key">Q</span> / <span class="manual-key">E</span> Snap Aileron Rolls (+22% Nitro)<br>
                    <span class="manual-key">C</span> Knife-Edge Flight (Hold 90 deg bank)<br>
                    <span class="manual-key">X</span> Cobra Airbrake (-62% speed dump)
                </div>
            </div>
        `;
    }

    renderSettings() {
        if (!this.settingsContainer) return;
        this.settingsContainer.innerHTML = `
            <div class="sidebar-settings-group">
                <div class="sidebar-setting-item">
                    <span class="sidebar-setting-label">GRAPHICS PROFILE</span>
                    <select id="sidebar-setting-graphics" class="settings-select" style="background:#0c111a; border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; padding:4px 8px; font-family:inherit;">
                        <option value="AUTO">AUTO-DETECT</option>
                        <option value="1">TIER 1 (MOBILE LOW)</option>
                        <option value="2">TIER 2 (MID-RANGE)</option>
                        <option value="3">TIER 3 (DESKTOP ULTRA)</option>
                    </select>
                </div>

                <div class="sidebar-setting-item">
                    <span class="sidebar-setting-label">ATMOSPHERIC SKYLINE</span>
                    <select id="sidebar-setting-skyline" class="settings-select" style="background:#0c111a; border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; padding:4px 8px; font-family:inherit;">
                        <option value="EVENING_GLOOMY">EVENING GLOOMY (DUSK)</option>
                        <option value="MORNING_CALM">MORNING BRIGHT (DAWN)</option>
                        <option value="NIGHT_NEON">NIGHT NEON (CYBERPUNK)</option>
                    </select>
                </div>

                <div class="sidebar-setting-item">
                    <span class="sidebar-setting-label">MASTER AUDIO</span>
                    <input type="range" id="sidebar-slider-audio" min="0" max="1" step="0.05" value="0.8" style="accent-color:var(--cyber-cyan); width:100px;">
                </div>

                <div class="sidebar-setting-item">
                    <span class="sidebar-setting-label">INVERT PITCH</span>
                    <input type="checkbox" id="sidebar-chk-invert" style="accent-color:var(--cyber-cyan); width:18px; height:18px;">
                </div>

                <div class="sidebar-setting-item">
                    <span class="sidebar-setting-label">HAPTIC VIBRATION</span>
                    <input type="checkbox" id="sidebar-chk-haptic" checked style="accent-color:var(--cyber-cyan); width:18px; height:18px;">
                </div>

                <div class="sidebar-setting-item">
                    <span class="sidebar-setting-label">DEFAULT FLIGHT ASSIST</span>
                    <input type="checkbox" id="sidebar-chk-assist" checked style="accent-color:var(--cyber-cyan); width:18px; height:18px;">
                </div>
            </div>
        `;

        const selSky = document.getElementById('sidebar-setting-skyline');
        if (selSky) {
            selSky.value = window._activeSkylineId || 'EVENING_GLOOMY';
            selSky.addEventListener('change', (e) => {
                if (window._setAtmosphericSkyline) window._setAtmosphericSkyline(e.target.value);
            });
        }

        const chkInvert = document.getElementById('sidebar-chk-invert');
        if (chkInvert) {
            chkInvert.checked = !!window._invertPitch;
            chkInvert.addEventListener('change', (e) => {
                window._invertPitch = e.target.checked;
            });
        }

        const chkHaptic = document.getElementById('sidebar-chk-haptic');
        if (chkHaptic) {
            chkHaptic.checked = window._hapticEnabled !== false;
            chkHaptic.addEventListener('change', (e) => {
                window._hapticEnabled = e.target.checked;
            });
        }

        const chkAssist = document.getElementById('sidebar-chk-assist');
        if (chkAssist && window._inputManager) {
            chkAssist.checked = window._inputManager.state.flyAssistEnabled;
            chkAssist.addEventListener('change', (e) => {
                window._inputManager.state.flyAssistEnabled = e.target.checked;
            });
        }
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
