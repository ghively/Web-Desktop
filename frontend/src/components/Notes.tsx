import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Save, FileText, Eye, Bold, Italic, Link, List, Quote, Code, Plus, Search, Trash2, Calendar, Edit, Split } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useSettings } from '../context/useSettings';

interface NotesProps {
    windowId: string;
}

interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

type ViewMode = 'edit' | 'preview' | 'split';

// Constants for performance
const MAX_CONTENT_LENGTH = 1000000;
const MAX_SEARCH_QUERY_LENGTH = 1000;
const AUTO_SAVE_DELAY = 1500;
const DEBOUNCE_DELAY = 300;

// Input validation utilities
const sanitizeSearchQuery = (query: string): string => {
    if (typeof query !== 'string') return '';
    return query
        .slice(0, MAX_SEARCH_QUERY_LENGTH)
        .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
        .trim();
};

const validateNoteContent = (content: string): boolean => {
    if (typeof content !== 'string') return false;
    return content.length <= MAX_CONTENT_LENGTH;
};

// Memoized note item component
const NoteItem = memo(({
    note,
    isSelected,
    onClick,
    escapeHtml,
    formatDate
}: {
    note: Note;
    isSelected: boolean;
    onClick: () => void;
    escapeHtml: (text: string) => string;
    formatDate: (dateStr: string) => string;
}) => (
    <div
        onClick={onClick}
        className={`p-4 border-b border-gray-700 cursor-pointer transition-colors ${
            isSelected
                ? 'bg-gray-700/50 border-l-4 border-l-blue-500'
                : 'hover:bg-gray-700/30'
        }`}
    >
        <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
                <h4 className="text-gray-100 font-medium truncate">
                    {escapeHtml(note.title || 'Untitled')}
                </h4>
                <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                    {escapeHtml(note.content.substring(0, 50))}
                    {note.content.length > 50 && '...'}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <Calendar size={12} />
            <span>{formatDate(note.updatedAt)}</span>
        </div>
    </div>
));

NoteItem.displayName = 'NoteItem';

