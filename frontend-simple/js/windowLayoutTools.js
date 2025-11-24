// Window Layout Tools - Advanced Window Management System
class WindowLayoutTools {
    constructor() {
        this.isOpen = false;
        this.activeTemplate = 'grid';
        this.snapThreshold = 20;
        this.snapZones = [];
        this.layoutTemplates = this.initializeTemplates();
        this.customLayouts = this.loadCustomLayouts();
        this.keyboardShortcuts = this.initializeKeyboardShortcuts();
        this.snapIndicators = [];
        this.previewMode = false;
        this.multiMonitorInfo = this.detectMultiMonitorSetup();

        this.init();
    }

    init() {
        this.createLayoutToolsPanel();
        this.setupKeyboardShortcuts();
        this.setupGlobalEventListeners();
        this.loadPersistedLayout();
        this.createSnapIndicators();
    }

    initializeTemplates() {
        return {
            grid: {
                name: 'Grid',
                description: 'Even grid distribution of windows',
                icon: '⊞',
                apply: (windows, area) => this.applyGridLayout(windows, area)
            },
            cascade: {
                name: 'Cascade',
                description: 'Staggered window arrangement',
                icon: '⚊',
                apply: (windows, area) => this.applyCascadeLayout(windows, area)
            },
            vertical: {
                name: 'Vertical Stack',
                description: 'Windows stacked vertically',
                icon: '⋮',
                apply: (windows, area) => this.applyVerticalLayout(windows, area)
            },
            horizontal: {
                name: 'Horizontal Row',
                description: 'Windows arranged side-by-side',
                icon: '⋯',
                apply: (windows, area) => this.applyHorizontalLayout(windows, area)
            },
            masterStack: {
                name: 'Master-Stack',
                description: 'Large master window with stacked windows',
                icon: '⊟',
                apply: (windows, area) => this.applyMasterStackLayout(windows, area)
            },
            mosaic: {
                name: 'Mosaic',
                description: 'Mixed sizes for varied content',
                icon: '◱',
                apply: (windows, area) => this.applyMosaicLayout(windows, area)
            },
            focus: {
                name: 'Focus Mode',
                description: 'Center focus with background windows',
                icon: '⊡',
                apply: (windows, area) => this.applyFocusLayout(windows, area)
            }
        };
    }

    initializeKeyboardShortcuts() {
        return {
            'Ctrl+Alt+G': () => this.applyTemplate('grid'),
            'Ctrl+Alt+C': () => this.applyTemplate('cascade'),
            'Ctrl+Alt+V': () => this.applyTemplate('vertical'),
            'Ctrl+Alt+H': () => this.applyTemplate('horizontal'),
            'Ctrl+Alt+M': () => this.applyTemplate('masterStack'),
            'Ctrl+Alt+S': () => this.toggleSnapping(),
            'Ctrl+Alt+L': () => this.showLayoutToolsPanel(),
            'Ctrl+Alt+N': () => this.createCustomLayout(),
            'Ctrl+Alt+R': () => this.resetLayout(),
            'Ctrl+Tab': () => this.cycleWindows(),
            'Ctrl+Shift+Tab': () => this.cycleWindowsBackward(),
            'Alt+ArrowKeys': () => this.moveFocusedWindow(),
            'Ctrl+Alt+ArrowKeys': () => this.resizeFocusedWindow(),
            'Ctrl+Alt+P': () => this.togglePreviewMode(),
            'Ctrl+Alt+F': () => this.toggleFloatingMode()
        };
    }

