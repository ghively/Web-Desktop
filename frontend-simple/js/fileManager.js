// File Manager Component
class FileManager {
    constructor() {
        this.currentPath = '/home';
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

        if (pathInput) pathInput.value = this.currentPath;

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
            <div class="file-item" onclick="fileManager.${file.isDirectory ? `navigate('${file.path}')` : `selectFile('${file.path}')`}" 
                 style="padding: 0.75rem; margin: 0.25rem; background: var(--surface0); border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; transition: background 0.2s;"
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
        alert(`File selected: ${path}\n\nDownload/view functionality coming soon!`);
    }
}

// Global instance
const fileManager = new FileManager();
