// Desktop initialization
let selectedIndex = 0;
let currentTab = 'installed';
let installedApps = [];
let availableApps = [];
let fuse = null; // Fuse.js instance for fuzzy search

document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);

    updateSystemInfo();
    setInterval(updateSystemInfo, 3000);

    loadSettings();
    systemMonitor.init();

    const modeToggle = document.getElementById('mode-toggle');
    const modeText = document.getElementById('mode-text');
    if (modeToggle) {
        modeToggle.addEventListener('click', () => {
            const newMode = windowManager.toggleMode();
            modeText.textContent = newMode.toUpperCase();
        });
    }

    const launcherButton = document.getElementById('launcher-button');
    if (launcherButton) {
        launcherButton.addEventListener('click', () => openLauncher());
    }

    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => openSettings());
    }

    const virtualBtn = document.getElementById('virtual-desktops-button');
    if (virtualBtn) virtualBtn.addEventListener('click', openVirtualDesktops);

    const aiBtn = document.getElementById('ai-integration-button');
    if (aiBtn) aiBtn.addEventListener('click', openAIIntegration);

    const poolsBtn = document.getElementById('storage-pools-button');
    if (poolsBtn) poolsBtn.addEventListener('click', openStoragePools);

    const proxyBtn = document.getElementById('nginx-proxy-button');
    if (proxyBtn) proxyBtn.addEventListener('click', openProxyManager);

    const sharesBtn = document.getElementById('shares-button');
    if (sharesBtn) sharesBtn.addEventListener('click', openSharesManager);

    const wifiBtn = document.getElementById('wifi-button');
    if (wifiBtn) wifiBtn.addEventListener('click', openWiFiManager);

    const mediaBtn = document.getElementById('media-server-button');
    if (mediaBtn) mediaBtn.addEventListener('click', openMediaServer);

    const haBtn = document.getElementById('home-assistant-button');
    if (haBtn) haBtn.addEventListener('click', openHomeAssistant);

    // Optional: power management quick launcher if added to UI later
    const powerBtn = document.getElementById('power-management-button');
    if (powerBtn) powerBtn.addEventListener('click', openPowerManagement);

    initializeSettings();
    initializeLauncher();

    window.addEventListener('resize', () => {
        if (windowManager.mode === 'tiling') {
            windowManager.applyTiling();
        }
    });
});

function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) clock.textContent = new Date().toLocaleTimeString();
}

async function updateSystemInfo() {
    // System monitor handles this now
}

function loadSettings() {
    const opacity = localStorage.getItem('windowOpacity') || '0.95';
    const wallpaper = localStorage.getItem('wallpaper') || 'https://cdn.mos.cms.futurecdn.net/AoWXgnHSxAAPxqymPQMQYL-1200-80.jpg';
    const useGradient = localStorage.getItem('useGradient') === 'true';

    document.documentElement.style.setProperty('--window-opacity', opacity);

    if (!useGradient && wallpaper) {
        document.documentElement.style.setProperty('--wallpaper', `url(${wallpaper})`);
        if (!localStorage.getItem('wallpaper')) {
            localStorage.setItem('wallpaper', wallpaper);
            localStorage.setItem('useGradient', 'false');
        }
    }
}

function initializeSettings() {
    const panel = document.getElementById('settings-panel');
    const closeBtn = document.getElementById('close-settings');
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityValue = document.getElementById('opacity-value');
    const wallpaperInput = document.getElementById('wallpaper-url');
    const gradientCheckbox = document.getElementById('use-gradient');

    if (!panel) return;

    opacitySlider.value = localStorage.getItem('windowOpacity') || '0.95';
    opacityValue.textContent = (parseFloat(opacitySlider.value) * 100).toFixed(0) + '%';
    wallpaperInput.value = localStorage.getItem('wallpaper') || 'https://cdn.mos.cms.futurecdn.net/AoWXgnHSxAAPxqymPQMQYL-1200-80.jpg';
    gradientCheckbox.checked = localStorage.getItem('useGradient') === 'true';

    opacitySlider.addEventListener('input', (e) => {
        const value = e.target.value;
        opacityValue.textContent = (parseFloat(value) * 100).toFixed(0) + '%';
        document.documentElement.style.setProperty('--window-opacity', value);
        localStorage.setItem('windowOpacity', value);
    });

    wallpaperInput.addEventListener('change', (e) => {
        const url = e.target.value;
        localStorage.setItem('wallpaper', url);
        if (url && !gradientCheckbox.checked) {
            document.documentElement.style.setProperty('--wallpaper', `url(${url})`);
        }
    });

    gradientCheckbox.addEventListener('change', (e) => {
        const useGradient = e.target.checked;
        localStorage.setItem('useGradient', useGradient.toString());

        if (useGradient) {
            document.documentElement.style.setProperty('--wallpaper',
                'linear-gradient(135deg, var(--base) 0%, var(--mantle) 50%, var(--crust) 100%)');
        } else {
            const wallpaper = wallpaperInput.value;
            if (wallpaper) {
                document.documentElement.style.setProperty('--wallpaper', `url(${wallpaper})`);
            }
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            panel.classList.add('hidden');
        });
    }

    panel.addEventListener('click', (e) => {
        if (e.target === panel) {
            panel.classList.add('hidden');
        }
    });
}

function openSettings() {
    const panel = document.getElementById('settings-panel');
    if (panel) panel.classList.remove('hidden');
}

