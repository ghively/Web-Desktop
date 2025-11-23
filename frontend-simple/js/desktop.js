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
                <div class="controls column">
                    <input id="ai-service-name" class="input" placeholder="Service name" />
                    <input id="ai-service-type" class="input" placeholder="Type (local/remote)" />
                    <input id="ai-service-endpoint" class="input" placeholder="Endpoint or notes" />
                    <input id="ai-service-key" class="input" placeholder="API key (optional)" />
                    <button id="ai-add-service" class="primary">Add Service</button>
                    <button id="ai-refresh" class="secondary">Refresh</button>
                </div>
            </div>
            <div class="app-card">
                <h3>Chat</h3>
                <textarea id="ai-prompt" class="input" rows="4" placeholder="Ask anything..."></textarea>
                <button id="ai-send" class="primary">Send</button>
                <div id="ai-response" class="output"></div>
            </div>
            <div class="app-card">
                <h3>Workflows</h3>
                <div id="ai-workflows" class="list">Loading...</div>
                <div class="controls column">
                    <input id="ai-workflow-name" class="input" placeholder="Workflow name" />
                    <input id="ai-workflow-desc" class="input" placeholder="Description" />
                    <label class="checkbox"><input type="checkbox" id="ai-workflow-active" /> Active</label>
                    <button id="ai-workflow-save" class="primary">Save Workflow</button>
                </div>
            </div>
            <div class="app-card">
                <h3>Security Events</h3>
                <div id="ai-events" class="list">Loading...</div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('AI Integration', content);
    const servicesEl = win.element.querySelector('#ai-services');
    const workflowsEl = win.element.querySelector('#ai-workflows');
    const eventsEl = win.element.querySelector('#ai-events');
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
    const loadWorkflows = async () => {
        workflowsEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/ai-integration/workflows');
            const data = await res.json();
            workflowsEl.innerHTML = (data || []).map(w => `
                <div class="list-item">
                    <div><strong>${w.name}</strong> • ${w.description || ''}</div>
                    <div class="subtle">Active: ${w.active ? 'yes' : 'no'} • Triggers: ${(w.triggers || []).length} • Actions: ${(w.actions || []).length}</div>
                    <div class="controls">
                        <button class="secondary small ai-workflow-toggle" data-id="${w.id}" data-active="${w.active ? '0' : '1'}">${w.active ? 'Disable' : 'Enable'}</button>
                        <button class="danger small ai-workflow-delete" data-id="${w.id}">Delete</button>
                    </div>
                </div>
            `).join('') || 'No workflows';
        } catch {
            workflowsEl.textContent = 'Failed to load workflows';
        }
    };
    const loadEvents = async () => {
        eventsEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/ai-integration/security/events');
            const data = await res.json();
            eventsEl.innerHTML = (data || []).map(ev => `
                <div class="list-item">
                    <div><strong>${ev.type}</strong> • ${ev.severity}</div>
                    <div class="subtle">${ev.description}</div>
                    <div class="controls">
                        <button class="secondary small ai-event-resolve" data-id="${ev.id}" ${ev.resolved ? 'disabled' : ''}>${ev.resolved ? 'Resolved' : 'Resolve'}</button>
                    </div>
                </div>
            `).join('') || 'No events';
        } catch {
            eventsEl.textContent = 'Failed to load events';
        }
    };
    loadServices();
    loadWorkflows();
    loadEvents();
    win.element.querySelector('#ai-refresh').addEventListener('click', loadServices);
    win.element.querySelector('#ai-add-service').addEventListener('click', async () => {
        const name = win.element.querySelector('#ai-service-name').value.trim();
        const type = win.element.querySelector('#ai-service-type').value.trim() || 'remote';
        const endpoint = win.element.querySelector('#ai-service-endpoint').value.trim();
        const apiKey = win.element.querySelector('#ai-service-key').value.trim();
        await fetch('/api/ai-integration/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type, endpoint, apiKey, capabilities: [] })
        }).catch(() => {});
        win.element.querySelector('#ai-service-name').value = '';
        win.element.querySelector('#ai-service-endpoint').value = '';
        win.element.querySelector('#ai-service-key').value = '';
        loadServices();
    });
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
    win.element.querySelector('#ai-workflow-save').addEventListener('click', async () => {
        const name = win.element.querySelector('#ai-workflow-name').value.trim();
        if (!name) { alert('Name required'); return; }
        const description = win.element.querySelector('#ai-workflow-desc').value.trim();
        const active = win.element.querySelector('#ai-workflow-active').checked;
        await fetch('/api/ai-integration/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, active, actions: [], triggers: [] })
        }).catch(() => {});
        win.element.querySelector('#ai-workflow-name').value = '';
        win.element.querySelector('#ai-workflow-desc').value = '';
        win.element.querySelector('#ai-workflow-active').checked = false;
        loadWorkflows();
    });
    workflowsEl.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('ai-workflow-delete')) {
            await fetch(`/api/ai-integration/workflows/${target.dataset.id}`, { method: 'DELETE' }).catch(() => {});
            loadWorkflows();
        }
        if (target.classList.contains('ai-workflow-toggle')) {
            const active = target.dataset.active === '1';
            await fetch(`/api/ai-integration/workflows/${target.dataset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active })
            }).catch(() => {});
            loadWorkflows();
        }
    });
    eventsEl.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('ai-event-resolve')) {
            await fetch(`/api/ai-integration/security/events/${target.dataset.id}/resolve`, { method: 'PUT' }).catch(() => {});
            loadEvents();
        }
    });
}

function openStoragePools() {
    const content = `
        <div class="app-grid">
            <div class="app-card">
                <h3>Storage Pools</h3>
                <div class="controls">
                    <button id="pools-refresh" class="secondary">Refresh</button>
                    <button id="pools-show-create" class="secondary">New Pool</button>
                </div>
                <div id="pools-summary" class="list subtle">Loading statistics...</div>
                <div id="pools-list" class="list">Loading pools...</div>
            </div>
            <div class="app-card">
                <h3>Create / Edit Pool</h3>
                <div class="controls column" id="pool-form">
                    <input id="pool-name" class="input" placeholder="Name" />
                    <select id="pool-type" class="input">
                        <option value="local">Local disk</option>
                        <option value="nfs">NFS</option>
                        <option value="smb">SMB / CIFS</option>
                        <option value="webdav">WebDAV</option>
                        <option value="ftp">FTP</option>
                        <option value="sftp">SFTP / SSHFS</option>
                    </select>
                    <input id="pool-path" class="input" placeholder="Path / URL / Export" />
                    <input id="pool-device" class="input" placeholder="Device (/dev/sdX) for local" />
                    <input id="pool-mount" class="input" placeholder="Mount point (optional)" />
                    <label class="checkbox"><input type="checkbox" id="pool-automount" checked /> Auto-mount</label>
                    <select id="pool-access" class="input">
                        <option value="read-write">Read/Write</option>
                        <option value="read">Read only</option>
                        <option value="write">Write only</option>
                    </select>
                    <div class="grid-2">
                        <input id="pool-username" class="input" placeholder="Username (remote)" />
                        <input id="pool-password" class="input" type="password" placeholder="Password / token" />
                    </div>
                    <div class="grid-2">
                        <input id="pool-domain" class="input" placeholder="Domain (SMB optional)" />
                        <input id="pool-keypath" class="input" placeholder="SSH key path (SFTP optional)" />
                    </div>
                    <textarea id="pool-options" class="input" rows="2" placeholder="Options (key=value per line)"></textarea>
                    <input id="pool-tags" class="input" placeholder="Tags comma separated" />
                    <textarea id="pool-description" class="input" rows="2" placeholder="Description"></textarea>
                    <div class="controls">
                        <button id="pool-test" class="secondary">Test Connection</button>
                        <button id="pool-save" class="primary">Save Pool</button>
                        <button id="pool-reset" class="secondary">Reset</button>
                    </div>
                    <div id="pool-local-disks" class="list subtle">Local disks loading...</div>
                </div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('Storage Pools', content);
    const list = win.element.querySelector('#pools-list');
    const summaryEl = win.element.querySelector('#pools-summary');
    const disksEl = win.element.querySelector('#pool-local-disks');

    const form = {
        name: win.element.querySelector('#pool-name'),
        type: win.element.querySelector('#pool-type'),
        path: win.element.querySelector('#pool-path'),
        device: win.element.querySelector('#pool-device'),
        mount: win.element.querySelector('#pool-mount'),
        autoMount: win.element.querySelector('#pool-automount'),
        access: win.element.querySelector('#pool-access'),
        username: win.element.querySelector('#pool-username'),
        password: win.element.querySelector('#pool-password'),
        domain: win.element.querySelector('#pool-domain'),
        keyPath: win.element.querySelector('#pool-keypath'),
        options: win.element.querySelector('#pool-options'),
        tags: win.element.querySelector('#pool-tags'),
        description: win.element.querySelector('#pool-description')
    };

    let editingPool = null;

    const renderStats = (stats) => {
        if (!stats) {
            summaryEl.textContent = 'Unable to load statistics';
            return;
        }
        const formatSize = (bytes) => {
            if (!bytes && bytes !== 0) return '0 B';
            const sizes = ['B','KB','MB','GB','TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            const value = bytes / Math.pow(1024, i);
            return `${value.toFixed(1)} ${sizes[i]}`;
        };
        summaryEl.innerHTML = `
            <div class="list-item">Pools: ${stats.totalPools} (${stats.connectedPools} mounted)</div>
            <div class="list-item">Space: ${formatSize(stats.usedSpace || 0)} / ${formatSize(stats.totalSpace || 0)}</div>
            <div class="list-item">Free: ${formatSize(stats.availableSpace || 0)}</div>
        `;
    };

    const renderLocalDisks = (disks) => {
        if (!disks || disks.length === 0) {
            disksEl.textContent = 'No local disks detected';
            return;
        }
        disksEl.innerHTML = disks.map(d => `
            <div class="list-item">
                ${d.name} • ${d.size} • ${d.model || ''}
                ${d.partitions?.length ? '<div class="subtle">' + d.partitions.map(p => `${p.name} ${p.size} ${p.fstype || ''} ${p.mountpoint || ''}`).join(' | ') + '</div>' : ''}
            </div>
        `).join('');
    };

    const parseOptions = () => {
        const opts = {};
        const lines = (form.options.value || '').split('\n').map(l => l.trim()).filter(Boolean);
        lines.forEach(line => {
            const [k, ...rest] = line.split('=');
            if (k) opts[k.trim()] = rest.join('=').trim();
        });
        return opts;
    };

    const resetForm = () => {
        editingPool = null;
        form.name.value = '';
        form.type.value = 'local';
        form.path.value = '';
        form.device.value = '';
        form.mount.value = '';
        form.autoMount.checked = true;
        form.access.value = 'read-write';
        form.username.value = '';
        form.password.value = '';
        form.domain.value = '';
        form.keyPath.value = '';
        form.options.value = '';
        form.tags.value = '';
        form.description.value = '';
    };

    const loadPools = async () => {
        list.textContent = 'Loading pools...';
        try {
            const res = await fetch('/api/storage-pools/pools');
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) {
                list.innerHTML = '<div class="list-item">No storage pools defined</div>';
                return;
            }
            list.innerHTML = data.map(pool => `
                <div class="list-item">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <strong>${pool.name}</strong> • ${pool.type.toUpperCase()} • ${pool.accessMode}
                            <div class="subtle">${pool.path}${pool.device ? ' • ' + pool.device : ''}</div>
                            ${pool.mountPoint ? `<div class="subtle">Mount: ${pool.mountPoint}</div>` : ''}
                            <div class="subtle">Status: ${pool.status || 'unknown'}${pool.autoMount ? ' • auto' : ''}</div>
                            ${pool.metadata?.tags?.length ? `<div class="subtle">Tags: ${pool.metadata.tags.join(', ')}</div>` : ''}
                            ${pool.metadata?.description ? `<div class="subtle">${pool.metadata.description}</div>` : ''}
                        </div>
                        <div class="controls">
                            <button class="secondary small pool-mount" data-id="${pool.id}" data-action="${pool.status === 'connected' ? 'unmount' : 'mount'}">${pool.status === 'connected' ? 'Unmount' : 'Mount'}</button>
                            <button class="secondary small pool-usage" data-id="${pool.id}">Usage</button>
                            <button class="secondary small pool-edit" data-id="${pool.id}">Edit</button>
                            <button class="danger small pool-delete" data-id="${pool.id}">Delete</button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch {
            list.textContent = 'Failed to load pools';
        }
    };

    const loadStats = async () => {
        try {
            const res = await fetch('/api/storage-pools/stats');
            const data = await res.json();
            renderStats(data);
        } catch {
            summaryEl.textContent = 'Failed to load stats';
        }
    };

    const loadDisks = async () => {
        disksEl.textContent = 'Loading local disks...';
        try {
            const res = await fetch('/api/storage-pools/scan/local');
            const data = await res.json();
            renderLocalDisks(data);
        } catch {
            disksEl.textContent = 'Failed to load disks';
        }
    };

    const savePool = async () => {
        const payload = {
            name: form.name.value.trim(),
            type: form.type.value,
            path: form.path.value.trim(),
            device: form.device.value.trim() || undefined,
            mountPoint: form.mount.value.trim() || undefined,
            autoMount: form.autoMount.checked,
            accessMode: form.access.value,
            credentials: {
                username: form.username.value.trim() || undefined,
                password: form.password.value,
                domain: form.domain.value.trim() || undefined,
                keyPath: form.keyPath.value.trim() || undefined
            },
            options: parseOptions(),
            metadata: {
                description: form.description.value.trim() || undefined,
                tags: (form.tags.value || '').split(',').map(t => t.trim()).filter(Boolean)
            },
            permissions: { owner: 'root', group: 'root', mode: '755' }
        };

        if (!payload.name || !payload.path) {
            alert('Name and path are required');
            return;
        }

        const method = editingPool ? 'PUT' : 'POST';
        const url = editingPool ? `/api/storage-pools/pools/${editingPool}` : '/api/storage-pools/pools';
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(() => {});

        resetForm();
        await loadPools();
        await loadStats();
    };

    const testConnection = async () => {
        const type = form.type.value;
        if (!form.path.value.trim()) {
            alert('Path / URL is required');
            return;
        }
        try {
            const res = await fetch('/api/storage-pools/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    path: form.path.value.trim(),
                    credentials: {
                        username: form.username.value.trim(),
                        password: form.password.value,
                        domain: form.domain.value.trim(),
                        keyPath: form.keyPath.value.trim()
                    }
                })
            });
            const data = await res.json();
            alert(data.success ? 'Connection successful' : `Connection failed: ${data.error || 'unknown error'}`);
        } catch (err) {
            alert(`Connection failed: ${err.message || err}`);
        }
    };

    const fillForm = (pool) => {
        editingPool = pool.id;
        form.name.value = pool.name || '';
        form.type.value = pool.type || 'local';
        form.path.value = pool.path || '';
        form.device.value = pool.device || '';
        form.mount.value = pool.mountPoint || '';
        form.autoMount.checked = !!pool.autoMount;
        form.access.value = pool.accessMode || 'read-write';
        form.username.value = pool.credentials?.username || '';
        form.password.value = pool.credentials?.password || '';
        form.domain.value = pool.credentials?.domain || '';
        form.keyPath.value = pool.credentials?.keyPath || '';
        form.options.value = pool.options ? Object.entries(pool.options).map(([k,v]) => `${k}=${v}`).join('\n') : '';
        form.tags.value = pool.metadata?.tags?.join(', ') || '';
        form.description.value = pool.metadata?.description || '';
    };

    list.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('pool-delete')) {
            const id = target.dataset.id;
            if (!confirm('Delete this pool?')) return;
            await fetch(`/api/storage-pools/pools/${id}`, { method: 'DELETE' }).catch(() => {});
            await loadPools();
            await loadStats();
        }
        if (target.classList.contains('pool-edit')) {
            const id = target.dataset.id;
            const res = await fetch('/api/storage-pools/pools').catch(() => null);
            const pools = res ? await res.json() : [];
            const pool = pools.find(p => p.id === id);
            if (pool) fillForm(pool);
        }
        if (target.classList.contains('pool-mount')) {
            const id = target.dataset.id;
            const action = target.dataset.action;
            await fetch(`/api/storage-pools/pools/${id}/${action}`, { method: 'POST' }).catch(() => {});
            await loadPools();
            await loadStats();
        }
        if (target.classList.contains('pool-usage')) {
            const id = target.dataset.id;
            try {
                const res = await fetch(`/api/storage-pools/pools/${id}/usage`);
                const data = await res.json();
                alert(`Files: ${data.fileCount || 0}\nLast Modified: ${data.lastModified || 'unknown'}`);
            } catch {
                alert('Failed to load usage details');
            }
        }
    });

    win.element.querySelector('#pools-refresh').addEventListener('click', () => { loadPools(); loadStats(); loadDisks(); });
    win.element.querySelector('#pools-show-create').addEventListener('click', resetForm);
    win.element.querySelector('#pool-save').addEventListener('click', savePool);
    win.element.querySelector('#pool-test').addEventListener('click', testConnection);
    win.element.querySelector('#pool-reset').addEventListener('click', resetForm);

    loadPools();
    loadStats();
    loadDisks();
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
                <h3>Status</h3>
                <div id="power-status" class="list">Loading...</div>
                <div class="controls">
                    <button id="power-refresh" class="secondary">Refresh</button>
                    <button id="power-monitor-toggle" class="secondary">Toggle Monitoring</button>
                </div>
                <div class="controls">
                    <label class="checkbox"><input type="checkbox" id="power-saver-toggle" /> Power saver</label>
                </div>
            </div>
            <div class="app-card">
                <h3>Controls</h3>
                <div class="controls column">
                    <label>Brightness <input type="range" id="power-brightness" min="1" max="100" value="50" /></label>
                    <select id="power-governor" class="input">
                        <option value="performance">Performance</option>
                        <option value="powersave">Power Save</option>
                        <option value="ondemand">On Demand</option>
                        <option value="conservative">Conservative</option>
                        <option value="userspace">Userspace</option>
                    </select>
                    <div class="controls">
                        <button id="power-suspend" class="secondary">Suspend</button>
                        <button id="power-hibernate" class="secondary">Hibernate</button>
                        <button id="power-reboot" class="secondary">Reboot</button>
                        <button id="power-shutdown" class="secondary danger">Shutdown</button>
                    </div>
                </div>
            </div>
            <div class="app-card">
                <h3>Auto Rules</h3>
                <div id="power-rules" class="list">Loading rules...</div>
                <div class="controls column">
                    <input id="rule-name" class="input" placeholder="Rule name" />
                    <select id="rule-action" class="input">
                        <option value="suspend">Suspend</option>
                        <option value="hibernate">Hibernate</option>
                        <option value="shutdown">Shutdown</option>
                    </select>
                    <div class="grid-2">
                        <input id="rule-cpu" class="input" placeholder="CPU max % (optional)" />
                        <input id="rule-mem" class="input" placeholder="Memory max % (optional)" />
                    </div>
                    <div class="grid-2">
                        <input id="rule-temp" class="input" placeholder="Temp max C (optional)" />
                        <input id="rule-battery" class="input" placeholder="Battery min % (optional)" />
                    </div>
                    <div class="grid-2">
                        <input id="rule-idle" class="input" placeholder="Idle minutes" />
                        <input id="rule-time" class="input" placeholder="Time window e.g. 22:00-06:00" />
                    </div>
                    <div class="controls">
                        <button id="rule-save" class="primary">Add/Update Rule</button>
                        <button id="rule-reset" class="secondary">Reset</button>
                    </div>
                </div>
            </div>
            <div class="app-card">
                <h3>Power Plans</h3>
                <div id="power-plans" class="list">Loading plans...</div>
                <div class="controls column">
                    <input id="plan-name" class="input" placeholder="Plan name" />
                    <input id="plan-description" class="input" placeholder="Description" />
                    <div class="grid-2">
                        <input id="plan-screen" class="input" placeholder="Screen timeout (min)" />
                        <input id="plan-sleep" class="input" placeholder="Sleep timeout (min)" />
                    </div>
                    <div class="grid-2">
                        <input id="plan-hibernate" class="input" placeholder="Hibernate timeout (min)" />
                        <input id="plan-brightness" class="input" placeholder="Brightness %" />
                    </div>
                    <label class="checkbox"><input type="checkbox" id="plan-wifi" /> WiFi power saving</label>
                    <label class="checkbox"><input type="checkbox" id="plan-bt" /> Bluetooth power saving</label>
                    <select id="plan-governor" class="input">
                        <option value="">CPU Governor (optional)</option>
                        <option value="performance">Performance</option>
                        <option value="powersave">Power Save</option>
                        <option value="ondemand">On Demand</option>
                        <option value="conservative">Conservative</option>
                        <option value="userspace">Userspace</option>
                    </select>
                    <div class="controls">
                        <button id="plan-save" class="primary">Save Plan</button>
                        <button id="plan-reset" class="secondary">Reset</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('Power Management', content);
    const statusEl = win.element.querySelector('#power-status');
    const rulesEl = win.element.querySelector('#power-rules');
    const plansEl = win.element.querySelector('#power-plans');
    const brightness = win.element.querySelector('#power-brightness');
    const governorSelect = win.element.querySelector('#power-governor');
    const saverToggle = win.element.querySelector('#power-saver-toggle');
    let monitoringEnabled = false;
    let configCache = null;
    let editingRuleId = null;

    const ruleFields = {
        name: win.element.querySelector('#rule-name'),
        action: win.element.querySelector('#rule-action'),
        cpu: win.element.querySelector('#rule-cpu'),
        mem: win.element.querySelector('#rule-mem'),
        temp: win.element.querySelector('#rule-temp'),
        battery: win.element.querySelector('#rule-battery'),
        idle: win.element.querySelector('#rule-idle'),
        time: win.element.querySelector('#rule-time')
    };

    const planFields = {
        name: win.element.querySelector('#plan-name'),
        description: win.element.querySelector('#plan-description'),
        screen: win.element.querySelector('#plan-screen'),
        sleep: win.element.querySelector('#plan-sleep'),
        hibernate: win.element.querySelector('#plan-hibernate'),
        brightness: win.element.querySelector('#plan-brightness'),
        wifi: win.element.querySelector('#plan-wifi'),
        bt: win.element.querySelector('#plan-bt'),
        governor: win.element.querySelector('#plan-governor')
    };

    const renderStatus = (data) => {
        statusEl.innerHTML = `
            <div class="list-item">Battery: ${data.battery?.level ?? '--'}% ${data.battery?.charging ? '(charging)' : ''}</div>
            <div class="list-item">AC: ${data.ac?.connected ? 'Connected' : 'Not connected'}</div>
            <div class="list-item">Uptime: ${Math.floor((data.uptime || 0)/3600)}h</div>
            <div class="list-item">CPU governor: ${data.cpuGovernor || 'unknown'}</div>
            <div class="list-item">Thermals: ${(data.thermalState || []).map(t => `${t.sensor} ${t.temperature}°C`).join(', ') || 'N/A'}</div>
            <div class="list-item">Monitoring: ${monitoringEnabled ? 'On' : 'Off'}</div>
        `;
    };

    const renderRules = (config) => {
        const rules = config?.autoShutdownRules || [];
        if (!rules.length) {
            rulesEl.innerHTML = '<div class="list-item">No rules defined</div>';
            return;
        }
        rulesEl.innerHTML = rules.map(rule => `
            <div class="list-item">
                <div><strong>${rule.name}</strong> • ${rule.action} • ${rule.enabled ? 'Enabled' : 'Disabled'}</div>
                <div class="subtle">Conditions: ${Object.keys(rule.conditions || {}).length ? Object.entries(rule.conditions).map(([k,v]) => `${k}=${JSON.stringify(v)}`).join(', ') : 'None'}</div>
                <div class="controls">
                    <button class="secondary small rule-toggle" data-id="${rule.id}" data-enabled="${rule.enabled ? '0' : '1'}">${rule.enabled ? 'Disable' : 'Enable'}</button>
                    <button class="secondary small rule-edit" data-id="${rule.id}">Edit</button>
                    <button class="danger small rule-delete" data-id="${rule.id}">Delete</button>
                </div>
            </div>
        `).join('');
    };

    const renderPlans = (config) => {
        const plans = config?.customPowerPlans || [];
        if (!plans.length) {
            plansEl.innerHTML = '<div class="list-item">No plans defined</div>';
            return;
        }
        plansEl.innerHTML = plans.map(plan => `
            <div class="list-item">
                <div><strong>${plan.name}</strong> • ${plan.description || ''}</div>
                <div class="subtle">CPU: ${plan.settings?.cpuGovernor || 'default'} • Screen ${plan.settings?.screenTimeout || '-'}m • Sleep ${plan.settings?.sleepTimeout || '-'}m</div>
                <div class="controls">
                    <button class="secondary small plan-activate" data-id="${plan.id}">${config?.activePlan === plan.id ? 'Active' : 'Activate'}</button>
                    <button class="secondary small plan-edit" data-id="${plan.id}">Edit</button>
                    <button class="danger small plan-delete" data-id="${plan.id}">Delete</button>
                </div>
            </div>
        `).join('');
    };

    const loadStatus = async () => {
        statusEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/power-management/status');
            const data = await res.json();
            monitoringEnabled = !!data.monitoring?.enabled;
            renderStatus(data);
            if (typeof data.brightness === 'number') brightness.value = data.brightness;
            if (data.cpuGovernor) governorSelect.value = data.cpuGovernor;
        } catch {
            statusEl.textContent = 'Failed to load status';
        }
    };

    const loadConfig = async () => {
        try {
            const res = await fetch('/api/power-management/config');
            const data = await res.json();
            configCache = data;
            renderRules(data);
            renderPlans(data);
            saverToggle.checked = !!data.powerSaverMode;
        } catch {
            rulesEl.textContent = 'Failed to load rules';
            plansEl.textContent = 'Failed to load plans';
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

    const saveRule = async () => {
        if (!configCache) return;
        const name = ruleFields.name.value.trim();
        if (!name) { alert('Rule name required'); return; }
        const rule = {
            id: editingRuleId || Date.now().toString(),
            name,
            enabled: true,
            action: ruleFields.action.value,
            conditions: {}
        };
        const cpu = parseFloat(ruleFields.cpu.value);
        const mem = parseFloat(ruleFields.mem.value);
        const temp = parseFloat(ruleFields.temp.value);
        const battery = parseFloat(ruleFields.battery.value);
        const idle = parseFloat(ruleFields.idle.value);
        const time = ruleFields.time.value.trim();
        if (!isNaN(cpu)) rule.conditions.cpuUsage = { max: cpu, duration: 5 };
        if (!isNaN(mem)) rule.conditions.memoryUsage = { max: mem, duration: 5 };
        if (!isNaN(temp)) rule.conditions.temperature = { max: temp, duration: 5 };
        if (!isNaN(battery)) rule.conditions.batteryLevel = { min: battery };
        if (!isNaN(idle)) rule.conditions.idleTime = { minutes: idle };
        if (time && time.includes('-')) {
            const [start, end] = time.split('-');
            rule.conditions.timeOfDay = { start: start.trim(), end: end.trim() };
        }

        const rules = configCache.autoShutdownRules || [];
        const updated = editingRuleId
            ? rules.map(r => r.id === editingRuleId ? rule : r)
            : [...rules, rule];

        await fetch('/api/power-management/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...configCache, autoShutdownRules: updated })
        }).catch(() => {});
        editingRuleId = null;
        Object.values(ruleFields).forEach(f => f.value = '');
        ruleFields.action.value = 'suspend';
        await loadConfig();
    };

    const savePlan = async () => {
        if (!configCache) return;
        const name = planFields.name.value.trim();
        if (!name) { alert('Plan name required'); return; }
        const plan = {
            id: configCache.customPowerPlans?.find(p => p.name === name)?.id || Date.now().toString(),
            name,
            description: planFields.description.value.trim(),
            settings: {
                screenTimeout: parseInt(planFields.screen.value) || undefined,
                sleepTimeout: parseInt(planFields.sleep.value) || undefined,
                hibernateTimeout: parseInt(planFields.hibernate.value) || undefined,
                brightness: parseInt(planFields.brightness.value) || undefined,
                wifiPower: planFields.wifi.checked,
                bluetoothPower: planFields.bt.checked,
                cpuGovernor: planFields.governor.value || undefined
            }
        };
        const plans = configCache.customPowerPlans || [];
        const exists = plans.find(p => p.id === plan.id);
        const updated = exists ? plans.map(p => p.id === plan.id ? plan : p) : [...plans, plan];
        await fetch('/api/power-management/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...configCache, customPowerPlans: updated })
        }).catch(() => {});
        Object.values(planFields).forEach(f => {
            if (f.type === 'checkbox') f.checked = false;
            else f.value = '';
        });
        await loadConfig();
    };

    const activatePlan = async (id) => {
        if (!configCache) return;
        await fetch('/api/power-management/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...configCache, activePlan: id })
        }).catch(() => {});
        await loadConfig();
    };

    rulesEl.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('rule-delete')) {
            const id = target.dataset.id;
            if (!confirm('Delete this rule?')) return;
            const rules = (configCache?.autoShutdownRules || []).filter(r => r.id !== id);
            await fetch('/api/power-management/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...configCache, autoShutdownRules: rules })
            }).catch(() => {});
            await loadConfig();
        }
        if (target.classList.contains('rule-toggle')) {
            const id = target.dataset.id;
            const enabled = target.dataset.enabled === '1';
            const rules = (configCache?.autoShutdownRules || []).map(r => r.id === id ? { ...r, enabled } : r);
            await fetch('/api/power-management/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...configCache, autoShutdownRules: rules })
            }).catch(() => {});
            await loadConfig();
        }
        if (target.classList.contains('rule-edit')) {
            const id = target.dataset.id;
            const rule = (configCache?.autoShutdownRules || []).find(r => r.id === id);
            if (!rule) return;
            editingRuleId = rule.id;
            ruleFields.name.value = rule.name || '';
            ruleFields.action.value = rule.action || 'suspend';
            ruleFields.cpu.value = rule.conditions?.cpuUsage?.max || '';
            ruleFields.mem.value = rule.conditions?.memoryUsage?.max || '';
            ruleFields.temp.value = rule.conditions?.temperature?.max || '';
            ruleFields.battery.value = rule.conditions?.batteryLevel?.min || '';
            ruleFields.idle.value = rule.conditions?.idleTime?.minutes || '';
            ruleFields.time.value = rule.conditions?.timeOfDay ? `${rule.conditions.timeOfDay.start}-${rule.conditions.timeOfDay.end}` : '';
        }
    });

    plansEl.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('plan-activate')) {
            await activatePlan(target.dataset.id);
        }
        if (target.classList.contains('plan-delete')) {
            if (!confirm('Delete this plan?')) return;
            const plans = (configCache?.customPowerPlans || []).filter(p => p.id !== target.dataset.id);
            await fetch('/api/power-management/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...configCache, customPowerPlans: plans })
            }).catch(() => {});
            await loadConfig();
        }
        if (target.classList.contains('plan-edit')) {
            const plan = (configCache?.customPowerPlans || []).find(p => p.id === target.dataset.id);
            if (!plan) return;
            planFields.name.value = plan.name || '';
            planFields.description.value = plan.description || '';
            planFields.screen.value = plan.settings?.screenTimeout || '';
            planFields.sleep.value = plan.settings?.sleepTimeout || '';
            planFields.hibernate.value = plan.settings?.hibernateTimeout || '';
            planFields.brightness.value = plan.settings?.brightness || '';
            planFields.wifi.checked = !!plan.settings?.wifiPower;
            planFields.bt.checked = !!plan.settings?.bluetoothPower;
            planFields.governor.value = plan.settings?.cpuGovernor || '';
        }
    });

    brightness.addEventListener('change', async () => {
        await fetch('/api/power-management/brightness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: parseInt(brightness.value) })
        }).catch(() => {});
    });

    governorSelect.addEventListener('change', async () => {
        await fetch('/api/power-management/cpu-governor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ governor: governorSelect.value })
        }).catch(() => {});
        loadStatus();
    });

    saverToggle.addEventListener('change', async () => {
        if (!configCache) return;
        await fetch('/api/power-management/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...configCache, powerSaverMode: saverToggle.checked })
        }).catch(() => {});
        await loadConfig();
    });

    win.element.querySelector('#power-refresh').addEventListener('click', () => { loadStatus(); loadConfig(); });
    win.element.querySelector('#power-suspend').addEventListener('click', () => sendAction('suspend'));
    win.element.querySelector('#power-hibernate').addEventListener('click', () => sendAction('hibernate'));
    win.element.querySelector('#power-reboot').addEventListener('click', () => sendAction('reboot'));
    win.element.querySelector('#power-shutdown').addEventListener('click', () => sendAction('shutdown'));
    win.element.querySelector('#power-monitor-toggle').addEventListener('click', async () => {
        const action = monitoringEnabled ? 'stop' : 'start';
        await fetch(`/api/power-management/monitoring/${action}`, { method: 'POST' }).catch(() => {});
        loadStatus();
    });
    win.element.querySelector('#rule-save').addEventListener('click', saveRule);
    win.element.querySelector('#rule-reset').addEventListener('click', () => { editingRuleId = null; Object.values(ruleFields).forEach(f => f.value = ''); ruleFields.action.value = 'suspend'; });
    win.element.querySelector('#plan-save').addEventListener('click', savePlan);
    win.element.querySelector('#plan-reset').addEventListener('click', () => { Object.values(planFields).forEach(f => { if (f.type === 'checkbox') f.checked = false; else f.value = ''; }); });

    loadStatus();
    loadConfig();
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
        <div class="app-grid">
            <div class="app-card">
                <h3>NFS Shares</h3>
                <div id="shares-nfs" class="list">Loading...</div>
                <div class="controls column">
                    <input id="nfs-path" class="input" placeholder="Path to export" />
                    <input id="nfs-clients" class="input" placeholder="Clients (IP/CIDR/hostname or *)" />
                    <input id="nfs-options" class="input" placeholder="Options (e.g. rw,sync,no_root_squash)" />
                    <div class="controls">
                        <button id="nfs-save" class="primary">Create / Update</button>
                        <button id="nfs-reload" class="secondary">Reload Exports</button>
                    </div>
                </div>
            </div>
            <div class="app-card">
                <h3>SMB Shares</h3>
                <div id="shares-smb" class="list">Loading...</div>
                <div class="controls column">
                    <input id="smb-name" class="input" placeholder="Share name" />
                    <input id="smb-path" class="input" placeholder="Path" />
                    <input id="smb-comment" class="input" placeholder="Comment (optional)" />
                    <div class="grid-2">
                        <input id="smb-users" class="input" placeholder="Allowed users (comma separated)" />
                        <label class="checkbox"><input type="checkbox" id="smb-guest" /> Guest OK</label>
                    </div>
                    <div class="grid-2">
                        <label class="checkbox"><input type="checkbox" id="smb-browse" checked /> Browseable</label>
                        <label class="checkbox"><input type="checkbox" id="smb-write" /> Writable</label>
                    </div>
                    <div class="controls">
                        <button id="smb-save" class="primary">Create / Update</button>
                        <button id="smb-reload" class="secondary">Reload Samba</button>
                    </div>
                </div>
            </div>
            <div class="app-card">
                <h3>SMB Users</h3>
                <div id="shares-smbusers" class="list">Loading...</div>
                <div class="controls">
                    <input id="smb-username" class="input" placeholder="SMB username" />
                    <input id="smb-password" type="password" class="input" placeholder="Password (Linux user must exist)" />
                    <button id="smb-user-create" class="primary">Add SMB User</button>
                </div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('Shares Manager', content);
    const nfsEl = win.element.querySelector('#shares-nfs');
    const smbEl = win.element.querySelector('#shares-smb');
    const smbUsersEl = win.element.querySelector('#shares-smbusers');
    let editingNfsId = null;
    let editingSmbId = null;

    const loadNfs = async () => {
        nfsEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/shares/nfs');
            const data = await res.json();
            nfsEl.innerHTML = (data.shares || []).map(s => `
                <div class="list-item">
                    <div><strong>${s.path}</strong></div>
                    <div class="subtle">${s.clients || ''} (${s.options || ''})</div>
                    <div class="controls">
                        <button class="secondary small nfs-edit" data-id="${s.id}" data-clients="${s.clients || ''}" data-options="${s.options || ''}" data-path="${s.path}">Edit</button>
                        <button class="danger small nfs-delete" data-id="${s.id}">Delete</button>
                    </div>
                </div>
            `).join('') || 'No NFS shares';
        } catch {
            nfsEl.textContent = 'Failed to load NFS shares';
        }
    };

    const loadSmb = async () => {
        smbEl.textContent = 'Loading...';
        try {
            const res = await fetch('/api/shares/smb');
            const data = await res.json();
            smbEl.innerHTML = (data.shares || []).map(s => `
                <div class="list-item">
                    <div><strong>${s.name}</strong> • ${s.path}</div>
                    <div class="subtle">Browseable: ${s.browseable || 'yes'} • Writable: ${s.writable || 'no'} • Guest: ${s.guestOk || 'no'}</div>
                    <div class="subtle">${s.comment || ''} ${s.validUsers ? '• Users: ' + s.validUsers : ''}</div>
                    <div class="controls">
                        <button class="secondary small smb-edit" data-id="${s.id}">Edit</button>
                        <button class="danger small smb-delete" data-id="${s.id}">Delete</button>
                    </div>
                </div>
            `).join('') || 'No SMB shares';
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

    const nfsPath = win.element.querySelector('#nfs-path');
    const nfsClients = win.element.querySelector('#nfs-clients');
    const nfsOptions = win.element.querySelector('#nfs-options');
    const smbName = win.element.querySelector('#smb-name');
    const smbPath = win.element.querySelector('#smb-path');
    const smbComment = win.element.querySelector('#smb-comment');
    const smbUsers = win.element.querySelector('#smb-users');
    const smbGuest = win.element.querySelector('#smb-guest');
    const smbBrowse = win.element.querySelector('#smb-browse');
    const smbWrite = win.element.querySelector('#smb-write');

    win.element.querySelector('#shares-smbusers').addEventListener('click', () => {});

    win.element.querySelector('#nfs-save').addEventListener('click', async () => {
        const path = nfsPath.value.trim();
        const clients = nfsClients.value.trim() || '*';
        const options = nfsOptions.value.trim() || 'ro,sync,no_subtree_check';
        if (!path) { alert('Path required'); return; }
        const method = editingNfsId ? 'PUT' : 'POST';
        const url = editingNfsId ? `/api/shares/nfs/${editingNfsId}` : '/api/shares/nfs';
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, clients, options })
        }).catch(() => {});
        editingNfsId = null;
        nfsPath.value = '';
        nfsClients.value = '';
        nfsOptions.value = '';
        loadNfs();
    });

    win.element.querySelector('#smb-save').addEventListener('click', async () => {
        const name = smbName.value.trim();
        const path = smbPath.value.trim();
        if (!name || !path) { alert('Name and path required'); return; }
        const payload = {
            name,
            path,
            comment: smbComment.value.trim(),
            browseable: smbBrowse.checked ? 'yes' : 'no',
            writable: smbWrite.checked ? 'yes' : 'no',
            guestOk: smbGuest.checked ? 'yes' : 'no',
            validUsers: smbUsers.value.trim()
        };
        const method = editingSmbId ? 'PUT' : 'POST';
        const url = editingSmbId ? `/api/shares/smb/${editingSmbId}` : '/api/shares/smb';
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(() => {});
        editingSmbId = null;
        smbName.value = '';
        smbPath.value = '';
        smbComment.value = '';
        smbUsers.value = '';
        smbGuest.checked = false;
        smbBrowse.checked = true;
        smbWrite.checked = false;
        loadSmb();
    });

    nfsEl.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('nfs-delete')) {
            if (!confirm('Delete NFS share?')) return;
            await fetch(`/api/shares/nfs/${target.dataset.id}`, { method: 'DELETE' }).catch(() => {});
            loadNfs();
        }
        if (target.classList.contains('nfs-edit')) {
            editingNfsId = target.dataset.id;
            nfsPath.value = target.dataset.path || '';
            nfsClients.value = target.dataset.clients || '';
            nfsOptions.value = target.dataset.options || '';
        }
    });

    smbEl.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('smb-delete')) {
            if (!confirm('Delete SMB share?')) return;
            await fetch(`/api/shares/smb/${target.dataset.id}`, { method: 'DELETE' }).catch(() => {});
            loadSmb();
        }
        if (target.classList.contains('smb-edit')) {
            const id = target.dataset.id;
            editingSmbId = id;
            const res = await fetch('/api/shares/smb').catch(() => null);
            const data = res ? await res.json() : { shares: [] };
            const share = (data.shares || []).find(s => s.id === id);
            if (!share) return;
            smbName.value = share.name || '';
            smbPath.value = share.path || '';
            smbComment.value = share.comment || '';
            smbUsers.value = share.validUsers || '';
            smbGuest.checked = share.guestOk === 'yes';
            smbBrowse.checked = share.browseable !== 'no';
            smbWrite.checked = share.writable === 'yes';
        }
    });

    win.element.querySelector('#smb-user-create').addEventListener('click', async () => {
        const username = win.element.querySelector('#smb-username').value.trim();
        const password = win.element.querySelector('#smb-password').value;
        if (!username || !password) { alert('Username and password required'); return; }
        await fetch('/api/shares/smb/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).catch(() => {});
        win.element.querySelector('#smb-username').value = '';
        win.element.querySelector('#smb-password').value = '';
        loadSmbUsers();
    });

    win.element.querySelector('#nfs-reload').addEventListener('click', async () => {
        await fetch('/api/shares/nfs/reload', { method: 'POST' }).catch(() => {});
        loadNfs();
    });

    win.element.querySelector('#smb-reload').addEventListener('click', async () => {
        await fetch('/api/shares/smb/reload', { method: 'POST' }).catch(() => {});
        loadSmb();
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
                <h3>Server Connections</h3>
                <div id="media-config-status" class="list">Loading...</div>
                <div class="controls column">
                    <select id="media-server-select" class="input">
                        <option value="jellyfin">Jellyfin</option>
                        <option value="emby">Emby</option>
                        <option value="sonarr">Sonarr</option>
                        <option value="radarr">Radarr</option>
                        <option value="sabnzbd">Sabnzbd</option>
                    </select>
                    <input id="media-url" class="input" placeholder="URL" />
                    <input id="media-key" class="input" placeholder="API Key" />
                    <label class="checkbox"><input type="checkbox" id="media-enabled" /> Enabled</label>
                    <div class="controls">
                        <button id="media-test" class="secondary">Test</button>
                        <button id="media-save-config" class="primary">Save Config</button>
                    </div>
                </div>
            </div>
            <div class="app-card">
                <h3>Libraries</h3>
                <div id="media-libraries" class="list">Loading...</div>
                <div class="controls">
                    <button id="media-refresh" class="secondary">Refresh</button>
                    <button id="media-scan" class="secondary">Scan Libraries</button>
                </div>
                <div id="media-items" class="list subtle">Select a library to browse items</div>
            </div>
            <div class="app-card">
                <h3>Transcoding</h3>
                <div class="controls column">
                    <input id="media-item-id" class="input" placeholder="Item ID (auto-filled when browsing)" />
                    <div class="grid-2">
                        <input id="media-quality" class="input" value="1080p" placeholder="Quality (720p/1080p/4k)" />
                        <input id="media-format" class="input" value="mp4" placeholder="Format (mp4/mkv)" />
                    </div>
                    <div class="grid-2">
                        <input id="media-video-codec" class="input" value="h264" placeholder="Video codec" />
                        <input id="media-audio-codec" class="input" value="aac" placeholder="Audio codec" />
                    </div>
                    <label class="checkbox"><input type="checkbox" id="media-hw" /> Hardware acceleration</label>
                    <button id="media-start-transcode" class="primary">Start Transcode</button>
                </div>
                <div id="media-transcodes" class="list">Loading...</div>
            </div>
            <div class="app-card">
                <h3>Downloads</h3>
                <div id="media-sonarr" class="list">Sonarr queue loading...</div>
                <div id="media-radarr" class="list">Radarr queue loading...</div>
                <div id="media-sab" class="list">Sabnzbd queue loading...</div>
            </div>
        </div>
    `;
    const win = windowManager.createWindow('Media Server', content);

    const configStatus = win.element.querySelector('#media-config-status');
    const serverSelect = win.element.querySelector('#media-server-select');
    const urlInput = win.element.querySelector('#media-url');
    const keyInput = win.element.querySelector('#media-key');
    const enabledInput = win.element.querySelector('#media-enabled');
    const libs = win.element.querySelector('#media-libraries');
    const items = win.element.querySelector('#media-items');
    const trans = win.element.querySelector('#media-transcodes');
    const itemInput = win.element.querySelector('#media-item-id');
    const sonarrEl = win.element.querySelector('#media-sonarr');
    const radarrEl = win.element.querySelector('#media-radarr');
    const sabEl = win.element.querySelector('#media-sab');
    const qualityInput = win.element.querySelector('#media-quality');
    const formatInput = win.element.querySelector('#media-format');
    const vCodecInput = win.element.querySelector('#media-video-codec');
    const aCodecInput = win.element.querySelector('#media-audio-codec');
    const hwInput = win.element.querySelector('#media-hw');

    let configCache = null;

    const renderConfigStatus = (cfg) => {
        configStatus.innerHTML = `
            <div class="list-item">Jellyfin: ${cfg?.jellyfin?.enabled ? 'Enabled' : 'Disabled'} ${cfg?.jellyfin?.url || ''}</div>
            <div class="list-item">Emby: ${cfg?.emby?.enabled ? 'Enabled' : 'Disabled'} ${cfg?.emby?.url || ''}</div>
            <div class="list-item">Sonarr: ${cfg?.sonarr?.enabled ? 'Enabled' : 'Disabled'} ${cfg?.sonarr?.url || ''}</div>
            <div class="list-item">Radarr: ${cfg?.radarr?.enabled ? 'Enabled' : 'Disabled'} ${cfg?.radarr?.url || ''}</div>
            <div class="list-item">Sabnzbd: ${cfg?.sabnzbd?.enabled ? 'Enabled' : 'Disabled'} ${cfg?.sabnzbd?.url || ''}</div>
        `;
    };

    const loadConfig = async () => {
        configStatus.textContent = 'Loading config...';
        try {
            const res = await fetch('/api/media-server/config');
            const data = await res.json();
            configCache = data;
            renderConfigStatus(data);
            applyConfigForm();
        } catch {
            configStatus.textContent = 'Failed to load config';
        }
    };

    const applyConfigForm = () => {
        const key = serverSelect.value;
        const cfg = configCache?.[key] || {};
        urlInput.value = cfg.url || '';
        keyInput.value = cfg.apiKey || '';
        enabledInput.checked = !!cfg.enabled;
    };

    const saveConfig = async () => {
        const key = serverSelect.value;
        const updated = { ...(configCache || {}) };
        updated[key] = {
            url: urlInput.value.trim(),
            apiKey: keyInput.value.trim(),
            enabled: enabledInput.checked
        };
        await fetch('/api/media-server/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        }).catch(() => {});
        await loadConfig();
    };

    const testConnection = async () => {
        const key = serverSelect.value;
        try {
            const res = await fetch(`/api/media-server/test/${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: urlInput.value.trim(), apiKey: keyInput.value.trim(), enabled: enabledInput.checked })
            });
            const data = await res.json();
            alert(data.success ? `Connected (${data.version || 'ok'})` : `Failed: ${data.error || 'unknown error'}`);
        } catch (err) {
            alert(`Test failed: ${err.message || err}`);
        }
    };

    const loadLibraries = async () => {
        libs.textContent = 'Loading...';
        try {
            const res = await fetch('/api/media-server/libraries');
            const data = await res.json();
            libs.innerHTML = data.map(l => `
                <div class="list-item media-library" data-id="${l.libraryId}" data-server="${l.server}">
                    <div><strong>${l.name}</strong> • ${l.type}</div>
                    <div class="subtle">${l.path}</div>
                </div>
            `).join('') || 'No libraries';
        } catch {
            libs.textContent = 'Failed to load';
        }
    };

    const loadItems = async (libraryId, server) => {
        items.textContent = 'Loading items...';
        try {
            const res = await fetch(`/api/media-server/libraries/${libraryId}/items?server=${server}`);
            const data = await res.json();
            items.innerHTML = data.map(i => `
                <div class="list-item media-item" data-id="${i.id}">
                    <div><strong>${i.name}</strong> • ${i.type || ''}</div>
                    <div class="subtle">${i.metadata?.year || ''} ${i.metadata?.overview || ''}</div>
                    <div class="subtle">Duration: ${i.duration || '--'}s • Size: ${i.size || 0}</div>
                    <button class="secondary small media-transcode" data-id="${i.id}">Transcode</button>
                </div>
            `).join('') || 'No items';
        } catch {
            items.textContent = 'Failed to load items';
        }
    };

    const loadTranscodes = async () => {
        trans.textContent = 'Loading...';
        try {
            const res = await fetch('/api/media-server/transcoding/queue');
            const data = await res.json();
            const queue = data.queue || [];
            const active = data.active ? [data.active] : [];
            const all = active.concat(queue);
            trans.innerHTML = all.map(t => `
                <div class="list-item">
                    <div><strong>${t.itemId}</strong> • ${t.status || ''}</div>
                    <div class="subtle">Progress: ${t.progress || 0}% • Engine: ${t.settings?.engine || ''}</div>
                </div>
            `).join('') || 'No jobs';
        } catch {
            trans.textContent = 'Failed to load';
        }
    };

    const loadQueues = async () => {
        sonarrEl.textContent = 'Loading Sonarr...';
        radarrEl.textContent = 'Loading Radarr...';
        sabEl.textContent = 'Loading Sabnzbd...';
        try {
            const seriesRes = await fetch('/api/media-server/sonarr/series');
            const series = await seriesRes.json();
            sonarrEl.innerHTML = series.slice(0, 10).map(s => `<div class="list-item">${s.title || s.name} • ${s.status || ''}</div>`).join('') || 'No series';
        } catch {
            sonarrEl.textContent = 'Sonarr unavailable';
        }
        try {
            const moviesRes = await fetch('/api/media-server/radarr/movies');
            const movies = await moviesRes.json();
            radarrEl.innerHTML = movies.slice(0, 10).map(m => `<div class="list-item">${m.title || ''} • ${m.status || ''}</div>`).join('') || 'No movies';
        } catch {
            radarrEl.textContent = 'Radarr unavailable';
        }
        try {
            const sabRes = await fetch('/api/media-server/sabnzbd/queue');
            const sab = await sabRes.json();
            sabEl.innerHTML = (sab?.queue || []).map(q => `<div class="list-item">${q.name || ''} • ${q.status || ''} • ${q.progress || 0}%</div>`).join('') || 'No downloads';
        } catch {
            sabEl.textContent = 'Sabnzbd unavailable';
        }
    };

    win.element.querySelector('#media-refresh').addEventListener('click', () => { loadLibraries(); loadTranscodes(); });
    win.element.querySelector('#media-scan').addEventListener('click', async () => {
        await fetch('/api/media-server/scan', { method: 'POST' }).catch(() => {});
        loadLibraries();
    });
    win.element.querySelector('#media-start-transcode').addEventListener('click', async () => {
        const id = itemInput.value.trim();
        if (!id) { alert('Item ID required'); return; }
        await fetch(`/api/media-server/transcode/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quality: qualityInput.value || '1080p',
                format: formatInput.value || 'mp4',
                videoCodec: vCodecInput.value || 'h264',
                audioCodec: aCodecInput.value || 'aac',
                hardwareAcceleration: hwInput.checked,
                engine: 'ffmpeg'
            })
        }).catch(() => {});
        loadTranscodes();
    });

    libs.addEventListener('click', (e) => {
        const target = e.target.closest('.media-library');
        if (!target) return;
        loadItems(target.dataset.id, target.dataset.server);
    });

    items.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('media-transcode')) {
            const id = target.dataset.id;
            itemInput.value = id;
        }
        const itemRow = e.target.closest('.media-item');
        if (itemRow) {
            itemInput.value = itemRow.dataset.id;
        }
    });

    serverSelect.addEventListener('change', applyConfigForm);
    win.element.querySelector('#media-test').addEventListener('click', testConnection);
    win.element.querySelector('#media-save-config').addEventListener('click', saveConfig);

    loadConfig();
    loadLibraries();
    loadTranscodes();
    loadQueues();
}