    createLayoutToolsPanel() {
        const panel = document.createElement('div');
        panel.id = 'window-layout-tools';
        panel.className = 'layout-tools-panel hidden';
        panel.innerHTML = `
            <div class="layout-tools-header">
                <h3>Window Layout Tools</h3>
                <button class="close-button" onclick="windowLayoutTools.hideLayoutToolsPanel()">×</button>
            </div>

            <div class="layout-tools-tabs">
                <button class="tab-button active" data-tab="templates">Templates</button>
                <button class="tab-button" data-tab="custom">Custom</button>
                <button class="tab-button" data-tab="snap">Snapping</button>
                <button class="tab-button" data-tab="shortcuts">Shortcuts</button>
            </div>

            <div class="layout-tools-content">
                <!-- Templates Tab -->
                <div class="tab-content active" id="templates-tab">
                    <div class="template-grid">
                        ${Object.entries(this.layoutTemplates).map(([key, template]) => `
                            <div class="template-card" data-template="${key}">
                                <div class="template-icon">${template.icon}</div>
                                <div class="template-info">
                                    <h4>${template.name}</h4>
                                    <p>${template.description}</p>
                                </div>
                                <button class="apply-template-button" onclick="windowLayoutTools.applyTemplate('${key}')">
                                    Apply
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Custom Layout Tab -->
                <div class="tab-content" id="custom-tab">
                    <div class="custom-layout-controls">
                        <button class="create-layout-button" onclick="windowLayoutTools.createCustomLayout()">
                            Create New Layout
                        </button>
                        <button class="save-current-button" onclick="windowLayoutTools.saveCurrentLayout()">
                            Save Current Arrangement
                        </button>
                    </div>
                    <div class="custom-layouts-list">
                        ${this.renderCustomLayouts()}
                    </div>
                </div>

                <!-- Snapping Tab -->
                <div class="tab-content" id="snap-tab">
                    <div class="snap-settings">
                        <div class="setting-item">
                            <label>Enable Snapping</label>
                            <input type="checkbox" id="enable-snapping" checked onchange="windowLayoutTools.toggleSnapping()">
                        </div>
                        <div class="setting-item">
                            <label>Snap Threshold (px)</label>
                            <input type="range" id="snap-threshold" min="5" max="50" value="${this.snapThreshold}"
                                   oninput="windowLayoutTools.setSnapThreshold(this.value)">
                            <span id="snap-value">${this.snapThreshold}px</span>
                        </div>
                        <div class="setting-item">
                            <label>Show Snap Indicators</label>
                            <input type="checkbox" id="show-indicators" checked onchange="windowLayoutTools.toggleIndicators()">
                        </div>
                        <div class="setting-item">
                            <label>Multi-Monitor Support</label>
                            <input type="checkbox" id="multi-monitor" checked onchange="windowLayoutTools.toggleMultiMonitor()">
                        </div>
                    </div>
                </div>

                <!-- Shortcuts Tab -->
                <div class="tab-content" id="shortcuts-tab">
                    <div class="shortcuts-list">
                        ${Object.entries(this.keyboardShortcuts).map(([shortcut, description]) => `
                            <div class="shortcut-item">
                                <kbd>${shortcut}</kbd>
                                <span>${this.getShortcutDescription(shortcut)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="layout-tools-footer">
                <div class="quick-actions">
                    <button onclick="windowLayoutTools.resetLayout()">Reset Layout</button>
                    <button onclick="windowLayoutTools.togglePreviewMode()">Preview Mode</button>
                    <button onclick="windowLayoutTools.toggleFloatingMode()">Floating Mode</button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this.setupTabSwitching();
    }

    setupTabSwitching() {
        const panel = document.getElementById('window-layout-tools');
        const tabButtons = panel.querySelectorAll('.tab-button');
        const tabContents = panel.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                button.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
            });
        });
    }

    applyGridLayout(windows, area) {
        const count = windows.length;
        if (count === 0) return;

        const gap = 8;
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const cellWidth = (area.width - gap * (cols + 1)) / cols;
        const cellHeight = (area.height - gap * (rows + 1)) / rows;

        windows.forEach((window, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            window.x = gap + col * (cellWidth + gap);
            window.y = gap + row * (cellHeight + gap);
            window.width = cellWidth;
            window.height = cellHeight;
        });
    }

    applyCascadeLayout(windows, area) {
        const offsetX = 30;
        const offsetY = 30;
        const width = Math.min(800, area.width - 200);
        const height = Math.min(600, area.height - 100);

        windows.forEach((window, index) => {
            window.x = 50 + (index * offsetX);
            window.y = 50 + (index * offsetY);
            window.width = width;
            window.height = height;
        });
    }

    applyVerticalLayout(windows, area) {
        const gap = 8;
        const width = area.width - (gap * 2);
        const height = (area.height - gap * (windows.length + 1)) / windows.length;

        windows.forEach((window, index) => {
            window.x = gap;
            window.y = gap + index * (height + gap);
            window.width = width;
            window.height = height;
        });
    }

    applyHorizontalLayout(windows, area) {
        const gap = 8;
        const width = (area.width - gap * (windows.length + 1)) / windows.length;
        const height = area.height - (gap * 2);

        windows.forEach((window, index) => {
            window.x = gap + index * (width + gap);
            window.y = gap;
            window.width = width;
            window.height = height;
        });
    }

    applyMasterStackLayout(windows, area) {
        const gap = 8;
        if (windows.length === 0) return;

        const masterWidth = windows.length === 1 ? area.width - gap * 2 : area.width * 0.6 - gap;
        const masterHeight = area.height - gap * 2;

        // Master window (first window)
        windows[0].x = gap;
        windows[0].y = gap;
        windows[0].width = masterWidth;
        windows[0].height = masterHeight;

        // Stack windows
        if (windows.length > 1) {
            const stackWidth = area.width - masterWidth - gap * 2;
            const stackHeight = (area.height - gap * (windows.length)) / (windows.length - 1);

            for (let i = 1; i < windows.length; i++) {
                windows[i].x = masterWidth + gap;
                windows[i].y = gap + (i - 1) * (stackHeight + gap);
                windows[i].width = stackWidth;
                windows[i].height = stackHeight;
            }
        }
    }

    applyMosaicLayout(windows, area) {
        const gap = 8;
        const count = windows.length;

        if (count === 0) return;
        if (count === 1) {
            windows[0].x = gap;
            windows[0].y = gap;
            windows[0].width = area.width - gap * 2;
            windows[0].height = area.height - gap * 2;
            return;
        }

        if (count === 2) {
            windows[0].x = gap;
            windows[0].y = gap;
            windows[0].width = area.width * 0.6 - gap;
            windows[0].height = area.height - gap * 2;

            windows[1].x = area.width * 0.6;
            windows[1].y = gap;
            windows[1].width = area.width * 0.4 - gap;
            windows[1].height = area.height - gap * 2;
            return;
        }

        // For 3+ windows, create a custom mosaic pattern
        const mainWidth = area.width * 0.5;
        const secondaryWidth = (area.width - mainWidth - gap * 2) / 2;

        // Main window (largest)
        windows[0].x = gap;
        windows[0].y = gap;
        windows[0].width = mainWidth - gap;
        windows[0].height = area.height - gap * 2;

        // Secondary windows
        const secondaryHeight = (area.height - gap * 2) / Math.ceil((count - 1) / 2);

        for (let i = 1; i < windows.length; i++) {
            const col = Math.floor((i - 1) / Math.ceil((count - 1) / 2));
            const row = (i - 1) % Math.ceil((count - 1) / 2);

            windows[i].x = mainWidth + col * (secondaryWidth + gap) + gap;
            windows[i].y = gap + row * (secondaryHeight + gap);
            windows[i].width = secondaryWidth;
            windows[i].height = secondaryHeight;
        }
    }

    applyFocusLayout(windows, area) {
        const gap = 8;
        if (windows.length === 0) return;

        const focusedWindow = windows.find(w => windowManager.activeWindow && w.id === windowManager.activeWindow.id);
        const backgroundWindows = windows.filter(w => !focusedWindow || w.id !== focusedWindow.id);

        // Background windows - smaller and dimmed
        const bgSize = Math.min(300, area.width * 0.2);
        const bgPositions = [
            { x: gap, y: gap },
            { x: area.width - bgSize - gap, y: gap },
            { x: gap, y: area.height - bgSize - gap },
            { x: area.width - bgSize - gap, y: area.height - bgSize - gap }
        ];

        backgroundWindows.forEach((window, index) => {
            const pos = bgPositions[index % bgPositions.length];
            window.x = pos.x;
            window.y = pos.y;
            window.width = bgSize;
            window.height = bgSize;

            if (window.element) {
                window.element.classList.add('background-window');
            }
        });

        // Focused window - large and centered
        if (focusedWindow) {
            focusedWindow.x = area.width * 0.25;
            focusedWindow.y = area.height * 0.25;
            focusedWindow.width = area.width * 0.5;
            focusedWindow.height = area.height * 0.5;

            if (focusedWindow.element) {
                focusedWindow.element.classList.remove('background-window');
                focusedWindow.element.classList.add('focus-window');
            }
        }
    }

    applyTemplate(templateName) {
        const template = this.layoutTemplates[templateName];
        if (!template) return;

        const visibleWindows = windowManager.windows.filter(w => !w.isMinimized);
        const desktopArea = windowManager.desktopArea.getBoundingClientRect();

        template.apply(visibleWindows, {
            width: desktopArea.width,
            height: desktopArea.height
        });

        // Update window positions
        visibleWindows.forEach(window => {
            if (window.element) {
                window.element.style.left = window.x + 'px';
                window.element.style.top = window.y + 'px';
                window.element.style.width = window.width + 'px';
                window.element.style.height = window.height + 'px';
            }
        });

        this.activeTemplate = templateName;
        this.saveLayoutState();
        this.showNotification(`Applied ${template.name} layout`);
    }

    createCustomLayout() {
        const layoutName = prompt('Enter a name for your custom layout:');
        if (!layoutName) return;

        const visibleWindows = windowManager.windows.filter(w => !w.isMinimized);
        const layoutData = {
            name: layoutName,
            timestamp: Date.now(),
            windows: visibleWindows.map(w => ({
                id: w.id,
                title: w.title,
                x: w.x,
                y: w.y,
                width: w.width,
                height: w.height
            }))
        };

        this.customLayouts[layoutName] = layoutData;
        this.saveCustomLayouts();
        this.renderCustomLayouts();
        this.showNotification(`Custom layout "${layoutName}" saved`);
    }

    saveCurrentLayout() {
        this.createCustomLayout();
    }

    loadCustomLayout(layoutName) {
        const layout = this.customLayouts[layoutName];
        if (!layout) return;

        const visibleWindows = windowManager.windows.filter(w => !w.isMinimized);
        const windowCount = Math.min(visibleWindows.length, layout.windows.length);

        for (let i = 0; i < windowCount; i++) {
            const window = visibleWindows[i];
            const layoutWindow = layout.windows[i];

            window.x = layoutWindow.x;
            window.y = layoutWindow.y;
            window.width = layoutWindow.width;
            window.height = layoutWindow.height;

            if (window.element) {
                window.element.style.left = window.x + 'px';
                window.element.style.top = window.y + 'px';
                window.element.style.width = window.width + 'px';
                window.element.style.height = window.height + 'px';
            }
        }

        this.showNotification(`Loaded custom layout "${layoutName}"`);
    }

    deleteCustomLayout(layoutName) {
        if (!confirm(`Delete custom layout "${layoutName}"?`)) return;

        delete this.customLayouts[layoutName];
        this.saveCustomLayouts();
        this.renderCustomLayouts();
        this.showNotification(`Custom layout "${layoutName}" deleted`);
    }

    renderCustomLayouts() {
        if (Object.keys(this.customLayouts).length === 0) {
            return '<p class="no-custom-layouts">No custom layouts saved yet</p>';
        }

        return Object.entries(this.customLayouts).map(([name, layout]) => `
            <div class="custom-layout-item">
                <div class="layout-info">
                    <h4>${layout.name}</h4>
                    <p>${new Date(layout.timestamp).toLocaleDateString()} • ${layout.windows.length} windows</p>
                </div>
                <div class="layout-actions">
                    <button onclick="windowLayoutTools.loadCustomLayout('${name}')">Load</button>
                    <button onclick="windowLayoutTools.deleteCustomLayout('${name}')" class="delete">Delete</button>
                </div>
            </div>
        `).join('');
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const key = this.getKeyString(e);
            const handler = this.keyboardShortcuts[key];

            if (handler && !e.target.matches('input, textarea')) {
                e.preventDefault();
                handler();
            }
        });
    }

    getKeyString(e) {
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');

        if (e.key === 'ArrowUp') parts.push('ArrowKeys');
        else if (e.key === 'ArrowDown') parts.push('ArrowKeys');
        else if (e.key === 'ArrowLeft') parts.push('ArrowKeys');
        else if (e.key === 'ArrowRight') parts.push('ArrowKeys');
        else parts.push(e.key);

        return parts.join('+');
    }

    getShortcutDescription(shortcut) {
        const descriptions = {
            'Ctrl+Alt+G': 'Apply Grid layout',
            'Ctrl+Alt+C': 'Apply Cascade layout',
            'Ctrl+Alt+V': 'Apply Vertical layout',
            'Ctrl+Alt+H': 'Apply Horizontal layout',
            'Ctrl+Alt+M': 'Apply Master-Stack layout',
            'Ctrl+Alt+S': 'Toggle window snapping',
            'Ctrl+Alt+L': 'Open layout tools panel',
            'Ctrl+Alt+N': 'Create new custom layout',
            'Ctrl+Alt+R': 'Reset current layout',
            'Ctrl+Tab': 'Cycle through windows',
            'Ctrl+Shift+Tab': 'Cycle backward through windows',
            'Alt+ArrowKeys': 'Move focused window',
            'Ctrl+Alt+ArrowKeys': 'Resize focused window',
            'Ctrl+Alt+P': 'Toggle preview mode',
            'Ctrl+Alt+F': 'Toggle floating mode'
        };

        return descriptions[shortcut] || shortcut;
    }

    setupGlobalEventListeners() {
        // Enhanced drag handling for snapping
        if (windowManager) {
            const originalStartDrag = windowManager.startDrag.bind(windowManager);
            windowManager.startDrag = (e, windowId) => {
                if (this.snapEnabled) {
                    this.enableSnappingMode(windowId);
                }
                originalStartDrag(e, windowId);
            };
        }
    }

    enableSnappingMode(windowId) {
        this.snappingWindow = windowId;
        this.updateSnapZones();
        this.showSnapIndicators();
    }

    disableSnappingMode() {
        this.snappingWindow = null;
        this.hideSnapIndicators();
    }

    updateSnapZones() {
        const desktopArea = windowManager.desktopArea.getBoundingClientRect();
        const gap = 8;

        this.snapZones = [
            // Screen edges
            { type: 'edge', side: 'left', x: gap, y: gap, width: this.snapThreshold, height: desktopArea.height - gap * 2 },
            { type: 'edge', side: 'right', x: desktopArea.width - gap - this.snapThreshold, y: gap, width: this.snapThreshold, height: desktopArea.height - gap * 2 },
            { type: 'edge', side: 'top', x: gap, y: gap, width: desktopArea.width - gap * 2, height: this.snapThreshold },
            { type: 'edge', side: 'bottom', x: gap, y: desktopArea.height - gap - this.snapThreshold, width: desktopArea.width - gap * 2, height: this.snapThreshold },

            // Corners
            { type: 'corner', side: 'top-left', x: gap, y: gap, width: this.snapThreshold * 2, height: this.snapThreshold * 2 },
            { type: 'corner', side: 'top-right', x: desktopArea.width - gap - this.snapThreshold * 2, y: gap, width: this.snapThreshold * 2, height: this.snapThreshold * 2 },
            { type: 'corner', side: 'bottom-left', x: gap, y: desktopArea.height - gap - this.snapThreshold * 2, width: this.snapThreshold * 2, height: this.snapThreshold * 2 },
            { type: 'corner', side: 'bottom-right', x: desktopArea.width - gap - this.snapThreshold * 2, y: desktopArea.height - gap - this.snapThreshold * 2, width: this.snapThreshold * 2, height: this.snapThreshold * 2 }
        ];
    }

    createSnapIndicators() {
        // Snap indicators will be created dynamically
    }

    showSnapIndicators() {
        this.hideSnapIndicators();

        const desktopArea = windowManager.desktopArea;

        this.snapZones.forEach(zone => {
            const indicator = document.createElement('div');
            indicator.className = `snap-indicator ${zone.type} ${zone.side}`;
            indicator.style.left = zone.x + 'px';
            indicator.style.top = zone.y + 'px';
            indicator.style.width = zone.width + 'px';
            indicator.style.height = zone.height + 'px';

            desktopArea.appendChild(indicator);
            this.snapIndicators.push(indicator);
        });
    }

    hideSnapIndicators() {
        this.snapIndicators.forEach(indicator => indicator.remove());
        this.snapIndicators = [];
    }

    checkSnapPosition(window) {
        const snapZone = this.findSnapZone(window);
        if (snapZone) {
            this.applySnapAction(window, snapZone);
            return true;
        }
        return false;
    }

    findSnapZone(window) {
        return this.snapZones.find(zone => {
            return Math.abs(window.x - zone.x) < this.snapThreshold ||
                   Math.abs(window.y - zone.y) < this.snapThreshold ||
                   Math.abs(window.x + window.width - zone.x - zone.width) < this.snapThreshold ||
                   Math.abs(window.y + window.height - zone.y - zone.height) < this.snapThreshold;
        });
    }

    applySnapAction(window, zone) {
        const desktopArea = windowManager.desktopArea.getBoundingClientRect();
        const gap = 8;

        switch (zone.side) {
            case 'left':
                window.x = gap;
                window.width = desktopArea.width / 2 - gap * 1.5;
                break;
            case 'right':
                window.x = desktopArea.width / 2 + gap / 2;
                window.width = desktopArea.width / 2 - gap * 1.5;
                break;
            case 'top':
                window.y = gap;
                window.height = desktopArea.height / 2 - gap * 1.5;
                break;
            case 'bottom':
                window.y = desktopArea.height / 2 + gap / 2;
                window.height = desktopArea.height / 2 - gap * 1.5;
                break;
            case 'top-left':
                window.x = gap;
                window.y = gap;
                window.width = desktopArea.width / 2 - gap * 1.5;
                window.height = desktopArea.height / 2 - gap * 1.5;
                break;
            case 'top-right':
                window.x = desktopArea.width / 2 + gap / 2;
                window.y = gap;
                window.width = desktopArea.width / 2 - gap * 1.5;
                window.height = desktopArea.height / 2 - gap * 1.5;
                break;
            case 'bottom-left':
                window.x = gap;
                window.y = desktopArea.height / 2 + gap / 2;
                window.width = desktopArea.width / 2 - gap * 1.5;
                window.height = desktopArea.height / 2 - gap * 1.5;
                break;
            case 'bottom-right':
                window.x = desktopArea.width / 2 + gap / 2;
                window.y = desktopArea.height / 2 + gap / 2;
                window.width = desktopArea.width / 2 - gap * 1.5;
                window.height = desktopArea.height / 2 - gap * 1.5;
                break;
        }

        windowManager.updateWindowSize(window);
    }

    toggleSnapping() {
        this.snapEnabled = !this.snapEnabled;
        const checkbox = document.getElementById('enable-snapping');
        if (checkbox) checkbox.checked = this.snapEnabled;
        this.showNotification(`Snapping ${this.snapEnabled ? 'enabled' : 'disabled'}`);
    }

    setSnapThreshold(value) {
        this.snapThreshold = parseInt(value);
        document.getElementById('snap-value').textContent = value + 'px';
        this.updateSnapZones();
    }

    toggleIndicators() {
        const showIndicators = document.getElementById('show-indicators').checked;
        this.showSnapIndicators = showIndicators;
        if (!showIndicators && this.snappingWindow) {
            this.hideSnapIndicators();
        }
    }

    toggleMultiMonitor() {
        const enabled = document.getElementById('multi-monitor').checked;
        this.multiMonitorEnabled = enabled;
        if (enabled) {
            this.multiMonitorInfo = this.detectMultiMonitorSetup();
        }
        this.showNotification(`Multi-monitor support ${enabled ? 'enabled' : 'disabled'}`);
    }

    detectMultiMonitorSetup() {
        // Simple multi-monitor detection based on screen dimensions
        // In a real implementation, this would use more sophisticated detection
        return {
            count: 1, // Default to single monitor
            primary: { width: screen.width, height: screen.height },
            monitors: [{
                width: screen.width,
                height: screen.height,
                x: 0,
                y: 0
            }]
        };
    }

    cycleWindows() {
        const visibleWindows = windowManager.windows.filter(w => !w.isMinimized);
        if (visibleWindows.length <= 1) return;

        const currentIndex = visibleWindows.findIndex(w =>
            windowManager.activeWindow && w.id === windowManager.activeWindow.id
        );

        const nextIndex = (currentIndex + 1) % visibleWindows.length;
        windowManager.focusWindow(visibleWindows[nextIndex].id);
    }

    cycleWindowsBackward() {
        const visibleWindows = windowManager.windows.filter(w => !w.isMinimized);
        if (visibleWindows.length <= 1) return;

        const currentIndex = visibleWindows.findIndex(w =>
            windowManager.activeWindow && w.id === windowManager.activeWindow.id
        );

        const prevIndex = currentIndex === 0 ? visibleWindows.length - 1 : currentIndex - 1;
        windowManager.focusWindow(visibleWindows[prevIndex].id);
    }

    moveFocusedWindow() {
        if (!windowManager.activeWindow || !this.snappingWindow) return;
        // Movement logic would be implemented here based on keyboard input
    }

    resizeFocusedWindow() {
        if (!windowManager.activeWindow) return;
        // Resize logic would be implemented here based on keyboard input
    }

    togglePreviewMode() {
        this.previewMode = !this.previewMode;

        if (this.previewMode) {
            windowManager.windows.forEach(window => {
                if (window.element) {
                    window.element.classList.add('preview-mode');
                }
            });
        } else {
            windowManager.windows.forEach(window => {
                if (window.element) {
                    window.element.classList.remove('preview-mode');
                }
            });
        }

        this.showNotification(`Preview mode ${this.previewMode ? 'enabled' : 'disabled'}`);
    }

    toggleFloatingMode() {
        const newMode = windowManager.toggleMode();
        this.showNotification(`Switched to ${newMode} mode`);
    }

    resetLayout() {
        windowManager.windows.forEach(window => {
            if (!window.isMinimized) {
                window.x = 100 + (Math.random() * 100);
                window.y = 100 + (Math.random() * 100);
                window.width = 800;
                window.height = 600;

                if (window.element) {
                    window.element.style.left = window.x + 'px';
                    window.element.style.top = window.y + 'px';
                    window.element.style.width = window.width + 'px';
                    window.element.style.height = window.height + 'px';
                }
            }
        });

        this.showNotification('Layout reset');
    }

    showLayoutToolsPanel() {
        this.isOpen = true;
        const panel = document.getElementById('window-layout-tools');
        if (panel) {
            panel.classList.remove('hidden');
        }
    }

    hideLayoutToolsPanel() {
        this.isOpen = false;
        const panel = document.getElementById('window-layout-tools');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    saveLayoutState() {
        const state = {
            activeTemplate: this.activeTemplate,
            snapEnabled: this.snapEnabled,
            snapThreshold: this.snapThreshold,
            showIndicators: this.showSnapIndicators,
            multiMonitorEnabled: this.multiMonitorEnabled
        };
        localStorage.setItem('windowLayoutToolsState', JSON.stringify(state));
    }

    loadPersistedLayout() {
        const saved = localStorage.getItem('windowLayoutToolsState');
        if (saved) {
            const state = JSON.parse(saved);
            this.activeTemplate = state.activeTemplate || 'grid';
            this.snapEnabled = state.snapEnabled !== false;
            this.snapThreshold = state.snapThreshold || 20;
            this.showSnapIndicators = state.showIndicators !== false;
            this.multiMonitorEnabled = state.multiMonitorEnabled !== false;

            // Update UI controls
            const enableSnapCheckbox = document.getElementById('enable-snapping');
            if (enableSnapCheckbox) enableSnapCheckbox.checked = this.snapEnabled;

            const snapThresholdSlider = document.getElementById('snap-threshold');
            if (snapThresholdSlider) {
                snapThresholdSlider.value = this.snapThreshold;
                document.getElementById('snap-value').textContent = this.snapThreshold + 'px';
            }
        }
    }

    saveCustomLayouts() {
        localStorage.setItem('windowLayoutToolsCustomLayouts', JSON.stringify(this.customLayouts));
    }

    loadCustomLayouts() {
        const saved = localStorage.getItem('windowLayoutToolsCustomLayouts');
        return saved ? JSON.parse(saved) : {};
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'layout-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            animation: fadeInOut 2s ease-in-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    }
}

// Initialize and export singleton instance
let windowLayoutTools;
if (typeof windowManager !== 'undefined') {
    windowLayoutTools = new WindowLayoutTools();
    window.windowLayoutTools = windowLayoutTools;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WindowLayoutTools;
}