function openVirtualDesktops() {
    const content = `
        <div class="app-grid">
            <div class="app-card">
                <h3>Desktops</h3>
                <div id="vd-list" class="list"></div>
                <div class="controls">
                    <button id="vd-add" class="primary">Add Desktop</button>
                </div>
            </div>
            <div class="app-card">
                <h3>Actions</h3>
                <div class="controls">
                    <button id="vd-tiling" class="secondary">Tiling Mode</button>
                    <button id="vd-floating" class="secondary">Floating Mode</button>
                </div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('Virtual Desktops', content);
    const list = win.element.querySelector('#vd-list');
    const render = () => {
        list.innerHTML = windowManager.windows.map((w, i) => `<div class="list-item">Desktop ${i + 1} • ${w.title || 'Window'}</div>`).join('');
    };
    render();
    win.element.querySelector('#vd-add').addEventListener('click', () => {
        windowManager.createWindow(`Desktop ${windowManager.windows.length + 1}`, '<div class="p-4">New desktop window</div>');
        render();
    });
    win.element.querySelector('#vd-tiling').addEventListener('click', () => {
        windowManager.mode = 'tiling';
        windowManager.applyTiling();
    });
    win.element.querySelector('#vd-floating').addEventListener('click', () => {
        windowManager.mode = 'floating';
        windowManager.applyTiling();
    });
}

function openAIIntegration() {
    const content = `
        <div class="app-grid">
            <div class="app-card">
                <h3>AI Services</h3>
                <div id="ai-services" class="list">Loading...</div>
                <button id="ai-refresh" class="secondary">Refresh</button>
            </div>
            <div class="app-card">
                <h3>Chat</h3>
                <textarea id="ai-prompt" class="input" rows="4" placeholder="Ask anything..."></textarea>
                <button id="ai-send" class="primary">Send</button>
                <div id="ai-response" class="output"></div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('AI Integration', content);
    const servicesEl = win.element.querySelector('#ai-services');
    const loadServices = async () => {
        servicesEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/ai-integration/services');
            const data = await res.json();
            servicesEl.innerHTML = data.map(s => `<div class="list-item">${s.name} • ${s.type}</div>`).join('');
        } catch {
            servicesEl.textContent = 'Failed to load services';
        }
    };
    loadServices();
    win.element.querySelector('#ai-refresh').addEventListener('click', loadServices);
    win.element.querySelector('#ai-send').addEventListener('click', async () => {
        const prompt = win.element.querySelector('#ai-prompt').value;
        const out = win.element.querySelector('#ai-response');
        out.textContent = 'Sending...';
        try {
            const res = await fetch('/api/ai-integration/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: prompt, limit: 5 })
            });
            const data = await res.json();
            out.innerHTML = (data.results || []).map(r => `<div class="list-item">${r.name || r.path}</div>`).join('') || 'No results';
        } catch {
            out.textContent = 'AI request failed';
        }
    });
}

function openStoragePools() {
    const content = `
        <div class="app-card">
            <h3>Storage Pools</h3>
            <div id="pools-list" class="list">Loading...</div>
            <button id="pools-refresh" class="secondary">Refresh</button>
        </div>
    `;
    const win = windowManager.createWindow('Storage Pools', content);
    const list = win.element.querySelector('#pools-list');
    const load = async () => {
        list.textContent = 'Loading...';
        try {
            const res = await fetch('/api/storage-pools');
            const data = await res.json();
            list.innerHTML = data.map(p => `<div class="list-item">${p.name} • ${p.status || 'unknown'}</div>`).join('') || 'No pools';
        } catch {
            list.textContent = 'Failed to load pools';
        }
    };
    load();
    win.element.querySelector('#pools-refresh').addEventListener('click', load);
}

