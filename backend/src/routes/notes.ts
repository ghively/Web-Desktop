import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const router = Router();

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

// GET /api/notes/:id - Get specific note
router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const filePath = path.join(NOTES_DIR, `${id}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        const note = JSON.parse(content);

        res.json({ note });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Note not found' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// POST /api/notes - Create new note
router.post('/', async (req: Request, res: Response) => {
    const { title, content, tags } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const note: Note = {
        id,
        title,
        content: content || '',
        tags: tags || [],
        createdAt: now,
        updatedAt: now
    };

    try {
        const filePath = path.join(NOTES_DIR, `${id}.json`);
        await fs.writeFile(filePath, JSON.stringify(note, null, 2));

        res.json({ note });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/notes/:id - Update note
router.put('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, content, tags } = req.body;

    try {
        const filePath = path.join(NOTES_DIR, `${id}.json`);
        const existingContent = await fs.readFile(filePath, 'utf-8');
        const existingNote = JSON.parse(existingContent);

        const updatedNote: Note = {
            ...existingNote,
            title: title !== undefined ? title : existingNote.title,
            content: content !== undefined ? content : existingNote.content,
            tags: tags !== undefined ? tags : existingNote.tags,
            updatedAt: new Date().toISOString()
        };

        await fs.writeFile(filePath, JSON.stringify(updatedNote, null, 2));

        res.json({ note: updatedNote });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Note not found' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// DELETE /api/notes/:id - Delete note
router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const filePath = path.join(NOTES_DIR, `${id}.json`);
        await fs.unlink(filePath);

        res.json({ success: true, message: 'Note deleted' });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Note not found' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// GET /api/notes/search?q=query - Search notes
router.get('/search', async (req: Request, res: Response) => {
    const query = (req.query.q as string || '').toLowerCase();

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const files = await fs.readdir(NOTES_DIR);
        const noteFiles = files.filter(f => f.endsWith('.json'));

        const notes = await Promise.all(
            noteFiles.map(async (file) => {
                const content = await fs.readFile(path.join(NOTES_DIR, file), 'utf-8');
                return JSON.parse(content);
            })
        );

        // Filter notes by query in title or content
        const filtered = notes.filter(note =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query)
        );

        res.json({ notes: filtered });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
