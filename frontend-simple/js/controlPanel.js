class ControlPanel {
    constructor() {
        this.currentCategory = null;
        this.serviceStatusInterval = null;
        this.systemInfoInterval = null;
        this.unsavedChanges = new Set();
        this.isMonitoring = false;

        this.categories = {
            desktop: {
                name: 'Desktop',
                icon: '🖥️',
                description: 'Appearance, themes, and desktop settings'
            },
            system: {
                name: 'System',
                icon: '⚙️',
                description: 'General system settings and information'
            },
            users: {
                name: 'Users',
                icon: '👥',
                description: 'User accounts and permissions'
            },
            network: {
                name: 'Network',
                icon: '🌐',
                description: 'Network configuration and interfaces'
            },
            storage: {
                name: 'Storage',
                icon: '💾',
                description: 'Disk management and storage configuration'
            },
            security: {
                name: 'Security',
                icon: '🔒',
                description: 'Security settings and firewall'
            },
            development: {
                name: 'Development',
                icon: '💻',
                description: 'Development tools and SSH keys'
            },
            services: {
                name: 'Services',
                icon: '🔄',
                description: 'System service management'
            }
        };

        this.init();
    }

    init() {
        this.createPanel();
        this.attachEventListeners();
        this.loadSettings();
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'control-panel';
        panel.className = 'control-panel hidden';
        panel.innerHTML = `
            <div class="control-panel-container">
                <div class="control-panel-header">
                    <h1>Advanced Control Panel</h1>
                    <div class="control-panel-actions">
                        <button id="cp-backup" class="cp-button cp-button-secondary" title="Backup Settings">
                            <span class="icon">💾</span> Backup
                        </button>
                        <button id="cp-restore" class="cp-button cp-button-secondary" title="Restore Settings">
                            <span class="icon">📥</span> Restore
                        </button>
                        <button id="cp-diagnose" class="cp-button cp-button-primary" title="System Diagnostics">
                            <span class="icon">🔍</span> Diagnose
                        </button>
                        <button id="cp-close" class="cp-button cp-button-danger" title="Close">
                            <span class="icon">✕</span>
                        </button>
                    </div>
                </div>

                <div class="control-panel-content">
                    <div class="control-panel-sidebar">
                        <div class="cp-categories">
                            ${Object.entries(this.categories).map(([key, cat]) => `
                                <div class="cp-category ${key}" data-category="${key}">
                                    <div class="cp-category-header">
                                        <span class="cp-category-icon">${cat.icon}</span>
                                        <span class="cp-category-name">${cat.name}</span>
                                    </div>
                                    <div class="cp-category-desc">${cat.description}</div>
                                </div>
                            `).join('')}
                        </div>

                        <div class="cp-status">
                            <div class="cp-status-item">
                                <span class="cp-status-label">System Health</span>
                                <div class="cp-status-indicator" id="system-health">
                                    <div class="cp-status-dot"></div>
                                    <span class="cp-status-text">Checking...</span>
                                </div>
                            </div>
                            <div class="cp-status-item">
                                <span class="cp-status-label">Services Running</span>
                                <div class="cp-status-indicator" id="services-running">
                                    <div class="cp-status-dot"></div>
                                    <span class="cp-status-text">0/0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="control-panel-main">
                        <div class="cp-content" id="cp-content">
                            <div class="cp-welcome">
                                <div class="cp-welcome-icon">🎛️</div>
                                <h2>Welcome to the Advanced Control Panel</h2>
                                <p>Select a category from the sidebar to begin managing your system.</p>
                                <div class="cp-quick-actions">
                                    <button class="cp-button cp-button-primary" data-action="system-info">System Information</button>
                                    <button class="cp-button cp-button-secondary" data-action="service-status">Service Status</button>
                                    <button class="cp-button cp-button-secondary" data-action="security-audit">Security Audit</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="control-panel-footer">
                    <div class="cp-footer-info">
                        <span id="cp-status">Ready</span>
                        <span id="cp-unsaved" class="hidden">Unsaved changes</span>
                    </div>
                    <div class="cp-footer-actions">
                        <button id="cp-apply" class="cp-button cp-button-primary hidden">Apply Changes</button>
                        <button id="cp-reset" class="cp-button cp-button-secondary hidden">Reset</button>
                    </div>
                </div>
            </div>

            <!-- Hidden modals -->
            <div id="cp-backup-modal" class="cp-modal hidden">
                <div class="cp-modal-content">
                    <div class="cp-modal-header">
                        <h3>Backup Settings</h3>
                        <button class="cp-modal-close">×</button>
                    </div>
                    <div class="cp-modal-body">
                        <p>Create a backup of your current system configuration.</p>
                        <div class="cp-form-group">
                            <label>Backup Name</label>
                            <input type="text" id="backup-name" value="system-backup-${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="cp-form-group">
                            <label>Include</label>
                            <div class="cp-checkbox-group">
                                <label><input type="checkbox" checked> System settings</label>
                                <label><input type="checkbox" checked> User configuration</label>
                                <label><input type="checkbox" checked> Network settings</label>
                                <label><input type="checkbox"> Security settings</label>
                            </div>
                        </div>
                    </div>
                    <div class="cp-modal-footer">
                        <button class="cp-button cp-button-secondary" id="cancel-backup">Cancel</button>
                        <button class="cp-button cp-button-primary" id="create-backup">Create Backup</button>
                    </div>
                </div>
            </div>

            <div id="cp-restore-modal" class="cp-modal hidden">
                <div class="cp-modal-content">
                    <div class="cp-modal-header">
                        <h3>Restore Settings</h3>
                        <button class="cp-modal-close">×</button>
                    </div>
                    <div class="cp-modal-body">
                        <p>Restore system configuration from a backup file.</p>
                        <div class="cp-form-group">
                            <label>Select Backup</label>
                            <select id="backup-list">
                                <option value="">Loading backups...</option>
                            </select>
                        </div>
                        <div class="cp-warning">
                            ⚠️ This will overwrite current settings. Make sure to backup first.
                        </div>
                    </div>
                    <div class="cp-modal-footer">
                        <button class="cp-button cp-button-secondary" id="cancel-restore">Cancel</button>
                        <button class="cp-button cp-button-danger" id="do-restore">Restore</button>
                    </div>
                </div>
            </div>

            <div id="cp-diagnostic-modal" class="cp-modal hidden">
                <div class="cp-modal-content cp-modal-large">
                    <div class="cp-modal-header">
                        <h3>System Diagnostics</h3>
                        <button class="cp-modal-close">×</button>
                    </div>
                    <div class="cp-modal-body">
                        <div class="cp-diagnostic-progress">
                            <div class="cp-progress-bar">
                                <div class="cp-progress-fill" style="width: 0%"></div>
                            </div>
                            <span class="cp-progress-text">Running diagnostics...</span>
                        </div>
                        <div class="cp-diagnostic-results" id="diagnostic-results"></div>
                    </div>
                    <div class="cp-modal-footer">
                        <button class="cp-button cp-button-secondary" id="export-diagnostic">Export Report</button>
                        <button class="cp-button cp-button-primary" id="close-diagnostic">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
    }

    attachEventListeners() {
        // Category selection
        document.querySelectorAll('.cp-category').forEach(cat => {
            cat.addEventListener('click', () => this.selectCategory(cat.dataset.category));
        });

        // Header actions
        document.getElementById('cp-close').addEventListener('click', () => this.close());
        document.getElementById('cp-backup').addEventListener('click', () => this.showBackupModal());
        document.getElementById('cp-restore').addEventListener('click', () => this.showRestoreModal());
        document.getElementById('cp-diagnose').addEventListener('click', () => this.runDiagnostics());

        // Footer actions
        document.getElementById('cp-apply').addEventListener('click', () => this.applyChanges());
        document.getElementById('cp-reset').addEventListener('click', () => this.resetChanges());

        // Quick actions
        document.querySelectorAll('.cp-quick-actions button').forEach(btn => {
            btn.addEventListener('click', () => this.handleQuickAction(btn.dataset.action));
        });

        // Modal handling
        this.setupModalHandlers();
    }

    selectCategory(category) {
        // Update active state
        document.querySelectorAll('.cp-category').forEach(cat => {
            cat.classList.remove('active');
        });
        document.querySelector(`.cp-category[data-category="${category}"]`).classList.add('active');

        this.currentCategory = category;
        this.loadCategoryContent(category);
        this.startMonitoring(category);
    }

    loadCategoryContent(category) {
        const content = document.getElementById('cp-content');

        switch (category) {
            case 'desktop':
                content.innerHTML = this.getDesktopContent();
                break;
            case 'system':
                content.innerHTML = this.getSystemContent();
                break;
            case 'users':
                content.innerHTML = this.getUsersContent();
                break;
            case 'network':
                content.innerHTML = this.getNetworkContent();
                break;
            case 'storage':
                content.innerHTML = this.getStorageContent();
                break;
            case 'security':
                content.innerHTML = this.getSecurityContent();
                break;
            case 'development':
                content.innerHTML = this.getDevelopmentContent();
                break;
            case 'services':
                content.innerHTML = this.getServicesContent();
                break;
        }

        this.attachCategoryListeners(category);
        this.loadCategoryData(category);
    }

    getDesktopContent() {
        return `
            <div class="cp-section">
                <h2>Desktop Settings</h2>

                <div class="cp-subsection">
                    <h3>Appearance</h3>
                    <div class="cp-form-group">
                        <label>Theme</label>
                        <select class="cp-form-control" data-setting="theme">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="auto">Auto</option>
                        </select>
                    </div>
                    <div class="cp-form-group">
                        <label>Wallpaper</label>
                        <div class="cp-input-group">
                            <input type="text" class="cp-form-control" data-setting="wallpaper" placeholder="Enter wallpaper URL or select file">
                            <button class="cp-button cp-button-secondary" data-action="browse-wallpaper">Browse</button>
                        </div>
                    </div>
                    <div class="cp-form-group">
                        <label>Window Opacity</label>
                        <input type="range" class="cp-form-control" data-setting="opacity" min="0.5" max="1" step="0.05" value="0.95">
                        <span class="cp-range-value">95%</span>
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>Sounds</h3>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="enable-sounds"> Enable system sounds</label>
                    </div>
                    <div class="cp-form-group">
                        <label>Volume</label>
                        <input type="range" class="cp-form-control" data-setting="sound-volume" min="0" max="100" value="50">
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>Date & Time</h3>
                    <div class="cp-form-group">
                        <label>Timezone</label>
                        <select class="cp-form-control" data-setting="timezone">
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">Eastern Time</option>
                            <option value="America/Chicago">Central Time</option>
                            <option value="America/Denver">Mountain Time</option>
                            <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                    </div>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="use-ntp"> Automatically synchronize time</label>
                    </div>
                </div>
            </div>
        `;
    }

    getSystemContent() {
        return `
            <div class="cp-section">
                <h2>System Settings</h2>

                <div class="cp-subsection">
                    <h3>General</h3>
                    <div class="cp-form-group">
                        <label>Host Name</label>
                        <input type="text" class="cp-form-control" data-setting="hostname" placeholder="system-hostname">
                    </div>
                    <div class="cp-form-group">
                        <label>Domain</label>
                        <input type="text" class="cp-form-control" data-setting="domain" placeholder="example.com">
                    </div>
                    <div class="cp-form-group">
                        <label>System Language</label>
                        <select class="cp-form-control" data-setting="language">
                            <option value="en-US">English (US)</option>
                            <option value="en-GB">English (UK)</option>
                            <option value="es-ES">Spanish</option>
                            <option value="fr-FR">French</option>
                            <option value="de-DE">German</option>
                        </select>
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>System Updates</h3>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="auto-updates"> Enable automatic updates</label>
                    </div>
                    <div class="cp-form-group">
                        <label>Update Schedule</label>
                        <select class="cp-form-control" data-setting="update-schedule">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <button class="cp-button cp-button-primary" data-action="check-updates">Check for Updates</button>
                </div>

                <div class="cp-subsection">
                    <h3>System Information</h3>
                    <div class="cp-info-grid" id="system-info-grid">
                        <div class="cp-info-item">
                            <span class="cp-info-label">OS Version</span>
                            <span class="cp-info-value" id="os-version">Loading...</span>
                        </div>
                        <div class="cp-info-item">
                            <span class="cp-info-label">Kernel</span>
                            <span class="cp-info-value" id="kernel-version">Loading...</span>
                        </div>
                        <div class="cp-info-item">
                            <span class="cp-info-label">Uptime</span>
                            <span class="cp-info-value" id="system-uptime">Loading...</span>
                        </div>
                        <div class="cp-info-item">
                            <span class="cp-info-label">Load Average</span>
                            <span class="cp-info-value" id="load-average">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getUsersContent() {
        return `
            <div class="cp-section">
                <h2>User Management</h2>

                <div class="cp-subsection">
                    <h3>User Accounts</h3>
                    <div class="cp-table-container">
                        <table class="cp-table" id="users-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Full Name</th>
                                    <th>Groups</th>
                                    <th>Home Directory</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="users-tbody">
                                <tr><td colspan="5">Loading users...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <button class="cp-button cp-button-primary" data-action="add-user">Add User</button>
                </div>

                <div class="cp-subsection">
                    <h3>Group Management</h3>
                    <div class="cp-table-container">
                        <table class="cp-table" id="groups-table">
                            <thead>
                                <tr>
                                    <th>Group Name</th>
                                    <th>GID</th>
                                    <th>Members</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="groups-tbody">
                                <tr><td colspan="4">Loading groups...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <button class="cp-button cp-button-primary" data-action="add-group">Add Group</button>
                </div>

                <div class="cp-subsection">
                    <h3>Authentication Settings</h3>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="ssh-auth"> Enable SSH authentication</label>
                    </div>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="password-complexity"> Enforce password complexity</label>
                    </div>
                    <div class="cp-form-group">
                        <label>Session Timeout (minutes)</label>
                        <input type="number" class="cp-form-control" data-setting="session-timeout" value="30" min="5" max="1440">
                    </div>
                </div>
            </div>
        `;
    }

    getNetworkContent() {
        return `
            <div class="cp-section">
                <h2>Network Configuration</h2>

                <div class="cp-subsection">
                    <h3>Network Interfaces</h3>
                    <div class="cp-interface-grid" id="interface-grid">
                        <!-- Interfaces will be loaded here -->
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>WiFi Configuration</h3>
                    <div class="cp-wifi-scanner">
                        <button class="cp-button cp-button-primary" data-action="scan-wifi">Scan Networks</button>
                        <div class="cp-wifi-networks" id="wifi-networks"></div>
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>Proxy Settings</h3>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="use-proxy"> Use proxy server</label>
                    </div>
                    <div class="cp-form-group">
                        <label>Proxy URL</label>
                        <input type="text" class="cp-form-control" data-setting="proxy-url" placeholder="http://proxy.example.com:8080">
                    </div>
                    <div class="cp-form-group">
                        <label>Proxy Bypass List</label>
                        <textarea class="cp-form-control" data-setting="proxy-bypass" placeholder="localhost,127.0.0.1,*.local"></textarea>
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>DNS Settings</h3>
                    <div class="cp-form-group">
                        <label>Primary DNS</label>
                        <input type="text" class="cp-form-control" data-setting="dns-primary" value="8.8.8.8">
                    </div>
                    <div class="cp-form-group">
                        <label>Secondary DNS</label>
                        <input type="text" class="cp-form-control" data-setting="dns-secondary" value="8.8.4.4">
                    </div>
                </div>
            </div>
        `;
    }

    getStorageContent() {
        return `
            <div class="cp-section">
                <h2>Storage Management</h2>

                <div class="cp-subsection">
                    <h3>Disk Usage</h3>
                    <div class="cp-disk-grid" id="disk-grid">
                        <!-- Disk information will be loaded here -->
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>Mount Points</h3>
                    <div class="cp-table-container">
                        <table class="cp-table" id="mounts-table">
                            <thead>
                                <tr>
                                    <th>Device</th>
                                    <th>Mount Point</th>
                                    <th>File System</th>
                                    <th>Size</th>
                                    <th>Used</th>
                                    <th>Available</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="mounts-tbody">
                                <tr><td colspan="7">Loading mount information...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <button class="cp-button cp-button-primary" data-action="add-mount">Add Mount</button>
                </div>

                <div class="cp-subsection">
                    <h3>Smart Storage Configuration</h3>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="auto-cleanup"> Enable automatic cleanup</label>
                    </div>
                    <div class="cp-form-group">
                        <label>Cleanup Threshold (%)</label>
                        <input type="number" class="cp-form-control" data-setting="cleanup-threshold" value="85" min="70" max="95">
                    </div>
                    <div class="cp-form-group">
                        <label>Retain Files (days)</label>
                        <input type="number" class="cp-form-control" data-setting="retain-days" value="30" min="1" max="365">
                    </div>
                </div>
            </div>
        `;
    }

    getSecurityContent() {
        return `
            <div class="cp-section">
                <h2>Security Settings</h2>

                <div class="cp-subsection">
                    <h3>Firewall</h3>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="firewall-enabled"> Enable firewall</label>
                    </div>
                    <div class="cp-firewall-rules" id="firewall-rules">
                        <!-- Firewall rules will be loaded here -->
                    </div>
                    <button class="cp-button cp-button-primary" data-action="add-firewall-rule">Add Rule</button>
                </div>

                <div class="cp-subsection">
                    <h3>User Security</h3>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="sudo-password"> Require password for sudo</label>
                    </div>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="fail2ban-enabled"> Enable fail2ban</label>
                    </div>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="audit-log"> Enable security audit logging</label>
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>Certificates</h3>
                    <div class="cp-cert-grid" id="cert-grid">
                        <!-- Certificates will be loaded here -->
                    </div>
                    <button class="cp-button cp-button-primary" data-action="generate-cert">Generate Certificate</button>
                    <button class="cp-button cp-button-secondary" data-action="import-cert">Import Certificate</button>
                </div>

                <div class="cp-subsection">
                    <h3>Security Audit</h3>
                    <button class="cp-button cp-button-primary" data-action="security-audit">Run Security Audit</button>
                    <div class="cp-audit-results" id="audit-results"></div>
                </div>
            </div>
        `;
    }

    getDevelopmentContent() {
        return `
            <div class="cp-section">
                <h2>Development Tools</h2>

                <div class="cp-subsection">
                    <h3>SSH Keys</h3>
                    <div class="cp-ssh-keys" id="ssh-keys">
                        <!-- SSH keys will be loaded here -->
                    </div>
                    <button class="cp-button cp-button-primary" data-action="generate-ssh-key">Generate SSH Key</button>
                    <button class="cp-button cp-button-secondary" data-action="import-ssh-key">Import SSH Key</button>
                </div>

                <div class="cp-subsection">
                    <h3>Git Configuration</h3>
                    <div class="cp-form-group">
                        <label>Git User Name</label>
                        <input type="text" class="cp-form-control" data-setting="git-user-name" placeholder="Your Name">
                    </div>
                    <div class="cp-form-group">
                        <label>Git Email</label>
                        <input type="text" class="cp-form-control" data-setting="git-user-email" placeholder="your.email@example.com">
                    </div>
                    <div class="cp-form-group">
                        <label>Default Editor</label>
                        <select class="cp-form-control" data-setting="git-editor">
                            <option value="nano">Nano</option>
                            <option value="vim">Vim</option>
                            <option value="code">VS Code</option>
                        </select>
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>Development Environment</h3>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="nodejs-installed"> Node.js</label>
                    </div>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="python-installed"> Python</label>
                    </div>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="docker-installed"> Docker</label>
                    </div>
                    <div class="cp-form-group">
                        <label><input type="checkbox" data-setting="git-installed"> Git</label>
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>Package Repositories</h3>
                    <div class="cp-repo-list" id="repo-list">
                        <!-- Repositories will be loaded here -->
                    </div>
                    <button class="cp-button cp-button-primary" data-action="add-repo">Add Repository</button>
                </div>
            </div>
        `;
    }

    getServicesContent() {
        return `
            <div class="cp-section">
                <h2>Service Management</h2>

                <div class="cp-subsection">
                    <h3>System Services</h3>
                    <div class="cp-service-controls">
                        <button class="cp-button cp-button-secondary" data-action="refresh-services">Refresh</button>
                        <button class="cp-button cp-button-primary" data-action="start-all-services">Start All</button>
                        <button class="cp-button cp-button-danger" data-action="stop-all-services">Stop All</button>
                    </div>
                    <div class="cp-services-grid" id="services-grid">
                        <!-- Services will be loaded here -->
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>Service Logs</h3>
                    <div class="cp-log-viewer">
                        <div class="cp-log-controls">
                            <select id="service-logs-select" class="cp-form-control">
                                <option value="">Select service...</option>
                            </select>
                            <button class="cp-button cp-button-secondary" data-action="refresh-logs">Refresh</button>
                            <button class="cp-button cp-button-secondary" data-action="clear-logs">Clear</button>
                            <button class="cp-button cp-button-secondary" data-action="download-logs">Download</button>
                        </div>
                        <div class="cp-log-content" id="log-content">
                            <pre class="cp-log-text">Select a service to view logs...</pre>
                        </div>
                    </div>
                </div>

                <div class="cp-subsection">
                    <h3>Service Configuration</h3>
                    <div class="cp-config-editor">
                        <div class="cp-config-controls">
                            <select id="service-config-select" class="cp-form-control">
                                <option value="">Select service...</option>
                            </select>
                            <button class="cp-button cp-button-primary" data-action="load-config">Load</button>
                            <button class="cp-button cp-button-secondary" data-action="save-config">Save</button>
                        </div>
                        <textarea id="config-content" class="cp-config-textarea" placeholder="Select a service to edit configuration..."></textarea>
                    </div>
                </div>
            </div>
        `;
    }

    attachCategoryListeners(category) {
        // Form controls
        document.querySelectorAll('.cp-form-control').forEach(control => {
            control.addEventListener('change', () => this.markAsChanged(control.dataset.setting));
        });

        // Checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.markAsChanged(checkbox.dataset.setting));
        });

        // Action buttons
        document.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', () => this.handleAction(button.dataset.action));
        });

        // Range inputs
        document.querySelectorAll('input[type="range"]').forEach(range => {
            range.addEventListener('input', (e) => {
                const value = e.target.value;
                const valueDisplay = e.target.parentElement.querySelector('.cp-range-value');
                if (valueDisplay) {
                    if (e.target.dataset.setting === 'opacity') {
                        valueDisplay.textContent = `${Math.round(value * 100)}%`;
                    } else if (e.target.dataset.setting === 'sound-volume') {
                        valueDisplay.textContent = `${value}%`;
                    }
                }
                this.markAsChanged(e.target.dataset.setting);
            });
        });
    }

    async loadCategoryData(category) {
        try {
            this.updateStatus('Loading data...');

            switch (category) {
                case 'system':
                    await this.loadSystemInfo();
                    break;
                case 'users':
                    await this.loadUsersData();
                    break;
                case 'network':
                    await this.loadNetworkData();
                    break;
                case 'storage':
                    await this.loadStorageData();
                    break;
                case 'security':
                    await this.loadSecurityData();
                    break;
                case 'development':
                    await this.loadDevelopmentData();
                    break;
                case 'services':
                    await this.loadServicesData();
                    break;
            }

            this.updateStatus('Ready');
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`, 'error');
        }
    }

    async loadSystemInfo() {
        try {
            const response = await fetch('/api/system/info');
            const data = await response.json();

            document.getElementById('os-version').textContent = data.os.distro || 'Unknown';
            document.getElementById('kernel-version').textContent = data.os.kernel || 'Unknown';
            document.getElementById('system-uptime').textContent = this.formatUptime(data.system.uptime);
            document.getElementById('load-average').textContent = data.system.loadavg?.join(', ') || 'N/A';
        } catch (error) {
            console.error('Error loading system info:', error);
        }
    }

    async loadUsersData() {
        try {
            // Load users
            const usersResponse = await fetch('/api/users');
            const users = await usersResponse.json();

            const usersTbody = document.getElementById('users-tbody');
            usersTbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.fullName || '-'}</td>
                    <td>${user.groups?.join(', ') || '-'}</td>
                    <td>${user.homeDir}</td>
                    <td>
                        <button class="cp-button cp-button-sm cp-button-secondary" data-action="edit-user" data-user="${user.username}">Edit</button>
                        <button class="cp-button cp-button-sm cp-button-danger" data-action="delete-user" data-user="${user.username}">Delete</button>
                    </td>
                </tr>
            `).join('');

            // Load groups
            const groupsResponse = await fetch('/api/groups');
            const groups = await groupsResponse.json();

            const groupsTbody = document.getElementById('groups-tbody');
            groupsTbody.innerHTML = groups.map(group => `
                <tr>
                    <td>${group.name}</td>
                    <td>${group.gid}</td>
                    <td>${group.members?.join(', ') || '-'}</td>
                    <td>
                        <button class="cp-button cp-button-sm cp-button-secondary" data-action="edit-group" data-group="${group.name}">Edit</button>
                        <button class="cp-button cp-button-sm cp-button-danger" data-action="delete-group" data-group="${group.name}">Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading users data:', error);
        }
    }

    async loadNetworkData() {
        try {
            // Load interfaces
            const interfacesResponse = await fetch('/api/network/interfaces');
            const interfaces = await interfacesResponse.json();

            const interfaceGrid = document.getElementById('interface-grid');
            interfaceGrid.innerHTML = interfaces.map(iface => `
                <div class="cp-interface-card ${iface.status === 'up' ? 'active' : ''}">
                    <div class="cp-interface-header">
                        <h4>${iface.name}</h4>
                        <span class="cp-interface-status ${iface.status}">${iface.status.toUpperCase()}</span>
                    </div>
                    <div class="cp-interface-details">
                        <div class="cp-interface-detail">
                            <span class="label">IP:</span>
                            <span class="value">${iface.ip4 || '-'}</span>
                        </div>
                        <div class="cp-interface-detail">
                            <span class="label">MAC:</span>
                            <span class="value">${iface.mac || '-'}</span>
                        </div>
                        <div class="cp-interface-detail">
                            <span class="label">Speed:</span>
                            <span class="value">${iface.speed || '-'}</span>
                        </div>
                    </div>
                    <div class="cp-interface-actions">
                        <button class="cp-button cp-button-sm cp-button-primary" data-action="configure-interface" data-interface="${iface.name}">Configure</button>
                        <button class="cp-button cp-button-sm cp-button-secondary" data-action="${iface.status === 'up' ? 'down' : 'up'}-interface" data-interface="${iface.name}">${iface.status === 'up' ? 'Down' : 'Up'}</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading network data:', error);
        }
    }

    async loadStorageData() {
        try {
            // Load disk information
            const disksResponse = await fetch('/api/storage/disks');
            const disks = await disksResponse.json();

            const diskGrid = document.getElementById('disk-grid');
            diskGrid.innerHTML = disks.map(disk => `
                <div class="cp-disk-card">
                    <div class="cp-disk-header">
                        <h4>${disk.device}</h4>
                        <span class="cp-disk-type">${disk.type || 'Unknown'}</span>
                    </div>
                    <div class="cp-disk-usage">
                        <div class="cp-usage-bar">
                            <div class="cp-usage-fill" style="width: ${disk.usedPercent || 0}%"></div>
                        </div>
                        <div class="cp-usage-stats">
                            <span>Used: ${disk.used || '0 GB'}</span>
                            <span>Total: ${disk.size || '0 GB'}</span>
                        </div>
                    </div>
                </div>
            `).join('');

            // Load mount information
            const mountsResponse = await fetch('/api/storage/mounts');
            const mounts = await mountsResponse.json();

            const mountsTbody = document.getElementById('mounts-tbody');
            mountsTbody.innerHTML = mounts.map(mount => `
                <tr>
                    <td>${mount.device}</td>
                    <td>${mount.mountpoint}</td>
                    <td>${mount.fstype}</td>
                    <td>${mount.size}</td>
                    <td>${mount.used}</td>
                    <td>${mount.available}</td>
                    <td>
                        <button class="cp-button cp-button-sm cp-button-secondary" data-action="unmount" data-mount="${mount.mountpoint}">Unmount</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading storage data:', error);
        }
    }

    async loadSecurityData() {
        try {
            // Load firewall rules
            const firewallResponse = await fetch('/api/security/firewall/rules');
            const rules = await firewallResponse.json();

            const firewallRules = document.getElementById('firewall-rules');
            firewallRules.innerHTML = rules.map(rule => `
                <div class="cp-firewall-rule">
                    <span class="cp-rule-action ${rule.action}">${rule.action.toUpperCase()}</span>
                    <span class="cp-rule-protocol">${rule.protocol}</span>
                    <span class="cp-rule-port">${rule.port || 'any'}</span>
                    <span class="cp-rule-source">${rule.source || 'any'}</span>
                    <button class="cp-button cp-button-sm cp-button-danger" data-action="delete-firewall-rule" data-rule="${rule.id}">Delete</button>
                </div>
            `).join('');

            // Load certificates
            const certsResponse = await fetch('/api/security/certificates');
            const certs = await certsResponse.json();

            const certGrid = document.getElementById('cert-grid');
            certGrid.innerHTML = certs.map(cert => `
                <div class="cp-cert-card ${cert.expired ? 'expired' : ''}">
                    <div class="cp-cert-header">
                        <h4>${cert.domain}</h4>
                        <span class="cp-cert-status ${cert.expired ? 'expired' : 'valid'}">${cert.expired ? 'EXPIRED' : 'VALID'}</span>
                    </div>
                    <div class="cp-cert-details">
                        <div class="cp-cert-detail">
                            <span class="label">Expires:</span>
                            <span class="value">${cert.expires}</span>
                        </div>
                        <div class="cp-cert-detail">
                            <span class="label">Issuer:</span>
                            <span class="value">${cert.issuer}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading security data:', error);
        }
    }

    async loadDevelopmentData() {
        try {
            // Load SSH keys
            const sshKeysResponse = await fetch('/api/development/ssh-keys');
            const sshKeys = await sshKeysResponse.json();

            const sshKeys = document.getElementById('ssh-keys');
            sshKeys.innerHTML = sshKeys.map(key => `
                <div class="cp-ssh-key">
                    <div class="cp-ssh-key-header">
                        <h4>${key.name || 'Unnamed Key'}</h4>
                        <span class="cp-ssh-key-type">${key.type}</span>
                    </div>
                    <div class="cp-ssh-key-details">
                        <div class="cp-ssh-key-fingerprint">
                            <span class="label">Fingerprint:</span>
                            <span class="value">${key.fingerprint}</span>
                        </div>
                        <div class="cp-ssh-key-comment">
                            <span class="label">Comment:</span>
                            <span class="value">${key.comment || '-'}</span>
                        </div>
                    </div>
                    <div class="cp-ssh-key-actions">
                        <button class="cp-button cp-button-sm cp-button-secondary" data-action="download-ssh-key" data-key="${key.id}">Download</button>
                        <button class="cp-button cp-button-sm cp-button-danger" data-action="delete-ssh-key" data-key="${key.id}">Delete</button>
                    </div>
                </div>
            `).join('');

            // Load repositories
            const reposResponse = await fetch('/api/development/repositories');
            const repos = await reposResponse.json();

            const repoList = document.getElementById('repo-list');
            repoList.innerHTML = repos.map(repo => `
                <div class="cp-repo-item">
                    <span class="cp-repo-name">${repo.name}</span>
                    <span class="cp-repo-url">${repo.url}</span>
                    <button class="cp-button cp-button-sm cp-button-danger" data-action="remove-repo" data-repo="${repo.id}">Remove</button>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading development data:', error);
        }
    }

    async loadServicesData() {
        try {
            const response = await fetch('/api/services');
            const services = await response.json();

            const servicesGrid = document.getElementById('services-grid');
            servicesGrid.innerHTML = services.map(service => `
                <div class="cp-service-card ${service.status}">
                    <div class="cp-service-header">
                        <h4>${service.name}</h4>
                        <span class="cp-service-status ${service.status}">${service.status.toUpperCase()}</span>
                    </div>
                    <div class="cp-service-details">
                        <div class="cp-service-detail">
                            <span class="label">Description:</span>
                            <span class="value">${service.description || '-'}</span>
                        </div>
                        <div class="cp-service-detail">
                            <span class="label">CPU:</span>
                            <span class="value">${service.cpu || '0%'}</span>
                        </div>
                        <div class="cp-service-detail">
                            <span class="label">Memory:</span>
                            <span class="value">${service.memory || '0 MB'}</span>
                        </div>
                    </div>
                    <div class="cp-service-actions">
                        ${service.status === 'running' ?
                            `<button class="cp-button cp-button-sm cp-button-warning" data-action="restart-service" data-service="${service.name}">Restart</button>
                             <button class="cp-button cp-button-sm cp-button-danger" data-action="stop-service" data-service="${service.name}">Stop</button>` :
                            `<button class="cp-button cp-button-sm cp-button-primary" data-action="start-service" data-service="${service.name}">Start</button>`
                        }
                    </div>
                </div>
            `).join('');

            // Populate service dropdowns
            const serviceSelect = document.getElementById('service-logs-select');
            const configSelect = document.getElementById('service-config-select');

            const options = services.map(service =>
                `<option value="${service.name}">${service.name}</option>`
            ).join('');

            serviceSelect.innerHTML = '<option value="">Select service...</option>' + options;
            configSelect.innerHTML = '<option value="">Select service...</option>' + options;
        } catch (error) {
            console.error('Error loading services data:', error);
        }
    }

    async handleAction(action) {
        try {
            this.updateStatus('Executing action...');

            switch (action) {
                case 'check-updates':
                    await this.checkSystemUpdates();
                    break;
                case 'add-user':
                    await this.showAddUserDialog();
                    break;
                case 'add-group':
                    await this.showAddGroupDialog();
                    break;
                case 'scan-wifi':
                    await this.scanWifiNetworks();
                    break;
                case 'add-mount':
                    await this.showAddMountDialog();
                    break;
                case 'add-firewall-rule':
                    await this.showAddFirewallRuleDialog();
                    break;
                case 'generate-cert':
                    await this.showGenerateCertDialog();
                    break;
                case 'import-cert':
                    await this.showImportCertDialog();
                    break;
                case 'security-audit':
                    await this.runSecurityAudit();
                    break;
                case 'generate-ssh-key':
                    await this.showGenerateSSHKeyDialog();
                    break;
                case 'import-ssh-key':
                    await this.showImportSSHKeyDialog();
                    break;
                case 'add-repo':
                    await this.showAddRepoDialog();
                    break;
                case 'start-all-services':
                    await this.startAllServices();
                    break;
                case 'stop-all-services':
                    await this.stopAllServices();
                    break;
                case 'refresh-services':
                    await this.loadServicesData();
                    break;
                case 'refresh-logs':
                    await this.refreshServiceLogs();
                    break;
                case 'clear-logs':
                    await this.clearServiceLogs();
                    break;
                case 'download-logs':
                    await this.downloadServiceLogs();
                    break;
                case 'load-config':
                    await this.loadServiceConfig();
                    break;
                case 'save-config':
                    await this.saveServiceConfig();
                    break;
                default:
                    if (action.startsWith('start-service-')) {
                        const serviceName = action.replace('start-service-', '');
                        await this.startService(serviceName);
                    } else if (action.startsWith('stop-service-')) {
                        const serviceName = action.replace('stop-service-', '');
                        await this.stopService(serviceName);
                    } else if (action.startsWith('restart-service-')) {
                        const serviceName = action.replace('restart-service-', '');
                        await this.restartService(serviceName);
                    } else if (action === 'system-info') {
                        this.selectCategory('system');
                    } else if (action === 'service-status') {
                        this.selectCategory('services');
                    }
            }

            this.updateStatus('Ready');
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`, 'error');
        }
    }

    async checkSystemUpdates() {
        const response = await fetch('/api/system/updates/check', { method: 'POST' });
        const updates = await response.json();

        if (updates.available) {
            this.showNotification(`${updates.count} updates available`, 'info');
        } else {
            this.showNotification('System is up to date', 'success');
        }
    }

    async startAllServices() {
        const response = await fetch('/api/services/start-all', { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            this.showNotification('All services started successfully', 'success');
            await this.loadServicesData();
        } else {
            throw new Error(result.message || 'Failed to start services');
        }
    }

    async stopAllServices() {
        if (!confirm('Are you sure you want to stop all services? This may affect system functionality.')) {
            return;
        }

        const response = await fetch('/api/services/stop-all', { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            this.showNotification('All services stopped successfully', 'success');
            await this.loadServicesData();
        } else {
            throw new Error(result.message || 'Failed to stop services');
        }
    }

    async startService(serviceName) {
        const response = await fetch(`/api/services/${serviceName}/start`, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            this.showNotification(`Service ${serviceName} started successfully`, 'success');
            await this.loadServicesData();
        } else {
            throw new Error(result.message || `Failed to start ${serviceName}`);
        }
    }

    async stopService(serviceName) {
        const response = await fetch(`/api/services/${serviceName}/stop`, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            this.showNotification(`Service ${serviceName} stopped successfully`, 'success');
            await this.loadServicesData();
        } else {
            throw new Error(result.message || `Failed to stop ${serviceName}`);
        }
    }

    async restartService(serviceName) {
        const response = await fetch(`/api/services/${serviceName}/restart`, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            this.showNotification(`Service ${serviceName} restarted successfully`, 'success');
            await this.loadServicesData();
        } else {
            throw new Error(result.message || `Failed to restart ${serviceName}`);
        }
    }

    async refreshServiceLogs() {
        const serviceSelect = document.getElementById('service-logs-select');
        const serviceName = serviceSelect.value;

        if (!serviceName) {
            this.showNotification('Please select a service first', 'warning');
            return;
        }

        const response = await fetch(`/api/services/${serviceName}/logs`);
        const logs = await response.json();

        const logContent = document.getElementById('log-content');
        logContent.querySelector('.cp-log-text').textContent = logs.logs || 'No logs available';
    }

    async clearServiceLogs() {
        const serviceSelect = document.getElementById('service-logs-select');
        const serviceName = serviceSelect.value;

        if (!serviceName) {
            this.showNotification('Please select a service first', 'warning');
            return;
        }

        const response = await fetch(`/api/services/${serviceName}/logs/clear`, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            this.showNotification('Logs cleared successfully', 'success');
            await this.refreshServiceLogs();
        } else {
            throw new Error(result.message || 'Failed to clear logs');
        }
    }

    async downloadServiceLogs() {
        const serviceSelect = document.getElementById('service-logs-select');
        const serviceName = serviceSelect.value;

        if (!serviceName) {
            this.showNotification('Please select a service first', 'warning');
            return;
        }

        window.open(`/api/services/${serviceName}/logs/download`);
    }

    async loadServiceConfig() {
        const configSelect = document.getElementById('service-config-select');
        const serviceName = configSelect.value;

        if (!serviceName) {
            this.showNotification('Please select a service first', 'warning');
            return;
        }

        const response = await fetch(`/api/services/${serviceName}/config`);
        const config = await response.json();

        const configContent = document.getElementById('config-content');
        configContent.value = config.content || '';
    }

    async saveServiceConfig() {
        const configSelect = document.getElementById('service-config-select');
        const serviceName = configSelect.value;
        const configContent = document.getElementById('config-content').value;

        if (!serviceName) {
            this.showNotification('Please select a service first', 'warning');
            return;
        }

        const response = await fetch(`/api/services/${serviceName}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: configContent })
        });

        const result = await response.json();

        if (result.success) {
            this.showNotification('Configuration saved successfully', 'success');
        } else {
            throw new Error(result.message || 'Failed to save configuration');
        }
    }

    markAsChanged(setting) {
        if (setting) {
            this.unsavedChanges.add(setting);
            this.updateUnsavedIndicator();
        }
    }

    updateUnsavedIndicator() {
        const unsavedElement = document.getElementById('cp-unsaved');
        const applyButton = document.getElementById('cp-apply');
        const resetButton = document.getElementById('cp-reset');

        if (this.unsavedChanges.size > 0) {
            unsavedElement.classList.remove('hidden');
            applyButton.classList.remove('hidden');
            resetButton.classList.remove('hidden');
            unsavedElement.textContent = `${this.unsavedChanges.size} unsaved change${this.unsavedChanges.size > 1 ? 's' : ''}`;
        } else {
            unsavedElement.classList.add('hidden');
            applyButton.classList.add('hidden');
            resetButton.classList.add('hidden');
        }
    }

    async applyChanges() {
        if (this.unsavedChanges.size === 0) return;

        try {
            this.updateStatus('Applying changes...');

            const settings = {};
            this.unsavedChanges.forEach(setting => {
                const element = document.querySelector(`[data-setting="${setting}"]`);
                if (element) {
                    if (element.type === 'checkbox') {
                        settings[setting] = element.checked;
                    } else {
                        settings[setting] = element.value;
                    }
                }
            });

            const response = await fetch('/api/control-panel/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Changes applied successfully', 'success');
                this.unsavedChanges.clear();
                this.updateUnsavedIndicator();
                await this.loadSettings();
            } else {
                throw new Error(result.message || 'Failed to apply changes');
            }

            this.updateStatus('Ready');
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`, 'error');
        }
    }

    async resetChanges() {
        if (!confirm('Are you sure you want to reset all unsaved changes?')) {
            return;
        }

        this.unsavedChanges.clear();
        this.updateUnsavedIndicator();
        await this.loadCategoryData(this.currentCategory);
        this.updateStatus('Changes reset');
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/control-panel/settings');
            const settings = await response.json();

            Object.entries(settings).forEach(([key, value]) => {
                const element = document.querySelector(`[data-setting="${key}"]`);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else if (element.type === 'range') {
                        element.value = value;
                        const valueDisplay = element.parentElement.querySelector('.cp-range-value');
                        if (valueDisplay) {
                            if (key === 'opacity') {
                                valueDisplay.textContent = `${Math.round(value * 100)}%`;
                            } else if (key === 'sound-volume') {
                                valueDisplay.textContent = `${value}%`;
                            }
                        }
                    } else {
                        element.value = value;
                    }
                }
            });
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    showBackupModal() {
        document.getElementById('cp-backup-modal').classList.remove('hidden');
    }

    showRestoreModal() {
        document.getElementById('cp-restore-modal').classList.remove('hidden');
        this.loadBackupList();
    }

    async loadBackupList() {
        try {
            const response = await fetch('/api/control-panel/backups');
            const backups = await response.json();

            const backupList = document.getElementById('backup-list');
            backupList.innerHTML = backups.map(backup =>
                `<option value="${backup.id}">${backup.name} - ${backup.date}</option>`
            ).join('');
        } catch (error) {
            console.error('Error loading backups:', error);
        }
    }

    async runDiagnostics() {
        const modal = document.getElementById('cp-diagnostic-modal');
        modal.classList.remove('hidden');

        const progressFill = modal.querySelector('.cp-progress-fill');
        const progressText = modal.querySelector('.cp-progress-text');
        const results = document.getElementById('diagnostic-results');

        progressFill.style.width = '0%';
        progressText.textContent = 'Starting diagnostics...';
        results.innerHTML = '';

        try {
            const checks = [
                { name: 'System Health', endpoint: 'system/health', weight: 15 },
                { name: 'Services Status', endpoint: 'services/status', weight: 15 },
                { name: 'Disk Space', endpoint: 'storage/disk-health', weight: 15 },
                { name: 'Network Connectivity', endpoint: 'network/health', weight: 15 },
                { name: 'Security Audit', endpoint: 'security/audit', weight: 20 },
                { name: 'Performance Check', endpoint: 'system/performance', weight: 20 }
            ];

            let currentProgress = 0;
            const diagnosticResults = [];

            for (const check of checks) {
                progressText.textContent = `Checking ${check.name}...`;

                const response = await fetch(`/api/control-panel/diagnostic/${check.endpoint}`);
                const result = await response.json();

                diagnosticResults.push({
                    name: check.name,
                    status: result.status || 'unknown',
                    message: result.message || '',
                    details: result.details || {}
                });

                currentProgress += check.weight;
                progressFill.style.width = `${currentProgress}%`;

                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
            }

            progressFill.style.width = '100%';
            progressText.textContent = 'Diagnostics complete';

            results.innerHTML = diagnosticResults.map(result => `
                <div class="cp-diagnostic-item ${result.status}">
                    <h4>${result.name}</h4>
                    <p class="cp-diagnostic-message">${result.message}</p>
                    ${Object.keys(result.details).length > 0 ? `
                        <details class="cp-diagnostic-details">
                            <summary>Details</summary>
                            <pre>${JSON.stringify(result.details, null, 2)}</pre>
                        </details>
                    ` : ''}
                </div>
            `).join('');

        } catch (error) {
            progressText.textContent = 'Diagnostics failed';
            results.innerHTML = `<div class="cp-diagnostic-item error"><h4>Error</h4><p>${error.message}</p></div>`;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `cp-notification cp-notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('cp-notification-visible');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('cp-notification-visible');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('cp-status');
        statusElement.textContent = message;
        statusElement.className = type === 'error' ? 'error' : '';
    }

    startMonitoring(category) {
        this.stopMonitoring();

        if (category === 'services') {
            this.serviceStatusInterval = setInterval(() => {
                this.loadServicesData();
            }, 5000);
        }

        this.isMonitoring = true;
    }

    stopMonitoring() {
        if (this.serviceStatusInterval) {
            clearInterval(this.serviceStatusInterval);
            this.serviceStatusInterval = null;
        }

        if (this.systemInfoInterval) {
            clearInterval(this.systemInfoInterval);
            this.systemInfoInterval = null;
        }

        this.isMonitoring = false;
    }

    setupModalHandlers() {
        // Backup modal
        document.getElementById('cancel-backup').addEventListener('click', () => {
            document.getElementById('cp-backup-modal').classList.add('hidden');
        });

        document.getElementById('create-backup').addEventListener('click', async () => {
            const backupName = document.getElementById('backup-name').value;
            const includeSystem = document.querySelector('input[value="system"]').checked;
            const includeUsers = document.querySelector('input[value="users"]').checked;
            const includeNetwork = document.querySelector('input[value="network"]').checked;
            const includeSecurity = document.querySelector('input[value="security"]').checked;

            try {
                const response = await fetch('/api/control-panel/backup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: backupName,
                        include: {
                            system: includeSystem,
                            users: includeUsers,
                            network: includeNetwork,
                            security: includeSecurity
                        }
                    })
                });

                const result = await response.json();

                if (result.success) {
                    this.showNotification('Backup created successfully', 'success');
                    document.getElementById('cp-backup-modal').classList.add('hidden');
                } else {
                    throw new Error(result.message || 'Failed to create backup');
                }
            } catch (error) {
                this.showNotification(`Error creating backup: ${error.message}`, 'error');
            }
        });

        // Restore modal
        document.getElementById('cancel-restore').addEventListener('click', () => {
            document.getElementById('cp-restore-modal').classList.add('hidden');
        });

        document.getElementById('do-restore').addEventListener('click', async () => {
            const backupId = document.getElementById('backup-list').value;

            if (!backupId) {
                this.showNotification('Please select a backup to restore', 'warning');
                return;
            }

            if (!confirm('This will overwrite current settings. Are you sure?')) {
                return;
            }

            try {
                const response = await fetch('/api/control-panel/restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ backupId })
                });

                const result = await response.json();

                if (result.success) {
                    this.showNotification('Settings restored successfully', 'success');
                    document.getElementById('cp-restore-modal').classList.add('hidden');
                    await this.loadSettings();
                    await this.loadCategoryData(this.currentCategory);
                } else {
                    throw new Error(result.message || 'Failed to restore backup');
                }
            } catch (error) {
                this.showNotification(`Error restoring backup: ${error.message}`, 'error');
            }
        });

        // Diagnostic modal
        document.getElementById('close-diagnostic').addEventListener('click', () => {
            document.getElementById('cp-diagnostic-modal').classList.add('hidden');
        });

        document.getElementById('export-diagnostic').addEventListener('click', () => {
            const results = document.getElementById('diagnostic-results').innerHTML;
            const blob = new Blob([results], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `diagnostic-report-${new Date().toISOString().split('T')[0]}.html`;
            a.click();
            URL.revokeObjectURL(url);
        });

        // Modal close buttons
        document.querySelectorAll('.cp-modal-close').forEach(button => {
            button.addEventListener('click', (e) => {
                e.target.closest('.cp-modal').classList.add('hidden');
            });
        });

        // Close modal on background click
        document.querySelectorAll('.cp-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    handleQuickAction(action) {
        switch (action) {
            case 'system-info':
                this.selectCategory('system');
                break;
            case 'service-status':
                this.selectCategory('services');
                break;
            case 'security-audit':
                this.runDiagnostics();
                break;
        }
    }

    formatUptime(seconds) {
        if (!seconds) return 'Unknown';

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    show() {
        document.getElementById('control-panel').classList.remove('hidden');
        this.startMonitoring(this.currentCategory || 'system');
    }

    close() {
        if (this.unsavedChanges.size > 0) {
            if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
                return;
            }
        }

        document.getElementById('control-panel').classList.add('hidden');
        this.stopMonitoring();
    }
}

// Export for use in desktop.js
window.ControlPanel = ControlPanel;