function openAIModels() {
    const content = `
        <div class="app-grid">
            <div class="app-card">
                <h3>Model Status</h3>
                <div id="aimodel-status" class="list">Loading...</div>
                <div class="controls">
                    <button id="aimodel-refresh" class="secondary">Refresh</button>
                    <button id="aimodel-test-ollama" class="secondary">Test Ollama</button>
                    <button id="aimodel-test-openrouter" class="secondary">Test OpenRouter</button>
                </div>
            </div>
            <div class="app-card">
                <h3>Task Routing</h3>
                <div id="aimodel-tasks" class="list">Loading...</div>
                <div class="controls">
                    <input id="aimodel-task-type" class="input" placeholder="task type (e.g. summarize)" />
                    <select id="aimodel-task-provider" class="input">
                        <option value="ollama">Ollama</option>
                        <option value="openrouter">OpenRouter</option>
                    </select>
                    <input id="aimodel-task-model" class="input" placeholder="preferred model id" />
                    <button id="aimodel-save-task" class="secondary">Save Route</button>
                </div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('AI Model Manager', content);
    const statusEl = win.element.querySelector('#aimodel-status');
    const tasksEl = win.element.querySelector('#aimodel-tasks');
    const taskTypeInput = win.element.querySelector('#aimodel-task-type');
    const taskProviderSelect = win.element.querySelector('#aimodel-task-provider');
    const taskModelInput = win.element.querySelector('#aimodel-task-model');

    const loadStatus = async () => {
        statusEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/ai-model-manager/status');
            const data = await res.json();
            statusEl.innerHTML = `
                <div class="list-item">Ollama: ${data.ollama?.connected ? 'Connected' : 'Offline'}</div>
                <div class="list-item">OpenRouter: ${data.openrouter?.connected ? 'Connected' : 'Offline'}</div>
                <div class="list-item">Models: ${(data.ollama?.models?.length || 0) + (data.openrouter?.models?.length || 0)}</div>
            `;
        } catch {
            statusEl.textContent = 'Failed to load';
        }
    };

    const loadTasks = async () => {
        tasksEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/ai-model-manager/config');
            const data = await res.json();
            const assignments = data.taskAssignments || {};
            tasksEl.innerHTML = Object.entries(assignments).map(([task, cfg]) =>
                `<div class="list-item">${task}: ${cfg.provider} → ${cfg.preferredModel || 'default'}</div>`
            ).join('') || 'No tasks';
        } catch {
            tasksEl.textContent = 'Failed to load';
        }
    };

    loadStatus();
    loadTasks();
    win.element.querySelector('#aimodel-refresh').addEventListener('click', () => {
        loadStatus();
        loadTasks();
    });
    const saveTask = async () => {
        const taskType = (taskTypeInput.value || '').trim();
        const provider = taskProviderSelect.value;
        const model = (taskModelInput.value || '').trim();
        if (!taskType || !model) {
            alert('Task type and model are required');
            return;
        }
        try {
            await fetch('/api/ai-model-manager/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskType,
                    provider,
                    preferredModel: model,
                    fallbackProvider: provider,
                    fallbackModel: model
                })
            });
            loadTasks();
        } catch {
            alert('Failed to save task route');
        }
    };
    win.element.querySelector('#aimodel-save-task').addEventListener('click', saveTask);
    win.element.querySelector('#aimodel-test-ollama').addEventListener('click', async () => {
        try { await fetch('/api/ai-model-manager/test/ollama', { method: 'POST' }); alert('Ollama test sent'); } catch { alert('Ollama test failed'); }
    });
    win.element.querySelector('#aimodel-test-openrouter').addEventListener('click', async () => {
        try { await fetch('/api/ai-model-manager/test/openrouter', { method: 'POST' }); alert('OpenRouter test sent'); } catch { alert('OpenRouter test failed'); }
    });
}

function openPowerManagement() {
    const content = `
        <div class="app-grid">
            <div class="app-card">
                <h3>System Power</h3>
                <div id="power-status" class="list">Loading...</div>
                <div class="controls">
                    <button id="power-refresh" class="secondary">Refresh</button>
                    <button id="power-monitor-toggle" class="secondary">Toggle Monitoring</button>
                </div>
            </div>
            <div class="app-card">
                <h3>Controls</h3>
                <div class="controls">
                    <button id="power-suspend" class="secondary">Suspend</button>
                    <button id="power-reboot" class="secondary">Reboot</button>
                    <button id="power-shutdown" class="secondary danger">Shutdown</button>
                </div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('Power Management', content);
    const statusEl = win.element.querySelector('#power-status');
    let monitoringEnabled = false;

    const load = async () => {
        statusEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/power-management/status');
            const data = await res.json();
            statusEl.innerHTML = `
                <div class="list-item">Battery: ${data.battery?.level ?? '--'}%</div>
                <div class="list-item">AC: ${data.ac?.connected ? 'Connected' : 'Not connected'}</div>
                <div class="list-item">Uptime: ${Math.floor((data.uptime || 0)/3600)}h</div>
                <div class="list-item">Monitoring: ${data.monitoring?.enabled ? 'On' : 'Off'}</div>
            `;
            monitoringEnabled = !!data.monitoring?.enabled;
        } catch {
            statusEl.textContent = 'Failed to load';
        }
    };

    const sendAction = async (action) => {
        try {
            await fetch(`/api/power-management/${action}`, { method: 'POST' });
            alert(`${action} requested`);
        } catch {
            alert(`${action} failed`);
        }
    };

    load();
    win.element.querySelector('#power-refresh').addEventListener('click', load);
    win.element.querySelector('#power-suspend').addEventListener('click', () => sendAction('suspend'));
    win.element.querySelector('#power-reboot').addEventListener('click', () => sendAction('reboot'));
    win.element.querySelector('#power-shutdown').addEventListener('click', () => sendAction('shutdown'));
    win.element.querySelector('#power-monitor-toggle').addEventListener('click', async () => {
        const action = monitoringEnabled ? 'stop' : 'start';
        await fetch(`/api/power-management/monitoring/${action}`, { method: 'POST' }).catch(() => {});
        load();
    });
}

function openMonitoring() {
    const content = `
        <div class="app-grid">
            <div class="app-card">
                <h3>Summary</h3>
                <div id="mon-summary" class="list">Loading...</div>
                <button id="mon-refresh" class="secondary">Refresh</button>
            </div>
            <div class="app-card">
                <h3>Performance</h3>
                <div id="mon-performance" class="list">Loading...</div>
            </div>
            <div class="app-card">
                <h3>Disk IO</h3>
                <div id="mon-disk" class="list">Loading...</div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('Monitoring', content);
    const summaryEl = win.element.querySelector('#mon-summary');
    const perfEl = win.element.querySelector('#mon-performance');
    const diskEl = win.element.querySelector('#mon-disk');

    const loadSummary = async () => {
        summaryEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/system-monitoring');
            const data = await res.json();
            summaryEl.innerHTML = `
                <div class="list-item">CPU: ${data.cpu?.usage ?? '--'}%</div>
                <div class="list-item">Memory: ${data.mem?.used ?? '--'} / ${data.mem?.total ?? '--'}</div>
                <div class="list-item">Load: ${data.load?.avg1 ?? '--'}, ${data.load?.avg5 ?? '--'}, ${data.load?.avg15 ?? '--'}</div>
            `;
        } catch {
            summaryEl.textContent = 'Failed to load';
        }
    };

    const loadPerformance = async () => {
        perfEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/system-monitoring/performance');
            const data = await res.json();
            perfEl.innerHTML = data.map(p => `<div class="list-item">${p.type}: ${p.value}${p.unit || ''}</div>`).join('') || 'No metrics';
        } catch {
            perfEl.textContent = 'Failed to load';
        }
    };

    const loadDisk = async () => {
        diskEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/system-monitoring/disk-io');
            const data = await res.json();
            diskEl.innerHTML = data.map(d => `<div class="list-item">${d.device || ''}: R ${d.readBytes || 0} B • W ${d.writeBytes || 0} B</div>`).join('') || 'No disk data';
        } catch {
            diskEl.textContent = 'Failed to load';
        }
    };

    const refresh = () => { loadSummary(); loadPerformance(); loadDisk(); };
    refresh();
    win.element.querySelector('#mon-refresh').addEventListener('click', refresh);
}

function openProxyManager() {
    const content = `
        <div class="app-card">
            <h3>Nginx Proxy</h3>
            <div id="proxy-status" class="list">Loading...</div>
            <div class="controls">
                <button id="proxy-refresh" class="secondary">Refresh</button>
                <button id="proxy-reload" class="secondary">Reload</button>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('Nginx Proxy', content);
    const statusEl = win.element.querySelector('#proxy-status');
    const load = async () => {
        statusEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/nginx-proxy/status');
            const data = await res.json();
            statusEl.innerHTML = `<div class="list-item">Status: ${data.status || 'unknown'}</div>`;
        } catch {
            statusEl.textContent = 'Failed to load status';
        }
    };
    load();
    win.element.querySelector('#proxy-refresh').addEventListener('click', load);
    win.element.querySelector('#proxy-reload').addEventListener('click', async () => {
        try { await fetch('/api/nginx-proxy/reload', { method: 'POST' }); alert('Reload requested'); } catch { alert('Reload failed'); }
    });
}

