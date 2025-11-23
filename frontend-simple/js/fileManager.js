// File Manager Component
class FileManager {
    constructor() {
        this.currentPath = '/home';
        this.clipboard = null; // { type: 'copy'|'cut', path: '/path/to/file' }
    }

    async init(windowId) {
        this.windowId = windowId;
        // Ensure we have a default path on first initialization
        if (!this.currentPath) {
            this.currentPath = '/home';
        }
        await this.loadDirectory(this.currentPath);
    }

    render(windowId) {
        return `
            <div style="display: flex; flex-direction: column; height: 100%; background: var(--base);">
                <div style="padding: 0.5rem; background: var(--surface0); border-bottom: 1px solid var(--overlay0); display: flex; gap: 0.5rem; align-items: center;">
                    <button onclick="fileManager.goUp()" style="padding: 0.5rem 1rem; background: var(--surface1); border: 1px solid var(--overlay0); color: var(--text); cursor: pointer; border-radius: 4px;">⬆️ Up</button>
                    <button onclick="fileManager.refresh()" style="padding: 0.5rem 1rem; background: var(--surface1); border: 1px solid var(--overlay0); color: var(--text); cursor: pointer; border-radius: 4px;">🔄</button>
                    <input type="text" id="fm-current-path-${windowId}" readonly value="${this.currentPath || '/home'}" style="flex: 1; padding: 0.5rem; background: var(--surface1); border: 1px solid var(--overlay0); color: var(--text); border-radius: 4px;">
                </div>
                <div style="padding: 0.5rem; background: var(--surface0); border-bottom: 1px solid var(--overlay0); display: flex; gap: 0.5rem;">
                    <button onclick="fileManager.createFolderPrompt()" style="padding: 0.25rem 0.5rem; font-size: 0.9rem; cursor: pointer;">New Folder</button>
                    <button onclick="fileManager.pasteItem()" id="fm-paste-btn-${windowId}" disabled style="padding: 0.25rem 0.5rem; font-size: 0.9rem; cursor: pointer; opacity: 0.5;">Paste</button>
                </div>
                <div id="fm-file-list-${windowId}" style="flex: 1; overflow-y: auto; padding: 0.5rem;">
                    <div style="color: var(--overlay0); padding: 1rem; text-align: center;">Loading...</div>
                </div>
            </div>
        `;
    }

    async loadDirectory(path) {
        try {
            const response = await fetch(`/api/fs?path=${encodeURIComponent(path)}`);
            const data = await response.json();

            this.currentPath = path;
            this.updateUI(data.files || []);
        } catch (err) {
            console.error('Failed to load directory:', err);
            this.updateUI([], `Error: ${err.message}`);
        }
    }

