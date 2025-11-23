import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const router = Router();

// Constants
const MAX_CONTENT_LENGTH = 1000000; // 1MB
const MAX_NOTES_PER_REQUEST = 1000;
const MAX_TITLE_LENGTH = 200;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS_COUNT = 20;

// Notes storage directory
const NOTES_DIR = path.join(process.cwd(), 'data', 'notes');

// Ensure notes directory exists
async function ensureNotesDir() {
    try {
        await fs.mkdir(NOTES_DIR, { recursive: true });
    } catch (err) {
        console.error('Failed to create notes directory:', err);
    }
}

ensureNotesDir();

interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

// GET /api/notes - List all notes
router.get('/', async (req: Request, res: Response) => {
    try {
        const files = await fs.readdir(NOTES_DIR);
        const noteFiles = files.filter(f => f.endsWith('.json'));

        const notes = await Promise.all(
            noteFiles.map(async (file) => {
                const content = await fs.readFile(path.join(NOTES_DIR, file), 'utf-8');
                return JSON.parse(content);
            })
        );

        // Sort by updated date (newest first)
        notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        res.json({ notes });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/notes/search?q=query - Search notes
router.get('/search', async (req: Request, res: Response) => {
    // Input validation and sanitization
    const rawQuery = req.query.q as string || '';

    if (!rawQuery || typeof rawQuery !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
    }

    // Sanitize query to prevent ReDoS attacks
    const query = rawQuery
        .trim()
        .slice(0, 1000) // Limit query length
        .replace(/[<>\"'&]/g, '') // Remove dangerous characters
        .toLowerCase();

    if (!query || query.length < 1) {
        return res.status(400).json({ error: 'Invalid search query' });
    }

    // Validate query doesn't contain dangerous regex patterns
    const dangerousPatterns = [
        /\*{3,}/,     // Multiple asterisks (ReDoS)
        /\(.{20,}/,   // Very long parenthesis content
        /\[.{20,}/,   // Very long bracket content
        /\\{2,}/,     // Multiple backslashes
        /[\^\$].*\1/, // Repeated special chars
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(query)) {
            return res.status(400).json({ error: 'Invalid search query pattern' });
        }
    }

    try {
        const files = await fs.readdir(NOTES_DIR);
        const noteFiles = files.filter(f => f.endsWith('.json'));

        // Limit file reading to prevent DoS
        const maxFiles = 1000;
        const limitedFiles = noteFiles.slice(0, maxFiles);

        const notes = await Promise.all(
            limitedFiles.map(async (file) => {
                try {
                    const content = await fs.readFile(path.join(NOTES_DIR, file), 'utf-8');
                    const note = JSON.parse(content);

                    // Validate note structure
                    if (!note || typeof note.title !== 'string' || typeof note.content !== 'string') {
                        return null;
                    }

                    // Limit content size for search
                    const title = note.title.slice(0, 500);
                    const contentPreview = note.content.slice(0, 10000);

                    return {
                        ...note,
                        title,
                        content: contentPreview
                    };
                } catch (parseError) {
                    console.warn(`Failed to parse note file: ${file}`, parseError);
                    return null;
                }
            })
        );

        // Filter out null entries and search using safe string methods
        const validNotes = notes.filter(note => note !== null);

        const filtered = validNotes.filter(note => {
            try {
                return note.title.includes(query) || note.content.includes(query);
            } catch (searchError) {
                console.warn('Search error for note:', note.id, searchError);
                return false;
            }
        });

        res.json({ notes: filtered });
    } catch (error: any) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/notes/:id - Get specific note
router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9\-]+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid note ID' });
    }

    try {
        const filePath = path.join(NOTES_DIR, `${id}.json`);

        // Check file exists and is within allowed directory
        try {
            await fs.access(filePath);
        } catch (accessError) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const note = JSON.parse(content);

        // Validate note structure
        if (!note || typeof note.id !== 'string' || typeof note.title !== 'string' || typeof note.content !== 'string') {
            return res.status(500).json({ error: 'Invalid note data' });
        }

        res.json({ note });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Note not found' });
        } else if (error instanceof SyntaxError) {
            res.status(500).json({ error: 'Invalid note file format' });
        } else {
            console.error('Error reading note:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// POST /api/notes - Create new note
router.post('/', async (req: Request, res: Response) => {
    const { title, content, tags } = req.body;

    // Input validation
    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Title is required and must be a string' });
    }

    // Sanitize and validate title
    const sanitizedTitle = title.trim().slice(0, 200);
    if (sanitizedTitle.length === 0) {
        return res.status(400).json({ error: 'Title cannot be empty' });
    }

    // Validate content
    let sanitizedContent = '';
    if (content !== undefined) {
        if (typeof content !== 'string') {
            return res.status(400).json({ error: 'Content must be a string' });
        }
        sanitizedContent = content.slice(0, MAX_CONTENT_LENGTH);
    }

    // Validate tags
    let sanitizedTags = [];
    if (tags !== undefined) {
        if (!Array.isArray(tags)) {
            return res.status(400).json({ error: 'Tags must be an array' });
        }
        sanitizedTags = tags
            .filter(tag => typeof tag === 'string')
            .map(tag => tag.trim().slice(0, MAX_TAG_LENGTH))
            .filter(tag => tag.length > 0)
            .slice(0, MAX_TAGS_COUNT);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const note: Note = {
        id,
        title: sanitizedTitle,
        content: sanitizedContent,
        tags: sanitizedTags,
        createdAt: now,
        updatedAt: now
    };

    try {
        const filePath = path.join(NOTES_DIR, `${id}.json`);
        await fs.writeFile(filePath, JSON.stringify(note, null, 2));

        res.json({ note });
    } catch (error: any) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// PUT /api/notes/:id - Update note
router.put('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9\-]+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid note ID' });
    }

    const { title, content, tags } = req.body;

    try {
        const filePath = path.join(NOTES_DIR, `${id}.json`);

        // Check if note exists
        try {
            await fs.access(filePath);
        } catch (accessError) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const existingContent = await fs.readFile(filePath, 'utf-8');
        const existingNote = JSON.parse(existingContent);

        // Validate existing note structure
        if (!existingNote || typeof existingNote.id !== 'string') {
            return res.status(500).json({ error: 'Invalid existing note data' });
        }

        // Validate and sanitize title if provided
        let sanitizedTitle = existingNote.title;
        if (title !== undefined) {
            if (typeof title !== 'string') {
                return res.status(400).json({ error: 'Title must be a string' });
            }
            const newTitle = title.trim().slice(0, MAX_TITLE_LENGTH);
            if (newTitle.length === 0) {
                return res.status(400).json({ error: 'Title cannot be empty' });
            }
            sanitizedTitle = newTitle;
        }

        // Validate and sanitize content if provided
        let sanitizedContent = existingNote.content;
        if (content !== undefined) {
            if (typeof content !== 'string') {
                return res.status(400).json({ error: 'Content must be a string' });
            }
            sanitizedContent = content.slice(0, MAX_CONTENT_LENGTH);
        }

        // Validate and sanitize tags if provided
        let sanitizedTags = existingNote.tags || [];
        if (tags !== undefined) {
            if (!Array.isArray(tags)) {
                return res.status(400).json({ error: 'Tags must be an array' });
            }
            sanitizedTags = tags
                .filter(tag => typeof tag === 'string')
                .map(tag => tag.trim().slice(0, MAX_TAG_LENGTH))
                .filter(tag => tag.length > 0)
                .slice(0, MAX_TAGS_COUNT);
        }

        const updatedNote: Note = {
            ...existingNote,
            title: sanitizedTitle,
            content: sanitizedContent,
            tags: sanitizedTags,
            updatedAt: new Date().toISOString()
        };

        await fs.writeFile(filePath, JSON.stringify(updatedNote, null, 2));

        res.json({ note: updatedNote });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Note not found' });
        } else if (error instanceof SyntaxError) {
            res.status(500).json({ error: 'Invalid note file format' });
        } else {
            console.error('Error updating note:', error);
            res.status(500).json({ error: 'Failed to update note' });
        }
    }
});

// DELETE /api/notes/:id - Delete note
router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9\-]+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid note ID' });
    }

    try {
        const filePath = path.join(NOTES_DIR, `${id}.json`);

        // Check if note exists before deleting
        try {
            await fs.access(filePath);
        } catch (accessError) {
            return res.status(404).json({ error: 'Note not found' });
        }

        await fs.unlink(filePath);

        res.json({ success: true, message: 'Note deleted' });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Note not found' });
        } else {
            console.error('Error deleting note:', error);
            res.status(500).json({ error: 'Failed to delete note' });
        }
    }
});

export default router;