function openSharesManager() {
    const content = `
        <div class="app-card">
            <h3>Shares</h3>
            <div class="tabs">
                <button class="tab-button active" data-tab="nfs">NFS</button>
                <button class="tab-button" data-tab="smb">SMB</button>
                <button class="tab-button" data-tab="smbusers">SMB Users</button>
            </div>
            <div id="shares-content">
                <div id="shares-nfs" class="list">Loading...</div>
                <div id="shares-smb" class="list hidden">Loading...</div>
                <div id="shares-smbusers" class="list hidden">Loading...</div>
            </div>
            <div class="controls" id="shares-form">
                <input id="share-name" class="input" placeholder="Name" />
                <input id="share-path" class="input" placeholder="Path" />
                <select id="share-type" class="input">
                    <option value="nfs">NFS</option>
                    <option value="smb">SMB</option>
                </select>
                <button id="shares-create" class="primary">Create</button>
                <button id="shares-refresh" class="secondary">Refresh</button>
            </div>
            <div class="controls hidden" id="shares-smbuser-form">
                <input id="smb-username" class="input" placeholder="SMB username" />
                <input id="smb-password" type="password" class="input" placeholder="Password (Linux user must exist)" />
                <button id="smb-user-create" class="primary">Add SMB User</button>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('Shares Manager', content);
    const nfsEl = win.element.querySelector('#shares-nfs');
    const smbEl = win.element.querySelector('#shares-smb');
    const smbUsersEl = win.element.querySelector('#shares-smbusers');
    const tabs = win.element.querySelectorAll('.tab-button');
    const smbUserForm = win.element.querySelector('#shares-smbuser-form');
    const smbUserInput = win.element.querySelector('#smb-username');
    const smbPassInput = win.element.querySelector('#smb-password');
    const nameInput = win.element.querySelector('#share-name');
    const pathInput = win.element.querySelector('#share-path');
    const typeSelect = win.element.querySelector('#share-type');
    const loadNfs = async () => {
        nfsEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/shares/nfs');
            const data = await res.json();
            nfsEl.innerHTML = (data.shares || []).map(s => `<div class="list-item">${s.name || s.id} • ${s.path || ''} <button data-id="${s.id}" class="danger small share-delete" data-type="nfs">Delete</button></div>`).join('') || 'No NFS shares';
        } catch {
            nfsEl.textContent = 'Failed to load NFS shares';
        }
    };
    const loadSmb = async () => {
        smbEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/shares/smb');
            const data = await res.json();
            smbEl.innerHTML = (data.shares || []).map(s => `<div class="list-item">${s.name || s.id} • ${s.path || ''} <button data-id="${s.id}" class="danger small share-delete" data-type="smb">Delete</button></div>`).join('') || 'No SMB shares';
        } catch {
            smbEl.textContent = 'Failed to load SMB shares';
        }
    };
    const loadSmbUsers = async () => {
        smbUsersEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/shares/smb/users');
            const data = await res.json();
            smbUsersEl.innerHTML = (data.users || []).map(u => `<div class="list-item">${u.username}</div>`).join('') || 'No SMB users';
        } catch {
            smbUsersEl.textContent = 'Failed to load SMB users';
        }
    };
    const refreshAll = () => { loadNfs(); loadSmb(); loadSmbUsers(); };
    refreshAll();

    tabs.forEach(tab => tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const selected = tab.dataset.tab;
        nfsEl.classList.add('hidden');
        smbEl.classList.add('hidden');
        smbUsersEl.classList.add('hidden');
        win.element.querySelector('#shares-form').classList.add('hidden');
        smbUserForm.classList.add('hidden');
        if (selected === 'nfs') { nfsEl.classList.remove('hidden'); win.element.querySelector('#shares-form').classList.remove('hidden'); }
        if (selected === 'smb') { smbEl.classList.remove('hidden'); win.element.querySelector('#shares-form').classList.remove('hidden'); }
        if (selected === 'smbusers') { smbUsersEl.classList.remove('hidden'); smbUserForm.classList.remove('hidden'); }
    }));

    win.element.querySelector('#shares-refresh').addEventListener('click', refreshAll);
    win.element.querySelector('#shares-create').addEventListener('click', async () => {
        const name = nameInput.value.trim();
        const path = pathInput.value.trim();
        const type = typeSelect.value;
        if (!name || !path) {
            alert('Name and path required');
            return;
        }
        const endpoint = type === 'nfs' ? '/api/shares/nfs' : '/api/shares/smb';
        await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, path, type })
        }).catch(() => {});
        nameInput.value = '';
        pathInput.value = '';
        refreshAll();
    });

    win.element.querySelector('#shares-content').addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('share-delete')) {
            const id = target.dataset.id;
            const type = target.dataset.type;
            if (!confirm('Delete share?')) return;
            const endpoint = type === 'nfs' ? `/api/shares/nfs/${id}` : `/api/shares/smb/${id}`;
            await fetch(endpoint, { method: 'DELETE' }).catch(() => {});
            refreshAll();
        }
    });
    win.element.querySelector('#smb-user-create').addEventListener('click', async () => {
        const username = smbUserInput.value.trim();
        const password = smbPassInput.value;
        if (!username || !password) { alert('Username and password required'); return; }
        await fetch('/api/shares/smb/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).catch(() => {});
        smbUserInput.value = '';
        smbPassInput.value = '';
        loadSmbUsers();
    });
}

function openWiFiManager() {
    const content = `
        <div class="app-grid">
            <div class="app-card">
                <h3>Interfaces</h3>
                <div id="wifi-interfaces" class="list">Loading...</div>
            </div>
            <div class="app-card">
                <h3>Networks</h3>
                <div id="wifi-networks" class="list">Loading...</div>
                <button id="wifi-scan" class="primary">Scan</button>
                <div class="controls">
                    <input id="wifi-ssid" class="input" placeholder="SSID" />
                    <input id="wifi-pass" class="input" placeholder="Password" />
                    <button id="wifi-connect" class="secondary">Connect</button>
                </div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('WiFi Management', content);
    const ifaces = win.element.querySelector('#wifi-interfaces');
    const nets = win.element.querySelector('#wifi-networks');
    const ssidInput = win.element.querySelector('#wifi-ssid');
    const passInput = win.element.querySelector('#wifi-pass');
    const loadInterfaces = async () => {
        ifaces.textContent = 'Loading...';
        try {
            const res = await fetch('/api/wifi-management/interfaces');
            const data = await res.json();
            ifaces.innerHTML = data.map(i => `<div class="list-item">${i.name} • ${i.state} <button class="danger small wifi-disconnect" data-iface="${i.name}">Disconnect</button></div>`).join('') || 'No interfaces';
            ifaces.querySelectorAll('.wifi-disconnect').forEach(btn => {
                btn.addEventListener('click', async () => {
                    await fetch('/api/wifi-management/disconnect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ interface: btn.dataset.iface })
                    }).catch(() => {});
                    loadInterfaces();
                });
            });
        } catch {
            ifaces.textContent = 'Failed to load interfaces';
        }
    };
    const scanNetworks = async () => {
        nets.textContent = 'Scanning...';
        try {
            const res = await fetch('/api/wifi-management/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
            const data = await res.json();
            nets.innerHTML = data.map(n => `<div class="list-item">${n.ssid} • ${n.signalStrength}dBm</div>`).join('') || 'No networks';
        } catch {
            nets.textContent = 'Scan failed';
        }
    };
    loadInterfaces();
    scanNetworks();
    win.element.querySelector('#wifi-scan').addEventListener('click', scanNetworks);
    win.element.querySelector('#wifi-connect').addEventListener('click', async () => {
        const ssid = ssidInput.value.trim();
        const password = passInput.value;
        if (!ssid) {
            alert('SSID required');
            return;
        }
        await fetch('/api/wifi-management/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ssid, password })
        }).catch(() => {});
        scanNetworks();
        loadInterfaces();
    });
}

