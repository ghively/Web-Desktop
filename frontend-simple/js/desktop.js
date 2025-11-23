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

    // Use fuzzy search if filter exists and Fuse.js is available
    let filtered = [];
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
            const filtered = apps.filter(app =>
                app.name.toLowerCase().includes(launcherSearch.value.toLowerCase())
            );

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
            { name: 'Control Panel', icon: '⚙️', id: 'controlpanel', description: 'System settings and configuration' }
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
            title = 'Terminal';
            const terminalId = `terminal-container-${Date.now()}`;
            content = `<div id="${terminalId}" style="height: 100%; width: 100%;"></div>`;
            setTimeout(() => {
                const term = new Terminal({
                    cursorBlink: true,
                    theme: {
                        background: '#1e1e2e',
                        foreground: '#cdd6f4',
                        cursor: '#f5e0dc',
                    }
                });
                const fitAddon = new FitAddon.FitAddon();
                term.loadAddon(fitAddon);
                term.open(document.getElementById(terminalId));
                fitAddon.fit();

                const ws = new WebSocket(`ws://${window.location.host}`);
                ws.onopen = () => {
                    term.onData(data => ws.send(data));
                    ws.onmessage = (event) => term.write(event.data);
                    ws.onclose = () => term.write('\\r\\nConnection closed.');
                };
            }, 100);
            break;
        default:
            title = appId;
            content = `<div>📦 ${appId}<br><small>Native app integration coming soon</small></div>`;
    }

    windowManager.createWindow(title, content);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
    }
`;
document.head.appendChild(style);
