// Container Management Component  
class ContainerManager {
    constructor() {
        this.containers = [];
        this.isLoading = false;
    }

    async init(windowId) {
        this.windowId = windowId;
        await this.loadContainers();
    }

    render(windowId) {
        return `
            <div style="display: flex; flex-direction: column; height: 100%; background: var(--base);">
                <div style="padding: 1rem; background: var(--surface0); border-bottom: 1px solid var(--overlay0); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: var(--text);">🐳 Docker Containers</h3>
                    <button onclick="containerManager.refresh()" style="padding: 0.5rem 1rem; background: var(--blue); color: var(--base); border: none; border-radius: 4px; cursor: pointer;">🔄 Refresh</button>
                </div>
                <div id="cm-container-list-${windowId}" style="flex: 1; overflow-y: auto; padding: 1rem;">
                    <div style="color: var(--overlay0); text-align: center; padding: 2rem;">Loading containers...</div>
                </div>
                <div id="cm-notification" style="position: absolute; bottom: 1rem; right: 1rem; min-width: 250px; display: none; padding: 1rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;"></div>
            </div>
        `;
    }

    showNotification(message, type = 'info') {
        const notif = document.getElementById('cm-notification');
        if (!notif) return;

        const colors = {
            success: 'var(--green)',
            error: 'var(--red)',
            info: 'var(--blue)',
            loading: 'var(--yellow)'
        };

        const icons = {
            success: '✓',
            error: '✗',
            info: 'ℹ',
            loading: '⏳'
        };

        notif.style.background = colors[type] || colors.info;
        notif.style.color = 'var(--base)';
        notif.style.display = 'block';
        notif.innerHTML = `<strong>${icons[type] || icons.info}</strong> ${message}`;

        if (type !== 'loading') {
            setTimeout(() => {
                notif.style.display = 'none';
            }, 3000);
        }
    }

    async loadContainers() {
        try {
            const response = await fetch('/api/containers');
            const data = await response.json();

            this.containers = data.containers || [];
            this.updateUI();
        } catch (err) {
            console.error('Failed to load containers:', err);
            this.updateUI(`Error: ${err.message}`);
        }
    }

    updateUI(error = null) {
        const listEl = document.querySelector(`[id^="cm-container-list-"]`);
        if (!listEl) return;

        if (error) {
            listEl.innerHTML = `
                <div style="color: var(--red); text-align: center; padding: 2rem;">
                    ${error}<br>
                    <small style="color: var(--subtext0);">Make sure Docker is installed and running</small>
                </div>
            `;
            return;
        }

        if (this.containers.length === 0) {
            listEl.innerHTML = '<div style="color: var(--overlay0); text-align: center; padding: 2rem;">No containers found</div>';
            return;
        }

        listEl.innerHTML = this.containers.map(container => `
            <div id="container-${container.id}" style="background: var(--surface0); padding: 1rem; margin-bottom: 0.5rem; border-radius: 8px; border-left: 4px solid ${container.state === 'running' ? 'var(--green)' : 'var(--overlay0)'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <div>
                        <div style="color: var(--text); font-weight: 600; font-size: 1.1rem;">${container.name}</div>
                        <div style="color: var(--subtext0); font-size: 0.85rem; margin-top: 0.25rem;">${container.image}</div>
                    </div>
                    <span style="padding: 0.25rem 0.75rem; background: ${container.state === 'running' ? 'var(--green)' : 'var(--overlay0)'}; color: var(--base); border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                        ${container.state.toUpperCase()}
                    </span>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                    ${container.state === 'running' ? `
                        <button id="stop-${container.id}" onclick="containerManager.stopContainer('${container.id}')" style="padding: 0.5rem 1rem; background: var(--red); color: var(--base); border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">⏹️ Stop</button>
                        <button id="restart-${container.id}" onclick="containerManager.restartContainer('${container.id}')" style="padding: 0.5rem 1rem; background: var(--yellow); color: var(--base); border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">🔄 Restart</button>
                    ` : `
                        <button id="start-${container.id}" onclick="containerManager.startContainer('${container.id}')" style="padding: 0.5rem 1rem; background: var(--green); color: var(--base); border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">▶️ Start</button>
                    `}
                    <button id="logs-${container.id}" onclick="containerManager.viewLogs('${container.id}', '${container.name}')" style="padding: 0.5rem 1rem; background: var(--blue); color: var(--base); border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">📋 Logs</button>
                </div>
            </div>
        `).join('');
    }