    updateUI(files, error = null) {
        const pathInput = document.querySelector(`[id^="fm-current-path-"]`);
        const fileList = document.querySelector(`[id^="fm-file-list-"]`);
        const pasteBtn = document.querySelector(`[id^="fm-paste-btn-"]`);

        if (pathInput) pathInput.value = this.currentPath;
        if (pasteBtn) {
            pasteBtn.disabled = !this.clipboard;
            pasteBtn.style.opacity = this.clipboard ? '1' : '0.5';
        }

        if (!fileList) return;

        if (error) {
            fileList.innerHTML = `<div style="color: var(--red); padding: 1rem;">${error}</div>`;
            return;
        }

        if (files.length === 0) {
            fileList.innerHTML = '<div style="color: var(--overlay0); padding: 1rem; text-align: center;">Empty directory</div>';
            return;
        }

        fileList.innerHTML = files.map(file => `
            <div class="file-item"
                 style="padding: 0.75rem; margin: 0.25rem; background: var(--surface0); border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; transition: background 0.2s;"
                 onclick="fileManager.handleClick('${file.path}', ${file.isDirectory}, event)"
                 oncontextmenu="fileManager.handleContextMenu('${file.path}', '${file.name}', event); return false;"
                 onmouseover="this.style.background='var(--surface1)'" 
                 onmouseout="this.style.background='var(--surface0)'">
                <span style="font-size: 1.5rem;">${file.isDirectory ? '📁' : this.getFileIcon(file.name)}</span>
                <div style="flex: 1;">
                    <div style="color: var(--text); font-weight: 500;">${file.name}</div>
                    <div style="color: var(--subtext0); font-size: 0.8rem;">
                        ${file.isDirectory ? 'Directory' : this.formatFileSize(file.size)} ${file.modified ? '• ' + new Date(file.modified).toLocaleDateString() : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    handleClick(path, isDirectory, event) {
        if (isDirectory) {
            this.navigate(path);
        } else {
            this.selectFile(path);
        }
    }

    handleContextMenu(path, name, event) {
        // Simple prompt based context menu replacement for now to keep it simple
        event.preventDefault();
        event.stopPropagation();

        // Remove existing context menu if any
        const existing = document.getElementById('fm-context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'fm-context-menu';
        menu.style.position = 'fixed';
        menu.style.top = event.clientY + 'px';
        menu.style.left = event.clientX + 'px';
        menu.style.background = '#1e1e2e';
        menu.style.border = '1px solid #313244';
        menu.style.borderRadius = '4px';
        menu.style.padding = '5px 0';
        menu.style.zIndex = '10000';
        menu.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';

        const options = [
            { label: 'Rename', action: () => this.renameItem(path, name) },
            { label: 'Delete', action: () => this.deleteItem(path) },
            { label: 'Copy', action: () => this.setClipboard('copy', path) },
            { label: 'Cut', action: () => this.setClipboard('move', path) },
        ];

        options.forEach(opt => {
            const item = document.createElement('div');
            item.textContent = opt.label;
            item.style.padding = '8px 16px';
            item.style.cursor = 'pointer';
            item.style.color = '#cdd6f4';
            item.addEventListener('mouseenter', () => item.style.background = '#313244');
            item.addEventListener('mouseleave', () => item.style.background = 'transparent');
            item.addEventListener('click', () => {
                opt.action();
                menu.remove();
            });
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Close on click outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'js': '📜', 'ts': '📜', 'json': '📋',
            'md': '📝', 'txt': '📄',
            'jpg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
            'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬',
            'mp3': '🎵', 'wav': '🎵',
            'zip': '📦', 'tar': '📦', 'gz': '📦',
            'pdf': '📕'
        };
        return icons[ext] || '📄';
    }

    formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }

    async navigate(path) {
        await this.loadDirectory(path);
    }

    async goUp() {
        const parts = this.currentPath.split('/').filter(p => p);
        parts.pop();
        const newPath = '/' + parts.join('/');
        await this.loadDirectory(newPath || '/');
    }

    async refresh() {
        await this.loadDirectory(this.currentPath);
    }

    selectFile(path) {
        // Placeholder for future preview logic
    }

    async createFolderPrompt() {
        const name = prompt('Enter folder name:');
        if (!name) return;

        try {
            const res = await fetch('/api/fs/operation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'create_folder',
                    path: this.currentPath,
                    name: name
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            this.refresh();
        } catch (e) {
            alert(e.message);
        }
    }

    async deleteItem(path) {
        if (!confirm(`Are you sure you want to delete ${path}?`)) return;

        try {
            const res = await fetch('/api/fs/operation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'delete',
                    path: path
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            this.refresh();
        } catch (e) {
            alert(e.message);
        }
    }

    async renameItem(path, oldName) {
        const newName = prompt('Enter new name:', oldName);
        if (!newName || newName === oldName) return;

        try {
            const res = await fetch('/api/fs/operation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'rename',
                    path: path,
                    name: newName
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            this.refresh();
        } catch (e) {
            alert(e.message);
        }
    }

    setClipboard(type, path) {
        this.clipboard = { type, path };
        this.updateUI([]); // Re-render to update paste button state (a bit inefficient but works)
        this.refresh(); // Better way to trigger re-render
    }

    async pasteItem() {
        if (!this.clipboard) return;

        try {
            const res = await fetch('/api/fs/operation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: this.clipboard.type,
                    path: this.clipboard.path,
                    dest: this.currentPath + '/' + this.clipboard.path.split('/').pop() // simplistic dest calculation
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            this.clipboard = null; // Clear clipboard after move? Maybe keep for copy.
            // For now, let's clear it.
            this.refresh();
        } catch (e) {
            alert(e.message);
        }
    }
}

// Global instance
const fileManager = new FileManager();
