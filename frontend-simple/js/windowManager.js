// Window Manager
class WindowManager {
    constructor() {
        this.windows = [];
        this.nextId = 1;
        this.nextZIndex = 100;
        this.activeWindow = null;
        this.mode = 'tiling'; // 'tiling' or 'floating'
        this.desktopArea = document.getElementById('desktop-area');
        this.runningAppsContainer = document.getElementById('running-apps');

        // Enhanced layout capabilities
        this.layoutTools = null;
        this.snapEnabled = true;
        this.snapThreshold = 20;
        this.windowGroups = new Map(); // For window grouping/tabbing
        this.layoutState = this.loadLayoutState();

        // Initialize layout tools when available
        this.initializeLayoutTools();
    }

    createWindow(title, content) {
        const id = this.nextId++;
        const window = {
            id,
            title,
            content,
            x: 100 + (this.windows.length * 20),
            y: 60 + (this.windows.length * 20),
            width: 800,
            height: 600,
            zIndex: this.nextZIndex++,
            isMinimized: false,
            isMaximized: false,
            element: null,
            groupId: null,
            tabPosition: null,
            isSnapped: false,
            snapEdge: null,
            isGrouped: false
        };

        this.windows.push(window);
        this.renderWindow(window);
        this.focusWindow(window.id);
        this.updateRunningApps();

        if (this.mode === 'tiling') {
            this.applyTiling();
        }

        return window;
    }

    renderWindow(window) {
        const el = document.createElement('div');
        el.className = 'window';
        el.dataset.windowId = window.id;
        el.style.left = window.x + 'px';
        el.style.top = window.y + 'px';
        el.style.width = window.width + 'px';
        el.style.height = window.height + 'px';
        el.style.zIndex = window.zIndex;

        el.innerHTML = `
            <div class="window-header">
                <span class="window-title">${window.title}</span>
                <div class="window-controls">
                    <button class="window-button minimize"></button>
                    <button class="window-button maximize"></button>
                    <button class="window-button close"></button>
                </div>
            </div>
            <div class="window-content">${window.content}</div>
            ${this.mode === 'floating' ? this.getResizeHandles() : ''}
        `;

        // Event listeners
        const header = el.querySelector('.window-header');
        header.addEventListener('mousedown', (e) => this.startDrag(e, window.id));

        el.querySelector('.minimize').addEventListener('click', () => this.minimizeWindow(window.id));
        el.querySelector('.maximize').addEventListener('click', () => this.maximizeWindow(window.id));
        el.querySelector('.close').addEventListener('click', () => this.closeWindow(window.id));

        // Resize handles (only in floating mode)
        if (this.mode === 'floating') {
            this.attachResizeHandlers(el, window.id);
        }

        window.element = el;
        this.desktopArea.appendChild(el);
    }

    getResizeHandles() {
        return `
            <div class="resize-handle n"></div>
            <div class="resize-handle s"></div>
            <div class="resize-handle e"></div>
            <div class="resize-handle w"></div>
            <div class="resize-handle ne"></div>
            <div class="resize-handle nw"></div>
            <div class="resize-handle se"></div>
            <div class="resize-handle sw"></div>
        `;
    }