    disableButtons(containerId) {
        const buttons = ['start', 'stop', 'restart', 'logs'];
        buttons.forEach(action => {
            const btn = document.getElementById(`${action}-${containerId}`);
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        });
    }

    enableButtons(containerId) {
        const buttons = ['start', 'stop', 'restart', 'logs'];
        buttons.forEach(action => {
            const btn = document.getElementById(`${action}-${containerId}`);
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    }

    async startContainer(id) {
        this.disableButtons(id);
        this.showNotification('Starting container...', 'loading');

        try {
            const response = await fetch(`/api/containers/${id}/start`, { method: 'POST' });
            const result = await response.json();

            if (response.ok) {
                this.showNotification('Container started successfully!', 'success');
                await this.refresh();
            } else {
                throw new Error(result.error || 'Failed to start container');
            }
        } catch (err) {
            this.showNotification(`Error: ${err.message}`, 'error');
            this.enableButtons(id);
        }
    }

    async stopContainer(id) {
        this.disableButtons(id);
        this.showNotification('Stopping container...', 'loading');

        try {
            const response = await fetch(`/api/containers/${id}/stop`, { method: 'POST' });
            const result = await response.json();

            if (response.ok) {
                this.showNotification('Container stopped successfully!', 'success');
                await this.refresh();
            } else {
                throw new Error(result.error || 'Failed to stop container');
            }
        } catch (err) {
            this.showNotification(`Error: ${err.message}`, 'error');
            this.enableButtons(id);
        }
    }

    async restartContainer(id) {
        this.disableButtons(id);
        this.showNotification('Restarting container...', 'loading');

        try {
            const response = await fetch(`/api/containers/${id}/restart`, { method: 'POST' });
            const result = await response.json();

            if (response.ok) {
                this.showNotification('Container restarted successfully!', 'success');
                await this.refresh();
            } else {
                throw new Error(result.error || 'Failed to restart container');
            }
        } catch (err) {
            this.showNotification(`Error: ${err.message}`, 'error');
            this.enableButtons(id);
        }
    }

    async viewLogs(id, name) {
        this.disableButtons(id);
        this.showNotification('Fetching logs...', 'loading');

        try {
            const response = await fetch(`/api/containers/${id}/logs?lines=100`);
            const result = await response.json();

            if (response.ok) {
                this.showNotification('Logs loaded!', 'success');
                this.enableButtons(id);

                // Create a new window for logs
                const logsContent = `
                    <div style="display: flex; flex-direction: column; height: 100%; background: #1e1e1e;">
                        <div style="padding: 1rem; background: #252526; border-bottom: 1px solid #3c3c3c; color: #ccc;">
                            <strong>📋 Logs: ${name}</strong> (last 100 lines)
                        </div>
                        <pre style="flex: 1; overflow: auto; margin: 0; padding: 1rem; font-family: 'Courier New', monospace; font-size: 0.85rem; color: #a6e3a1; background: #1e1e1e; line-height: 1.4;">${result.logs || 'No logs available'}</pre>
                    </div>
                `;

                windowManager.createWindow(`Logs: ${name}`, logsContent);
            } else {
                throw new Error(result.error || 'Failed to fetch logs');
            }
        } catch (err) {
            this.showNotification(`Error: ${err.message}`, 'error');
            this.enableButtons(id);
        }
    }

    async refresh() {
        this.showNotification('Refreshing...', 'loading');
        await this.loadContainers();
        this.showNotification('Containers refreshed!', 'success');
    }
}

// Global instance
const containerManager = new ContainerManager();

