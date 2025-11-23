// Notes App
class NotesApp {
    constructor() {
        this.notes = [];
        this.currentNote = null;
        this.viewMode = 'split'; // 'edit', 'preview', 'split'
        this.autoSaveTimeout = null;
    }

    async init() {
        await this.loadNotes();
    }

    render(windowId) {
        const hasNotes = this.notes.length > 0;
        const currentNote = this.currentNote || (hasNotes ? this.notes[0] : null);

        if (!this.currentNote && hasNotes) {
            this.currentNote = this.notes[0];
        }

        return `
            <div class="notes-app">
                <div class="notes-sidebar">
                    <div class="notes-header">
                        <h3>📝 Notes</h3>
                        <button class="new-note-btn" onclick="notesApp.createNote()">+ New</button>
                    </div>
                    <div class="notes-search">
                        <input type="text" placeholder="Search notes..." oninput="notesApp.searchNotes(this.value)">
                    </div>
                    <div class="notes-list" id="notes-list-${windowId}">
                        ${hasNotes ? this.renderNotesList() : '<div style="padding: 1rem; color: var(--overlay0); text-align: center; font-size: 0.85rem;">No notes yet</div>'}
                    </div>
                </div>
                
                ${currentNote ? this.renderEditor(currentNote, windowId) : this.renderEmpty()}
            </div>
        `;
    }

    renderNotesList() {
        return this.notes.map(note => `
            <div class="note-item ${this.currentNote?.id === note.id ? 'active' : ''}" 
                 onclick="notesApp.selectNote('${note.id}')">
                <div class="note-item-title">${this.escapeHtml(note.title || 'Untitled')}</div>
                <div class="note-item-preview">${this.escapeHtml(note.content.substring(0, 50))}...</div>
                <div class="note-item-date">${this.formatDate(note.updatedAt)}</div>
            </div>
        `).join('');
    }

    renderEditor(note, windowId) {
        const showEdit = this.viewMode === 'edit' || this.viewMode === 'split';
        const showPreview = this.viewMode === 'preview' || this.viewMode === 'split';

        return `
            <div class="notes-editor">
                <div class="notes-toolbar">
                    <input type="text" id="note-title-${windowId}" value="${this.escapeHtml(note.title || '')}" 
                           placeholder="Note title..." 
                           oninput="notesApp.updateTitle(this.value)">
                    <button class="toolbar-btn ${this.viewMode === 'edit' ? 'active' : ''}" 
                            onclick="notesApp.setViewMode('edit')">✏️ Edit</button>
                    <button class="toolbar-btn ${this.viewMode === 'split' ? 'active' : ''}" 
                            onclick="notesApp.setViewMode('split')">⚡ Split</button>
                    <button class="toolbar-btn ${this.viewMode === 'preview' ? 'active' : ''}" 
                            onclick="notesApp.setViewMode('preview')">👁️ Preview</button>
                    <button class="toolbar-btn" onclick="notesApp.deleteNote()">🗑️</button>
                </div>
                <div class="notes-content">
                    ${showEdit ? `
                        <div class="notes-pane ${this.viewMode === 'split' ? 'split' : ''}">
                            <textarea class="notes-editor-textarea" 
                                      id="note-content-${windowId}"
                                      oninput="notesApp.updateContent(this.value)"
                                      placeholder="Start writing in Markdown...">${this.escapeHtml(note.content || '')}</textarea>
                        </div>
                    ` : ''}
                    ${showEdit && showPreview ? '<div class="notes-divider"></div>' : ''}
                    ${showPreview ? `
                        <div class="notes-pane ${this.viewMode === 'split' ? 'split' : ''} notes-preview" id="note-preview-${windowId}">
                            ${this.renderMarkdown(note.content || '*No content yet*')}
                        </div>
                    ` : ''}
                </div>
                <div class="notes-status">
                    <span>Created: ${this.formatDate(note.createdAt)}</span>
                    <span>Modified: ${this.formatDate(note.updatedAt)}</span>
                </div>
            </div>
        `;
    }

