import { useState, useEffect, useRef } from 'react';
import { Save, FileText, Eye, Edit3, Bold, Italic, Link, List, Quote, Code } from 'lucide-react';
import DOMPurify from 'dompurify';

interface NotesProps {
    windowId: string;
}

export const Notes: React.FC<NotesProps> = () => {
    const [content, setContent] = useState('# Welcome to Notes\n\nStart typing in Markdown!');
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load saved notes on mount
    useEffect(() => {
        try {
            const savedNotes = localStorage.getItem('web-desktop-notes');
            if (savedNotes && typeof savedNotes === 'string') {
                // Validate content size to prevent storage issues
                if (savedNotes.length < 1000000) { // 1MB limit
                    setContent(savedNotes);
                } else {
                    console.warn('Notes content too large, using default content');
                }
            }
        } catch (error) {
            console.error('Failed to load notes from localStorage:', error);
        }
    }, []);

    // Auto-save notes with debouncing
    useEffect(() => {
        if (!content || content.trim().length === 0) return;

        const timer = setTimeout(() => {
            try {
                localStorage.setItem('web-desktop-notes', content);
                console.log('Notes auto-saved');
            } catch (error) {
                console.error('Failed to save notes:', error);
                // Handle quota exceeded error
                if (error instanceof Error && error.name === 'QuotaExceededError') {
                    alert('Storage quota exceeded. Please delete some content or export your notes.');
                }
            }
        }, 2000); // Save after 2 seconds of inactivity

        return () => clearTimeout(timer);
    }, [content]);

    const handleSave = () => {
        try {
            if (!content || content.trim().length === 0) {
                setError('Cannot save empty content');
                return;
            }

            localStorage.setItem('web-desktop-notes', content);
            setIsEditing(false);
            setError(null);
            console.log('Notes saved manually');
        } catch (error) {
            console.error('Failed to save notes:', error);
            setError('Failed to save notes');
        }
    };

    // Enhanced markdown preview
    const renderMarkdown = (text: string) => {
        return text
            // Headers
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-100 mb-3 mt-4">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-100 mb-3 mt-4">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-100 mb-4 mt-4">$1</h1>')
            // Bold and italic
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold text-gray-100">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic text-gray-200">$1</em>')
            // Code blocks
            .replace(/```(.*?)```/gs, '<pre class="bg-gray-800 text-gray-100 p-3 rounded-lg mb-4 overflow-x-auto"><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-800 text-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank">$1</a>')
            // Lists
            .replace(/^\* (.+)/gim, '<li class="ml-4 mb-1">• $1</li>')
            .replace(/(<li.*<\/li>)/s, '<ul class="list-disc mb-4">$1</ul>')
            // Blockquotes
            .replace(/^> (.+)/gim, '<blockquote class="border-l-4 border-gray-600 pl-4 italic text-gray-300 mb-3">$1</blockquote>')
            // Line breaks
            .replace(/\n\n/g, '</p><p class="mb-4">')
            .replace(/\n/g, '<br />')
            // Wrap in paragraphs
            .replace(/^(?!<[h|u|b|p|c])/gim, '<p class="mb-4 text-gray-200">')
            .replace(/(?<![>])$/gim, '</p>');
    };

    const insertMarkdown = (syntax: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
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
        
        const newContent = content.substring(0, start) + newText + content.substring(end);
        setContent(newContent);
        
        // Reset cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + newText.length, start + newText.length);
        }, 0);
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                    <FileText size={20} className="text-blue-400" />
                    <div>
                        <h2 className="text-gray-100 font-semibold">Notes</h2>
                        <p className="text-gray-500 text-xs">Markdown editor</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing && (
                        <button
                            onClick={handleSave}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-all hover:scale-105 flex items-center gap-2"
                        >
                            <Save size={14} />
                            Save
                        </button>
                    )}
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all hover:scale-105 flex items-center gap-2 ${
                            isEditing 
                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                                : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                        {isEditing ? <Eye size={14} /> : <Edit3 size={14} />}
                        {isEditing ? 'Preview' : 'Edit'}
                    </button>
                </div>
            </div>

            {/* Markdown Toolbar */}
            {isEditing && (
                <div className="flex items-center gap-1 p-2 bg-gray-800/50 border-b border-gray-700/30">
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
                    <button
                        onClick={() => insertMarkdown('header')}
                        className="p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors"
                        title="Header"
                    >
                        <span className="font-bold text-sm">H2</span>
                    </button>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mx-4 mb-2 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => {
                            const newContent = e.target.value;
                            // Prevent extremely large content
                            if (newContent.length < 1000000) {
                                setContent(newContent);
                                setError(null);
                            } else {
                                setError('Content too large (max 1MB)');
                            }
                        }}
                        className="w-full h-full p-4 bg-gray-900 text-gray-200 font-mono text-sm resize-none outline-none"
                        placeholder="Start typing in Markdown..."
                        style={{ lineHeight: '1.6' }}
                        maxLength={1000000}
                        spellCheck={false}
                    />
                ) : (
                    <div
                        className="w-full h-full p-6 overflow-y-auto text-gray-200"
                        style={{ lineHeight: '1.7' }}
                        dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(renderMarkdown(content), {
                                ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'li', 'blockquote', 'br'],
                                ALLOWED_ATTR: ['href', 'class', 'target'],
                                ALLOW_DATA_ATTR: false
                            })
                        }}
                    />
                )}
            </div>
        </div>
    );
};