function openMediaServer() {
    const content = `
        <div class="app-grid">
            <div class="app-card">
                <h3>Libraries</h3>
                <div id="media-libraries" class="list">Loading...</div>
                <div class="controls">
                    <button id="media-refresh" class="secondary">Refresh</button>
                    <button id="media-scan" class="secondary">Scan</button>
                </div>
            </div>
            <div class="app-card">
                <h3>Transcoding</h3>
                <div id="media-transcodes" class="list">Loading...</div>
                <div class="controls">
                    <input id="media-item-id" class="input" placeholder="Item ID to transcode" />
                    <button id="media-start-transcode" class="primary">Start</button>
                </div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('Media Server', content);
    const libs = win.element.querySelector('#media-libraries');
    const trans = win.element.querySelector('#media-transcodes');
    const itemInput = win.element.querySelector('#media-item-id');
    const load = async () => {
        libs.textContent = 'Loading...';
        try {
            const res = await fetch('/api/media-server/libraries');
            const data = await res.json();
            libs.innerHTML = data.map(l => `<div class="list-item">${l.name} • ${l.type}</div>`).join('') || 'No libraries';
        } catch {
            libs.textContent = 'Failed to load';
        }
    };
    const loadTranscodes = async () => {
        trans.textContent = 'Loading...';
        try {
            const res = await fetch('/api/media-server/transcoding');
            const data = await res.json();
            trans.innerHTML = data.map(t => `<div class="list-item">${t.itemId || ''} • ${t.status || ''}</div>`).join('') || 'No jobs';
        } catch {
            trans.textContent = 'Failed to load';
        }
    };
    load();
    loadTranscodes();
    win.element.querySelector('#media-refresh').addEventListener('click', load);
    win.element.querySelector('#media-scan').addEventListener('click', async () => {
        await fetch('/api/media-server/scan', { method: 'POST' }).catch(() => {});
        load();
    });
    win.element.querySelector('#media-start-transcode').addEventListener('click', async () => {
        const id = itemInput.value.trim();
        if (!id) { alert('Item ID required'); return; }
        await fetch('/api/media-server/transcoding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: id })
        }).catch(() => {});
        itemInput.value = '';
        loadTranscodes();
    });
}

function openHomeAssistant() {
    const content = `
        <div class="app-card">
            <h3>Home Assistant</h3>
            <div id="ha-status" class="list">Loading...</div>
            <div class="controls">
                <button id="ha-refresh" class="secondary">Refresh</button>
            </div>
            <h4>Entities</h4>
            <div id="ha-entities" class="list">Loading...</div>
        </div>
    `;
    const win = windowManager.createWindow('Home Assistant', content);
    const statusEl = win.element.querySelector('#ha-status');
    const entitiesEl = win.element.querySelector('#ha-entities');
    const load = async () => {
        statusEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/home-assistant/status');
            const data = await res.json();
            statusEl.innerHTML = `<div class="list-item">Connected: ${data.connected ? 'Yes' : 'No'}</div><div class="list-item">Entities: ${data.entities || 0}</div>`;
        } catch {
            statusEl.textContent = 'Failed to load';
        }
    };
    const loadEntities = async () => {
        entitiesEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/home-assistant/entities');
            const data = await res.json();
            entitiesEl.innerHTML = data.map(e => `<div class="list-item">${e.entity_id || e.id} • ${e.state || ''}</div>`).join('') || 'No entities';
        } catch {
            entitiesEl.textContent = 'Failed to load entities';
        }
    };
    load();
    loadEntities();
    win.element.querySelector('#ha-refresh').addEventListener('click', () => { load(); loadEntities(); });
}

function isAppRunning(appName) {
    // Check if a window with this app name is currently open
    return windowManager.windows.some(win =>
        win.title.toLowerCase() === appName.toLowerCase()
    );
}

function renderLauncherApps(filter = '') {
    const appsContainer = document.getElementById('launcher-apps-list');
    if (!appsContainer) return;

    const apps = currentTab === 'installed' ? installedApps : availableApps;
    let filtered = apps;

    if (filter) {
        if (typeof Fuse !== 'undefined') {
            const fuse = new Fuse(apps, {
                keys: ['name', 'description'],
                threshold: 0.6
            });
            filtered = fuse.search(filter).map(result => result.item);
        } else {
            filtered = apps.filter(app =>
                app.name.toLowerCase().includes(filter.toLowerCase())
            );
        }
    }

    // Limit results to top 50 to prevent lag
    filtered = filtered.slice(0, 50);

    // Use fuzzy search if filter exists and Fuse.js is available
    if (filter && filter.trim() && typeof Fuse !== 'undefined') {
        // Initialize or update Fuse instance
        if (!fuse || fuse._docs !== apps) {
            fuse = new Fuse(apps, {
                keys: [
                    { name: 'name', weight: 2 },
                    { name: 'description', weight: 1 },
                    { name: 'categories', weight: 0.5 }
                ],
                threshold: 0.4,
                includeScore: true,
                minMatchCharLength: 1
            });
        }
        filtered = fuse.search(filter).map(result => result.item);
    } else {
        // Fallback to simple filtering if no query or Fuse.js not available
        filtered = filter
            ? apps.filter(app => app.name.toLowerCase().includes(filter.toLowerCase()))
            : apps;
    }

    // Separate running apps from available apps
    const runningApps = filtered.filter(app => isAppRunning(app.name));
    const notRunningApps = filtered.filter(app => !isAppRunning(app.name));

    // Build HTML for running apps section
    let html = '';

    if (runningApps.length > 0) {
        html += '<div style="padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 600; color: var(--overlay0); text-transform: uppercase; letter-spacing: 0.05em;">Running Apps</div>';
        html += runningApps.map((app, i) => `
            <button class="launcher-app-item ${i === selectedIndex ? 'selected' : ''}" data-app-id="${app.id || app.name}">
                <span class="icon">${app.icon || '📦'}</span>
                <span style="color: var(--green); font-size: 0.8em; margin-right: 0.5rem;">▶</span>
                <span style="flex: 1;">${app.name}${app.description ? '<br><small style="color: var(--subtext0);">' + app.description + '</small>' : ''}</span>
                ${currentTab === 'available' ? `
                    <div class="app-actions">
                        <button class="app-action-btn install-btn" data-package="${app.name}">Install</button>
                    </div>
                ` : ''}
            </button>
        `).join('');
    }

    if (notRunningApps.length > 0) {
        if (runningApps.length > 0) {
            html += '<div style="padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 600; color: var(--overlay0); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.5rem;">Available Apps</div>';
        }
        html += notRunningApps.map((app, i) => {
            const globalIndex = runningApps.length + i;
            return `
                <button class="launcher-app-item ${globalIndex === selectedIndex ? 'selected' : ''}" data-app-id="${app.id || app.name}">
                    <span class="icon">${app.icon || '📦'}</span>
                    <span style="flex: 1;">${app.name}${app.description ? '<br><small style="color: var(--subtext0);">' + app.description + '</small>' : ''}</span>
                    ${currentTab === 'available' ? `
                        <div class="app-actions">
                            <button class="app-action-btn install-btn" data-package="${app.name}">Install</button>
                        </div>
                    ` : ''}
                </button>
            `;
        }).join('');
    }

    if (filtered.length === 0) {
        html = '<div style="padding: 2rem; text-align: center; color: var(--overlay0);">No apps found</div>';
    }

    appsContainer.innerHTML = html;

    const launcher = document.getElementById('app-launcher');

    appsContainer.querySelectorAll('.launcher-app-item').forEach((el, i) => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('install-btn')) return;

            if (currentTab === 'installed') {
                launchApp(el.dataset.appId);
                if (launcher) launcher.classList.add('hidden');
            }
        });
    });

    appsContainer.querySelectorAll('.install-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            installPackage(btn.dataset.package);
        });
    });
}

function initializeLauncher() {
    const launcher = document.getElementById('app-launcher');
    const launcherSearch = document.getElementById('launcher-search');
    const tabs = document.querySelectorAll('.launcher-tab');

    if (!launcher) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;

            if (currentTab === 'available' && availableApps.length === 0) {
                await searchAvailablePackages('firefox gimp vlc');
            }

            renderLauncherApps('');
            if (launcherSearch) launcherSearch.value = '';
        });
    });

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.altKey) && e.code === 'Space') {
            e.preventDefault();
            openLauncher();
        }

        if (e.key === 'Escape' && !launcher.classList.contains('hidden')) {
            launcher.classList.add('hidden');
        }
    });

    if (launcherSearch) {
        launcherSearch.addEventListener('input', (e) => {
            selectedIndex = 0;
            renderLauncherApps(e.target.value);
        });

        launcherSearch.addEventListener('keydown', (e) => {
            const apps = currentTab === 'installed' ? installedApps : availableApps;
            let filtered = apps;
            if (launcherSearch.value) {
                if (typeof Fuse !== 'undefined') {
                    const fuse = new Fuse(apps, { keys: ['name', 'description'], threshold: 0.6 });
                    filtered = fuse.search(launcherSearch.value).map(r => r.item);
                } else {
                    filtered = apps.filter(app => app.name.toLowerCase().includes(launcherSearch.value.toLowerCase()));
                }
            }
            filtered = filtered.slice(0, 50);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
                renderLauncherApps(launcherSearch.value);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                renderLauncherApps(launcherSearch.value);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filtered[selectedIndex]) {
                    if (currentTab === 'installed') {
                        launchApp(filtered[selectedIndex].id);
                        launcher.classList.add('hidden');
                    } else {
                        installPackage(filtered[selectedIndex].name);
                    }
                }
            }
        });
    }

    launcher.addEventListener('click', (e) => {
        if (e.target === launcher) {
            launcher.classList.add('hidden');
        }
    });

    fetchInstalledApps();
}

async function openLauncher() {
    const launcher = document.getElementById('app-launcher');
    const launcherSearch = document.getElementById('launcher-search');

    if (!launcher) return;

    launcher.classList.remove('hidden');
    if (launcherSearch) launcherSearch.focus();

    await fetchInstalledApps();
    renderLauncherApps('');
}

async function fetchInstalledApps() {
    try {
        const response = await fetch('/api/packages/installed');
        const data = await response.json();

        installedApps = [
            { name: 'Terminal', icon: '📟', id: 'terminal', description: 'System terminal with shell access' },
            { name: 'File Manager', icon: '📂', id: 'filemanager', description: 'Browse and manage files' },
            { name: 'Notes', icon: '📝', id: 'notes', description: 'Markdown notes editor' },
            { name: 'Text Editor', icon: '💻', id: 'editor', description: 'Monaco code editor' },
            { name: 'Containers', icon: '🐳', id: 'containers', description: 'Docker container management' },
            { name: 'Control Panel', icon: '⚙️', id: 'controlpanel', description: 'System settings and configuration' },
            { name: 'Virtual Desktops', icon: '🖥️', id: 'virtual-desktops', description: 'Switch and manage desktops' },
            { name: 'AI Integration', icon: '🤖', id: 'ai-integration', description: 'AI services and chat' },
            { name: 'AI Models', icon: '🧠', id: 'ai-models', description: 'Model routing and status' },
            { name: 'Storage Pools', icon: '💾', id: 'storage-pools', description: 'Manage pools and volumes' },
            { name: 'Proxy', icon: '🌐', id: 'proxy', description: 'Nginx proxy status' },
            { name: 'Shares', icon: '📁', id: 'shares', description: 'NFS/SMB shares' },
            { name: 'WiFi', icon: '📶', id: 'wifi', description: 'WiFi interfaces and networks' },
            { name: 'Media Server', icon: '🎬', id: 'media', description: 'Libraries and transcoding' },
            { name: 'Home Assistant', icon: '🏠', id: 'home-assistant', description: 'Smart home status' },
            { name: 'Power', icon: '🔋', id: 'power', description: 'Power controls and status' },
            { name: 'Monitoring', icon: '📊', id: 'monitoring', description: 'System monitoring dashboard' },
            ...data.apps.map(app => ({
                name: app.name,
                icon: app.icon || '🖥️',
                id: app.id || app.name,
                description: app.description || '',
                categories: app.categories || []
            }))
        ];
    } catch (err) {
        console.error('Failed to fetch installed apps:', err);
        installedApps = [
            { name: 'Terminal', icon: '📟', id: 'terminal', description: 'System terminal with shell access' },
            { name: 'File Manager', icon: '📂', id: 'filemanager', description: 'Browse and manage files' },
            { name: 'Notes', icon: '📝', id: 'notes', description: 'Markdown notes editor' },
            { name: 'Text Editor', icon: '💻', id: 'editor', description: 'Monaco code editor' },
            { name: 'Containers', icon: '🐳', id: 'containers', description: 'Docker container management' },
            { name: 'Control Panel', icon: '⚙️', id: 'controlpanel', description: 'System settings and configuration' },
            { name: 'Virtual Desktops', icon: '🖥️', id: 'virtual-desktops', description: 'Switch and manage desktops' },
            { name: 'AI Integration', icon: '🤖', id: 'ai-integration', description: 'AI services and chat' },
            { name: 'AI Models', icon: '🧠', id: 'ai-models', description: 'Model routing and status' },
            { name: 'Storage Pools', icon: '💾', id: 'storage-pools', description: 'Manage pools and volumes' },
            { name: 'Proxy', icon: '🌐', id: 'proxy', description: 'Nginx proxy status' },
            { name: 'Shares', icon: '📁', id: 'shares', description: 'NFS/SMB shares' },
            { name: 'WiFi', icon: '📶', id: 'wifi', description: 'WiFi interfaces and networks' },
            { name: 'Media Server', icon: '🎬', id: 'media', description: 'Libraries and transcoding' },
            { name: 'Home Assistant', icon: '🏠', id: 'home-assistant', description: 'Smart home status' },
            { name: 'Power', icon: '🔋', id: 'power', description: 'Power controls and status' }
        ];
    }
}

async function searchAvailablePackages(query) {
    try {
        const response = await fetch(`/api/packages/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        availableApps = data.packages || [];
    } catch (err) {
        console.error('Failed to search packages:', err);
        availableApps = [];
    }
}

