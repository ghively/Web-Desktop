// Environment Configuration for Legacy Frontend
class EnvironmentConfig {
    constructor() {
        this.currentConfig = null;
        this.initializeEventListeners();
    }

    async loadConfiguration() {
        try {
            const response = await fetch('/api/environment-config/config');
            this.currentConfig = await response.json();
            return this.currentConfig;
        } catch (error) {
            console.error('Failed to load environment configuration:', error);
            return null;
        }
    }

    async saveConfiguration(section, data) {
        try {
            const response = await fetch('/api/environment-config/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ section, data }),
            });

            if (!response.ok) {
                throw new Error('Failed to save configuration');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to save configuration:', error);
            throw error;
        }
    }

    async testConnection(service, serviceConfig) {
        try {
            const response = await fetch('/api/environment-config/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ service, config: serviceConfig }),
            });

            return await response.json();
        } catch (error) {
            console.error('Failed to test connection:', error);
            throw error;
        }
    }

    initializeEventListeners() {
        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', () => {
            this.loadConfiguration();
        });
    }

    createEnvironmentConfigWindow() {
        const windowId = 'environment-config-' + Date.now();

        const windowContent = `
            <div class="environment-config-window">
                <div class="window-header">
                    <h3>Environment Configuration</h3>
                    <div class="window-controls">
                        <button onclick="environmentConfig.closeWindow('${windowId}')" class="close-btn">×</button>
                    </div>
                </div>
                <div class="window-content">
                    <div class="tabs">
                        <button class="tab-btn active" data-tab="services">External Services</button>
                        <button class="tab-btn" data-tab="system">System Tools</button>
                        <button class="tab-btn" data-tab="features">Features</button>
                    </div>
                    <div class="tab-content" id="services-tab">
                        <div class="config-section">
                            <h4>AI Services</h4>
                            <div class="service-config">
                                <h5>Ollama</h5>
                                <label>
                                    <input type="checkbox" id="ollama-enabled"> Enabled
                                </label>
                                <input type="text" id="ollama-url" placeholder="http://localhost:11434" class="form-control">
                                <button onclick="environmentConfig.saveService('ollama')" class="btn btn-sm btn-primary">Save</button>
                                <button onclick="environmentConfig.testConnection('ollama')" class="btn btn-sm btn-secondary">Test</button>
                            </div>
                            <div class="service-config">
                                <h5>OpenRouter</h5>
                                <label>
                                    <input type="checkbox" id="openrouter-enabled"> Enabled
                                </label>
                                <input type="text" id="openrouter-url" placeholder="https://openrouter.ai/api/v1" class="form-control">
                                <input type="password" id="openrouter-key" placeholder="API Key" class="form-control">
                                <button onclick="environmentConfig.saveService('openrouter')" class="btn btn-sm btn-primary">Save</button>
                                <button onclick="environmentConfig.testConnection('openrouter')" class="btn btn-sm btn-secondary">Test</button>
                            </div>
                        </div>

                        <div class="config-section">
                            <h4>Home Automation</h4>
                            <div class="service-config">
                                <h5>Home Assistant</h5>
                                <label>
                                    <input type="checkbox" id="ha-enabled"> Enabled
                                </label>
                                <input type="text" id="ha-url" placeholder="http://localhost:8123" class="form-control">
                                <input type="password" id="ha-token" placeholder="Access Token" class="form-control">
                                <button onclick="environmentConfig.saveService('home_assistant')" class="btn btn-sm btn-primary">Save</button>
                                <button onclick="environmentConfig.testConnection('home_assistant')" class="btn btn-sm btn-secondary">Test</button>
                            </div>
                        </div>

                        <div class="config-section">
                            <h4>Media Servers</h4>
                            <div class="service-config">
                                <h5>Jellyfin</h5>
                                <label>
                                    <input type="checkbox" id="jellyfin-enabled"> Enabled
                                </label>
                                <input type="text" id="jellyfin-url" placeholder="http://localhost:8096" class="form-control">
                                <input type="password" id="jellyfin-key" placeholder="API Key" class="form-control">
                                <button onclick="environmentConfig.saveService('jellyfin')" class="btn btn-sm btn-primary">Save</button>
                                <button onclick="environmentConfig.testConnection('jellyfin')" class="btn btn-sm btn-secondary">Test</button>
                            </div>
                        </div>
                    </div>
                    <div class="tab-content" id="system-tab" style="display: none;">
                        <div class="config-section">
                            <h4>System Tools</h4>
                            <div class="form-group">
                                <label>FFmpeg Path:</label>
                                <input type="text" id="ffmpeg-path" class="form-control" placeholder="/usr/bin/ffmpeg">
                            </div>
                            <div class="form-group">
                                <label>HandBrake Path:</label>
                                <input type="text" id="handbrake-path" class="form-control" placeholder="/usr/bin/HandBrakeCLI">
                            </div>
                            <div class="form-group">
                                <label>Docker Path:</label>
                                <input type="text" id="docker-path" class="form-control" placeholder="/usr/bin/docker">
                            </div>
                            <button onclick="environmentConfig.saveSystemTools()" class="btn btn-primary">Save System Tools</button>
                        </div>
                    </div>
                    <div class="tab-content" id="features-tab" style="display: none;">
                        <div class="config-section">
                            <h4>Feature Flags</h4>
                            <div class="checkbox-group">
                                <label><input type="checkbox" id="vnc-enabled"> VNC Enabled</label>
                                <label><input type="checkbox" id="rdp-enabled"> RDP Enabled</label>
                                <label><input type="checkbox" id="ai-enabled"> AI Features Enabled</label>
                                <label><input type="checkbox" id="media-server-enabled"> Media Server Enabled</label>
                                <label><input type="checkbox" id="container-management-enabled"> Container Management Enabled</label>
                            </div>
                            <button onclick="environmentConfig.saveFeatures()" class="btn btn-primary">Save Features</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const style = `
            .environment-config-window {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .window-header {
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                padding: 15px;
                display: flex;
                justify-content: between;
                align-items: center;
                border-radius: 8px 8px 0 0;
            }
            .window-header h3 {
                margin: 0;
                color: #333;
            }
            .close-btn {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                padding: 5px;
                color: #666;
            }
            .close-btn:hover {
                color: #000;
            }
            .window-content {
                padding: 20px;
                max-height: 600px;
                overflow-y: auto;
            }
            .tabs {
                display: flex;
                margin-bottom: 20px;
                border-bottom: 1px solid #e9ecef;
            }
            .tab-btn {
                background: none;
                border: none;
                padding: 10px 20px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                margin-right: 5px;
            }
            .tab-btn.active {
                border-bottom-color: #007bff;
                color: #007bff;
            }
            .tab-content {
                display: block;
            }
            .config-section {
                margin-bottom: 30px;
            }
            .config-section h4 {
                color: #333;
                margin-bottom: 15px;
                font-size: 16px;
                font-weight: 600;
            }
            .service-config {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 15px;
            }
            .service-config h5 {
                margin: 0 0 10px 0;
                color: #555;
                font-size: 14px;
                font-weight: 600;
            }
            .form-control {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 10px;
                box-sizing: border-box;
            }
            .form-group {
                margin-bottom: 15px;
            }
            .form-group label {
                display: block;
                margin-bottom: 5px;
                color: #555;
                font-weight: 500;
            }
            .checkbox-group label {
                display: block;
                margin-bottom: 8px;
            }
            .checkbox-group input {
                margin-right: 8px;
            }
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                margin-right: 5px;
                text-decoration: none;
                display: inline-block;
            }
            .btn-primary {
                background: #007bff;
                color: white;
            }
            .btn-primary:hover {
                background: #0056b3;
            }
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            .btn-secondary:hover {
                background: #545b62;
            }
            .btn-sm {
                padding: 5px 10px;
                font-size: 11px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                color: #555;
                font-size: 13px;
            }
        `;

        // Create style element
        if (!document.getElementById('environment-config-style')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'environment-config-style';
            styleElement.textContent = style;
            document.head.appendChild(styleElement);
        }

        // Create window
        const windowDiv = document.createElement('div');
        windowDiv.id = windowId;
        windowDiv.className = 'window environment-config-window';
        windowDiv.innerHTML = windowContent;
        windowDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
            height: 600px;
            z-index: 1000;
        `;

        document.body.appendChild(windowDiv);

        // Initialize event listeners
        this.initializeWindowListeners(windowId);

        // Load configuration
        this.loadConfiguration();
    }

    initializeWindowListeners(windowId) {
        const windowElement = document.getElementById(windowId);

        // Tab switching
        windowElement.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;

                // Hide all tabs
                windowElement.querySelectorAll('.tab-content').forEach(tab => {
                    tab.style.display = 'none';
                });

                // Remove active class from all buttons
                windowElement.querySelectorAll('.tab-btn').forEach(tabBtn => {
                    tabBtn.classList.remove('active');
                });

                // Show selected tab
                document.getElementById(tabName + '-tab').style.display = 'block';
                e.target.classList.add('active');
            });
        });
    }

    closeWindow(windowId) {
        const windowElement = document.getElementById(windowId);
        if (windowElement) {
            windowElement.remove();
        }
    }

    async saveService(service) {
        const serviceConfig = {
            enabled: document.getElementById(service + '-enabled').checked,
            url: document.getElementById(service + '-url').value,
            api_key: document.getElementById(service + '-key')?.value || document.getElementById(service + '-token')?.value || ''
        };

        try {
            await this.saveConfiguration('external_services', {
                ...this.currentConfig.external_services,
                [service]: serviceConfig
            });

            this.showNotification('Configuration saved successfully', 'success');
        } catch (error) {
            this.showNotification('Failed to save configuration', 'error');
        }
    }

    async saveSystemTools() {
        const systemTools = {
            ffmpeg_path: document.getElementById('ffmpeg-path').value,
            handbrake_path: document.getElementById('handbrake-path').value,
            docker_path: document.getElementById('docker-path').value,
            vnc_path: '/usr/bin/x11vnc',
            sensors_path: '/usr/bin/sensors'
        };

        try {
            await this.saveConfiguration('system_tools', systemTools);
            this.showNotification('System tools configuration saved', 'success');
        } catch (error) {
            this.showNotification('Failed to save system tools', 'error');
        }
    }

    async saveFeatures() {
        const features = {
            vnc_enabled: document.getElementById('vnc-enabled').checked,
            rdp_enabled: document.getElementById('rdp-enabled').checked,
            ai_enabled: document.getElementById('ai-enabled').checked,
            media_server_enabled: document.getElementById('media-server-enabled').checked,
            container_management_enabled: document.getElementById('container-management-enabled').checked
        };

        try {
            await this.saveConfiguration('features', features);
            this.showNotification('Feature configuration saved', 'success');
        } catch (error) {
            this.showNotification('Failed to save features', 'error');
        }
    }

    async testConnection(service) {
        const serviceConfig = {
            enabled: document.getElementById(service + '-enabled').checked,
            url: document.getElementById(service + '-url').value,
            api_key: document.getElementById(service + '-key')?.value || document.getElementById(service + '-token')?.value || ''
        };

        try {
            const result = await this.testConnection(service, serviceConfig);
            if (result.success) {
                this.showNotification('Connection successful', 'success');
            } else {
                this.showNotification('Connection failed: ' + result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Connection test failed', 'error');
        }
    }

    showNotification(message, type) {
        // Simple notification implementation
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

// Create global instance
window.environmentConfig = new EnvironmentConfig();

// Add CSS animations
if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}