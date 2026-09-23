/*
================================================================================
BARCH AERO-CANYON RACING - FLIGHT ACADEMY & CONTROLS GUIDE
Comprehensive multi-device control schema, keycap cards, and stunt aerodynamics
================================================================================
*/

export class ControlsGuide {
    constructor() {
        this.activeTab = 'desktop';
        this.modal = null;
        this.initDOMElements();
        this.bindEvents();
    }

    initDOMElements() {
        this.modal = document.getElementById('help-modal');
        this.tabButtons = document.querySelectorAll('.help-tab-btn');
        this.tabContents = document.querySelectorAll('.help-tab-content');
        this.btnClose = document.getElementById('btn-close-help');
    }

    bindEvents() {
        if (this.tabButtons) {
            this.tabButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetTab = btn.dataset.tab;
                    this.switchTab(targetTab);
                });
            });
        }

        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => {
                this.close();
            });
        }

        // Close on escape key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        if (this.tabButtons) {
            this.tabButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabId);
            });
        }
        if (this.tabContents) {
            this.tabContents.forEach(content => {
                content.classList.toggle('active', content.id === `help-tab-${tabId}`);
            });
        }
    }

    open(initialTab = null) {
        if (initialTab) {
            this.switchTab(initialTab);
        }
        if (this.modal) {
            this.modal.classList.remove('hidden');
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
    }
}
