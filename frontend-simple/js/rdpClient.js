class RDPClient {
    constructor() {
        this.currentSession = null;
        this.rdpConnection = null;
        this.connectionProfiles = this.loadConnectionProfiles();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.connectionStatus = 'disconnected';
        this.clipboardData = '';
        this.fullscreenMode = false;
        this.qualityLevel = 'medium';
        this.resizeTimeout = null;

        // RDP display settings
        this.displaySettings = {
            width: 1280,
            height: 720,
            bpp: 32,
            consoleSession: false
        };

        this.init();
    }

    init() {
        this.createRDPModal();
        this.bindEvents();
        this.setupKeyboardHandler();
    }

    createRDPModal() {
        const modalHTML = `
            <div id="rdp-modal" class="rdp-modal">
                <div class="rdp-modal-content">
                    <div class="rdp-header">
                        <h2>Remote Desktop Protocol (RDP)</h2>
                        <div class="rdp-controls">
                            <button id="rdp-settings-btn" class="rdp-btn" title="Settings">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
                                </svg>
                            </button>
                            <button id="rdp-fullscreen-btn" class="rdp-btn" title="Fullscreen">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                                </svg>
                            </button>
                            <button id="rdp-clipboard-btn" class="rdp-btn" title="Clipboard">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="2" width="6" height="4" rx="1" ry="1"></rect>
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                </svg>
                            </button>
                            <button id="rdp-disconnect-btn" class="rdp-btn rdp-btn-danger" title="Disconnect">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5m5 5H9"></path>
                                </svg>
                            </button>
                            <button id="rdp-close-btn" class="rdp-btn rdp-btn-close" title="Close">×</button>
                        </div>
                    </div>

                    <div class="rdp-connection-panel" id="rdp-connection-panel">
                        <div class="rdp-profiles-section">
                            <h3>Saved Connections</h3>
                            <div class="rdp-profiles-list" id="rdp-profiles-list"></div>
                            <button id="rdp-new-profile-btn" class="rdp-btn rdp-btn-primary">+ New Connection</button>
                        </div>

                        <div class="rdp-connection-form">
                            <div class="rdp-form-group">
                                <label for="rdp-host">Host/IP Address:</label>
                                <input type="text" id="rdp-host" placeholder="192.168.1.100 or windows-pc.local" value="">
                            </div>

                            <div class="rdp-form-group">
                                <label for="rdp-port">Port:</label>
                                <input type="number" id="rdp-port" placeholder="3389" value="3389" min="1" max="65535">
                            </div>

                            <div class="rdp-form-group">
                                <label for="rdp-profile">Connection Profile:</label>
                                <select id="rdp-profile">
                                    <option value="windows-desktop">Windows Desktop</option>
                                    <option value="windows-server">Windows Server</option>
                                    <option value="linux-xrdp">Linux XRDP</option>
                                </select>
                            </div>

                            <div class="rdp-form-group">
                                <label for="rdp-username">Username (optional):</label>
                                <input type="text" id="rdp-username" placeholder="Leave blank for credential prompt">
                            </div>

                            <div class="rdp-form-group">
                                <label for="rdp-password">Password (optional):</label>
                                <div class="rdp-password-input">
                                    <input type="password" id="rdp-password" placeholder="Leave blank for credential prompt">
                                    <button id="rdp-show-password" class="rdp-btn rdp-btn-small" type="button">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div class="rdp-form-group">
                                <label for="rdp-domain">Domain (optional):</label>
                                <input type="text" id="rdp-domain" placeholder="WORKGROUP or company.com">
                            </div>

                            <div class="rdp-form-row">
                                <div class="rdp-form-group">
                                    <label for="rdp-width">Width:</label>
                                    <input type="number" id="rdp-width" placeholder="1280" value="1280" min="640" max="3840">
                                </div>
                                <div class="rdp-form-group">
                                    <label for="rdp-height">Height:</label>
                                    <input type="number" id="rdp-height" placeholder="720" value="720" min="480" max="2160">
                                </div>
                                <div class="rdp-form-group">
                                    <label for="rdp-bpp">Color Depth:</label>
                                    <select id="rdp-bpp">
                                        <option value="16">16-bit</option>
                                        <option value="24">24-bit</option>
                                        <option value="32" selected>32-bit</option>
                                    </select>
                                </div>
                            </div>

                            <div class="rdp-form-group">
                                <label class="rdp-checkbox-label">
                                    <input type="checkbox" id="rdp-console">
                                    <span class="rdp-checkbox-text">Console Session (Admin)</span>
                                </label>
                            </div>

                            <div class="rdp-form-actions">
                                <button id="rdp-test-connection-btn" class="rdp-btn rdp-btn-secondary">Test Connection</button>
                                <button id="rdp-connect-btn" class="rdp-btn rdp-btn-primary">Connect</button>
                                <button id="rdp-save-profile-btn" class="rdp-btn rdp-btn-secondary">Save Profile</button>
                            </div>
                        </div>
                    </div>

                    <div class="rdp-viewer-section" id="rdp-viewer-section" style="display: none;">
                        <div class="rdp-status-bar">
                            <span id="rdp-status-indicator" class="rdp-status-indicator rdp-status-disconnected"></span>
                            <span id="rdp-status-text">Disconnected</span>
                            <div class="rdp-status-info">
                                <span id="rdp-connection-info"></span>
                                <span id="rdp-quality-indicator" class="rdp-quality-indicator">32-bit color</span>
                            </div>
                        </div>

                        <div class="rdp-viewer-container" id="rdp-viewer-container">
                            <div id="rdp-canvas-container" class="rdp-canvas-container">
                                <canvas id="rdp-canvas" class="rdp-canvas"></canvas>
                                <div id="rdp-info-overlay" class="rdp-info-overlay">
                                    <h3>RDP Web Client</h3>
                                    <p>WebSocket-based RDP connection</p>
                                    <div id="rdp-session-details"></div>
                                </div>
                            </div>
                            <div id="rdp-loading" class="rdp-loading">
                                <div class="rdp-spinner"></div>
                                <p>Establishing RDP connection...</p>
                            </div>
                            <div id="rdp-error" class="rdp-error" style="display: none;">
                                <h3>Connection Failed</h3>
                                <p id="rdp-error-message"></p>
                                <button id="rdp-retry-btn" class="rdp-btn rdp-btn-primary">Retry</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="rdp-clipboard-modal" class="rdp-modal rdp-clipboard-modal">
                <div class="rdp-modal-content rdp-clipboard-content">
                    <div class="rdp-clipboard-header">
                        <h3>Clipboard</h3>
                        <button id="rdp-clipboard-close" class="rdp-btn">×</button>
                    </div>
                    <div class="rdp-clipboard-body">
                        <textarea id="rdp-clipboard-text" placeholder="Text to copy to remote clipboard..."></textarea>
                        <div class="rdp-clipboard-actions">
                            <button id="rdp-clipboard-copy" class="rdp-btn rdp-btn-primary">Copy to Remote</button>
                            <button id="rdp-clipboard-paste" class="rdp-btn rdp-btn-secondary">Paste from Remote</button>
                            <button id="rdp-clipboard-clear" class="rdp-btn rdp-btn-secondary">Clear</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Load RDP web client library if needed
        this.loadRDPLibrary();
    }

    loadRDPLibrary() {
        // For now, we'll use a WebSocket-based approach
        // In production, you would load a proper RDP web client library
        console.log('RDP web client initialized with WebSocket support');
    }

    bindEvents() {
        // Modal controls
        document.getElementById('rdp-close-btn')?.addEventListener('click', () => this.close());
        document.getElementById('rdp-disconnect-btn')?.addEventListener('click', () => this.disconnect());
        document.getElementById('rdp-connect-btn')?.addEventListener('click', () => this.connect());
        document.getElementById('rdp-retry-btn')?.addEventListener('click', () => this.connect());
        document.getElementById('rdp-test-connection-btn')?.addEventListener('click', () => this.testConnection());
        document.getElementById('rdp-save-profile-btn')?.addEventListener('click', () => this.saveCurrentProfile());
        document.getElementById('rdp-new-profile-btn')?.addEventListener('click', () => this.showConnectionForm());

        // RDP controls
        document.getElementById('rdp-fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('rdp-settings-btn')?.addEventListener('click', () => this.toggleSettings());
        document.getElementById('rdp-clipboard-btn')?.addEventListener('click', () => this.showClipboard());

        // Password visibility toggle
        document.getElementById('rdp-show-password')?.addEventListener('click', () => this.togglePasswordVisibility());

        // Clipboard modal
        document.getElementById('rdp-clipboard-close')?.addEventListener('click', () => this.hideClipboard());
        document.getElementById('rdp-clipboard-copy')?.addEventListener('click', () => this.copyToRemoteClipboard());
        document.getElementById('rdp-clipboard-paste')?.addEventListener('click', () => this.pasteFromRemoteClipboard());
        document.getElementById('rdp-clipboard-clear')?.addEventListener('click', () => this.clearClipboard());

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Connection form validation
        ['rdp-host', 'rdp-port', 'rdp-username', 'rdp-password', 'rdp-domain'].forEach(id => {
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
            if (this.connectionStatus === 'connected' && this.rdpConnection) {
                // Prevent default browser shortcuts when RDP is focused
                const viewerContainer = document.getElementById('rdp-viewer-container');
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
                    // Send special keys to RDP session
                    else {
                        this.sendKeyEvent(e);
                    }
                }
            }
        });
    }

    async testConnection() {
        const host = document.getElementById('rdp-host').value.trim();
        const port = parseInt(document.getElementById('rdp-port').value);

        if (!host) {
            this.showError('Please enter a host/IP address');
            return;
        }

        const connectBtn = document.getElementById('rdp-test-connection-btn');
        connectBtn.disabled = true;
        connectBtn.textContent = 'Testing...';

        try {
            const response = await fetch('/api/rdp/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ host, port })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess(`Connection to ${host}:${port} successful!`);
            } else {
                this.showError(`Connection failed: ${result.message}`);
            }
        } catch (error) {
            this.showError(`Connection test failed: ${error.message}`);
        } finally {
            connectBtn.disabled = false;
            connectBtn.textContent = 'Test Connection';
        }
    }

    async connect() {
        const host = document.getElementById('rdp-host').value.trim();
        const port = parseInt(document.getElementById('rdp-port').value);
        const username = document.getElementById('rdp-username').value.trim();
        const password = document.getElementById('rdp-password').value;
        const domain = document.getElementById('rdp-domain').value.trim();
        const profile = document.getElementById('rdp-profile').value;
        const width = parseInt(document.getElementById('rdp-width').value);
        const height = parseInt(document.getElementById('rdp-height').value);
        const bpp = parseInt(document.getElementById('rdp-bpp').value);
        const consoleSession = document.getElementById('rdp-console').checked;

        // Validate inputs
        if (!host) {
            this.showError('Please enter a host/IP address');
            return;
        }

        if (!port || port < 1 || port > 65535) {
            this.showError('Please enter a valid port number (1-65535)');
            return;
        }

        if (!width || !height || width < 640 || height < 480) {
            this.showError('Please enter valid resolution (min: 640x480)');
            return;
        }

        this.updateConnectionStatus('connecting');
        this.showViewer();

        try {
            // Start RDP session via backend
            const response = await fetch('/api/rdp/session/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    host,
                    port,
                    username: username || undefined,
                    password: password || undefined,
                    domain: domain || undefined,
                    profile,
                    width,
                    height,
                    bpp,
                    consoleSession
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start RDP session');
            }

            const result = await response.json();
            const session = result.session;

            this.currentSession = {
                id: session.id,
                host: session.host,
                port: session.port,
                websocketUrl: session.websocketUrl,
                resolution: session.resolution,
                profile: session.profile,
                bpp: session.bpp,
                consoleSession: session.consoleSession
            };

            // Connect to the WebSocket RDP session
            await this.connectToWebSocket(session.websocketUrl);

            this.updateConnectionStatus('connected');
            this.updateConnectionInfo(`${session.host}:${session.port} • ${session.resolution}`);

            // Update session details in overlay
            const detailsDiv = document.getElementById('rdp-session-details');
            if (detailsDiv) {
                detailsDiv.innerHTML = `
                    <p><strong>Host:</strong> ${session.host}:${session.port}</p>
                    <p><strong>Resolution:</strong> ${session.resolution}</p>
                    <p><strong>Profile:</strong> ${session.profile}</p>
                    <p><strong>WebSocket:</strong> ${session.websocketUrl}</p>
                `;
            }

            // Hide info overlay after a delay
            setTimeout(() => {
                const overlay = document.getElementById('rdp-info-overlay');
                if (overlay) {
                    overlay.style.opacity = '0.3';
                }
            }, 5000);

        } catch (error) {
            console.error('RDP connection failed:', error);
            this.showError(`Connection failed: ${error.message}`);
            this.updateConnectionStatus('error');
        }
    }

    async connectToWebSocket(websocketUrl) {
        return new Promise((resolve, reject) => {
            try {
                this.rdpConnection = new WebSocket(websocketUrl);

                this.rdpConnection.binaryType = 'arraybuffer';

                this.rdpConnection.onopen = () => {
                    console.log('RDP WebSocket connected');
                    this.startRDPRendering();
                    resolve();
                };

                this.rdpConnection.onmessage = (event) => {
                    this.handleRDPMessage(event.data);
                };

                this.rdpConnection.onclose = (event) => {
                    console.log('RDP WebSocket disconnected:', event);
                    this.handleDisconnect(event);
                };

                this.rdpConnection.onerror = (error) => {
                    console.error('RDP WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    startRDPRendering() {
        // Initialize canvas for RDP rendering
        const canvas = document.getElementById('rdp-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Set canvas size based on session resolution
                const [width, height] = this.currentSession.resolution.split('x').map(v => parseInt(v));
                canvas.width = width;
                canvas.height = height;

                // Initialize with a placeholder
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = '#ffffff';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('RDP Session Connected', width / 2, height / 2 - 20);
                ctx.font = '14px Arial';
                ctx.fillText('Waiting for RDP data stream...', width / 2, height / 2 + 10);
            }
        }

        // Hide loading and show canvas
        document.getElementById('rdp-loading').style.display = 'none';
    }

    handleRDPMessage(data) {
        // Handle RDP data messages
        // In a real implementation, this would decode RDP protocol data
        // and render to the canvas
        console.log('Received RDP data:', data);
    }

    sendKeyEvent(event) {
        // Send keyboard events to RDP session
        if (this.rdpConnection && this.rdpConnection.readyState === WebSocket.OPEN) {
            // In a real implementation, this would send properly formatted RDP keyboard events
            const keyEvent = {
                type: 'keydown',
                key: event.key,
                keyCode: event.keyCode,
                ctrlKey: event.ctrlKey,
                altKey: event.altKey,
                shiftKey: event.shiftKey
            };

            this.rdpConnection.send(JSON.stringify(keyEvent));
        }
    }

    sendMouseEvent(type, x, y, button = 0) {
        // Send mouse events to RDP session
        if (this.rdpConnection && this.rdpConnection.readyState === WebSocket.OPEN) {
            const mouseEvent = {
                type: type,
                x: x,
                y: y,
                button: button
            };

            this.rdpConnection.send(JSON.stringify(mouseEvent));
        }
    }

    disconnect() {
        if (this.rdpConnection) {
            this.rdpConnection.close();
            this.rdpConnection = null;
        }

        // Cleanup backend session
        if (this.currentSession) {
            fetch(`/api/rdp/session/${this.currentSession.id}`, {
                method: 'DELETE'
            }).catch(console.error);
        }

        this.currentSession = null;
        this.updateConnectionStatus('disconnected');
        this.showConnectionForm();
    }

    handleDisconnect(event) {
        this.updateConnectionStatus('disconnected');

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.updateConnectionStatus('reconnecting');

            setTimeout(() => {
                console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            this.showError('Connection lost. Please try reconnecting manually.');
        }
    }

    updateConnectionStatus(status) {
        this.connectionStatus = status;
        const indicator = document.getElementById('rdp-status-indicator');
        const text = document.getElementById('rdp-status-text');

        if (!indicator || !text) return;

        indicator.className = 'rdp-status-indicator';

        switch (status) {
            case 'disconnected':
                indicator.classList.add('rdp-status-disconnected');
                text.textContent = 'Disconnected';
                break;
            case 'connecting':
                indicator.classList.add('rdp-status-connecting');
                text.textContent = 'Connecting...';
                break;
            case 'connected':
                indicator.classList.add('rdp-status-connected');
                text.textContent = 'Connected';
                this.reconnectAttempts = 0;
                break;
            case 'reconnecting':
                indicator.classList.add('rdp-status-connecting');
                text.textContent = `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`;
                break;
            case 'error':
                indicator.classList.add('rdp-status-error');
                text.textContent = 'Error';
                break;
        }
    }

    updateConnectionInfo(info) {
        const infoElement = document.getElementById('rdp-connection-info');
        if (infoElement) {
            infoElement.textContent = info;
        }
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('rdp-password');
        const showButton = document.getElementById('rdp-show-password');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            showButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            `;
        } else {
            passwordInput.type = 'password';
            showButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            `;
        }
    }

    toggleFullscreen() {
        this.fullscreenMode = !this.fullscreenMode;
        const viewerContainer = document.getElementById('rdp-viewer-container');

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
        const connectionPanel = document.getElementById('rdp-connection-panel');
        const viewerSection = document.getElementById('rdp-viewer-section');

        if (connectionPanel.style.display === 'none') {
            connectionPanel.style.display = 'block';
            viewerSection.style.display = 'none';
        } else {
            connectionPanel.style.display = 'none';
            viewerSection.style.display = 'block';
        }
    }

    showClipboard() {
        document.getElementById('rdp-clipboard-modal').classList.remove('hidden');
        document.getElementById('rdp-clipboard-text').value = this.clipboardData;
    }

    hideClipboard() {
        document.getElementById('rdp-clipboard-modal').classList.add('hidden');
    }

    copyToRemoteClipboard() {
        const text = document.getElementById('rdp-clipboard-text').value;
        if (this.rdpConnection && text) {
            // Send clipboard data to RDP session
            this.rdpConnection.send(JSON.stringify({
                type: 'clipboard',
                data: text
            }));
            this.clipboardData = text;
        }
    }

    pasteFromRemoteClipboard() {
        document.getElementById('rdp-clipboard-text').value = this.clipboardData;
    }

    clearClipboard() {
        this.clipboardData = '';
        document.getElementById('rdp-clipboard-text').value = '';
        if (this.rdpConnection) {
            this.rdpConnection.send(JSON.stringify({
                type: 'clipboard',
                data: ''
            }));
        }
    }

    sendCtrlAltDel() {
        if (this.rdpConnection) {
            this.rdpConnection.send(JSON.stringify({
                type: 'special_keys',
                keys: ['ctrl', 'alt', 'delete']
            }));
        }
    }

    sendCtrlShiftEsc() {
        if (this.rdpConnection) {
            this.rdpConnection.send(JSON.stringify({
                type: 'special_keys',
                keys: ['ctrl', 'shift', 'escape']
            }));
        }
    }

    handleResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            if (this.rdpConnection && this.rdpConnection.readyState === WebSocket.OPEN) {
                const viewerContainer = document.getElementById('rdp-viewer-container');
                if (viewerContainer) {
                    const rect = viewerContainer.getBoundingClientRect();
                    this.rdpConnection.send(JSON.stringify({
                        type: 'resize',
                        width: rect.width,
                        height: rect.height
                    }));
                }
            }
        }, 250);
    }

    showConnectionForm() {
        document.getElementById('rdp-connection-panel').style.display = 'block';
        document.getElementById('rdp-viewer-section').style.display = 'none';
        document.getElementById('rdp-loading').style.display = 'none';
        document.getElementById('rdp-error').style.display = 'none';
    }

    showViewer() {
        document.getElementById('rdp-connection-panel').style.display = 'none';
        document.getElementById('rdp-viewer-section').style.display = 'block';
        document.getElementById('rdp-loading').style.display = 'block';
        document.getElementById('rdp-error').style.display = 'none';

        // Reset info overlay
        const overlay = document.getElementById('rdp-info-overlay');
        if (overlay) {
            overlay.style.opacity = '1';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('rdp-error');
        const errorMessage = document.getElementById('rdp-error-message');

        document.getElementById('rdp-loading').style.display = 'none';

        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.style.display = 'block';
        }

        this.updateConnectionStatus('error');
    }

    showSuccess(message) {
        // Show success message temporarily
        const successDiv = document.createElement('div');
        successDiv.className = 'rdp-success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        document.body.appendChild(successDiv);

        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    saveCurrentProfile() {
        const host = document.getElementById('rdp-host').value.trim();
        const port = parseInt(document.getElementById('rdp-port').value);
        const username = document.getElementById('rdp-username').value.trim();
        const domain = document.getElementById('rdp-domain').value.trim();
        const profile = document.getElementById('rdp-profile').value;
        const width = parseInt(document.getElementById('rdp-width').value);
        const height = parseInt(document.getElementById('rdp-height').value);
        const bpp = parseInt(document.getElementById('rdp-bpp').value);
        const consoleSession = document.getElementById('rdp-console').checked;

        if (!host) {
            alert('Please enter a host/IP address');
            return;
        }

        const profileName = prompt('Enter a name for this connection profile:');
        if (!profileName) return;

        const connectionProfile = {
            id: Date.now().toString(),
            name: profileName,
            host: host,
            port: port,
            username: username,
            domain: domain,
            profile: profile,
            width: width,
            height: height,
            bpp: bpp,
            consoleSession: consoleSession
        };

        this.connectionProfiles.push(connectionProfile);
        this.saveConnectionProfiles();
        this.renderConnectionProfiles();
    }

    loadConnectionProfiles() {
        const saved = localStorage.getItem('rdp-connection-profiles');
        return saved ? JSON.parse(saved) : [];
    }

    saveConnectionProfiles() {
        localStorage.setItem('rdp-connection-profiles', JSON.stringify(this.connectionProfiles));
    }

    renderConnectionProfiles() {
        const profilesList = document.getElementById('rdp-profiles-list');
        if (!profilesList) return;

        if (this.connectionProfiles.length === 0) {
            profilesList.innerHTML = '<p class="rdp-no-profiles">No saved connections</p>';
            return;
        }

        profilesList.innerHTML = this.connectionProfiles.map(profile => `
            <div class="rdp-profile-item" data-profile-id="${profile.id}">
                <div class="rdp-profile-info">
                    <div class="rdp-profile-name">${profile.name}</div>
                    <div class="rdp-profile-details">${profile.host}:${profile.port} • ${profile.width}x${profile.height}</div>
                </div>
                <div class="rdp-profile-actions">
                    <button class="rdp-btn rdp-btn-small rdp-btn-connect" data-profile-id="${profile.id}">Connect</button>
                    <button class="rdp-btn rdp-btn-small rdp-btn-delete" data-profile-id="${profile.id}">×</button>
                </div>
            </div>
        `).join('');

        // Bind profile events
        profilesList.addEventListener('click', (e) => {
            const profileId = e.target.dataset.profileId;
            if (!profileId) return;

            const profile = this.connectionProfiles.find(p => p.id === profileId);
            if (!profile) return;

            if (e.target.classList.contains('rdp-btn-connect')) {
                this.loadProfile(profile);
            } else if (e.target.classList.contains('rdp-btn-delete')) {
                this.deleteProfile(profileId);
            }
        });
    }

    loadProfile(profile) {
        document.getElementById('rdp-host').value = profile.host;
        document.getElementById('rdp-port').value = profile.port;
        document.getElementById('rdp-username').value = profile.username || '';
        document.getElementById('rdp-domain').value = profile.domain || '';
        document.getElementById('rdp-profile').value = profile.profile;
        document.getElementById('rdp-width').value = profile.width;
        document.getElementById('rdp-height').value = profile.height;
        document.getElementById('rdp-bpp').value = profile.bpp;
        document.getElementById('rdp-console').checked = profile.consoleSession;
    }

    deleteProfile(profileId) {
        if (confirm('Delete this connection profile?')) {
            this.connectionProfiles = this.connectionProfiles.filter(p => p.id !== profileId);
            this.saveConnectionProfiles();
            this.renderConnectionProfiles();
        }
    }

    open() {
        document.getElementById('rdp-modal').classList.remove('hidden');
        this.showConnectionForm();
    }

    close() {
        this.disconnect();
        document.getElementById('rdp-modal').classList.add('hidden');
        document.getElementById('rdp-clipboard-modal').classList.add('hidden');
    }
}

// Export for global use
window.RDPClient = RDPClient;