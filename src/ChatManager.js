class ChatManager {
    constructor() {
        this.chatList = document.querySelector('#chat ul');
        this.maxMessages = 15;
        this.messages = [];
        this.settings = {};
        this.channelLogin = null;
        this.isConnected = false;
        this.messageTimers = new WeakMap();
    }

    init() {
        const params = new URLSearchParams(window.location.search);
        // Always default to RieLoveChan on load if not specified in URL
        this.channelLogin = params.get('channel') || 'RieLoveChan';
        if (this.channelLogin) {
            this.connect();
        } else {
            this.updateStatus('No channel specified. Enter a channel name and Connect.', false);
        }
    }

    quickConnect(channelName) {
        window.settingsManager.controls.channel.value = channelName;
        window.settingsManager.updateSetting('channel', channelName);
        this.channelLogin = channelName;
        this.connect();
    }

    connect() {
        // Clear messages when connecting to a new channel
        this.clearAllMessages();

        if (this.isConnected) {
            if (window.ComfyJS) window.ComfyJS.Disconnect();
        }
        this.updateStatus(`Connecting to ${this.channelLogin}...`, false);
        if (window.ComfyJS) window.ComfyJS.Init(this.channelLogin);
        window.settingsManager.updateSetting('channel', this.channelLogin);

        // Show connection confirmation in chat if enabled
        if (window.settingsManager.settings.showConnectionMsg) {
            setTimeout(() => { // slight delay to ensure UI ready
                this.addSystemMessage(`Connected to ${this.channelLogin}`);
            }, 500);
        }
    }

    clearAllMessages() {
        // Clear all existing messages
        this.messages.forEach(msg => {
            const timer = this.messageTimers.get(msg);
            if (timer) {
                clearTimeout(timer);
                this.messageTimers.delete(msg);
            }
        });
        this.messages = [];
        if (this.chatList) this.chatList.innerHTML = '';
    }

    updateStatus(message, connected) {
        const statusEl = document.getElementById('status');
        const statusTextEl = document.getElementById('statusText');
        if (statusEl) statusEl.className = connected ? 'status connected' : 'status disconnected';
        if (statusTextEl) statusTextEl.textContent = message;
    }

    addSystemMessage(text) {
        if (!this.chatList) return;
        const li = document.createElement('li');
        li.classList.add('system-message');
        li.setAttribute('data-stretch', window.settingsManager.settings.itemStretch !== false ? 'true' : 'false');

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const msgSpan = document.createElement('span');
        msgSpan.className = 'message';
        // Allow basic HTML in system messages (e.g. bolding)
        msgSpan.innerHTML = text;

        contentDiv.appendChild(msgSpan);
        li.appendChild(contentDiv);

        this.chatList.appendChild(li);
        this.messages.push(li);

        // Use specific decay setting for system messages
        const decay = parseInt(window.settingsManager.settings.connectionMsgDecay) || 10;
        if (decay > 0) {
            const timer = setTimeout(() => {
                this.removeMessage(li);
            }, decay * 1000);
            this.messageTimers.set(li, timer);
        }
    }

    addMessage(user, message, flags, self, extra) {
        // Safe-guard: Ensure message is always a string to prevent crashes on events without text
        message = message || "";

        // --- Check Ignore Commands ---
        // If ignoreCommands is TRUE, we skip messages starting with !
        const isCommand = message.trim().startsWith('!');
        if (isCommand && window.settingsManager.settings.ignoreCommands) {
            return;
        }

        const li = document.createElement('li');
        li.setAttribute('data-stretch', window.settingsManager.settings.itemStretch !== false ? 'true' : 'false');

        // Special styling for Redemptions/Events
        if (extra?.isRedemption) {
            li.classList.add('redemption-message');
            li.style.borderLeft = "4px solid #9146FF"; // Twitch Purple
            li.style.background = "linear-gradient(90deg, rgba(145, 70, 255, 0.2), transparent)";
        }

        // Create header element (badges + username)
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';

        if (window.settingsManager.settings.showTimestamps) {
            const timestamp = document.createElement('span');
            timestamp.className = 'timestamp';
            timestamp.textContent = `[${new Date().toLocaleTimeString()}]`;
            headerDiv.appendChild(timestamp);
        }

        const badgesContainer = document.createElement('span');
        badgesContainer.className = 'user-badges';
        if (extra && extra.userBadges) {
            for (const badgeName in extra.userBadges) {
                const version = extra.userBadges[badgeName];
                const badgeUrl = this.findBadgeUrl(badgeName, version);
                if (badgeUrl) {
                    const img = document.createElement('img');
                    img.alt = img.title = badgeName;
                    img.src = badgeUrl;
                    badgesContainer.appendChild(img);
                }
            }
        }
        headerDiv.appendChild(badgesContainer);

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'username';
        usernameSpan.textContent = user;
        if (extra && extra.userColor) {
            usernameSpan.style.color = extra.userColor;
        }
        headerDiv.appendChild(usernameSpan);

        // Create message content element
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-content';

        const messageSpan = document.createElement('span');
        messageSpan.className = 'message';

        let finalMessageHtml = this.parseEmotes(message, extra?.messageEmotes);

        // If Redemption, append Reward Name
        if (extra?.rewardName) {
            finalMessageHtml = `<div style="font-size:0.8em; color:#d8b4fe; margin-bottom:4px; font-weight:bold;">REDEEMED: ${extra.rewardName} <span style="font-size:0.8em; opacity:0.8;">(${extra.rewardCost})</span></div>` + finalMessageHtml;
        }

        // If Cheer, append bits info
        if (extra?.bits) {
            finalMessageHtml = `<div style="font-size:0.8em; color:#a970ff; margin-bottom:4px; font-weight:bold;">CHEERED ${extra.bits} BITS!</div>` + finalMessageHtml;
        }

        // If Resub Streak, append info
        if (extra?.streak) {
            finalMessageHtml = `<div style="font-size:0.8em; color:#ffb143; margin-bottom:4px; font-weight:bold;">★ ${extra.streak} MONTH STREAK!</div>` + finalMessageHtml;
        }

        // Check for Watch Streak (Shared in Chat)
        // Usually comes with tag `msg-id` (in extra usually as property or userState property)
        // ComfyJS flattens tags into extra mostly.
        // We look for any indication of a streak sharing event.
        // Often strictly: extra.userState['msg-id'] === 'watch-streak-share'
        let isWatchStreak = false;
        if (extra?.userState && extra.userState['msg-id'] === 'watch-streak-share') {
            isWatchStreak = true;
        }

        if (isWatchStreak && window.settingsManager.settings.showStreaks) {
            // We can try to extract number of months? typically not easy without parsing raw tags or message text which varies.
            // We will just highlight the message.
            finalMessageHtml = `<div style="font-size:0.8em; color:#00C6FF; margin-bottom:4px; font-weight:bold;">📺 WATCH STREAK SHARED!</div>` + finalMessageHtml;
            li.style.borderLeft = "4px solid #00C6FF";
            li.style.background = "linear-gradient(90deg, rgba(0, 198, 255, 0.1), transparent)";
        }

        messageSpan.innerHTML = finalMessageHtml;
        messageDiv.appendChild(messageSpan);

        li.appendChild(headerDiv);
        li.appendChild(messageDiv);

        this.chatList.appendChild(li);
        this.messages.push(li);

        // Set up decay timer if enabled
        const decay = parseInt(window.settingsManager.settings.messageDecay) || 60;
        if (decay > 0) {
            const timer = setTimeout(() => {
                this.removeMessage(li);
            }, decay * 1000);
            this.messageTimers.set(li, timer);
        }

        // Remove old messages if exceeding max
        while (this.messages.length > this.maxMessages) {
            const oldMsg = this.messages.shift();
            this.removeMessage(oldMsg);
        }
    }

    // --- New Methods for Events ---

    addRedemption(user, reward, cost, message, extra) {
        // Default to true (undefined != false) to match HTML checked state
        if (window.settingsManager.settings.showRedemptions === false) return;

        const combinedExtra = {
            ...extra,
            isRedemption: true,
            rewardName: reward,
            rewardCost: cost
        };
        this.addMessage(user, message, {}, false, combinedExtra);
    }

    addCheer(user, message, bits, flags, extra) {
        // Default to true (undefined != false) to match HTML checked state
        if (window.settingsManager.settings.showCheers === false) return;

        const combinedExtra = {
            ...extra,
            isCheer: true,
            bits: bits
        };
        this.addMessage(user, message, flags, false, combinedExtra);
    }

    // Called when a resub happens to specifically highlight streaks
    addResubStreak(user, message, streakMonths, cumulativeMonths, subTierInfo, extra) {
        if (!window.settingsManager.settings.showStreaks) {
            return;
        }

        const combinedExtra = {
            ...extra,
            streak: streakMonths,
            cumulative: cumulativeMonths
        };

        // If they included a message, show it as a chat message with the streak header
        if (message) {
            this.addMessage(user, message, {}, false, combinedExtra);
        } else {
            const text = `<strong>${user}</strong> is on a <strong>${streakMonths} month streak</strong>! (Total: ${cumulativeMonths})`;
            this.addSystemMessage(text);
        }
    }

    removeMessage(element) {
        // Clear any existing timer
        const timer = this.messageTimers.get(element);
        if (timer) {
            clearTimeout(timer);
            this.messageTimers.delete(element);
        }

        // Apply hide animation
        element.classList.add('hiding');

        // Remove after animation completes
        const duration = parseFloat(window.settingsManager.settings.animationSpeed || '0.3') * 1000;
        setTimeout(() => {
            if (element.parentNode) {
                element.remove();
            }
        }, duration);
    }

    parseEmotes(message, emotes) {
        if (!emotes) return this.escapeHtml(message);
        const replacements = [];
        for (const emoteId in emotes) {
            emotes[emoteId].forEach(pos => {
                const [start, end] = pos.split('-').map(Number);
                replacements.push({ start, end, emoteId });
            });
        }
        replacements.sort((a, b) => a.start - b.start);

        let result = '';
        let cursor = 0;
        replacements.forEach(rep => {
            if (cursor < rep.start) {
                result += this.escapeHtml(message.substring(cursor, rep.start));
            }
            const emoteCode = message.substring(rep.start, rep.end + 1);
            result += `<img src="https://static-cdn.jtvnw.net/emoticons/v2/${rep.emoteId}/default/dark/1.0" alt="${this.escapeHtml(emoteCode)}" />`;
            cursor = rep.end + 1;
        });
        if (cursor < message.length) {
            result += this.escapeHtml(message.substring(cursor));
        }
        return result;
    }

    escapeHtml(text) {
        return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    findBadgeUrl(badgeName, version) {
        if (window.channelBadgeSets?.[badgeName]) {
            const v = window.channelBadgeSets[badgeName].versions?.[version];
            if (v?.image_url_1x) return v.image_url_1x;
        }
        if (window.globalBadgeSets?.[badgeName]) {
            const v = window.globalBadgeSets[badgeName].versions?.[version];
            if (v?.image_url_1x) return v.image_url_1x;
        }
        return null;
    }
}
window.ChatManager = ChatManager;