function openHomeAssistant() {
    const content = `
        <div class="app-card">
            <h3>Home Assistant</h3>
            <div id="ha-status" class="list">Loading...</div>
            <div class="controls">
                <button id="ha-refresh" class="secondary">Refresh</button>
            </div>
            <div class="controls column">
                <input id="ha-domain" class="input" placeholder="Service domain (e.g. light)" />
                <input id="ha-service" class="input" placeholder="Service (e.g. toggle)" />
                <textarea id="ha-payload" class="input" rows="2" placeholder='Service data JSON e.g. {"entity_id":"light.kitchen"}'></textarea>
                <button id="ha-call" class="primary">Call Service</button>
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
    win.element.querySelector('#ha-call').addEventListener('click', async () => {
        const domain = win.element.querySelector('#ha-domain').value.trim();
        const service = win.element.querySelector('#ha-service').value.trim();
        if (!domain || !service) { alert('Domain and service required'); return; }
        let payload = {};
        const raw = win.element.querySelector('#ha-payload').value.trim();
        if (raw) {
            try { payload = JSON.parse(raw); } catch { alert('Invalid JSON payload'); return; }
        }
        try {
            await fetch(`/api/home-assistant/services/${domain}/${service}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            alert('Service call sent');
        } catch {
            alert('Failed to call service');
        }
    });
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
