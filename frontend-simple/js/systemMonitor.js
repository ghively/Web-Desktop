// System Monitor
class SystemMonitor {
    constructor() {
        this.cpuHistory = new Array(60).fill(0);
        this.ramHistory = new Array(60).fill(0);
        this.isPopupVisible = false;
    }

    init() {
        this.createPopup();
        this.startMonitoring();

        // Add click handler to system info
        const sysInfo = document.getElementById('system-info');
        if (sysInfo) {
            sysInfo.style.cursor = 'pointer';
            sysInfo.addEventListener('click', () => this.togglePopup());
        }

        // Close popup when clicking outside
        document.addEventListener('click', (e) => {
            const popup = document.getElementById('monitor-popup');
            const sysInfo = document.getElementById('system-info');
            if (popup && !popup.contains(e.target) && e.target !== sysInfo) {
                this.hidePopup();
            }
        });
    }

    createPopup() {
        const popup = document.createElement('div');
        popup.id = 'monitor-popup';
        popup.className = 'monitor-popup';
        popup.innerHTML = `
            <div class="monitor-header">
                <h3>⚡ System Monitor</h3>
            </div>
            <div class="monitor-stats">
                <div class="stat-row">
                    <div class="stat-label">
                        <span>CPU Usage</span>
                        <span class="stat-value" id="cpu-percent">0%</span>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-fill cpu" id="cpu-bar" style="width: 0%"></div>
                    </div>
                    <div class="mini-graph">
                        <canvas id="cpu-graph"></canvas>
                    </div>
                </div>
                <div class="stat-row">
                    <div class="stat-label">
                        <span>RAM Usage</span>
                        <span class="stat-value" id="ram-percent">0%</span>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-fill ram" id="ram-bar" style="width: 0%"></div>
                    </div>
                    <div class="mini-graph">
                        <canvas id="ram-graph"></canvas>
                    </div>
                </div>
                <div class="stat-row">
                    <div class="stat-label">
                        <span>Disk Usage</span>
                        <span class="stat-value" id="disk-percent">--</span>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-fill disk" id="disk-bar" style="width: 0%"></div>
                    </div>
                </div>
            </div>
            <div class="monitor-footer">
                <span>Updates every 3 seconds</span>
                <span id="uptime">Uptime: --</span>
            </div>
        `;

        // Append to topbar-right for positioning
        const topbarRight = document.querySelector('.topbar-right');
        if (topbarRight) {
            const sysInfo = document.getElementById('system-info');
            if (sysInfo) {
                sysInfo.style.position = 'relative';
                sysInfo.appendChild(popup);
            }
        }
    }

    togglePopup() {
        const popup = document.getElementById('monitor-popup');
        if (popup) {
            this.isPopupVisible = !this.isPopupVisible;
            popup.classList.toggle('visible', this.isPopupVisible);

            if (this.isPopupVisible) {
                this.updateGraphs();
            }
        }
    }

    hidePopup() {
        const popup = document.getElementById('monitor-popup');
        if (popup) {
            this.isPopupVisible = false;
            popup.classList.remove('visible');
        }
    }

    async startMonitoring() {
        await this.fetchStats();
        setInterval(() => this.fetchStats(), 3000);
    }

    async fetchStats() {
        try {
            const response = await fetch('/api/system');
            const data = await response.json();

            const cpuLoad = data.cpu?.currentLoad || 0;
            const ramUsed = data.mem?.used || 0;
            const ramTotal = data.mem?.total || 1;
            const ramPercent = (ramUsed / ramTotal) * 100;

            // Update history
            this.cpuHistory.shift();
            this.cpuHistory.push(cpuLoad);
            this.ramHistory.shift();
            this.ramHistory.push(ramPercent);

            // Update UI
            this.updateStats(cpuLoad, ramPercent);

            if (this.isPopupVisible) {
                this.updateGraphs();
            }
        } catch (err) {
            console.error('Failed to fetch system stats:', err);
        }
    }

    updateStats(cpu, ram) {
        // Update top bar
        const sysInfo = document.getElementById('system-info');
        if (sysInfo) {
            sysInfo.innerHTML = `CPU: ${cpu.toFixed(1)}% | RAM: ${ram.toFixed(1)}%`;
        }

        // Update popup if visible
        const cpuPercent = document.getElementById('cpu-percent');
        const cpuBar = document.getElementById('cpu-bar');
        const ramPercent = document.getElementById('ram-percent');
        const ramBar = document.getElementById('ram-bar');

        if (cpuPercent) cpuPercent.textContent = `${cpu.toFixed(1)}%`;
        if (cpuBar) cpuBar.style.width = `${cpu}%`;
        if (ramPercent) ramPercent.textContent = `${ram.toFixed(1)}%`;
        if (ramBar) ramBar.style.width = `${ram}%`;
    }

    updateGraphs() {
        this.drawGraph('cpu-graph', this.cpuHistory, '#89b4fa');
        this.drawGraph('ram-graph', this.ramHistory, '#f9e2af');
    }

    drawGraph(canvasId, data, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;

        canvas.width = width;
        canvas.height = height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const stepX = width / (data.length - 1);
        data.forEach((value, i) => {
            const x = i * stepX;
            const y = height - (value / 100) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Fill area under line
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

// Global instance
const systemMonitor = new SystemMonitor();
