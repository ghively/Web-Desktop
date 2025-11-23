// Window Manager
class WindowManager {
    constructor() {
        this.windows = [];
        this.nextId = 1;
        this.nextZIndex = 100;
        this.activeWindow = null;
        this.mode = 'tiling'; // 'tiling' or 'floating'
        this.desktopArea = document.getElementById('desktop-area');
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
            element: null
        };

        this.windows.push(window);
        this.renderWindow(window);
        this.focusWindow(window.id);

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
        }
    }

    minimizeWindow(windowId) {
        const window = this.windows.find(w => w.id === windowId);
        if (window) {
            window.isMinimized = !window.isMinimized;
            window.element.classList.toggle('minimized', window.isMinimized);
            if (this.mode === 'tiling') {
                this.applyTiling();
            }
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
}

// Export singleton instance
const windowManager = new WindowManager();