async function installPackage(packageName) {
    if (!confirm(`Install package "${packageName}"?\n\nThis requires sudo privileges.`)) {
        return;
    }

    try {
        const response = await fetch('/api/packages/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packageName })
        });

        const data = await response.json();

        if (data.success) {
            alert(`${packageName} installed successfully!`);
            await fetchInstalledApps();
        } else {
            alert(`Failed to install ${packageName}: ${data.error}`);
        }
    } catch (err) {
        alert(`Error installing ${packageName}: ${err.message}`);
    }
}

function launchApp(appId) {
    let content = '';
    let title = '';

    switch (appId) {
        case 'notes':
            title = 'Notes';
            notesApp.init().then(() => {
                const win = windowManager.windows.find(w => w.title === 'Notes');
                if (win) {
                    const winContent = win.element.querySelector('.window-content');
                    if (winContent) {
                        winContent.innerHTML = notesApp.render(win.id);
                    }
                }
            });
            content = '<div style="padding: 2rem; text-align: center; color: var(--overlay0);">Loading notes...</div>';
            break;
        case 'editor':
            title = 'Text Editor';
            content = `
                <div style="display: flex; flex-direction: column; height: 100%; background: #1e1e1e;">
                    <div style="padding: 0.5rem; background: #252526; border-bottom: 1px solid #3c3c3c;">
                        <span style="color: #ccc; padding: 0 1rem;">Monaco Editor - Markdown Support</span>
                    </div>
                    <div id="monaco-editor-${Date.now()}" style="flex: 1;"></div>
                </div>
            `;
            setTimeout(() => {
                const editorDiv = document.querySelector('[id^="monaco-editor-"]');
                if (editorDiv && typeof monaco !== 'undefined') {
                    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
                    require(['vs/editor/editor.main'], function () {
                        monaco.editor.create(editorDiv, {
                            value: '# Welcome to the Editor\\n\\nStart typing in Markdown!',
                            language: 'markdown',
                            theme: 'vs-dark',
                            automaticLayout: true
                        });
                    });
                }
            }, 100);
            break;
        case 'filemanager':
            title = 'File Manager';
            const fmWindowId = Date.now();
            content = fileManager.render(fmWindowId);
            setTimeout(() => fileManager.init(fmWindowId), 100);
            break;
        case 'containers':
            title = 'Container Management';
            const cmWindowId = Date.now();
            content = containerManager.render(cmWindowId);
            setTimeout(() => containerManager.init(cmWindowId), 100);
            break;
        case 'controlpanel':
            title = 'Control Panel';
            content = '<div style="padding: 2rem; text-align: center; color: var(--text);">⚙️ Control Panel<br><small>Feature coming soon</small></div>';
            break;
        case 'terminal':
            launchTerminal();
            return;
        case 'virtual-desktops':
            openVirtualDesktops();
            return;
        case 'ai-integration':
            openAIIntegration();
            return;
        case 'ai-models':
            openAIModels();
            return;
        case 'storage-pools':
            openStoragePools();
            return;
        case 'proxy':
            openProxyManager();
            return;
        case 'shares':
            openSharesManager();
            return;
        case 'wifi':
            openWiFiManager();
            return;
        case 'media':
            openMediaServer();
            return;
        case 'home-assistant':
            openHomeAssistant();
            return;
        case 'power':
            openPowerManagement();
            return;
        case 'monitoring':
            openMonitoring();
            return;
        default:
            title = appId;
            content = `<div>📦 ${appId}<br><small>Native app integration coming soon</small></div>`;
    }

    windowManager.createWindow(title, content);
}

