class VNCClient {
    constructor() {
        this.currentSession = null;
        this.rfb = null;
        this.connectionProfiles = this.loadConnectionProfiles();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.connectionStatus = 'disconnected';
        this.clipboardData = '';
        this.fullscreenMode = false;
        this.qualityLevel = 'medium';
        this.resizeTimeout = null;

        // VNC display settings
        this.displaySettings = {
            width: 1280,
            height: 720,
            quality: 6,
            compression: true
        };

        this.init();
    }

    init() {
        this.createVNCModal();
        this.bindEvents();
        this.setupKeyboardHandler();
    }

    createVNCModal() {
        const modalHTML = `
            <div id="vnc-modal" class="vnc-modal">
                <div class="vnc-modal-content">
                    <div class="vnc-header">
                        <h2>Remote Desktop Connection</h2>
                        <div class="vnc-controls">
                            <button id="vnc-settings-btn" class="vnc-btn" title="Settings">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
                                </svg>
                            </button>
                            <button id="vnc-fullscreen-btn" class="vnc-btn" title="Fullscreen">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                                </svg>
                            </button>
                            <button id="vnc-clipboard-btn" class="vnc-btn" title="Clipboard">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="2" width="6" height="4" rx="1" ry="1"></rect>
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                </svg>
                            </button>
                            <button id="vnc-disconnect-btn" class="vnc-btn vnc-btn-danger" title="Disconnect">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5m5 5H9"></path>
                                </svg>
                            </button>
                            <button id="vnc-close-btn" class="vnc-btn vnc-btn-close" title="Close">×</button>
                        </div>
                    </div>

                    <div class="vnc-connection-panel" id="vnc-connection-panel">
                        <div class="vnc-profiles-section">
                            <h3>Saved Connections</h3>
                            <div class="vnc-profiles-list" id="vnc-profiles-list"></div>
                            <button id="vnc-new-profile-btn" class="vnc-btn vnc-btn-primary">+ New Connection</button>
                        </div>

                        <div class="vnc-connection-form">
                            <div class="vnc-form-group">
                                <label for="vnc-host">Host/IP Address:</label>
                                <input type="text" id="vnc-host" placeholder="localhost or IP address" value="localhost">
                            </div>

                            <div class="vnc-form-group">
                                <label for="vnc-port">Port:</label>
                                <input type="number" id="vnc-port" placeholder="5900" value="5900" min="1" max="65535">
                            </div>

                            <div class="vnc-form-group">
                                <label for="vnc-password">Password (optional):</label>
                                <input type="password" id="vnc-password" placeholder="VNC password">
                            </div>

                            <div class="vnc-form-group">
                                <label for="vnc-resolution">Resolution:</label>
                                <select id="vnc-resolution">
                                    <option value="auto">Auto (fit window)</option>
                                    <option value="1024x768">1024×768</option>
                                    <option value="1280x720" selected>1280×720</option>
                                    <option value="1920x1080">1920×1080</option>
                                    <option value="1600x900">1600×900</option>
                                    <option value="2560x1440">2560×1440</option>
                                </select>
                            </div>

                            <div class="vnc-form-group">
                                <label for="vnc-quality">Quality:</label>
                                <select id="vnc-quality">
                                    <option value="low">Low (fastest)</option>
                                    <option value="medium" selected>Medium (balanced)</option>
                                    <option value="high">High (best quality)</option>
                                </select>
                            </div>

                            <div class="vnc-form-actions">
                                <button id="vnc-connect-btn" class="vnc-btn vnc-btn-primary">Connect</button>
                                <button id="vnc-save-profile-btn" class="vnc-btn vnc-btn-secondary">Save Profile</button>
                            </div>
                        </div>
                    </div>

                    <div class="vnc-viewer-section" id="vnc-viewer-section" style="display: none;">
                        <div class="vnc-status-bar">
                            <span id="vnc-status-indicator" class="vnc-status-indicator vnc-status-disconnected"></span>
                            <span id="vnc-status-text">Disconnected</span>
                            <div class="vnc-status-info">
                                <span id="vnc-connection-info"></span>
                                <span id="vnc-quality-indicator" class="vnc-quality-indicator">Quality: Medium</span>
                            </div>
                        </div>

                        <div class="vnc-viewer-container" id="vnc-viewer-container">
                            <div id="vnc-canvas-container" class="vnc-canvas-container"></div>
                            <div id="vnc-loading" class="vnc-loading">
                                <div class="vnc-spinner"></div>
                                <p>Connecting to remote desktop...</p>
                            </div>
                            <div id="vnc-error" class="vnc-error" style="display: none;">
                                <h3>Connection Failed</h3>
                                <p id="vnc-error-message"></p>
                                <button id="vnc-retry-btn" class="vnc-btn vnc-btn-primary">Retry</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="vnc-clipboard-modal" class="vnc-modal vnc-clipboard-modal">
                <div class="vnc-modal-content vnc-clipboard-content">
                    <div class="vnc-clipboard-header">
                        <h3>Clipboard</h3>
                        <button id="vnc-clipboard-close" class="vnc-btn">×</button>
                    </div>
                    <div class="vnc-clipboard-body">
                        <textarea id="vnc-clipboard-text" placeholder="Text to copy to remote clipboard..."></textarea>
                        <div class="vnc-clipboard-actions">
                            <button id="vnc-clipboard-copy" class="vnc-btn vnc-btn-primary">Copy to Remote</button>
                            <button id="vnc-clipboard-paste" class="vnc-btn vnc-btn-secondary">Paste from Remote</button>
                            <button id="vnc-clipboard-clear" class="vnc-btn vnc-btn-secondary">Clear</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add noVNC script if not already loaded
        if (!document.getElementById('novnc-script')) {
            const script = document.createElement('script');
            script.id = 'novnc-script';
            script.src = 'https://cdn.jsdelivr.net/npm/novnc@1.4.0/core/rfb.js';
            document.head.appendChild(script);
        }

        if (!document.getElementById('novnc-css')) {
            const link = document.createElement('link');
            link.id = 'novnc-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/novnc@1.4.0/core/base.css';
            document.head.appendChild(link);
        }
    }

    bindEvents() {
        // Modal controls
        document.getElementById('vnc-close-btn')?.addEventListener('click', () => this.close());
        document.getElementById('vnc-disconnect-btn')?.addEventListener('click', () => this.disconnect());
        document.getElementById('vnc-connect-btn')?.addEventListener('click', () => this.connect());
        document.getElementById('vnc-retry-btn')?.addEventListener('click', () => this.connect());
        document.getElementById('vnc-save-profile-btn')?.addEventListener('click', () => this.saveCurrentProfile());
        document.getElementById('vnc-new-profile-btn')?.addEventListener('click', () => this.showConnectionForm());

        // VNC controls
        document.getElementById('vnc-fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('vnc-settings-btn')?.addEventListener('click', () => this.toggleSettings());
        document.getElementById('vnc-clipboard-btn')?.addEventListener('click', () => this.showClipboard());

        // Clipboard modal
        document.getElementById('vnc-clipboard-close')?.addEventListener('click', () => this.hideClipboard());
        document.getElementById('vnc-clipboard-copy')?.addEventListener('click', () => this.copyToRemoteClipboard());
        document.getElementById('vnc-clipboard-paste')?.addEventListener('click', () => this.pasteFromRemoteClipboard());
        document.getElementById('vnc-clipboard-clear')?.addEventListener('click', () => this.clearClipboard());

        // Quality and resolution changes
        document.getElementById('vnc-quality')?.addEventListener('change', (e) => this.updateQuality(e.target.value));
        document.getElementById('vnc-resolution')?.addEventListener('change', (e) => this.updateResolution(e.target.value));

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Connection form validation
        ['vnc-host', 'vnc-port', 'vnc-password'].forEach(id => {
            document.getElementById(id)?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.connect();
                }
            });
        });

        this.renderConnectionProfiles();
    }

    setupKeyboardHandler() {
        document.addEventListener('keydown', (e) => {
            if (this.connectionStatus === 'connected' && this.rfb) {
                // Prevent default browser shortcuts when VNC is focused
                const viewerContainer = document.getElementById('vnc-viewer-container');
                if (viewerContainer && viewerContainer.contains(document.activeElement)) {
                    // Allow Ctrl+Alt+Del for remote systems
                    if (e.ctrlKey && e.altKey && e.key === 'Delete') {
                        e.preventDefault();
                        this.sendCtrlAltDel();
                    }
                    // Allow Ctrl+Shift+Esc for task manager
                    else if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
                        e.preventDefault();
                        this.sendCtrlShiftEsc();
                    }
                    // Allow F11 for fullscreen toggle
                    else if (e.key === 'F11') {
                        e.preventDefault();
                        this.toggleFullscreen();
                    }
                }
            }
        });
    }

    async connect() {
        const host = document.getElementById('vnc-host').value.trim();
        const port = parseInt(document.getElementById('vnc-port').value);
        const password = document.getElementById('vnc-password').value;
        const resolution = document.getElementById('vnc-resolution').value;

        // Validate inputs
        if (!host) {
            this.showError('Please enter a host/IP address');
            return;
        }

        if (!port || port < 1 || port > 65535) {
            this.showError('Please enter a valid port number (1-65535)');
            return;
        }

        try {
            // Check if we should use the backend VNC service
            if (host === 'localhost' && !password) {
                await this.connectToBackendVNC(resolution);
            } else {
                await this.connectToDirectVNC(host, port, password);
            }
        } catch (error) {
            console.error('VNC connection failed:', error);
            this.showError(`Connection failed: ${error.message}`);
        }
    }

    async connectToBackendVNC(resolution) {
        this.updateConnectionStatus('starting');
        this.showViewer();

        try {
            // Parse resolution
            let width = 1280, height = 720;
            if (resolution !== 'auto') {
                [width, height] = resolution.split('x').map(v => parseInt(v));
            }

            // Start VNC session via backend
            const response = await fetch('/api/vnc/session/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ width, height })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start VNC session');
            }

            const result = await response.json();
            const session = result.session;

            this.currentSession = {
                id: session.id,
                websocketUrl: session.websocketUrl,
                vncPassword: session.vncPassword,
                resolution: session.resolution,
                display: session.display,
                websockifyPort: session.websockifyPort
            };

            // Connect to the WebSocket VNC session
            await this.connectToWebSocket(session.websocketUrl, session.vncPassword);

            this.updateConnectionStatus('connected');
            this.updateConnectionInfo(`Session: ${session.id.substring(0, 20)}...`);

        } catch (error) {
            this.updateConnectionStatus('error');
            throw error;
        }
    }

    async connectToDirectVNC(host, port, password) {
        this.updateConnectionStatus('starting');
        this.showViewer();

        try {
            const websocketUrl = `ws://${host}:${port}`;

            this.currentSession = {
                id: `direct-${host}-${port}`,
                websocketUrl: websocketUrl,
                password: password,
                resolution: 'auto'
            };

            await this.connectToWebSocket(websocketUrl, password);

            this.updateConnectionStatus('connected');
            this.updateConnectionInfo(`${host}:${port}`);

        } catch (error) {
            this.updateConnectionStatus('error');
            throw error;
        }
    }

    async connectToWebSocket(websocketUrl, password) {
        return new Promise((resolve, reject) => {
            // Wait for noVNC to load
            const checkRFB = () => {
                if (typeof RFB === 'undefined') {
                    setTimeout(checkRFB, 100);
                    return;
                }

                try {
                    const canvasContainer = document.getElementById('vnc-canvas-container');
                    canvasContainer.innerHTML = '';

                    this.rfb = new RFB(canvasContainer, websocketUrl, {
                        credentials: { password: password },
                        wsProtocols: ['binary']
                    });

                    this.rfb.addEventListener('connect', () => {
                        console.log('VNC connected');
                        resolve();
                    });

                    this.rfb.addEventListener('disconnect', (e) => {
                        console.log('VNC disconnected:', e.detail);
                        this.handleDisconnect(e.detail);
                    });

                    this.rfb.addEventListener('credentialsrequired', () => {
                        console.error('VNC requires credentials');
                        reject(new Error('Authentication required'));
                    });

                    this.rfb.addEventListener('securityfailure', (e) => {
                        console.error('VNC security failure:', e.detail);
                        reject(new Error('Authentication failed'));
                    });

                    this.rfb.addEventListener('desktopname', (e) => {
                        console.log('VNC desktop name:', e.detail.name);
                        document.title = `Remote Desktop - ${e.detail.name}`;
                    });

                    this.rfb.addEventListener('clipboard', (e) => {
                        this.clipboardData = e.detail.text;
                        this.onRemoteClipboardUpdate(e.detail.text);
                    });

                    this.rfb.viewOnly = false;
                    this.updateQuality(this.qualityLevel);

                } catch (error) {
                    reject(error);
                }
            };

            checkRFB();
        });
    }

    disconnect() {
        if (this.rfb) {
            this.rfb.disconnect();
            this.rfb = null;
        }

        // Cleanup backend session if applicable
        if (this.currentSession && this.currentSession.id.startsWith('vnc-')) {
            fetch(`/api/vnc/session/${this.currentSession.id}`, {
                method: 'DELETE'
            }).catch(console.error);
        }

        this.currentSession = null;
        this.updateConnectionStatus('disconnected');
        this.showConnectionForm();
    }

    handleDisconnect(detail) {
        this.updateConnectionStatus('disconnected');

        if (detail && detail.clean === false && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.updateConnectionStatus('reconnecting');

            setTimeout(() => {
                console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            this.showError(detail?.reason || 'Connection lost');
        }
    }

    updateConnectionStatus(status) {
        this.connectionStatus = status;
        const indicator = document.getElementById('vnc-status-indicator');
        const text = document.getElementById('vnc-status-text');

        if (!indicator || !text) return;

        indicator.className = 'vnc-status-indicator';

        switch (status) {
            case 'disconnected':
                indicator.classList.add('vnc-status-disconnected');
                text.textContent = 'Disconnected';
                break;
            case 'starting':
                indicator.classList.add('vnc-status-connecting');
                text.textContent = 'Connecting...';
                break;
            case 'connected':
                indicator.classList.add('vnc-status-connected');
                text.textContent = 'Connected';
                this.reconnectAttempts = 0;
                break;
            case 'reconnecting':
                indicator.classList.add('vnc-status-connecting');
                text.textContent = `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`;
                break;
            case 'error':
                indicator.classList.add('vnc-status-error');
                text.textContent = 'Error';
                break;
        }
    }

    updateConnectionInfo(info) {
        const infoElement = document.getElementById('vnc-connection-info');
        if (infoElement) {
            infoElement.textContent = info;
        }
    }

    updateQuality(quality) {
        this.qualityLevel = quality;

        if (!this.rfb) return;

        const qualityMap = {
            'low': 1,
            'medium': 6,
            'high': 9
        };

        this.rfb.qualityLevel = qualityMap[quality] || 6;
        this.rfb.compressionLevel = quality === 'low' ? 9 : (quality === 'high' ? 0 : 6);

        const indicator = document.getElementById('vnc-quality-indicator');
        if (indicator) {
            indicator.textContent = `Quality: ${quality.charAt(0).toUpperCase() + quality.slice(1)}`;
        }
    }

    updateResolution(resolution) {
        if (resolution !== 'auto') {
            const [width, height] = resolution.split('x').map(v => parseInt(v));
            this.displaySettings.width = width;
            this.displaySettings.height = height;
        }

        if (this.rfb && resolution !== 'auto') {
            // Request resolution change if supported
            this.rfb.sendFPGARequest();
        }
    }

    handleResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            if (this.rfb) {
                const viewerContainer = document.getElementById('vnc-viewer-container');
                if (viewerContainer) {
                    const rect = viewerContainer.getBoundingClientRect();
                    this.rfb.resizeSession(rect.width, rect.height);
                }
            }
        }, 250);
    }

    toggleFullscreen() {
        this.fullscreenMode = !this.fullscreenMode;
        const viewerContainer = document.getElementById('vnc-viewer-container');

        if (this.fullscreenMode) {
            if (viewerContainer.requestFullscreen) {
                viewerContainer.requestFullscreen();
            } else if (viewerContainer.webkitRequestFullscreen) {
                viewerContainer.webkitRequestFullscreen();
            } else if (viewerContainer.msRequestFullscreen) {
                viewerContainer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }

        this.handleResize();
    }

    toggleSettings() {
        const connectionPanel = document.getElementById('vnc-connection-panel');
        const viewerSection = document.getElementById('vnc-viewer-section');

        if (connectionPanel.style.display === 'none') {
            connectionPanel.style.display = 'block';
            viewerSection.style.display = 'none';
        } else {
            connectionPanel.style.display = 'none';
            viewerSection.style.display = 'block';
        }
    }

    showClipboard() {
        document.getElementById('vnc-clipboard-modal').classList.remove('hidden');
        document.getElementById('vnc-clipboard-text').value = this.clipboardData;
    }

    hideClipboard() {
        document.getElementById('vnc-clipboard-modal').classList.add('hidden');
    }

    copyToRemoteClipboard() {
        const text = document.getElementById('vnc-clipboard-text').value;
        if (this.rfb && text) {
            this.rfb.clipboardPasteFrom(text);
            this.clipboardData = text;
        }
    }

    pasteFromRemoteClipboard() {
        document.getElementById('vnc-clipboard-text').value = this.clipboardData;
    }

    clearClipboard() {
        this.clipboardData = '';
        document.getElementById('vnc-clipboard-text').value = '';
        if (this.rfb) {
            this.rfb.clipboardPasteFrom('');
        }
    }

    onRemoteClipboardUpdate(text) {
        this.clipboardData = text;
        // Update clipboard modal if it's open
        const clipboardModal = document.getElementById('vnc-clipboard-modal');
        if (clipboardModal && !clipboardModal.classList.contains('hidden')) {
            document.getElementById('vnc-clipboard-text').value = text;
        }
    }

    sendCtrlAltDel() {
        if (this.rfb) {
            this.rfb.sendCtrlAltDel();
        }
    }

    sendCtrlShiftEsc() {
        if (this.rfb) {
            this.rfb.sendCtrlShiftEsc();
        }
    }

    showConnectionForm() {
        document.getElementById('vnc-connection-panel').style.display = 'block';
        document.getElementById('vnc-viewer-section').style.display = 'none';
        document.getElementById('vnc-loading').style.display = 'none';
        document.getElementById('vnc-error').style.display = 'none';
    }

    showViewer() {
        document.getElementById('vnc-connection-panel').style.display = 'none';
        document.getElementById('vnc-viewer-section').style.display = 'block';
        document.getElementById('vnc-loading').style.display = 'block';
        document.getElementById('vnc-error').style.display = 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('vnc-error');
        const errorMessage = document.getElementById('vnc-error-message');

        document.getElementById('vnc-loading').style.display = 'none';

        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.style.display = 'block';
        }

        this.updateConnectionStatus('error');
    }

    saveCurrentProfile() {
        const host = document.getElementById('vnc-host').value.trim();
        const port = parseInt(document.getElementById('vnc-port').value);
        const password = document.getElementById('vnc-password').value;
        const resolution = document.getElementById('vnc-resolution').value;
        const quality = document.getElementById('vnc-quality').value;

        if (!host) {
            alert('Please enter a host/IP address');
            return;
        }

        const profile = {
            id: Date.now().toString(),
            name: `${host}:${port}`,
            host: host,
            port: port,
            password: password,
            resolution: resolution,
            quality: quality
        };

        this.connectionProfiles.push(profile);
        this.saveConnectionProfiles();
        this.renderConnectionProfiles();
    }

    loadConnectionProfiles() {
        const saved = localStorage.getItem('vnc-connection-profiles');
        return saved ? JSON.parse(saved) : [];
    }

    saveConnectionProfiles() {
        localStorage.setItem('vnc-connection-profiles', JSON.stringify(this.connectionProfiles));
    }

    renderConnectionProfiles() {
        const profilesList = document.getElementById('vnc-profiles-list');
        if (!profilesList) return;

        if (this.connectionProfiles.length === 0) {
            profilesList.innerHTML = '<p class="vnc-no-profiles">No saved connections</p>';
            return;
        }

        profilesList.innerHTML = this.connectionProfiles.map(profile => `
            <div class="vnc-profile-item" data-profile-id="${profile.id}">
                <div class="vnc-profile-info">
                    <div class="vnc-profile-name">${profile.name}</div>
                    <div class="vnc-profile-details">${profile.host}:${profile.port} • ${profile.resolution}</div>
                </div>
                <div class="vnc-profile-actions">
                    <button class="vnc-btn vnc-btn-small vnc-btn-connect" data-profile-id="${profile.id}">Connect</button>
                    <button class="vnc-btn vnc-btn-small vnc-btn-delete" data-profile-id="${profile.id}">×</button>
                </div>
            </div>
        `).join('');

        // Bind profile events
        profilesList.addEventListener('click', (e) => {
            const profileId = e.target.dataset.profileId;
            if (!profileId) return;

            const profile = this.connectionProfiles.find(p => p.id === profileId);
            if (!profile) return;

            if (e.target.classList.contains('vnc-btn-connect')) {
                this.loadProfile(profile);
            } else if (e.target.classList.contains('vnc-btn-delete')) {
                this.deleteProfile(profileId);
            }
        });
    }

    loadProfile(profile) {
        document.getElementById('vnc-host').value = profile.host;
        document.getElementById('vnc-port').value = profile.port;
        document.getElementById('vnc-password').value = profile.password || '';
        document.getElementById('vnc-resolution').value = profile.resolution;
        document.getElementById('vnc-quality').value = profile.quality;
    }

    deleteProfile(profileId) {
        if (confirm('Delete this connection profile?')) {
            this.connectionProfiles = this.connectionProfiles.filter(p => p.id !== profileId);
            this.saveConnectionProfiles();
            this.renderConnectionProfiles();
        }
    }

    open() {
        document.getElementById('vnc-modal').classList.remove('hidden');
        this.showConnectionForm();
    }

    close() {
        this.disconnect();
        document.getElementById('vnc-modal').classList.add('hidden');
        document.getElementById('vnc-clipboard-modal').classList.add('hidden');
    }
}

// Export for global use
window.VNCClient = VNCClient;