    renderEmpty() {
        return `
            <div class="notes-empty">
                <div class="notes-empty-icon">📝</div>
                <div class="notes-empty-text">No note selected</div>
                <div class="notes-empty-subtext">Create a new note to get started</div>
            </div>
        `;
    }

    renderMarkdown(content) {
        if (typeof marked === 'undefined') {
            return '<p style="color: var(--red);">Markdown library not loaded</p>';
        }

        try {
            return marked.parse(content);
        } catch (err) {
            return `<p style="color: var(--red);">Error rendering markdown: ${err.message}</p>`;
        }
    }

    async loadNotes() {
        try {
            const response = await fetch('/api/notes');
            const data = await response.json();
            this.notes = data.notes || [];
        } catch (err) {
            console.error('Failed to load notes:', err);
            this.notes = [];
        }
    }

    async createNote() {
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'New Note',
                    content: ''
                })
            });
            const data = await response.json();
            this.notes.unshift(data.note);
            this.currentNote = data.note;
            this.refreshNotesWindow();
        } catch (err) {
            console.error('Failed to create note:', err);
        }
    }

    selectNote(noteId) {
        this.currentNote = this.notes.find(n => n.id === noteId);
        this.refreshNotesWindow();
    }

    updateTitle(title) {
        if (this.currentNote) {
            this.currentNote.title = title;
            this.scheduleAutoSave();
        }
    }

    updateContent(content) {
        if (this.currentNote) {
            this.currentNote.content = content;
            this.scheduleAutoSave();

            // Update preview in real-time if in split view
            if (this.viewMode === 'split' || this.viewMode === 'preview') {
                const previewEls = document.querySelectorAll('[id^="note-preview-"]');
                previewEls.forEach(el => {
                    el.innerHTML = this.renderMarkdown(content);
                });
            }
        }
    }

    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.saveCurrentNote();
        }, 1500); // Auto-save after 1.5 seconds of inactivity
    }

    async saveCurrentNote() {
        if (!this.currentNote) return;

        try {
            const response = await fetch(`/api/notes/${this.currentNote.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: this.currentNote.title,
                    content: this.currentNote.content
                })
            });
            const data = await response.json();

            // Update modified time
            this.currentNote.updatedAt = data.note.updatedAt;

            // Update note in list
            const index = this.notes.findIndex(n => n.id === this.currentNote.id);
            if (index !== -1) {
                this.notes[index] = this.currentNote;
            }

            this.refreshNotesList();
        } catch (err) {
            console.error('Failed to save note:', err);
        }
    }

    async deleteNote() {
        if (!this.currentNote) return;

        if (!confirm(`Delete "${this.currentNote.title}"?`)) return;

        try {
            await fetch(`/api/notes/${this.currentNote.id}`, {
                method: 'DELETE'
            });

            this.notes = this.notes.filter(n => n.id !== this.currentNote.id);
            this.currentNote = this.notes.length > 0 ? this.notes[0] : null;
            this.refreshNotesWindow();
        } catch (err) {
            console.error('Failed to delete note:', err);
        }
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.refreshNotesWindow();
    }

    async searchNotes(query) {
        if (!query) {
            await this.loadNotes();
            this.refreshNotesList();
            return;
        }

        try {
            const response = await fetch(`/api/notes/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            this.notes = data.notes || [];
            this.refreshNotesList();
        } catch (err) {
            console.error('Failed to search notes:', err);
        }
    }

    refreshNotesWindow() {
        // Find all windows with notes app
        const notesWindows = windowManager.windows.filter(w => w.title === 'Notes');
        notesWindows.forEach(win => {
            const content = win.element.querySelector('.window-content');
            if (content) {
                content.innerHTML = this.render(win.id);
            }
        });
    }

    refreshNotesList() {
        const listEls = document.querySelectorAll('[id^="notes-list-"]');
        listEls.forEach(el => {
            el.innerHTML = this.notes.length > 0
                ? this.renderNotesList()
                : '<div style="padding: 1rem; color: var(--overlay0); text-align: center; font-size: 0.85rem;">No notes yet</div>';
        });
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global notes app instance
const notesApp = new NotesApp();