    attachResizeHandlers(el, windowId) {
        const handles = el.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => this.startResize(e, windowId, handle.className.split(' ')[1]));
        });
    }

    startDrag(e, windowId) {
        if (this.mode === 'tiling') return; // Can't drag in tiling mode

        const window = this.windows.find(w => w.id === windowId);
        if (!window || window.isMaximized) return;

        this.focusWindow(windowId);

        const startX = e.clientX - window.x;
        const startY = e.clientY - window.y;

        const onMouseMove = (e) => {
            window.x = e.clientX - startX;
            window.y = e.clientY - startY;
            window.element.style.left = window.x + 'px';
            window.element.style.top = window.y + 'px';
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    startResize(e, windowId, direction) {
        e.stopPropagation();
        const window = this.windows.find(w => w.id === windowId);
        if (!window) return;

        this.focusWindow(windowId);

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = window.width;
        const startHeight = window.height;
        const startPosX = window.x;
        const startPosY = window.y;

        const onMouseMove = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (direction.includes('e')) {
                window.width = Math.max(300, startWidth + dx);
            }
            if (direction.includes('w')) {
                const newWidth = Math.max(300, startWidth - dx);
                window.x = startPosX + (startWidth - newWidth);
                window.width = newWidth;
            }
            if (direction.includes('s')) {
                window.height = Math.max(200, startHeight + dy);
            }
            if (direction.includes('n')) {
                const newHeight = Math.max(200, startHeight - dy);
                window.y = startPosY + (startHeight - newHeight);
                window.height = newHeight;
            }

            this.updateWindowSize(window);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    updateWindowSize(window) {
        window.element.style.left = window.x + 'px';
        window.element.style.top = window.y + 'px';
        window.element.style.width = window.width + 'px';
        window.element.style.height = window.height + 'px';
    }

    focusWindow(windowId) {
        this.windows.forEach(w => {
            if (w.element) {
                w.element.classList.remove('focused');
            }
        });

        const window = this.windows.find(w => w.id === windowId);
        if (window && window.element) {
            window.zIndex = this.nextZIndex++;
            window.element.style.zIndex = window.zIndex;
            window.element.classList.add('focused');
            this.activeWindow = window;
            if (window.isMinimized) {
                this.minimizeWindow(window.id); // Unminimize
            }
        }
        this.updateRunningApps();
    }

    minimizeWindow(windowId) {
        const window = this.windows.find(w => w.id === windowId);
        if (window) {
            window.isMinimized = !window.isMinimized;
            window.element.classList.toggle('minimized', window.isMinimized);
            if (this.mode === 'tiling') {
                this.applyTiling();
            }
            this.updateRunningApps();
        }
    }

    maximizeWindow(windowId) {
        const window = this.windows.find(w => w.id === windowId);
        if (window) {
            window.isMaximized = !window.isMaximized;
            window.element.classList.toggle('maximized', window.isMaximized);
        }
    }

    closeWindow(windowId) {
        const index = this.windows.findIndex(w => w.id === windowId);
        if (index !== -1) {
            const window = this.windows[index];
            if (window.element) {
                window.element.remove();
            }
            this.windows.splice(index, 1);

            if (this.mode === 'tiling') {
                this.applyTiling();
            }
            this.updateRunningApps();
        }
    }

    updateRunningApps() {
        if (!this.runningAppsContainer) return;
        this.runningAppsContainer.innerHTML = '';
        this.windows.forEach(window => {
            const button = document.createElement('button');
            button.className = 'app-button';
            if (this.activeWindow && this.activeWindow.id === window.id) {
                button.classList.add('focused');
            }
            if (window.isMinimized) {
                button.classList.add('minimized');
            }
            button.dataset.windowId = window.id;
            button.innerHTML = `
                <span class="icon">${this.getIconForApp(window.title)}</span>
                <span>${window.title}</span>
            `;
            button.addEventListener('click', () => this.focusWindow(window.id));
            this.runningAppsContainer.appendChild(button);
        });
    }

    getIconForApp(title) {
        switch (title) {
            case 'Terminal': return '📟';
            case 'File Manager': return '📂';
            case 'Notes': return '📝';
            case 'Text Editor': return '💻';
            case 'Containers': return '🐳';
            case 'Control Panel': return '⚙️';
            default: return '📦';
        }
    }

    toggleMode() {
        this.mode = this.mode === 'tiling' ? 'floating' : 'tiling';

        // Update all windows
        this.windows.forEach(window => {
            if (window.element) {
                if (this.mode === 'tiling') {
                    window.element.classList.add('tiled');
                    // Remove resize handles
                    window.element.querySelectorAll('.resize-handle').forEach(h => h.remove());
                } else {
                    window.element.classList.remove('tiled');
                    // Add resize handles
                    const content = window.element.querySelector('.window-content');
                    content.insertAdjacentHTML('afterend', this.getResizeHandles());
                    this.attachResizeHandlers(window.element, window.id);
                }
            }
        });

        if (this.mode === 'tiling') {
            this.applyTiling();
        }

        return this.mode;
    }

    applyTiling() {
        const visibleWindows = this.windows.filter(w => !w.isMinimized);
        const count = visibleWindows.length;

        if (count === 0) return;

        const areaWidth = this.desktopArea.clientWidth;
        const areaHeight = this.desktopArea.clientHeight;
        const gap = 8;

        if (count === 1) {
            // Full screen
            const w = visibleWindows[0];
            w.x = gap;
            w.y = gap;
            w.width = areaWidth - (gap * 2);
            w.height = areaHeight - (gap * 2);
            this.updateWindowSize(w);
        } else if (count === 2) {
            // Split vertically
            const w = (areaWidth - (gap * 3)) / 2;
            visibleWindows.forEach((window, i) => {
                window.x = gap + (i * (w + gap));
                window.y = gap;
                window.width = w;
                window.height = areaHeight - (gap * 2);
                this.updateWindowSize(window);
            });
        } else {
            // Grid layout
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);
            const w = (areaWidth - (gap * (cols + 1))) / cols;
            const h = (areaHeight - (gap * (rows + 1))) / rows;

            visibleWindows.forEach((window, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                window.x = gap + (col * (w + gap));
                window.y = gap + (row * (h + gap));
                window.width = w;
                window.height = h;
                this.updateWindowSize(window);
            });
        }
    }

    // Enhanced layout methods
    initializeLayoutTools() {
        // Wait for layout tools to load
        setTimeout(() => {
            if (typeof windowLayoutTools !== 'undefined') {
                this.layoutTools = windowLayoutTools;
                this.snapEnabled = this.layoutTools.snapEnabled !== false;
                this.snapThreshold = this.layoutTools.snapThreshold || 20;
            }
        }, 100);
    }

    loadLayoutState() {
        const saved = localStorage.getItem('windowManagerLayoutState');
        return saved ? JSON.parse(saved) : {
            windowGroups: {},
            lastLayout: 'grid',
            snapSettings: {
                enabled: true,
                threshold: 20
            }
        };
    }

    saveLayoutState() {
        const state = {
            windowGroups: this.serializeWindowGroups(),
            lastLayout: this.activeLayout || 'grid',
            snapSettings: {
                enabled: this.snapEnabled,
                threshold: this.snapThreshold
            }
        };
        localStorage.setItem('windowManagerLayoutState', JSON.stringify(state));
    }

    serializeWindowGroups() {
        const groups = {};
        this.windowGroups.forEach((windows, groupId) => {
            groups[groupId] = {
                id: groupId,
                windowIds: windows.map(w => w.id),
                layout: 'tabs' // Could be 'tiles', 'stack', etc.
            };
        });
        return groups;
    }

    // Enhanced drag with snapping
    startDrag(e, windowId) {
        if (this.mode === 'tiling') return;

        const window = this.windows.find(w => w.id === windowId);
        if (!window || window.isMaximized) return;

        this.focusWindow(windowId);
        window.isSnapped = false;
        window.snapEdge = null;

        const startX = e.clientX - window.x;
        const startY = e.clientY - window.y;
        let lastSnapCheck = 0;

        const onMouseMove = (e) => {
            const currentX = e.clientX - startX;
            const currentY = e.clientY - startY;

            // Check for snapping every few pixels to avoid performance issues
            const now = Date.now();
            if (this.snapEnabled && now - lastSnapCheck > 50) {
                const snappedPosition = this.checkSnapPosition(window, currentX, currentY);
                if (snappedPosition) {
                    window.x = snappedPosition.x;
                    window.y = snappedPosition.y;
                    window.width = snappedPosition.width;
                    window.height = snappedPosition.height;
                    window.isSnapped = true;
                    window.snapEdge = snappedPosition.edge;
                    this.updateWindowSize(window);
                    lastSnapCheck = now;
                    return;
                }
            }

            window.x = currentX;
            window.y = currentY;
            window.element.style.left = window.x + 'px';
            window.element.style.top = window.y + 'px';

            // Update snap indicators if layout tools are available
            if (this.layoutTools && this.layoutTools.snappingWindow === windowId) {
                this.layoutTools.showSnapIndicators();
            }

            lastSnapCheck = now;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // Disable snapping indicators
            if (this.layoutTools) {
                this.layoutTools.disableSnappingMode();
            }

            // Save layout state after repositioning
            this.saveLayoutState();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    checkSnapPosition(window, targetX, targetY) {
        if (!this.snapEnabled) return null;

        const desktopArea = this.desktopArea.getBoundingClientRect();
        const threshold = this.snapThreshold;
        const gap = 8;

        // Check screen edges
        if (targetX <= gap + threshold) {
            // Left edge snap
            return {
                x: gap,
                y: gap,
                width: desktopArea.width / 2 - gap * 1.5,
                height: desktopArea.height - gap * 2,
                edge: 'left'
            };
        }

        if (targetX + window.width >= desktopArea.width - gap - threshold) {
            // Right edge snap
            return {
                x: desktopArea.width / 2 + gap / 2,
                y: gap,
                width: desktopArea.width / 2 - gap * 1.5,
                height: desktopArea.height - gap * 2,
                edge: 'right'
            };
        }

        if (targetY <= gap + threshold) {
            // Top edge snap
            return {
                x: gap,
                y: gap,
                width: desktopArea.width - gap * 2,
                height: desktopArea.height / 2 - gap * 1.5,
                edge: 'top'
            };
        }

        if (targetY + window.height >= desktopArea.height - gap - threshold) {
            // Bottom edge snap
            return {
                x: gap,
                y: desktopArea.height / 2 + gap / 2,
                width: desktopArea.width - gap * 2,
                height: desktopArea.height / 2 - gap * 1.5,
                edge: 'bottom'
            };
        }

        // Check corners
        if (targetX <= gap + threshold && targetY <= gap + threshold) {
            // Top-left corner - maximize
            return {
                x: gap,
                y: gap,
                width: desktopArea.width - gap * 2,
                height: desktopArea.height - gap * 2,
                edge: 'top-left'
            };
        }

        if (targetX + window.width >= desktopArea.width - gap - threshold &&
            targetY + window.height >= desktopArea.height - gap - threshold) {
            // Bottom-right corner - minimize to corner
            return {
                x: desktopArea.width - window.width - gap,
                y: desktopArea.height - window.height - gap,
                width: window.width,
                height: window.height,
                edge: 'bottom-right'
            };
        }

        return null;
    }

    // Window grouping and tabbing
    createWindowGroup(windowIds, layout = 'tabs') {
        const groupId = 'group_' + Date.now();
        const groupWindows = windowIds.map(id => this.windows.find(w => w.id === id)).filter(w => w);

        groupWindows.forEach((window, index) => {
            window.groupId = groupId;
            window.tabPosition = index;
            window.isGrouped = true;
        });

        this.windowGroups.set(groupId, groupWindows);
        this.saveLayoutState();
        this.arrangeWindowGroup(groupId, layout);

        return groupId;
    }

    arrangeWindowGroup(groupId, layout = 'tabs') {
        const groupWindows = this.windowGroups.get(groupId);
        if (!groupWindows || groupWindows.length === 0) return;

        const desktopArea = this.desktopArea.getBoundingClientRect();
        const gap = 8;

        switch (layout) {
            case 'tabs':
                // Tabbed layout - windows stacked on top of each other
                groupWindows.forEach((window, index) => {
                    window.x = gap;
                    window.y = gap;
                    window.width = desktopArea.width - gap * 2;
                    window.height = desktopArea.height - gap * 2 - 30; // Space for tab bar

                    if (index === 0) {
                        // Only show the first window, hide others
                        if (window.element) {
                            window.element.style.zIndex = this.nextZIndex++;
                            window.element.classList.add('group-active');
                        }
                    } else {
                        if (window.element) {
                            window.element.style.display = 'none';
                        }
                    }

                    this.updateWindowSize(window);
                });
                break;

            case 'tiles':
                // Tiled layout within group
                const cols = Math.ceil(Math.sqrt(groupWindows.length));
                const rows = Math.ceil(groupWindows.length / cols);
                const cellWidth = (desktopArea.width - gap * (cols + 1)) / cols;
                const cellHeight = (desktopArea.height - gap * (rows + 1)) / rows;

                groupWindows.forEach((window, index) => {
                    const col = index % cols;
                    const row = Math.floor(index / cols);

                    window.x = gap + col * (cellWidth + gap);
                    window.y = gap + row * (cellHeight + gap);
                    window.width = cellWidth;
                    window.height = cellHeight;

                    if (window.element) {
                        window.element.style.display = 'block';
                        window.element.classList.add('group-tile');
                    }

                    this.updateWindowSize(window);
                });
                break;

            case 'stack':
                // Cascaded stack
                groupWindows.forEach((window, index) => {
                    const offset = 20;
                    window.x = gap + (index * offset);
                    window.y = gap + (index * offset);
                    window.width = desktopArea.width - gap * 2 - (groupWindows.length * offset);
                    window.height = desktopArea.height - gap * 2 - (groupWindows.length * offset);

                    if (window.element) {
                        window.element.style.display = 'block';
                        window.element.style.zIndex = this.nextZIndex - (groupWindows.length - index);
                    }

                    this.updateWindowSize(window);
                });
                break;
        }
    }

    // Quick layout actions
    centerWindow(windowId) {
        const window = this.windows.find(w => w.id === windowId);
        if (!window) return;

        const bounds = this.getDesktopAreaBounds();
        window.x = (bounds.width - window.width) / 2;
        window.y = (bounds.height - window.height) / 2;

        if (window.element) {
            window.element.style.left = window.x + 'px';
            window.element.style.top = window.y + 'px';
        }
    }

    getDesktopAreaBounds() {
        const rect = this.desktopArea.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    // Keyboard navigation
    focusNextWindow() {
        const visibleWindows = this.windows.filter(w => !w.isMinimized);
        if (visibleWindows.length <= 1) return;

        const currentIndex = visibleWindows.findIndex(w =>
            this.activeWindow && w.id === this.activeWindow.id
        );

        const nextIndex = (currentIndex + 1) % visibleWindows.length;
        this.focusWindow(visibleWindows[nextIndex].id);
    }

    focusPreviousWindow() {
        const visibleWindows = this.windows.filter(w => !w.isMinimized);
        if (visibleWindows.length <= 1) return;

        const currentIndex = visibleWindows.findIndex(w =>
            this.activeWindow && w.id === this.activeWindow.id
        );

        const prevIndex = currentIndex === 0 ? visibleWindows.length - 1 : currentIndex - 1;
        this.focusWindow(visibleWindows[prevIndex].id);
    }
}

// Export singleton instance
const windowManager = new WindowManager();