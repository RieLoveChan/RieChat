class SettingsManager {
    constructor() {
        this.settings = {};
        this.controls = {};
        this.initControls();
        this.initControls();
        this.bindEvents();
        this.initCollapsible();
        this.enhanceColorPickers();
    }

    async init() {
        // Attempt to load from settings.json (lowercase)
        try {
            const response = await fetch('settings.json');
            if (response.ok) {
                const jsonSettings = await response.json();
                console.log("Loaded settings from settings.json");
                this.settings = jsonSettings;
                this.applyLoadedSettings();
                this.applySettings();
            } else {
                console.warn("settings.json not found, using defaults.");
                this.applySettings();
            }
        } catch (e) {
            console.error("Error loading settings.json:", e);
            this.applySettings();
        }
    }

    initControls() {
        const controlIds = [
            'channel', 'ignoreCommands', 'maxMessages', 'chatDirection',
            'showRedemptions', 'showCheers', 'showStreaks',
            'itemInAnimation', 'itemStayAnimation', 'itemOutAnimation', 'animationSpeed', 'itemStretch', 'itemZoom', 'messageDecay', 'itemPaddingH', 'itemPaddingV',
            'itemBgColor', 'itemBgOpacity', 'itemBgUrl', 'itemBgFile', 'itemBgImageOpacity', 'borderRadius',
            'headerInAnimation', 'headerStayAnimation', 'headerOutAnimation',
            'headerFontFamily', 'headerTextAlign', 'usernameColor', 'headerTextOpacity',
            'headerBgColor', 'headerBgOpacity', 'headerBorderRadius', 'headerBgUrl', 'headerBgFile', 'headerBgImageOpacity',
            'messageInAnimation', 'messageStayAnimation', 'messageOutAnimation',
            'messageFontFamily', 'messageTextAlign', 'textColor', 'messageTextOpacity', 'emoteSize',
            'messageBgColor', 'messageBgOpacity', 'messageBorderRadius', 'messageBgUrl', 'messageBgFile', 'messageBgImageOpacity',
            'badgeSize', 'showTimestamps',
            'messageLetterSpacing',
            'msgShadowX', 'msgShadowY', 'msgShadowBlur', 'msgShadowColor',
            'msgStrokeWidth', 'msgStrokeColor',
            // Custom Animation Controls
            'customInX', 'customInY', 'customInRot', 'customInScale', 'customInOpacity',
            'customStayX', 'customStayY', 'customStayRot', 'customStayScale',
            'customOutX', 'customOutY', 'customOutRot', 'customOutScale', 'customOutOpacity',
            // Panel Customization
            'panelBgColor', 'panelSectionBg', 'panelTextColor', 'panelFontFamily', 'panelFontSize',
            // New Features
            'showConnectionMsg', 'connectionMsgDecay'
        ];

        controlIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                this.controls[id] = el;
            }
        });

        // Connect Buttons
        const btnConnect = document.getElementById('btnConnect');
        if (btnConnect) {
            btnConnect.addEventListener('click', () => {
                const channel = this.controls.channel.value.trim();
                if (channel && window.chatManager) {
                    window.chatManager.channelLogin = channel;
                    window.chatManager.connect();
                }
            });
        }

        const btnDisconnect = document.getElementById('btnDisconnect');
        if (btnDisconnect) {
            btnDisconnect.addEventListener('click', () => {
                if (window.ComfyJS) window.ComfyJS.Disconnect();
            });
        }

        // JSON Loader
        const fileInput = document.getElementById('jsonFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target.result;
                    const ta = document.getElementById('settingsJsonText');
                    if (ta) ta.value = text;
                };
                reader.readAsText(file);
            });
        }
    }

    enhanceColorPickers() {
        document.querySelectorAll('input[type="color"]').forEach(input => {
            // Wrap input if not already wrapped
            if (!input.parentElement.classList.contains('color-input-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'color-input-wrapper';
                input.parentNode.insertBefore(wrapper, input);
                wrapper.appendChild(input);

                const hexDisplay = document.createElement('span');
                hexDisplay.className = 'hex-display';
                hexDisplay.textContent = input.value;
                wrapper.appendChild(hexDisplay);

                // Update hex on input
                input.addEventListener('input', (e) => {
                    hexDisplay.textContent = e.target.value.toUpperCase();
                });
                // Update input on load if value exists
                if (input.value) hexDisplay.textContent = input.value.toUpperCase();
            }
        });
    }

    initCollapsible() {
        document.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const group = header.parentElement;
                if (group.classList.contains('collapsible')) {
                    group.classList.toggle('expanded');
                }
            });
        });

        const firstGroup = document.querySelector('.setting-group.collapsible');
        if (firstGroup && !firstGroup.classList.contains('expanded')) {
            firstGroup.classList.add('expanded');
        }
    }

    bindEvents() {
        // Mouse wheel support
        const numberInputs = document.querySelectorAll('input[type="number"]');
        numberInputs.forEach(input => {
            input.addEventListener('wheel', function (e) {
                e.preventDefault();
                const step = parseFloat(this.step) || 1;
                const current = parseFloat(this.value) || 0;
                const min = parseFloat(this.min) || 0;
                const max = parseFloat(this.max) || 1000;

                if (e.deltaY < 0) {
                    this.value = Math.min(current + step, max);
                } else {
                    this.value = Math.max(current - step, min);
                }
                this.dispatchEvent(new Event('input'));
            });
        });

        // Range input display
        const rangeInputs = document.querySelectorAll('input[type="range"]');
        rangeInputs.forEach(input => {
            const valueSpan = document.getElementById(input.id + 'Value');
            if (valueSpan) {
                input.addEventListener('input', (e) => {
                    valueSpan.textContent = e.target.value + '%';
                });
            }
        });

        // File inputs
        const fileInputs = document.querySelectorAll('input[type=file]');
        fileInputs.forEach(input => {
            if (input.id === 'jsonFileInput') return; // Skip JSON loader
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const settingKey = input.id.replace('File', 'Url');
                        this.updateSetting(settingKey, e.target.result);
                        const urlInput = document.getElementById(settingKey);
                        if (urlInput) {
                            urlInput.value = e.target.result;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        });

        // Color inputs
        const colorInputs = document.querySelectorAll('input[type=color]');
        colorInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const hex = e.target.value;
                this.updateSetting(e.target.id, hex);
            });
        });

        // General inputs
        Object.entries(this.controls).forEach(([key, control]) => {
            if (control && !control.dataset.bound) {
                control.addEventListener('change', (e) => {
                    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                    this.updateSetting(key, value);
                });
                control.addEventListener('input', (e) => {
                    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                    this.updateSetting(key, value);
                });
                control.dataset.bound = true;
            }
        });
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        this.applySettings();
        this.updateJsonTextArea();
    }

    getSafeInt(key, def) {
        const val = this.settings[key];
        if (val === undefined || val === null || val === '') return def;
        return parseInt(val);
    }

    getSafeFloat(key, def) {
        const val = this.settings[key];
        if (val === undefined || val === null || val === '') return def;
        return parseFloat(val);
    }

    applySettings() {
        const root = document.documentElement;

        // --- General Settings ---
        root.style.setProperty('--item-zoom', this.getSafeFloat('itemZoom', 1.0));
        root.style.setProperty('--badge-size', this.getSafeInt('badgeSize', 18) + 'px');
        root.style.setProperty('--emote-size', this.getSafeInt('emoteSize', 14) + 'px');
        root.style.setProperty('--chat-direction', this.settings.chatDirection || 'column-reverse');
        root.style.setProperty('--show-animation-duration', this.getSafeFloat('animationSpeed', 0.3) + 's');
        root.style.setProperty('--hide-animation-duration', this.getSafeFloat('animationSpeed', 0.3) + 's');

        if (window.chatManager) {
            window.chatManager.maxMessages = this.getSafeInt('maxMessages', 15);
        }

        // --- Custom Animation Settings ---
        root.style.setProperty('--custom-in-x', this.getSafeInt('customInX', 0) + 'px');
        root.style.setProperty('--custom-in-y', this.getSafeInt('customInY', 50) + 'px');
        root.style.setProperty('--custom-in-rot', this.getSafeInt('customInRot', 0) + 'deg');
        root.style.setProperty('--custom-in-scale', this.getSafeFloat('customInScale', 0.5));
        root.style.setProperty('--custom-in-opacity', this.getSafeFloat('customInOpacity', 0));

        root.style.setProperty('--custom-stay-x', this.getSafeInt('customStayX', 5) + 'px');
        root.style.setProperty('--custom-stay-y', this.getSafeInt('customStayY', 5) + 'px');
        root.style.setProperty('--custom-stay-rot', this.getSafeInt('customStayRot', 2) + 'deg');
        root.style.setProperty('--custom-stay-scale', this.getSafeFloat('customStayScale', 1.05));

        root.style.setProperty('--custom-out-x', this.getSafeInt('customOutX', 0) + 'px');
        root.style.setProperty('--custom-out-y', this.getSafeInt('customOutY', -50) + 'px');
        root.style.setProperty('--custom-out-rot', this.getSafeInt('customOutRot', 0) + 'deg');
        root.style.setProperty('--custom-out-scale', this.getSafeFloat('customOutScale', 1.5));
        root.style.setProperty('--custom-out-opacity', this.getSafeFloat('customOutOpacity', 0));

        // --- Panel Customization ---
        root.style.setProperty('--panel-bg-color', this.settings.panelBgColor || '#1a1a1a');
        root.style.setProperty('--panel-section-bg', this.settings.panelSectionBg || '#252525');
        root.style.setProperty('--panel-text-color', this.settings.panelTextColor || '#ffffff');
        root.style.setProperty('--panel-font-family', this.settings.panelFontFamily || 'monospace');
        root.style.setProperty('--panel-font-size', this.getSafeInt('panelFontSize', 14) + 'px');
        root.style.setProperty('--panel-input-bg', this.settings.panelBgColor ? this.adjustColor(this.settings.panelBgColor, 20) : '#2a2a2a');

        // --- Item (Container) Settings ---
        root.style.setProperty('--item-in-animation', this.settings.itemInAnimation || 'none');
        root.style.setProperty('--item-stay-animation', this.settings.itemStayAnimation || 'none');
        root.style.setProperty('--item-out-animation', this.settings.itemOutAnimation || 'none');
        root.style.setProperty('--item-padding-h', this.getSafeInt('itemPaddingH', 0) + 'px');
        root.style.setProperty('--item-padding-v', this.getSafeInt('itemPaddingV', 0) + 'px');
        root.style.setProperty('--item-bg-image-opacity', (this.getSafeInt('itemBgImageOpacity', 50) / 100));

        const itemColor = this.settings.itemBgColor || '#000000';
        const itemOpacityRaw = this.settings.itemBgOpacity !== undefined ? parseInt(this.settings.itemBgOpacity) : 25;
        const itemAlpha = Math.round(itemOpacityRaw * 2.55).toString(16).padStart(2, '0');
        root.style.setProperty('--item-bg-color', itemColor + itemAlpha);
        root.style.setProperty('--item-bg-image', this.settings.itemBgUrl ? `url(${this.settings.itemBgUrl})` : 'none');
        root.style.setProperty('--item-border-radius', this.getSafeInt('borderRadius', 8) + 'px');

        // Apply stretch
        const chatList = document.querySelector('#chat ul');
        if (chatList) {
            const applyStretch = (item) => {
                item.setAttribute('data-stretch', this.settings.itemStretch !== false ? 'true' : 'false');
            };
            document.querySelectorAll('#chat li').forEach(applyStretch);
        }

        // --- Header (Username) Settings ---
        const headerColor = this.settings.usernameColor || '#FFFFFF';
        const headerTextOpacityRaw = this.settings.headerTextOpacity !== undefined ? parseInt(this.settings.headerTextOpacity) : 0;
        const headerTextAlpha = Math.round(headerTextOpacityRaw * 2.55).toString(16).padStart(2, '0');
        root.style.setProperty('--username-color', headerColor + headerTextAlpha);

        root.style.setProperty('--header-font-family', this.settings.headerFontFamily || 'monospace');
        root.style.setProperty('--header-in-animation', this.settings.headerInAnimation || 'none');
        root.style.setProperty('--header-stay-animation', this.settings.headerStayAnimation || 'none');
        root.style.setProperty('--header-out-animation', this.settings.headerOutAnimation || 'none');
        root.style.setProperty('--header-bg-image-opacity', (this.getSafeInt('headerBgImageOpacity', 50) / 100));
        root.style.setProperty('--header-text-align', this.settings.headerTextAlign || 'flex-start');
        root.style.setProperty('--header-border-radius', this.getSafeInt('headerBorderRadius', 8) + 'px');

        const headerBoxColor = this.settings.headerBgColor || '#000000';
        const headerBoxOpacityRaw = this.settings.headerBgOpacity !== undefined ? parseInt(this.settings.headerBgOpacity) : 25;
        const headerBoxAlpha = Math.round(headerBoxOpacityRaw * 2.55).toString(16).padStart(2, '0');
        root.style.setProperty('--header-bg-color', headerBoxColor + headerBoxAlpha);
        root.style.setProperty('--header-bg-image', this.settings.headerBgUrl ? `url(${this.settings.headerBgUrl})` : 'none');

        // --- Message Settings ---
        const messageColor = this.settings.textColor || '#FFFFFF';
        const messageTextOpacityRaw = this.settings.messageTextOpacity !== undefined ? parseInt(this.settings.messageTextOpacity) : 0;
        const messageTextAlpha = Math.round(messageTextOpacityRaw * 2.55).toString(16).padStart(2, '0');
        root.style.setProperty('--text-color', messageColor + messageTextAlpha);

        root.style.setProperty('--message-font-family', this.settings.messageFontFamily || 'monospace');
        root.style.setProperty('--message-in-animation', this.settings.messageInAnimation || 'none');
        root.style.setProperty('--message-stay-animation', this.settings.messageStayAnimation || 'none');
        root.style.setProperty('--message-out-animation', this.settings.messageOutAnimation || 'none');
        root.style.setProperty('--message-bg-image-opacity', (this.getSafeInt('messageBgImageOpacity', 50) / 100));
        root.style.setProperty('--message-text-align', this.settings.messageTextAlign || 'left');
        root.style.setProperty('--message-border-radius', this.getSafeInt('messageBorderRadius', 8) + 'px');

        const messageBoxColor = this.settings.messageBgColor || '#000000';
        const messageBoxOpacityRaw = this.settings.messageBgOpacity !== undefined ? parseInt(this.settings.messageBgOpacity) : 25;
        const messageBoxAlpha = Math.round(messageBoxOpacityRaw * 2.55).toString(16).padStart(2, '0');
        root.style.setProperty('--message-bg-color', messageBoxColor + messageBoxAlpha);
        root.style.setProperty('--message-bg-image', this.settings.messageBgUrl ? `url(${this.settings.messageBgUrl})` : 'none');

        // --- Message Text Effects ---
        root.style.setProperty('--message-letter-spacing', this.getSafeInt('messageLetterSpacing', 0) + 'px');
        root.style.setProperty('--msg-shadow-x', this.getSafeInt('msgShadowX', 0) + 'px');
        root.style.setProperty('--msg-shadow-y', this.getSafeInt('msgShadowY', 0) + 'px');
        root.style.setProperty('--msg-shadow-blur', this.getSafeInt('msgShadowBlur', 0) + 'px');
        root.style.setProperty('--msg-shadow-color', this.settings.msgShadowColor || '#000000');
        root.style.setProperty('--msg-stroke-width', this.getSafeFloat('msgStrokeWidth', 0) + 'px');
        root.style.setProperty('--msg-stroke-color', this.settings.msgStrokeColor || '#000000');
    }

    adjustColor(color, amount) {
        return color; // Simple helper placeholder
    }

    applyLoadedSettings() {
        // Apply loaded values to controls
        Object.entries(this.controls).forEach(([key, control]) => {
            if (control && this.settings[key] !== undefined) {
                if (control.type === 'checkbox') {
                    control.checked = this.settings[key];
                } else if (control.tagName === 'INPUT' || control.tagName === 'SELECT') {
                    control.value = this.settings[key];
                    // Manually trigger color update for hex displays
                    if (control.type === 'color') {
                        const display = control.parentElement.querySelector('.hex-display');
                        if (display) display.textContent = control.value.toUpperCase();
                    }
                    // Update range display values
                    if (control.type === 'range') {
                        const valueSpan = document.getElementById(key + 'Value');
                        if (valueSpan) {
                            valueSpan.textContent = this.settings[key] + '%';
                        }
                    }
                }
            }
        });
        this.updateJsonTextArea();
    }

    // JSON Settings Management
    getCleanSettings() {
        // Create copy
        const clean = JSON.parse(JSON.stringify(this.settings));
        // Remove large data URIs
        Object.keys(clean).forEach(key => {
            if (key.endsWith('Url') && typeof clean[key] === 'string' && clean[key].startsWith('data:image')) {
                clean[key] = '';
            }
        });
        return clean;
    }

    updateJsonTextArea() {
        const ta = document.getElementById('settingsJsonText');
        if (ta) ta.value = JSON.stringify(this.getCleanSettings(), null, 2);
    }

    loadJsonFromFile() {
        const fileInput = document.getElementById('jsonFileInput');
        if (fileInput) fileInput.click();
    }

    applyJsonFromText() {
        try {
            const ta = document.getElementById('settingsJsonText');
            if (ta) {
                const json = JSON.parse(ta.value);
                this.settings = { ...this.settings, ...json };
                this.applyLoadedSettings();
                this.applySettings();
                alert('Settings Applied Successfully!');
            }
        } catch (e) {
            alert('Invalid JSON Error: ' + e.message);
        }
    }

    copyJsonFromText() {
        const ta = document.getElementById('settingsJsonText');
        if (ta) {
            ta.select();
            document.execCommand('copy');
        }
    }

    exportSettings() {
        const settings = this.getCleanSettings();
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "settings.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    restoreDefaults() {
        if (confirm('Are you sure you want to restore default settings? This will refresh the page and load settings.json.')) {
            location.reload();
        }
    }
}
window.SettingsManager = SettingsManager;
