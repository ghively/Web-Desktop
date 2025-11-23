// File Manager Component
class FileManager {
    constructor() {
        this.currentPath = '/home';
        this.clipboard = null; // { file, operation: 'copy' | 'cut' }
        this.contextMenu = null;
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
            <div id="file-manager-${windowId}" style="display: flex; flex-direction: column; height: 100%; background: var(--base);"
                 ondragover="fileManager.handleDragOver(event)"
                 ondragleave="fileManager.handleDragLeave(event)"
                 ondrop="fileManager.handleDrop(event)">

                <!-- Header with Upload -->
                <div style="padding: 0.75rem; background: var(--surface0); border-bottom: 1px solid var(--overlay0); display: flex; gap: 0.5rem; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 0.5rem; align-items: center; flex: 1;">
                        <button onclick="fileManager.goUp()" style="padding: 0.5rem 1rem; background: var(--surface1); border: 1px solid var(--overlay0); color: var(--text); cursor: pointer; border-radius: 4px;" title="Go up">⬆️ Up</button>
                        <button onclick="fileManager.refresh()" style="padding: 0.5rem 1rem; background: var(--surface1); border: 1px solid var(--overlay0); color: var(--text); cursor: pointer; border-radius: 4px;" title="Refresh">🔄</button>
                        ${this.clipboard ? `<button onclick="fileManager.handlePaste()" style="padding: 0.5rem 1rem; background: var(--green); border: 1px solid var(--overlay0); color: var(--base); cursor: pointer; border-radius: 4px;" title="Paste (${this.clipboard.operation})">${this.clipboard.operation === 'copy' ? '📋' : '✂️'} Paste</button>` : ''}
                        <input type="text" id="fm-current-path-${windowId}" readonly value="${this.currentPath || '/home'}" style="flex: 1; padding: 0.5rem; background: var(--surface1); border: 1px solid var(--overlay0); color: var(--text); border-radius: 4px;">
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="file" id="fm-file-input-${windowId}" multiple style="display: none;" onchange="fileManager.handleFileInputChange(event)">
                        <button onclick="document.getElementById('fm-file-input-${windowId}').click()" style="padding: 0.5rem 1rem; background: var(--blue); border: 1px solid var(--overlay0); color: var(--base); cursor: pointer; border-radius: 4px; font-weight: 500;">📤 Upload</button>
                    </div>
                </div>

                <!-- Drag overlay -->
                <div id="fm-drag-overlay-${windowId}" style="display: none; position: absolute; inset: 0; background: rgba(137, 180, 250, 0.2); border: 4px dashed var(--blue); z-index: 100; pointer-events: none; align-items: center; justify-content: center;">
                    <div style="background: var(--surface0); padding: 2rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📤</div>
                        <div style="color: var(--text); font-size: 1.2rem; font-weight: 500;">Drop files to upload</div>
                    </div>
                </div>

                <!-- File List -->
                <div id="fm-file-list-${windowId}" style="flex: 1; overflow-y: auto; padding: 0.5rem;">
                    <div style="color: var(--overlay0); padding: 1rem; text-align: center;">Loading...</div>
                </div>

                <!-- Context Menu -->
                <div id="fm-context-menu-${windowId}" style="display: none; position: fixed; background: var(--surface0); border: 1px solid var(--overlay0); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000; min-width: 180px;">
                </div>

                <!-- Preview Modal -->
                <div id="fm-preview-modal-${windowId}" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 2000; padding: 2rem;">
                    <div style="background: var(--surface0); border-radius: 8px; max-width: 900px; max-height: 90vh; margin: 0 auto; display: flex; flex-direction: column;">
                        <div style="padding: 1rem; border-bottom: 1px solid var(--overlay0); display: flex; justify-content: space-between; align-items: center;">
                            <h3 id="fm-preview-title-${windowId}" style="color: var(--text); margin: 0;"></h3>
                            <button onclick="fileManager.closePreview()" style="background: transparent; border: none; color: var(--text); font-size: 1.5rem; cursor: pointer; padding: 0.25rem 0.5rem;">×</button>
                        </div>
                        <div id="fm-preview-content-${windowId}" style="flex: 1; overflow: auto; padding: 1rem;">
                        </div>
                    </div>
                </div>

                <!-- Rename Dialog -->
                <div id="fm-rename-dialog-${windowId}" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 2000; align-items: center; justify-content: center;">
                    <div style="background: var(--surface0); border-radius: 8px; padding: 1.5rem; max-width: 400px; width: 90%;">
                        <h3 style="color: var(--text); margin: 0 0 1rem 0;">Rename File</h3>
                        <input type="text" id="fm-rename-input-${windowId}" style="width: 100%; padding: 0.5rem; background: var(--surface1); border: 1px solid var(--overlay0); color: var(--text); border-radius: 4px; margin-bottom: 1rem;">
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="fileManager.performRename()" style="flex: 1; padding: 0.5rem 1rem; background: var(--blue); border: none; color: var(--base); cursor: pointer; border-radius: 4px; font-weight: 500;">Rename</button>
                            <button onclick="fileManager.closeRenameDialog()" style="flex: 1; padding: 0.5rem 1rem; background: var(--surface1); border: 1px solid var(--overlay0); color: var(--text); cursor: pointer; border-radius: 4px;">Cancel</button>
                        </div>
                    </div>
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

        // Sort: directories first, then files
        const directories = files.filter(f => f.isDirectory);
        const regularFiles = files.filter(f => !f.isDirectory);

        fileList.innerHTML = [...directories, ...regularFiles].map((file, idx) => `
            <div class="file-item"
                 onclick="fileManager.${file.isDirectory ? `navigate('${file.path}')` : `handlePreview('${file.path}', '${file.name}')`}"
                 oncontextmenu="fileManager.showContextMenu(event, ${idx}, '${file.path}', '${file.name}', ${file.isDirectory})"
                 style="padding: 0.75rem; margin: 0.25rem; background: var(--surface0); border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; transition: background 0.2s;"
                 onmouseover="this.style.background='var(--surface1)'"
                 onmouseout="this.style.background='var(--surface0)'">
                <span style="font-size: 1.5rem;">${file.isDirectory ? '📁' : this.getFileIcon(file.name)}</span>
                <div style="flex: 1;">
                    <div style="color: var(--text); font-weight: 500;">${this.escapeHtml(file.name)}</div>
                    <div style="color: var(--subtext0); font-size: 0.8rem;">
                        ${file.isDirectory ? 'Directory' : this.formatFileSize(file.size)} ${file.modified ? '• ' + new Date(file.modified).toLocaleDateString() : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'js': '📜', 'ts': '📜', 'json': '📋',
            'md': '📝', 'txt': '📄',
            'jpg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️', 'webp': '🖼️',
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

    // Drag and Drop
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        const overlay = document.querySelector('[id^="fm-drag-overlay-"]');
        if (overlay) overlay.style.display = 'flex';
    }

    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        // Only hide if leaving the main container
        if (event.target.id && event.target.id.startsWith('file-manager-')) {
            const overlay = document.querySelector('[id^="fm-drag-overlay-"]');
            if (overlay) overlay.style.display = 'none';
        }
    }

    async handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        const overlay = document.querySelector('[id^="fm-drag-overlay-"]');
        if (overlay) overlay.style.display = 'none';

        const files = Array.from(event.dataTransfer.files);
        for (const file of files) {
            await this.uploadFile(file);
        }
    }

    handleFileInputChange(event) {
        const files = Array.from(event.target.files);
        files.forEach(file => this.uploadFile(file));
        event.target.value = ''; // Reset input
    }

    async uploadFile(file) {
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target.result;
                const base64Content = content.split(',')[1]; // Remove data:... prefix

                const response = await fetch('/api/fs/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        path: this.currentPath,
                        filename: file.name,
                        content: base64Content
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Upload failed');
                }

                this.refresh();
            };
            reader.readAsDataURL(file);
        } catch (err) {
            alert(`Upload failed: ${err.message}`);
        }
    }

    // Context Menu
    showContextMenu(event, index, path, name, isDirectory) {
        event.preventDefault();
        event.stopPropagation();

        this.contextMenu = { path, name, isDirectory };

        const menu = document.querySelector('[id^="fm-context-menu-"]');
        if (!menu) return;

        menu.innerHTML = `
            <button onclick="fileManager.handlePreview('${path}', '${this.escapeHtml(name)}')" style="width: 100%; padding: 0.75rem 1rem; background: transparent; border: none; color: var(--text); cursor: pointer; text-align: left; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='var(--surface1)'" onmouseout="this.style.background='transparent'">
                <span>👁️</span> Preview
            </button>
            <button onclick="fileManager.handleCopy('${path}', '${this.escapeHtml(name)}')" style="width: 100%; padding: 0.75rem 1rem; background: transparent; border: none; color: var(--text); cursor: pointer; text-align: left; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='var(--surface1)'" onmouseout="this.style.background='transparent'">
                <span>📋</span> Copy
            </button>
            <button onclick="fileManager.handleCut('${path}', '${this.escapeHtml(name)}')" style="width: 100%; padding: 0.75rem 1rem; background: transparent; border: none; color: var(--text); cursor: pointer; text-align: left; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='var(--surface1)'" onmouseout="this.style.background='transparent'">
                <span>✂️</span> Cut
            </button>
            <button onclick="fileManager.showRenameDialog('${path}', '${this.escapeHtml(name)}')" style="width: 100%; padding: 0.75rem 1rem; background: transparent; border: none; color: var(--text); cursor: pointer; text-align: left; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='var(--surface1)'" onmouseout="this.style.background='transparent'">
                <span>✏️</span> Rename
            </button>
            <div style="height: 1px; background: var(--overlay0); margin: 0.25rem 0;"></div>
            <button onclick="fileManager.handleDelete('${path}', '${this.escapeHtml(name)}')" style="width: 100%; padding: 0.75rem 1rem; background: transparent; border: none; color: var(--red); cursor: pointer; text-align: left; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='rgba(243, 139, 168, 0.1)'" onmouseout="this.style.background='transparent'">
                <span>🗑️</span> Delete
            </button>
        `;

        menu.style.display = 'block';
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';

        // Close menu on outside click
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    // File Operations
    handleCopy(path, name) {
        this.clipboard = { file: { path, name }, operation: 'copy' };
        this.refresh(); // Refresh to show paste button
    }

    handleCut(path, name) {
        this.clipboard = { file: { path, name }, operation: 'cut' };
        this.refresh(); // Refresh to show paste button
    }

    async handlePaste() {
        if (!this.clipboard) return;

        try {
            const destination = `${this.currentPath}/${this.clipboard.file.name}`;
            const endpoint = this.clipboard.operation === 'copy' ? 'copy' : 'move';

            const response = await fetch(`/api/fs/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: this.clipboard.file.path,
                    destination
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Operation failed');
            }

            if (this.clipboard.operation === 'cut') {
                this.clipboard = null;
            }
            this.refresh();
        } catch (err) {
            alert(`Operation failed: ${err.message}`);
        }
    }

    async handleDelete(path, name) {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;

        try {
            const response = await fetch('/api/fs/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Delete failed');
            }

            this.refresh();
        } catch (err) {
            alert(`Delete failed: ${err.message}`);
        }
    }

    // Rename Dialog
    showRenameDialog(path, name) {
        const dialog = document.querySelector('[id^="fm-rename-dialog-"]');
        const input = document.querySelector('[id^="fm-rename-input-"]');

        if (!dialog || !input) return;

        this.renameTarget = { path, name };
        input.value = name;
        dialog.style.display = 'flex';

        // Focus and select filename (without extension)
        setTimeout(() => {
            input.focus();
            const lastDot = name.lastIndexOf('.');
            if (lastDot > 0) {
                input.setSelectionRange(0, lastDot);
            } else {
                input.select();
            }
        }, 0);

        // Handle Enter key
        input.onkeydown = (e) => {
            if (e.key === 'Enter') this.performRename();
            if (e.key === 'Escape') this.closeRenameDialog();
        };
    }

    async performRename() {
        const input = document.querySelector('[id^="fm-rename-input-"]');
        if (!input || !this.renameTarget) return;

        const newName = input.value.trim();
        if (!newName) return;

        try {
            const response = await fetch('/api/fs/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: this.renameTarget.path,
                    newName
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Rename failed');
            }

            this.closeRenameDialog();
            this.refresh();
        } catch (err) {
            alert(`Rename failed: ${err.message}`);
        }
    }

    closeRenameDialog() {
        const dialog = document.querySelector('[id^="fm-rename-dialog-"]');
        if (dialog) dialog.style.display = 'none';
        this.renameTarget = null;
    }

    // Preview
    async handlePreview(path, name) {
        try {
            const response = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Preview failed');
            }

            const data = await response.json();
            this.showPreview(name, data.content, data.type, data.mimeType);
        } catch (err) {
            alert(`Preview failed: ${err.message}`);
        }
    }

    showPreview(name, content, type, mimeType) {
        const modal = document.querySelector('[id^="fm-preview-modal-"]');
        const title = document.querySelector('[id^="fm-preview-title-"]');
        const contentDiv = document.querySelector('[id^="fm-preview-content-"]');

        if (!modal || !title || !contentDiv) return;

        title.textContent = name;

        if (type === 'text') {
            contentDiv.innerHTML = `<pre style="color: var(--text); font-size: 0.9rem; white-space: pre-wrap; font-family: monospace; background: var(--mantle); padding: 1rem; border-radius: 4px; margin: 0;">${this.escapeHtml(content)}</pre>`;
        } else if (type === 'binary' && mimeType.startsWith('image/')) {
            contentDiv.innerHTML = `<img src="data:${mimeType};base64,${content}" alt="${this.escapeHtml(name)}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">`;
        } else {
            contentDiv.innerHTML = `<div style="color: var(--subtext0); text-align: center; padding: 2rem;">Binary file - preview not available</div>`;
        }

        modal.style.display = 'flex';

        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) this.closePreview();
        };
    }

    closePreview() {
        const modal = document.querySelector('[id^="fm-preview-modal-"]');
        if (modal) modal.style.display = 'none';
    }
}

// Global instance
const fileManager = new FileManager();
