// Advanced Monitoring Dashboard
class MonitoringDashboard {
    constructor() {
        this.isVisible = false;
        this.currentTab = 'overview';
        this.updateInterval = null;
        this.dataHistory = {
            cpu: [],
            memory: [],
            network: [],
            disk: []
        };
        this.maxHistoryLength = 300; // 5 minutes at 1-second intervals
        this.alerts = [];
        this.settings = {
            refreshInterval: 3000,
            alertsEnabled: true,
            cpuThreshold: 80,
            memoryThreshold: 85,
            diskThreshold: 90,
            temperatureThreshold: 70
        };
        this.processes = [];
        this.sortField = 'cpu';
        this.processSearchTerm = '';
        this.charts = {};
        this.sessionId = this.generateSessionId();

        // Load settings and alerts from localStorage
        this.loadSettings();
        this.loadAlerts();
    }

    generateSessionId() {
        return 'monitoring_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        this.createDashboard();
        this.bindEvents();
        this.startDataCollection();
    }

    createDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'monitoring-dashboard';
        dashboard.className = 'monitoring-dashboard hidden';
        dashboard.innerHTML = `
            <div class="dashboard-header">
                <div class="dashboard-title">
                    <h2>📊 Advanced Monitoring Dashboard</h2>
                    <div class="dashboard-status">
                        <span class="status-indicator online"></span>
                        <span class="status-text">Live</span>
                    </div>
                </div>
                <div class="dashboard-controls">
                    <div class="refresh-controls">
                        <button id="refresh-btn" class="control-btn" title="Manual Refresh">🔄</button>
                        <select id="refresh-interval" class="interval-select">
                            <option value="1000">1s</option>
                            <option value="3000" selected>3s</option>
                            <option value="5000">5s</option>
                            <option value="10000">10s</option>
                        </select>
                    </div>
                    <div class="alert-controls">
                        <button id="alert-config-btn" class="control-btn" title="Alert Configuration">🔔</button>
                        <button id="export-btn" class="control-btn" title="Export Data">📥</button>
                    </div>
                    <button id="close-dashboard" class="close-btn" title="Close Dashboard">×</button>
                </div>
            </div>

            <div class="dashboard-tabs">
                <button class="tab-btn active" data-tab="overview">📋 Overview</button>
                <button class="tab-btn" data-tab="performance">⚡ Performance</button>
                <button class="tab-btn" data-tab="processes">⚙️ Processes</button>
                <button class="tab-btn" data-tab="hardware">💻 Hardware</button>
                <button class="tab-btn" data-tab="alerts">🚨 Alerts</button>
                <button class="tab-btn" data-tab="history">📈 History</button>
            </div>

            <div class="dashboard-content">
                <!-- Overview Tab -->
                <div id="overview-tab" class="tab-content active">
                    <div class="overview-grid">
                        <div class="metric-card cpu-card">
                            <div class="metric-header">
                                <h3>CPU Usage</h3>
                                <span class="metric-value" id="cpu-overview-value">--%</span>
                            </div>
                            <div class="metric-chart">
                                <canvas id="cpu-overview-chart"></canvas>
                            </div>
                            <div class="metric-details">
                                <div class="detail-item">
                                    <span class="detail-label">Load Average:</span>
                                    <span class="detail-value" id="load-avg">--</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Cores:</span>
                                    <span class="detail-value" id="cpu-cores">--</span>
                                </div>
                            </div>
                        </div>

                        <div class="metric-card memory-card">
                            <div class="metric-header">
                                <h3>Memory Usage</h3>
                                <span class="metric-value" id="memory-overview-value">--%</span>
                            </div>
                            <div class="metric-chart">
                                <canvas id="memory-overview-chart"></canvas>
                            </div>
                            <div class="metric-details">
                                <div class="detail-item">
                                    <span class="detail-label">Used:</span>
                                    <span class="detail-value" id="memory-used">--</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Available:</span>
                                    <span class="detail-value" id="memory-available">--</span>
                                </div>
                            </div>
                        </div>

                        <div class="metric-card disk-card">
                            <div class="metric-header">
                                <h3>Disk Usage</h3>
                                <span class="metric-value" id="disk-overview-value">--%</span>
                            </div>
                            <div class="metric-chart">
                                <canvas id="disk-overview-chart"></canvas>
                            </div>
                            <div class="metric-details">
                                <div class="detail-item">
                                    <span class="detail-label">Used:</span>
                                    <span class="detail-value" id="disk-used">--</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Free:</span>
                                    <span class="detail-value" id="disk-free">--</span>
                                </div>
                            </div>
                        </div>

                        <div class="metric-card network-card">
                            <div class="metric-header">
                                <h3>Network</h3>
                                <span class="metric-value" id="network-overview-value">--</span>
                            </div>
                            <div class="metric-chart">
                                <canvas id="network-overview-chart"></canvas>
                            </div>
                            <div class="metric-details">
                                <div class="detail-item">
                                    <span class="detail-label">Download:</span>
                                    <span class="detail-value" id="network-download">--</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Upload:</span>
                                    <span class="detail-value" id="network-upload">--</span>
                                </div>
                            </div>
                        </div>

                        <div class="metric-card system-card">
                            <div class="metric-header">
                                <h3>System Health</h3>
                                <span class="metric-value" id="health-score">--</span>
                            </div>
                            <div class="health-meters">
                                <div class="health-meter">
                                    <div class="meter-label">CPU</div>
                                    <div class="meter-bar">
                                        <div class="meter-fill" id="cpu-health-meter"></div>
                                    </div>
                                </div>
                                <div class="health-meter">
                                    <div class="meter-label">Memory</div>
                                    <div class="meter-bar">
                                        <div class="meter-fill" id="memory-health-meter"></div>
                                    </div>
                                </div>
                                <div class="health-meter">
                                    <div class="meter-label">Disk</div>
                                    <div class="meter-bar">
                                        <div class="meter-fill" id="disk-health-meter"></div>
                                    </div>
                                </div>
                                <div class="health-meter">
                                    <div class="meter-label">Temp</div>
                                    <div class="meter-bar">
                                        <div class="meter-fill" id="temp-health-meter"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="metric-card alerts-card">
                            <div class="metric-header">
                                <h3>Recent Alerts</h3>
                                <span class="alert-count" id="alert-count">0</span>
                            </div>
                            <div class="alerts-list" id="recent-alerts">
                                <div class="no-alerts">No recent alerts</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Performance Tab -->
                <div id="performance-tab" class="tab-content">
                    <div class="performance-charts">
                        <div class="chart-container">
                            <div class="chart-header">
                                <h3>C Performance</h3>
                                <div class="chart-controls">
                                    <button class="chart-range-btn active" data-range="1h">1H</button>
                                    <button class="chart-range-btn" data-range="6h">6H</button>
                                    <button class="chart-range-btn" data-range="24h">24H</button>
                                </div>
                            </div>
                            <canvas id="cpu-performance-chart"></canvas>
                        </div>

                        <div class="chart-container">
                            <div class="chart-header">
                                <h3>Memory Performance</h3>
                                <div class="chart-controls">
                                    <button class="chart-range-btn active" data-range="1h">1H</button>
                                    <button class="chart-range-btn" data-range="6h">6H</button>
                                    <button class="chart-range-btn" data-range="24h">24H</button>
                                </div>
                            </div>
                            <canvas id="memory-performance-chart"></canvas>
                        </div>

                        <div class="chart-container">
                            <div class="chart-header">
                                <h3>Network Performance</h3>
                                <div class="chart-controls">
                                    <button class="chart-range-btn active" data-range="1h">1H</button>
                                    <button class="chart-range-btn" data-range="6h">6H</button>
                                    <button class="chart-range-btn" data-range="24h">24H</button>
                                </div>
                            </div>
                            <canvas id="network-performance-chart"></canvas>
                        </div>

                        <div class="chart-container">
                            <div class="chart-header">
                                <h3>Disk I/O</h3>
                                <div class="chart-controls">
                                    <button class="chart-range-btn active" data-range="1h">1H</button>
                                    <button class="chart-range-btn" data-range="6h">6H</button>
                                    <button class="chart-range-btn" data-range="24h">24H</button>
                                </div>
                            </div>
                            <canvas id="disk-performance-chart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Processes Tab -->
                <div id="processes-tab" class="tab-content">
                    <div class="processes-controls">
                        <div class="search-box">
                            <input type="text" id="process-search" placeholder="Search processes..." />
                            <button id="clear-search" class="clear-btn">×</button>
                        </div>
                        <div class="sort-controls">
                            <label>Sort by:</label>
                            <select id="process-sort">
                                <option value="cpu">CPU Usage</option>
                                <option value="memory">Memory Usage</option>
                                <option value="name">Process Name</option>
                                <option value="pid">PID</option>
                            </select>
                        </div>
                        <div class="filter-controls">
                            <button id="show-user-processes" class="filter-btn">User Only</button>
                            <button id="show-system-processes" class="filter-btn">System Only</button>
                            <button id="show-all-processes" class="filter-btn active">All</button>
                        </div>
                    </div>
                    <div class="processes-table-container">
                        <table class="processes-table">
                            <thead>
                                <tr>
                                    <th>PID</th>
                                    <th>Name</th>
                                    <th>CPU %</th>
                                    <th>Memory %</th>
                                    <th>Memory (RSS)</th>
                                    <th>User</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="processes-tbody">
                                <tr>
                                    <td colspan="8" class="loading-row">Loading processes...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Hardware Tab -->
                <div id="hardware-tab" class="tab-content">
                    <div class="hardware-grid">
                        <div class="hardware-section">
                            <h3>CPU Information</h3>
                            <div class="hardware-info" id="cpu-info">
                                <div class="loading">Loading CPU information...</div>
                            </div>
                        </div>

                        <div class="hardware-section">
                            <h3>Memory Information</h3>
                            <div class="hardware-info" id="memory-info">
                                <div class="loading">Loading memory information...</div>
                            </div>
                        </div>

                        <div class="hardware-section">
                            <h3>Disk Information</h3>
                            <div class="hardware-info" id="disk-info">
                                <div class="loading">Loading disk information...</div>
                            </div>
                        </div>

                        <div class="hardware-section">
                            <h3>Network Interfaces</h3>
                            <div class="hardware-info" id="network-info">
                                <div class="loading">Loading network information...</div>
                            </div>
                        </div>

                        <div class="hardware-section">
                            <h3>Graphics</h3>
                            <div class="hardware-info" id="graphics-info">
                                <div class="loading">Loading graphics information...</div>
                            </div>
                        </div>

                        <div class="hardware-section">
                            <h3>Battery</h3>
                            <div class="hardware-info" id="battery-info">
                                <div class="loading">Loading battery information...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Alerts Tab -->
                <div id="alerts-tab" class="tab-content">
                    <div class="alerts-controls">
                        <div class="alert-summary">
                            <div class="summary-item critical">
                                <span class="count" id="critical-count">0</span>
                                <span class="label">Critical</span>
                            </div>
                            <div class="summary-item warning">
                                <span class="count" id="warning-count">0</span>
                                <span class="label">Warning</span>
                            </div>
                            <div class="summary-item info">
                                <span class="count" id="info-count">0</span>
                                <span class="label">Info</span>
                            </div>
                        </div>
                        <div class="alert-actions">
                            <button id="clear-all-alerts" class="btn-danger">Clear All</button>
                            <button id="export-alerts" class="btn-secondary">Export</button>
                        </div>
                    </div>
                    <div class="alerts-list-container">
                        <div class="alerts-filters">
                            <button class="filter-btn active" data-severity="all">All</button>
                            <button class="filter-btn" data-severity="critical">Critical</button>
                            <button class="filter-btn" data-severity="warning">Warning</button>
                            <button class="filter-btn" data-severity="info">Info</button>
                        </div>
                        <div class="alerts-content" id="alerts-content">
                            <div class="no-alerts">No alerts</div>
                        </div>
                    </div>
                </div>

                <!-- History Tab -->
                <div id="history-tab" class="tab-content">
                    <div class="history-controls">
                        <div class="time-range-selector">
                            <button class="range-btn active" data-range="1h">Last Hour</button>
                            <button class="range-btn" data-range="6h">Last 6 Hours</button>
                            <button class="range-btn" data-range="24h">Last 24 Hours</button>
                            <button class="range-btn" data-range="7d">Last Week</button>
                            <button class="range-btn" data-range="30d">Last Month</button>
                        </div>
                        <div class="export-controls">
                            <button id="export-history" class="btn-primary">Export History</button>
                            <button id="clear-history" class="btn-danger">Clear History</button>
                        </div>
                    </div>
                    <div class="history-content">
                        <div class="history-summary">
                            <div class="summary-card">
                                <h4>Average CPU Usage</h4>
                                <div class="summary-value" id="avg-cpu">--%</div>
                            </div>
                            <div class="summary-card">
                                <h4>Peak CPU Usage</h4>
                                <div class="summary-value" id="peak-cpu">--%</div>
                            </div>
                            <div class="summary-card">
                                <h4>Average Memory Usage</h4>
                                <div class="summary-value" id="avg-memory">--%</div>
                            </div>
                            <div class="summary-card">
                                <h4>System Uptime</h4>
                                <div class="summary-value" id="system-uptime">--</div>
                            </div>
                        </div>
                        <div class="history-charts">
                            <div class="chart-container">
                                <h3>Historical Performance Trends</h3>
                                <canvas id="history-chart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dashboard);
    }

    bindEvents() {
        // Dashboard controls
        document.getElementById('close-dashboard').addEventListener('click', () => this.hide());
        document.getElementById('refresh-btn').addEventListener('click', () => this.forceUpdate());
        document.getElementById('refresh-interval').addEventListener('change', (e) => {
            this.settings.refreshInterval = parseInt(e.target.value);
            this.saveSettings();
            this.restartDataCollection();
        });
        document.getElementById('alert-config-btn').addEventListener('click', () => this.showAlertConfig());
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Process controls
        document.getElementById('process-search').addEventListener('input', (e) => {
            this.processSearchTerm = e.target.value.toLowerCase();
            this.filterProcesses();
        });
        document.getElementById('clear-search').addEventListener('click', () => {
            document.getElementById('process-search').value = '';
            this.processSearchTerm = '';
            this.filterProcesses();
        });
        document.getElementById('process-sort').addEventListener('change', (e) => {
            this.sortField = e.target.value;
            this.sortProcesses();
        });

        // Process filter buttons
        document.querySelectorAll('#processes-tab .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#processes-tab .filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterProcesses(e.target.textContent);
            });
        });

        // Alert controls
        document.getElementById('clear-all-alerts').addEventListener('click', () => this.clearAllAlerts());
        document.getElementById('export-alerts').addEventListener('click', () => this.exportAlerts());

        // Alert filters
        document.querySelectorAll('#alerts-tab .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#alerts-tab .filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterAlerts(e.target.dataset.severity);
            });
        });

        // History controls
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.loadHistory(e.target.dataset.range));
        });
        document.getElementById('export-history').addEventListener('click', () => this.exportHistory());
        document.getElementById('clear-history').addEventListener('click', () => this.clearHistory());

        // Chart range controls
        document.querySelectorAll('.chart-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const parent = e.target.closest('.chart-controls');
                parent.querySelectorAll('.chart-range-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateChartRange(e.target.dataset.range);
            });
        });
    }

    switchTab(tabName) {
        if (this.currentTab === tabName) return;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        // Initialize tab-specific content
        if (tabName === 'processes') {
            this.loadProcesses();
        } else if (tabName === 'hardware') {
            this.loadHardwareInfo();
        } else if (tabName === 'history') {
            this.loadHistory('1h');
        }

        // Resize charts for the active tab
        setTimeout(() => this.resizeCharts(), 100);
    }

    async startDataCollection() {
        await this.updateData(); // Initial update
        this.updateInterval = setInterval(() => this.updateData(), this.settings.refreshInterval);
    }

    restartDataCollection() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.startDataCollection();
    }

    async updateData() {
        try {
            const [systemData, processesData] = await Promise.all([
                this.fetchSystemData(),
                this.fetchProcessesData()
            ]);

            this.processSystemData(systemData);
            this.processProcessesData(processesData);
            this.checkAlerts(systemData);
            this.updateUI();

            // Store metrics
            this.storeMetrics(systemData);

        } catch (error) {
            console.error('Failed to update monitoring data:', error);
            this.showError('Failed to update monitoring data');
        }
    }

    async fetchSystemData() {
        const response = await fetch('/api/system-monitoring');
        if (!response.ok) throw new Error('Failed to fetch system data');
        return await response.json();
    }

    async fetchProcessesData() {
        const response = await fetch('/api/system-monitoring/processes?limit=100');
        if (!response.ok) throw new Error('Failed to fetch processes data');
        return await response.json();
    }

    processSystemData(data) {
        const timestamp = Date.now();

        // Update history
        this.dataHistory.cpu.push({
            timestamp,
            usage: data.cpu.load.currentLoad,
            user: data.cpu.load.currentLoadUser,
            system: data.cpu.load.currentLoadSystem
        });

        this.dataHistory.memory.push({
            timestamp,
            used: data.memory.used,
            total: data.memory.total,
            usage: (data.memory.used / data.memory.total) * 100
        });

        if (data.networkStats && data.networkStats.length > 0) {
            const totalRx = data.networkStats.reduce((sum, iface) => sum + iface.rx_sec, 0);
            const totalTx = data.networkStats.reduce((sum, iface) => sum + iface.tx_sec, 0);

            this.dataHistory.network.push({
                timestamp,
                rx: totalRx,
                tx: totalTx
            });
        }

        if (data.diskUsage && data.diskUsage.length > 0) {
            const mainDisk = data.diskUsage.find(disk => disk.mount === '/') || data.diskUsage[0];
            if (mainDisk) {
                this.dataHistory.disk.push({
                    timestamp,
                    usage: mainDisk.use,
                    used: mainDisk.used,
                    total: mainDisk.size
                });
            }
        }

        // Trim history if too long
        Object.keys(this.dataHistory).forEach(key => {
            if (this.dataHistory[key].length > this.maxHistoryLength) {
                this.dataHistory[key] = this.dataHistory[key].slice(-this.maxHistoryLength);
            }
        });

        this.currentSystemData = data;
    }

    processProcessesData(data) {
        this.processes = data.processes || [];
    }

    updateUI() {
        if (this.currentTab === 'overview') {
            this.updateOverviewTab();
        } else if (this.currentTab === 'performance') {
            this.updatePerformanceTab();
        } else if (this.currentTab === 'alerts') {
            this.updateAlertsTab();
        }
    }

    updateOverviewTab() {
        if (!this.currentSystemData) return;

        const data = this.currentSystemData;

        // CPU
        const cpuUsage = data.cpu.load.currentLoad;
        document.getElementById('cpu-overview-value').textContent = `${cpuUsage.toFixed(1)}%`;
        document.getElementById('load-avg').textContent = data.cpu.load.avgLoad.slice(0, 3).map(l => l.toFixed(2)).join(', ');
        document.getElementById('cpu-cores').textContent = `${data.cpu.cores} cores`;

        // Memory
        const memUsage = (data.memory.used / data.memory.total) * 100;
        document.getElementById('memory-overview-value').textContent = `${memUsage.toFixed(1)}%`;
        document.getElementById('memory-used').textContent = this.formatBytes(data.memory.used);
        document.getElementById('memory-available').textContent = this.formatBytes(data.memory.available);

        // Disk
        const mainDisk = data.diskUsage.find(disk => disk.mount === '/') || data.diskUsage[0];
        if (mainDisk) {
            document.getElementById('disk-overview-value').textContent = `${mainDisk.use.toFixed(1)}%`;
            document.getElementById('disk-used').textContent = this.formatBytes(mainDisk.used);
            document.getElementById('disk-free').textContent = this.formatBytes(mainDisk.size - mainDisk.used);
        }

        // Network
        if (data.networkStats && data.networkStats.length > 0) {
            const totalRx = data.networkStats.reduce((sum, iface) => sum + iface.rx_sec, 0);
            const totalTx = data.networkStats.reduce((sum, iface) => sum + iface.tx_sec, 0);
            document.getElementById('network-overview-value').textContent = 'Active';
            document.getElementById('network-download').textContent = `${this.formatBytes(totalRx)}/s`;
            document.getElementById('network-upload').textContent = `${this.formatBytes(totalTx)}/s`;
        }

        // Health score
        this.updateHealthScore(cpuUsage, memUsage, mainDisk ? mainDisk.use : 0, data.cpu.temperature);

        // Update charts
        this.updateOverviewCharts();
    }

    updateHealthScore(cpu, memory, disk, temperature) {
        const healthScore = Math.max(0, 100 - (
            Math.max(0, cpu - 50) * 0.3 +
            Math.max(0, memory - 70) * 0.3 +
            Math.max(0, disk - 80) * 0.2 +
            Math.max(0, temperature - 60) * 0.2
        ));

        document.getElementById('health-score').textContent = `${Math.round(healthScore)}`;
        document.getElementById('health-score').className = `metric-value ${healthScore >= 80 ? 'good' : healthScore >= 50 ? 'warning' : 'critical'}`;

        // Update health meters
        document.getElementById('cpu-health-meter').style.width = `${Math.min(100, cpu * 1.5)}%`;
        document.getElementById('memory-health-meter').style.width = `${Math.min(100, memory * 1.2)}%`;
        document.getElementById('disk-health-meter').style.width = `${Math.min(100, disk * 1.1)}%`;

        const tempScore = temperature ? Math.min(100, (temperature / 80) * 100) : 0;
        document.getElementById('temp-health-meter').style.width = `${tempScore}%`;
    }

    updateOverviewCharts() {
        this.drawMiniChart('cpu-overview-chart', this.dataHistory.cpu, 'usage', '#89b4fa');
        this.drawMiniChart('memory-overview-chart', this.dataHistory.memory, 'usage', '#f9e2af');
        this.drawMiniChart('disk-overview-chart', this.dataHistory.disk, 'usage', '#a6e3a1');
        this.drawMiniChart('network-overview-chart', this.dataHistory.network, 'rx', '#cba6f7');
    }

    drawMiniChart(canvasId, data, field, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get recent data (last 60 points)
        const recentData = data.slice(-60);
        const maxValue = Math.max(...recentData.map(d => d[field] || 0), 1);

        // Draw gradient fill
        ctx.beginPath();
        ctx.moveTo(0, height);

        recentData.forEach((value, i) => {
            const x = (i / (recentData.length - 1)) * width;
            const y = height - ((value[field] || 0) / maxValue) * height;

            if (i === 0) {
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.lineTo(width, height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        recentData.forEach((value, i) => {
            const x = (i / (recentData.length - 1)) * width;
            const y = height - ((value[field] || 0) / maxValue) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    async loadProcesses() {
        try {
            const response = await fetch('/api/system-monitoring/processes?limit=100');
            const data = await response.json();
            this.processes = data.processes || [];
            this.renderProcessesTable();
        } catch (error) {
            console.error('Failed to load processes:', error);
            this.showError('Failed to load processes');
        }
    }

    renderProcessesTable() {
        const tbody = document.getElementById('processes-tbody');
        if (!tbody) return;

        let filteredProcesses = [...this.processes];

        // Apply search filter
        if (this.processSearchTerm) {
            filteredProcesses = filteredProcesses.filter(proc =>
                proc.name.toLowerCase().includes(this.processSearchTerm) ||
                proc.command.toLowerCase().includes(this.processSearchTerm)
            );
        }

        // Apply sort
        filteredProcesses.sort((a, b) => {
            switch (this.sortField) {
                case 'cpu':
                    return (b.pcpu || 0) - (a.pcpu || 0);
                case 'memory':
                    return (b.pmem || 0) - (a.pmem || 0);
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'pid':
                    return a.pid - b.pid;
                default:
                    return 0;
            }
        });

        tbody.innerHTML = filteredProcesses.map(proc => `
            <tr>
                <td>${proc.pid}</td>
                <td class="process-name" title="${proc.command}">${proc.name}</td>
                <td class="cpu-usage">${(proc.pcpu || 0).toFixed(1)}%</td>
                <td class="memory-usage">${(proc.pmem || 0).toFixed(1)}%</td>
                <td>${this.formatBytes(proc.memRss || 0)}</td>
                <td>${proc.user}</td>
                <td class="status ${proc.state.toLowerCase()}">${proc.state}</td>
                <td class="process-actions">
                    <button class="action-btn terminate-btn" onclick="monitoringDashboard.terminateProcess(${proc.pid})" title="Terminate Process">⚠️</button>
                    <button class="action-btn kill-btn" onclick="monitoringDashboard.killProcess(${proc.pid})" title="Kill Process">❌</button>
                </td>
            </tr>
        `).join('');
    }

    async terminateProcess(pid) {
        if (!confirm(`Are you sure you want to terminate process ${pid}?`)) return;

        try {
            const response = await fetch(`/api/system-monitoring/processes/${pid}/kill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signal: 15 }) // SIGTERM
            });

            if (response.ok) {
                this.showSuccess(`Process ${pid} terminated`);
                this.loadProcesses();
            } else {
                throw new Error('Failed to terminate process');
            }
        } catch (error) {
            console.error('Failed to terminate process:', error);
            this.showError(`Failed to terminate process ${pid}`);
        }
    }

    async killProcess(pid) {
        if (!confirm(`Are you sure you want to KILL process ${pid}? This is forceful.`)) return;

        try {
            const response = await fetch(`/api/system-monitoring/processes/${pid}/kill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signal: 9 }) // SIGKILL
            });

            if (response.ok) {
                this.showSuccess(`Process ${pid} killed`);
                this.loadProcesses();
            } else {
                throw new Error('Failed to kill process');
            }
        } catch (error) {
            console.error('Failed to kill process:', error);
            this.showError(`Failed to kill process ${pid}`);
        }
    }

    async loadHardwareInfo() {
        if (!this.currentSystemData) {
            this.showError('No system data available');
            return;
        }

        const data = this.currentSystemData;

        // CPU Info
        document.getElementById('cpu-info').innerHTML = `
            <div class="hardware-item">
                <span class="hardware-label">Processor:</span>
                <span class="hardware-value">${data.cpu.brand}</span>
            </div>
            <div class="hardware-item">
                <span class="hardware-label">Cores:</span>
                <span class="hardware-value">${data.cpu.cores} (${data.cpu.physicalCores} physical)</span>
            </div>
            <div class="hardware-item">
                <span class="hardware-label">Base Speed:</span>
                <span class="hardware-value">${data.cpu.speed} GHz</span>
            </div>
            <div class="hardware-item">
                <span class="hardware-label">Current Speed:</span>
                <span class="hardware-value">${data.cpu.currentSpeed.toFixed(2)} GHz</span>
            </div>
            <div class="hardware-item">
                <span class="hardware-label">Temperature:</span>
                <span class="hardware-value">${data.cpu.temperature ? data.cpu.temperature + '°C' : 'N/A'}</span>
            </div>
        `;

        // Memory Info
        document.getElementById('memory-info').innerHTML = `
            <div class="hardware-item">
                <span class="hardware-label">Total Memory:</span>
                <span class="hardware-value">${this.formatBytes(data.memory.total)}</span>
            </div>
            <div class="hardware-item">
                <span class="hardware-label">Used Memory:</span>
                <span class="hardware-value">${this.formatBytes(data.memory.used)}</span>
            </div>
            <div class="hardware-item">
                <span class="hardware-label">Available Memory:</span>
                <span class="hardware-value">${this.formatBytes(data.memory.available)}</span>
            </div>
            <div class="hardware-item">
                <span class="hardware-label">Swap Total:</span>
                <span class="hardware-value">${this.formatBytes(data.memory.swaptotal)}</span>
            </div>
            <div class="hardware-item">
                <span class="hardware-label">Swap Used:</span>
                <span class="hardware-value">${this.formatBytes(data.memory.swapused)}</span>
            </div>
        `;

        // Disk Info
        document.getElementById('disk-info').innerHTML = data.disks.map(disk => `
            <div class="hardware-item">
                <span class="hardware-label">${disk.name}:</span>
                <span class="hardware-value">${this.formatBytes(disk.size)} ${disk.interfaceType}</span>
            </div>
        `).join('') + data.diskUsage.map(disk => `
            <div class="hardware-item">
                <span class="hardware-label">${disk.mount}:</span>
                <span class="hardware-value">${this.formatBytes(disk.used)}/${this.formatBytes(disk.size)} (${disk.use.toFixed(1)}%)</span>
            </div>
        `).join('');

        // Network Info
        document.getElementById('network-info').innerHTML = data.networks.map(iface => `
            <div class="hardware-item">
                <span class="hardware-label">${iface.iface}:</span>
                <span class="hardware-value">${iface.ip4 || iface.ip6 || 'No IP'} (${iface.type})</span>
            </div>
        `).join('');

        // Graphics Info
        document.getElementById('graphics-info').innerHTML = data.graphics.map(gpu => `
            <div class="hardware-item">
                <span class="hardware-label">${gpu.vendor}:</span>
                <span class="hardware-value">${gpu.model} (${gpu.vram ? this.formatBytes(gpu.vram) : 'Shared'})</span>
            </div>
        `).join('');

        // Battery Info
        if (data.battery) {
            const battery = data.battery;
            document.getElementById('battery-info').innerHTML = `
                <div class="hardware-item">
                    <span class="hardware-label">Charge:</span>
                    <span class="hardware-value">${battery.percent}%</span>
                </div>
                <div class="hardware-item">
                    <span class="hardware-label">Status:</span>
                    <span class="hardware-value">${battery.isCharging ? 'Charging' : 'Discharging'}</span>
                </div>
                <div class="hardware-item">
                    <span class="hardware-label">Time Remaining:</span>
                    <span class="hardware-value">${battery.timeRemaining > 0 ? Math.round(battery.timeRemaining / 60) + ' min' : 'Calculating...'}</span>
                </div>
                <div class="hardware-item">
                    <span class="hardware-label">Health:</span>
                    <span class="hardware-value">${battery.health}%</span>
                </div>
            `;
        } else {
            document.getElementById('battery-info').innerHTML = '<div class="hardware-item">No battery detected</div>';
        }
    }

    checkAlerts(systemData) {
        if (!this.settings.alertsEnabled || !systemData) return;

        const alerts = [];

        // CPU alerts
        if (systemData.cpu.load.currentLoad > this.settings.cpuThreshold) {
            alerts.push({
                id: Date.now() + '_cpu',
                type: 'cpu',
                severity: systemData.cpu.load.currentLoad > 95 ? 'critical' : 'warning',
                message: `High CPU usage: ${systemData.cpu.load.currentLoad.toFixed(1)}%`,
                timestamp: Date.now(),
                value: systemData.cpu.load.currentLoad
            });
        }

        // Memory alerts
        const memUsage = (systemData.memory.used / systemData.memory.total) * 100;
        if (memUsage > this.settings.memoryThreshold) {
            alerts.push({
                id: Date.now() + '_memory',
                type: 'memory',
                severity: memUsage > 95 ? 'critical' : 'warning',
                message: `High memory usage: ${memUsage.toFixed(1)}%`,
                timestamp: Date.now(),
                value: memUsage
            });
        }

        // Disk alerts
        if (systemData.diskUsage && systemData.diskUsage.length > 0) {
            const mainDisk = systemData.diskUsage.find(disk => disk.mount === '/') || systemData.diskUsage[0];
            if (mainDisk && mainDisk.use > this.settings.diskThreshold) {
                alerts.push({
                    id: Date.now() + '_disk',
                    type: 'disk',
                    severity: mainDisk.use > 98 ? 'critical' : 'warning',
                    message: `Low disk space on ${mainDisk.mount}: ${mainDisk.use.toFixed(1)}% used`,
                    timestamp: Date.now(),
                    value: mainDisk.use
                });
            }
        }

        // Temperature alerts
        if (systemData.cpu.temperature && systemData.cpu.temperature > this.settings.temperatureThreshold) {
            alerts.push({
                id: Date.now() + '_temp',
                type: 'temperature',
                severity: systemData.cpu.temperature > 85 ? 'critical' : 'warning',
                message: `High CPU temperature: ${systemData.cpu.temperature}°C`,
                timestamp: Date.now(),
                value: systemData.cpu.temperature
            });
        }

        // Add new alerts (avoid duplicates)
        alerts.forEach(alert => {
            if (!this.alerts.some(existing => existing.type === alert.type && (Date.now() - existing.timestamp) < 30000)) {
                this.alerts.unshift(alert);
                this.showNotification(alert.message, alert.severity);
            }
        });

        // Keep only recent alerts (last 100)
        this.alerts = this.alerts.slice(0, 100);

        // Update alerts tab if active
        if (this.currentTab === 'alerts') {
            this.updateAlertsTab();
        }
    }

    updateAlertsTab() {
        // Update alert counts
        const criticalCount = this.alerts.filter(a => a.severity === 'critical').length;
        const warningCount = this.alerts.filter(a => a.severity === 'warning').length;
        const infoCount = this.alerts.filter(a => a.severity === 'info').length;

        document.getElementById('critical-count').textContent = criticalCount;
        document.getElementById('warning-count').textContent = warningCount;
        document.getElementById('info-count').textContent = infoCount;

        // Update overview alert count
        document.getElementById('alert-count').textContent = this.alerts.length;

        // Render alerts
        const alertsContent = document.getElementById('alerts-content');
        if (this.alerts.length === 0) {
            alertsContent.innerHTML = '<div class="no-alerts">No alerts</div>';
        } else {
            alertsContent.innerHTML = this.alerts.map(alert => `
                <div class="alert-item ${alert.severity}">
                    <div class="alert-header">
                        <span class="alert-type">${alert.type.toUpperCase()}</span>
                        <span class="alert-time">${this.formatTime(alert.timestamp)}</span>
                        <button class="alert-dismiss" onclick="monitoringDashboard.dismissAlert('${alert.id}')">×</button>
                    </div>
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-value">Value: ${alert.value.toFixed(1)}${alert.type === 'temperature' ? '°C' : '%'}</div>
                </div>
            `).join('');
        }
    }

    dismissAlert(alertId) {
        this.alerts = this.alerts.filter(alert => alert.id !== alertId);
        this.updateAlertsTab();
    }

    clearAllAlerts() {
        if (confirm('Are you sure you want to clear all alerts?')) {
            this.alerts = [];
            this.updateAlertsTab();
        }
    }

    async exportData() {
        try {
            const exportData = {
                timestamp: Date.now(),
                systemData: this.currentSystemData,
                history: this.dataHistory,
                alerts: this.alerts,
                settings: this.settings
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `monitoring-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showSuccess('Data exported successfully');
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showError('Failed to export data');
        }
    }

    async exportAlerts() {
        try {
            const blob = new Blob([JSON.stringify(this.alerts, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `alerts-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showSuccess('Alerts exported successfully');
        } catch (error) {
            console.error('Failed to export alerts:', error);
            this.showError('Failed to export alerts');
        }
    }

    async loadHistory(timeRange) {
        // Calculate time range in milliseconds
        const rangeMs = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        }[timeRange] || 60 * 60 * 1000;

        const cutoffTime = Date.now() - rangeMs;

        // Filter history data
        const filteredHistory = {
            cpu: this.dataHistory.cpu.filter(item => item.timestamp > cutoffTime),
            memory: this.dataHistory.memory.filter(item => item.timestamp > cutoffTime),
            network: this.dataHistory.network.filter(item => item.timestamp > cutoffTime),
            disk: this.dataHistory.disk.filter(item => item.timestamp > cutoffTime)
        };

        // Calculate statistics
        const avgCpu = filteredHistory.cpu.length > 0
            ? filteredHistory.cpu.reduce((sum, item) => sum + item.usage, 0) / filteredHistory.cpu.length
            : 0;
        const peakCpu = filteredHistory.cpu.length > 0
            ? Math.max(...filteredHistory.cpu.map(item => item.usage))
            : 0;
        const avgMemory = filteredHistory.memory.length > 0
            ? filteredHistory.memory.reduce((sum, item) => sum + item.usage, 0) / filteredHistory.memory.length
            : 0;

        document.getElementById('avg-cpu').textContent = `${avgCpu.toFixed(1)}%`;
        document.getElementById('peak-cpu').textContent = `${peakCpu.toFixed(1)}%`;
        document.getElementById('avg-memory').textContent = `${avgMemory.toFixed(1)}%`;

        // Update history chart
        this.drawHistoryChart(filteredHistory);
    }

    drawHistoryChart(historyData) {
        const canvas = document.getElementById('history-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw CPU line
        if (historyData.cpu.length > 0) {
            this.drawLine(ctx, historyData.cpu, 'usage', '#89b4fa', width, height);
        }

        // Draw Memory line
        if (historyData.memory.length > 0) {
            this.drawLine(ctx, historyData.memory, 'usage', '#f9e2af', width, height);
        }
    }

    drawLine(ctx, data, field, color, width, height) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((value, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((value[field] || 0) / 100) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    }

    async storeMetrics(systemData) {
        try {
            const metrics = [
                {
                    type: 'cpu',
                    name: 'cpu_usage',
                    value: systemData.cpu.load.currentLoad,
                    timestamp: Date.now()
                },
                {
                    type: 'memory',
                    name: 'memory_usage',
                    value: (systemData.memory.used / systemData.memory.total) * 100,
                    timestamp: Date.now()
                },
                {
                    type: 'disk',
                    name: 'disk_usage',
                    value: systemData.diskUsage && systemData.diskUsage.length > 0
                        ? systemData.diskUsage[0].use
                        : 0,
                    timestamp: Date.now()
                }
            ];

            await fetch('/api/monitoring/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    metrics,
                    timestamp: Date.now()
                })
            });
        } catch (error) {
            console.error('Failed to store metrics:', error);
        }
    }

    forceUpdate() {
        const btn = document.getElementById('refresh-btn');
        btn.classList.add('spinning');
        this.updateData().finally(() => {
            btn.classList.remove('spinning');
        });
    }

    resizeCharts() {
        // Resize all charts in the active tab
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;

        activeTab.querySelectorAll('canvas').forEach(canvas => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        });

        // Redraw charts based on current tab
        if (this.currentTab === 'overview') {
            this.updateOverviewCharts();
        } else if (this.currentTab === 'history') {
            this.loadHistory('1h');
        }
    }

    show() {
        const dashboard = document.getElementById('monitoring-dashboard');
        if (dashboard) {
            dashboard.classList.remove('hidden');
            this.isVisible = true;
            this.forceUpdate();
            setTimeout(() => this.resizeCharts(), 100);
        }
    }

    hide() {
        const dashboard = document.getElementById('monitoring-dashboard');
        if (dashboard) {
            dashboard.classList.add('hidden');
            this.isVisible = false;
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // Utility methods
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            return Math.floor(diff / 60000) + ' min ago';
        } else if (diff < 86400000) { // Less than 1 day
            return Math.floor(diff / 3600000) + ' hours ago';
        } else {
            return date.toLocaleDateString();
        }
    }

    showNotification(message, severity = 'info') {
        // Simple notification - could be enhanced with a proper notification system
        const notification = document.createElement('div');
        notification.className = `notification ${severity}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${severity === 'critical' ? '#ff5555' : severity === 'warning' ? '#ffaa00' : '#00aa00'};
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    showSuccess(message) {
        this.showNotification(message, 'info');
    }

    showError(message) {
        this.showNotification(message, 'critical');
    }

    showAlertConfig() {
        // Simple alert configuration dialog
        const config = prompt(
            'Configure alerts (format: cpu:80,memory:85,disk:90,temp:70):',
            `${this.settings.cpuThreshold},${this.settings.memoryThreshold},${this.settings.diskThreshold},${this.settings.temperatureThreshold}`
        );

        if (config) {
            const values = config.split(',').map(v => parseFloat(v.trim()));
            if (values.length === 4 && values.every(v => !isNaN(v))) {
                this.settings.cpuThreshold = values[0];
                this.settings.memoryThreshold = values[1];
                this.settings.diskThreshold = values[2];
                this.settings.temperatureThreshold = values[3];
                this.saveSettings();
                this.showSuccess('Alert configuration updated');
            } else {
                this.showError('Invalid configuration format');
            }
        }
    }

    filterProcesses(filter = 'all') {
        // This is a simplified filter - in a real implementation,
        // you'd want more sophisticated filtering
        this.renderProcessesTable();
    }

    filterAlerts(severity) {
        const alertItems = document.querySelectorAll('#alerts-content .alert-item');
        alertItems.forEach(item => {
            if (severity === 'all') {
                item.style.display = 'block';
            } else {
                item.style.display = item.classList.contains(severity) ? 'block' : 'none';
            }
        });
    }

    updateChartRange(range) {
        // Update charts based on selected range
        console.log('Updating chart range:', range);
    }

    exportHistory() {
        this.exportData();
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all historical data?')) {
            this.dataHistory = {
                cpu: [],
                memory: [],
                network: [],
                disk: []
            };
            this.showSuccess('History cleared');
        }
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('monitoring_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('monitoring_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    loadAlerts() {
        try {
            const saved = localStorage.getItem('monitoring_alerts');
            if (saved) {
                this.alerts = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load alerts:', error);
        }
    }

    saveAlerts() {
        try {
            localStorage.setItem('monitoring_alerts', JSON.stringify(this.alerts));
        } catch (error) {
            console.error('Failed to save alerts:', error);
        }
    }
}

// Global instance
const monitoringDashboard = new MonitoringDashboard();