function launchTerminal() {
    // Create the window synchronously
    const windowObj = windowManager.createWindow('Terminal', '');
    const windowContent = windowObj.element.querySelector('.window-content');

    // Ensure the content area has no padding so terminal fits perfectly
    windowContent.style.padding = '0';
    windowContent.style.backgroundColor = '#1e1e2e';

    // Create container for xterm
    const terminalContainer = document.createElement('div');
    terminalContainer.style.width = '100%';
    terminalContainer.style.height = '100%';
    windowContent.appendChild(terminalContainer);

    // Initialize xterm
    const term = new Terminal({
        cursorBlink: true,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
        theme: {
            background: '#1e1e2e',
            foreground: '#cdd6f4',
            cursor: '#f5e0dc',
            black: '#45475a',
            red: '#f38ba8',
            green: '#a6e3a1',
            yellow: '#f9e2af',
            blue: '#89b4fa',
            magenta: '#f5c2e7',
            cyan: '#94e2d5',
            white: '#bac2de',
            brightBlack: '#585b70',
            brightRed: '#f38ba8',
            brightGreen: '#a6e3a1',
            brightYellow: '#f9e2af',
            brightBlue: '#89b4fa',
            brightMagenta: '#f5c2e7',
            brightCyan: '#94e2d5',
            brightWhite: '#a6adc8'
        }
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalContainer);

    // Initial fit
    // We need a slight delay or next tick to ensure the DOM is fully rendered/sized
    requestAnimationFrame(() => {
        fitAddon.fit();
    });

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        term.onData(data => ws.send(data));

        // Handle resizing
        const resizeObserver = new ResizeObserver(() => {
            try {
                fitAddon.fit();
                // Optional: Send resize event to backend if supported by node-pty/protocol
                // const dims = fitAddon.proposeDimensions();
                // if (dims) ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
            } catch (e) {
                console.warn('Resize error:', e);
            }
        });
        resizeObserver.observe(terminalContainer);

        // Clean up on window close
        const closeBtn = windowObj.element.querySelector('.close');
        const originalClose = closeBtn.onclick; // This might be handled via event listener in WindowManager, so be careful

        // Better way: Monitor if the element is removed from DOM
        const observer = new MutationObserver((mutations) => {
            if (!document.body.contains(windowObj.element)) {
                ws.close();
                term.dispose();
                resizeObserver.disconnect();
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    ws.onmessage = (event) => {
        term.write(event.data);
    };

    ws.onclose = () => {
        term.write('\r\n\x1b[31mConnection closed.\x1b[0m');
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        term.write('\r\n\x1b[31mConnection error.\x1b[0m');
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
    }
`;
document.head.appendChild(style);
