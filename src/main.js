// Initialize globals so they are accessible
// Order matters: Classes must be loaded before main.js runs

// Classes are already on 'window' via the previous scripts.
// But we still need to instantiate them.

window.settingsManager = new window.SettingsManager();
window.chatManager = new window.ChatManager();

// Global functions for clear background buttons (called by onclick in HTML)
window.clearBackground = function (type) {
    const urlId = type + 'BgUrl';
    const fileId = type + 'BgFile';
    const urlInput = document.getElementById(urlId);
    const fileInput = document.getElementById(fileId);

    if (urlInput) {
        urlInput.value = '';
        window.settingsManager.updateSetting(urlId, '');
    }
    if (fileInput) {
        fileInput.value = '';
    }
};

// Badge loading
window.globalBadgeSets = {};
window.channelBadgeSets = {};

fetch('https://badges.twitch.tv/v1/badges/global/display')
    .then(r => r.json())
    .then(data => { window.globalBadgeSets = data.badge_sets || {}; });

function fetchChannelId(login) {
    return fetch(`https://decapi.me/twitch/id/${encodeURIComponent(login)}`)
        .then(r => r.text())
        .then(id => id.trim());
}

function loadChannelBadges(channelId) {
    fetch(`https://badges.twitch.tv/v1/badges/channels/${channelId}/display`)
        .then(r => r.json())
        .then(data => { window.channelBadgeSets = data.badge_sets || {}; });
}

// Ensure ComfyJS is loaded
if (!window.ComfyJS) {
    console.warn("ComfyJS not loaded!");
} else {
    // ComfyJS events
    ComfyJS.onChat = (user, message, flags, self, extra) => {
        window.chatManager.addMessage(user, message, flags, self, extra);
    };

    ComfyJS.onCommand = (user, command, message, flags, extra) => {
        // If "Ignore Commands" is OFF (false), we should show them.
        if (!window.settingsManager.settings.ignoreCommands) {
            const fullMessage = `!${command} ${message}`;
            window.chatManager.addMessage(user, fullMessage, flags, false, extra);
        }
    };

    // Redemptions
    ComfyJS.onReward = (user, reward, cost, message, extra) => {
        window.chatManager.addRedemption(user, reward, cost, message, extra);
    };

    // Cheers
    ComfyJS.onCheer = (user, message, bits, flags, extra) => {
        window.chatManager.addCheer(user, message, bits, flags, extra);
    };

    // Raids
    ComfyJS.onRaid = (user, viewers) => {
        window.chatManager.addSystemMessage(`${user} raided with ${viewers} viewers!`);
    };

    // Subs
    ComfyJS.onSub = (user, message, subTierInfo, extra) => {
        window.chatManager.addSystemMessage(`${user} subscribed!`);
        if (message) window.chatManager.addMessage(user, message, {}, false, extra);
    };

    // Resubs with Streaks
    ComfyJS.onResub = (user, message, streamMonths, cumulativeMonths, subTierInfo, extra) => {
        // Call dedicated method to handle streak display
        window.chatManager.addResubStreak(user, message, streamMonths, cumulativeMonths, subTierInfo, extra);
    };

    ComfyJS.onSubGift = (gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra) => {
        window.chatManager.addSystemMessage(`${gifterUser} gifted a sub to ${recipientUser}!`);
    };

    ComfyJS.onConnected = (address, port, isFirstConnect) => {
        window.chatManager.isConnected = true;
        window.chatManager.updateStatus(`Connected to ${window.chatManager.channelLogin}`, true);
    };

    ComfyJS.onDisconnect = () => {
        window.chatManager.isConnected = false;
        window.chatManager.updateStatus('Disconnected', false);
    };
}

// Channel input event listener
const channelInput = document.getElementById('channel');
if (channelInput) {
    channelInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const channel = e.target.value.trim();
            if (channel) {
                window.chatManager.channelLogin = channel;
                window.chatManager.connect();
                fetchChannelId(channel).then(id => loadChannelBadges(id));
            }
        }
    });
}

// Init Flow
// URL params
const params = new URLSearchParams(window.location.search);
const urlChannel = params.get('channel');
if (urlChannel) {
    fetchChannelId(urlChannel).then(id => loadChannelBadges(id));
}

// Start Chat Manager
if (window.chatManager) {
    window.chatManager.init();
    // Load badges for the connected channel if not already handled above
    if (window.chatManager.channelLogin && window.chatManager.channelLogin !== urlChannel) {
        fetchChannelId(window.chatManager.channelLogin).then(id => loadChannelBadges(id));
    }
}

// OBS detection
if (/obsstudio/i.test(navigator.userAgent)) {
    document.documentElement.style.setProperty('--bg-color', 'transparent');
    document.documentElement.style.setProperty('--chat-bg-color', 'transparent');
    document.body.style.background = 'transparent';
}