export const Notes: React.FC<NotesProps> = () => {
    const { settings } = useSettings();
    const [notes, setNotes] = useState<Note[]>([]);
    const [currentNote, setCurrentNote] = useState<Note | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('split');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const autoSaveTimeoutRef = useRef<number | null>(null);
    const searchTimeoutRef = useRef<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const API_BASE = `${settings.backend.apiUrl}/api/notes`;

    // Network status monitoring
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Save current note (moved before usage to fix hoisting issue)
    const saveCurrentNote = useCallback(async () => {
        if (!currentNote || !isOnline) return;

        try {
            setSaveStatus('saving');
            setError(null);

            const response = await fetch(`${API_BASE}/${currentNote.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: currentNote.title,
                    content: currentNote.content
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const updatedNote = data.note;

            // Update note in list
            setNotes(prevNotes =>
                prevNotes.map(note =>
                    note.id === updatedNote.id ? updatedNote : note
                )
            );
            setCurrentNote(updatedNote);
            setSaveStatus('saved');

            // Clear saved status after 2 seconds
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
            console.error('Failed to save note:', err);
            setSaveStatus('error');
            setError(err instanceof Error ? err.message : 'Failed to save note');
        }
    }, [currentNote, isOnline, API_BASE]);

    // Load notes on component mount - will be added after function definitions

    // Auto-save functionality
    const scheduleAutoSave = useCallback(() => {
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = window.setTimeout(() => {
            if (currentNote && isOnline) {
                saveCurrentNote();
            }
        }, AUTO_SAVE_DELAY);
    }, [currentNote, isOnline, saveCurrentNote]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // Load notes from API
    const loadNotes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const loadedNotes = data.notes || [];
            setNotes(loadedNotes);

            // Set current note if none selected
            if (!currentNote && loadedNotes.length > 0) {
                setCurrentNote(loadedNotes[0]);
            }
        } catch (err) {
            console.error('Failed to load notes:', err);
            setError(err instanceof Error ? err.message : 'Failed to load notes');
            setNotes([]);
        } finally {
            setLoading(false);
        }
    }, [currentNote, API_BASE]);

    // Create new note
    const createNote = async () => {
        if (!isOnline) {
            setError('Cannot create notes while offline');
            return;
        }

        try {
            setError(null);
            const response = await fetch(`${API_BASE}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'New Note',
                    content: ''
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const newNote = data.note;

            setNotes(prevNotes => [newNote, ...prevNotes]);
            setCurrentNote(newNote);

            // Focus title input after a short delay
            setTimeout(() => titleRef.current?.focus(), 100);
        } catch (err) {
            console.error('Failed to create note:', err);
            setError(err instanceof Error ? err.message : 'Failed to create note');
        }
    };

    // Delete current note
    const deleteNote = async () => {
        if (!currentNote || !isOnline) return;

        if (!confirm(`Delete "${currentNote.title}"?`)) return;

        try {
            setError(null);
            const response = await fetch(`${API_BASE}/${currentNote.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const updatedNotes = notes.filter(note => note.id !== currentNote.id);
            setNotes(updatedNotes);
            setCurrentNote(updatedNotes.length > 0 ? updatedNotes[0] : null);
        } catch (err) {
            console.error('Failed to delete note:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete note');
        }
    };

    // Update current note title
    const updateTitle = (title: string) => {
        if (!currentNote) return;

        const updatedNote = { ...currentNote, title };
        setCurrentNote(updatedNote);
        scheduleAutoSave();
    };

    // Update current note content
    const updateContent = (content: string) => {
        if (!currentNote) return;

        // Validate content
        if (!validateNoteContent(content)) {
            setError('Content too large (max 1MB)');
            return;
        }

        const updatedNote = { ...currentNote, content };
        setCurrentNote(updatedNote);
        scheduleAutoSave();
        setError(null);
    };

    // Search notes with debouncing and input validation
    const searchNotes = useCallback(async (query: string) => {
        // Sanitize and validate query
        const sanitizedQuery = sanitizeSearchQuery(query);
        setSearchQuery(sanitizedQuery);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce search
        searchTimeoutRef.current = window.setTimeout(async () => {
            if (!sanitizedQuery) {
                await loadNotes();
                return;
            }

            if (!isOnline) {
                setError('Cannot search while offline');
                return;
            }

            try {
                setError(null);
                setLoading(true);

                const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(sanitizedQuery)}`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                setNotes(data.notes || []);
            } catch (err) {
                console.error('Failed to search notes:', err);
                setError(err instanceof Error ? err.message : 'Failed to search notes');
                setNotes([]);
            } finally {
                setLoading(false);
            }
        }, DEBOUNCE_DELAY);
    }, [isOnline, API_BASE, loadNotes]);

    // Manual save
    const handleSave = () => {
        if (currentNote) {
            saveCurrentNote();
        }
    };

    // Safe markdown preview with fixed regex patterns
    const renderMarkdown = useCallback((text: string) => {
        // Input validation and sanitization
        if (typeof text !== 'string') return '';
        if (text.length > 50000) return 'Content too large to preview';

        // Escape HTML first to prevent XSS
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        let result = escaped;

        try {
            // Headers - use non-greedy patterns and limit line length
            result = result
                .replace(/^(#{1,3})\s+([^\n]{0,100})$/gm, (match, hashes, content) => {
                    const level = hashes.length;
                    const tag = `h${Math.min(level, 3)}`;
                    const className = level === 1 ? 'text-2xl font-bold text-gray-100 mb-4 mt-4' :
                                     level === 2 ? 'text-xl font-semibold text-gray-100 mb-3 mt-4' :
                                     'text-lg font-semibold text-gray-100 mb-3 mt-4';
                    return `<${tag} class="${className}">${content}</${tag}>`;
                });

            // Code blocks - limit block size and use safer pattern
            result = result.replace(/```([^`]{0,5000})```/gs,
                '<pre class="bg-gray-800 text-gray-100 p-3 rounded-lg mb-4 overflow-x-auto"><code>$1</code></pre>');

            // Inline code
            result = result.replace(/`([^`\n]{0,100})`/g,
                '<code class="bg-gray-800 text-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');

            // Bold text - prevent nested patterns
            result = result.replace(/\*\*([^*\n]{0,200})\*\*/g,
                '<strong class="font-bold text-gray-100">$1</strong>');

            // Italic text - prevent conflicts with bold
            result = result.replace(/(?<!\*)\*([^*\n]{0,200})\*(?!\*)/g,
                '<em class="italic text-gray-200">$1</em>');

            // Links - validate URL format
            result = result.replace(/\[([^\]]{0,100})\]\(([^)]{0,200})\)/g, (match, text, url) => {
                // Basic URL validation
                if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('#') || url.startsWith('/')) {
                    return `<a href="${url}" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
                }
                return match; // Return original if URL looks suspicious
            });

            // Lists - process line by line to prevent ReDoS
            const lines = result.split('\n');
            const processedLines = lines.map(line => {
                if (line.trim().startsWith('* ')) {
                    return `<li class="ml-4 mb-1">• ${line.trim().substring(2)}</li>`;
                }
                return line;
            });
            result = processedLines.join('\n');

            // Wrap consecutive list items in ul tags
            result = result.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, match =>
                `<ul class="list-disc mb-4">${match}</ul>`
            );

            // Blockquotes
            result = result.replace(/^>\s+([^\n]{0,300})$/gm,
                '<blockquote class="border-l-4 border-gray-600 pl-4 italic text-gray-300 mb-3">$1</blockquote>');

            // Line breaks and paragraphs - safer approach
            result = result
                .replace(/\n\n+/g, '</p><p class="mb-4 text-gray-200">')
                .replace(/\n/g, '<br />');

            // Add paragraph tags to text blocks
            result = result
                .split(/(?=<h[1-6]|<pre|<ul|<blockquote|<p)/)
                .map(part => {
                    if (part.trim() && !part.startsWith('<')) {
                        return `<p class="mb-4 text-gray-200">${part}</p>`;
                    }
                    return part;
                })
                .join('');

        } catch (error) {
            console.error('Markdown parsing error:', error);
            return escaped; // Return escaped text if parsing fails
        }

        return result;
    }, []);

    // Insert markdown syntax at cursor position
    const insertMarkdown = (syntax: string) => {
        const textarea = textareaRef.current;
        if (!textarea || !currentNote) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = currentNote.content.substring(start, end);
        let newText = '';

        switch (syntax) {
            case 'bold':
                newText = `**${selectedText}**`;
                break;
            case 'italic':
                newText = `*${selectedText}*`;
                break;
            case 'code':
                newText = `\`${selectedText}\``;
                break;
            case 'link':
                newText = `[${selectedText}](url)`;
                break;
            case 'list':
                newText = `\n* ${selectedText}`;
                break;
            case 'quote':
                newText = `\n> ${selectedText}`;
                break;
            case 'header':
                newText = `\n## ${selectedText}`;
                break;
            default:
                newText = selectedText;
        }

        const newContent = currentNote.content.substring(0, start) + newText + currentNote.content.substring(end);
        updateContent(newContent);

        // Reset cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + newText.length, start + newText.length);
        }, 0);
    };

    const escapeHtml = useCallback((text: string) => {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }, []);

    // Memoized utility functions
    const formatDate = useCallback((dateStr: string) => {
        if (!dateStr) return 'Unknown';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Invalid date';

            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));

            if (days === 0) return 'Today';
            if (days === 1) return 'Yesterday';
            if (days < 7) return `${days} days ago`;
            return date.toLocaleDateString();
        } catch {
            return 'Invalid date';
        }
    }, []);

    // Memoized filtered notes for virtual scrolling
    const notesToDisplay = useMemo(() => {
        return notes.slice(0, 50); // Limit display to prevent performance issues
    }, [notes]);

    // Memoized markdown content for preview
    const markdownPreview = useMemo(() => {
        if (!currentNote) return '';
        return renderMarkdown(currentNote.content || '*No content yet*');
    }, [currentNote, renderMarkdown]);

    const showEdit = viewMode === 'edit' || viewMode === 'split';
    const showPreview = viewMode === 'preview' || viewMode === 'split';

    // Load notes on component mount
    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    return (
        <div className="flex h-full bg-gray-900">
            {/* Sidebar */}
            <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <FileText size={20} className="text-blue-400" />
                            <h3 className="text-gray-100 font-semibold">Notes</h3>
                        </div>
                        <button
                            onClick={createNote}
                            disabled={!isOnline}
                            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                            title="New note"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={(e) => searchNotes(e.target.value)}
                            disabled={!isOnline}
                            className="w-full pl-9 pr-3 py-2 bg-gray-700 text-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:text-gray-500"
                        />
                    </div>
                </div>

                {/* Notes List with optimized rendering */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-gray-400">
                            <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                Loading notes...
                            </div>
                        </div>
                    ) : notesToDisplay.length > 0 ? (
                        <div className="relative">
                            {notesToDisplay.map(note => (
                                <NoteItem
                                    key={note.id}
                                    note={note}
                                    isSelected={currentNote?.id === note.id}
                                    onClick={() => setCurrentNote(note)}
                                    escapeHtml={escapeHtml}
                                    formatDate={formatDate}
                                />
                            ))}
                            {notes.length > 50 && (
                                <div className="p-4 text-center text-gray-500 text-sm border-t border-gray-700">
                                    Showing 50 of {notes.length} notes. Use search to find more.
                                </div>
                            )}
                        </div>
                    ) : searchQuery ? (
                        <div className="p-8 text-center text-gray-400">
                            <Search size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="mb-2">No notes found</p>
                            <p className="text-sm">Try different search terms</p>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            <FileText size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="mb-2">No notes yet</p>
                            <p className="text-sm">Create your first note to get started</p>
                        </div>
                    )}
                </div>

                {/* Network Status */}
                {!isOnline && (
                    <div className="p-3 bg-yellow-900/50 border-t border-yellow-700 text-yellow-400 text-sm">
                        ⚠️ Offline mode - Limited functionality
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {currentNote ? (
                    <>
                        {/* Editor Header */}
                        <div className="p-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
                            <div className="flex items-center justify-between mb-3">
                                <input
                                    ref={titleRef}
                                    type="text"
                                    value={currentNote.title || ''}
                                    onChange={(e) => updateTitle(e.target.value)}
                                    placeholder="Note title..."
                                    className="text-xl font-semibold text-gray-100 bg-transparent outline-none flex-1"
                                />
                                <div className="flex items-center gap-2">
                                    {/* Save Status */}
                                    {saveStatus && (
                                        <span className={`text-xs px-2 py-1 rounded ${
                                            saveStatus === 'saved' ? 'bg-green-600 text-white' :
                                            saveStatus === 'saving' ? 'bg-yellow-600 text-white' :
                                            'bg-red-600 text-white'
                                        }`}>
                                            {saveStatus === 'saved' ? 'Saved' :
                                             saveStatus === 'saving' ? 'Saving...' : 'Error'}
                                        </span>
                                    )}

                                    {/* View Mode Buttons */}
                                    <button
                                        onClick={() => setViewMode('edit')}
                                        className={`p-2 rounded transition-colors ${
                                            viewMode === 'edit'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                        title="Edit mode"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('split')}
                                        className={`p-2 rounded transition-colors ${
                                            viewMode === 'split'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                        title="Split view"
                                    >
                                        <Split size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('preview')}
                                        className={`p-2 rounded transition-colors ${
                                            viewMode === 'preview'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                        title="Preview mode"
                                    >
                                        <Eye size={16} />
                                    </button>

                                    {/* Action Buttons */}
                                    <button
                                        onClick={handleSave}
                                        disabled={!isOnline}
                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                                    >
                                        <Save size={14} />
                                        Save
                                    </button>
                                    <button
                                        onClick={deleteNote}
                                        disabled={!isOnline}
                                        className="p-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                                        title="Delete note"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Markdown Toolbar */}
                            {showEdit && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => insertMarkdown('bold')}
                                        className="p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                                        title="Bold"
                                    >
                                        <Bold size={16} />
                                    </button>
                                    <button
                                        onClick={() => insertMarkdown('italic')}
                                        className="p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                                        title="Italic"
                                    >
                                        <Italic size={16} />
                                    </button>
                                    <button
                                        onClick={() => insertMarkdown('code')}
                                        className="p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                                        title="Code"
                                    >
                                        <Code size={16} />
                                    </button>
                                    <div className="w-px h-6 bg-gray-700 mx-1"></div>
                                    <button
                                        onClick={() => insertMarkdown('link')}
                                        className="p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                                        title="Link"
                                    >
                                        <Link size={16} />
                                    </button>
                                    <button
                                        onClick={() => insertMarkdown('list')}
                                        className="p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                                        title="List"
                                    >
                                        <List size={16} />
                                    </button>
                                    <button
                                        onClick={() => insertMarkdown('quote')}
                                        className="p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                                        title="Quote"
                                    >
                                        <Quote size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="mx-4 mb-2 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Editor Content */}
                        <div className="flex-1 overflow-hidden">
                            <div className={`h-full ${viewMode === 'split' ? 'flex' : ''}`}>
                                {/* Editor Pane */}
                                {showEdit && (
                                    <div className={`h-full ${viewMode === 'split' ? 'w-1/2 border-r border-gray-700' : ''}`}>
                                        <textarea
                                            ref={textareaRef}
                                            value={currentNote.content || ''}
                                            onChange={(e) => updateContent(e.target.value)}
                                            className="w-full h-full p-4 bg-gray-900 text-gray-200 font-mono text-sm resize-none outline-none"
                                            placeholder="Start writing in Markdown..."
                                            style={{ lineHeight: '1.6' }}
                                            maxLength={1000000}
                                            spellCheck={false}
                                        />
                                    </div>
                                )}

                                {/* Preview Pane */}
                                {showPreview && (
                                    <div className={`h-full overflow-y-auto ${viewMode === 'split' ? 'w-1/2' : ''}`}>
                                        <div
                                            className="p-6 text-gray-200"
                                            style={{ lineHeight: '1.7' }}
                                            dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(
                                                    markdownPreview,
                                                    {
                                                        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'li', 'blockquote', 'br'],
                                                        ALLOWED_ATTR: ['href', 'class', 'target'],
                                                        ALLOW_DATA_ATTR: false
                                                    }
                                                )
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
                            <span>Created: {formatDate(currentNote.createdAt)}</span>
                            <span>Modified: {formatDate(currentNote.updatedAt)}</span>
                        </div>
                    </>
                ) : (
                    /* Empty State */
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                            <FileText size={64} className="mx-auto mb-4 opacity-30" />
                            <h3 className="text-xl font-medium mb-2">No note selected</h3>
                            <p className="text-sm">Select a note from the sidebar or create a new one</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
