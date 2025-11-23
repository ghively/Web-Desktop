import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = Router();
const HOME_DIR = os.homedir();

router.get('/', async (req, res) => {
    const dirPath = (req.query.path as string) || HOME_DIR;

    try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        const files = await Promise.all(
            items.map(async (item) => {
                const fullPath = path.join(dirPath, item.name);
                let size = 0;
                let modified = null;

                try {
                    const stats = await fs.stat(fullPath);
                    size = stats.size;
                    modified = stats.mtime.toISOString();
                } catch (err) {
                    // Ignore stat errors
                }

                return {
                    name: item.name,
                    isDirectory: item.isDirectory(),
                    path: fullPath,
                    size,
                    modified
                };
            })
        );

        res.json({ path: dirPath, files });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read directory' });
    }
});

router.post('/operation', async (req, res) => {
    const { type, path: targetPath, dest, name } = req.body;

    if (!type || !targetPath) {
        return res.status(400).json({ error: 'Missing type or path' });
    }

    try {
        switch (type) {
            case 'create_folder':
                if (!name) return res.status(400).json({ error: 'Missing folder name' });
                await fs.mkdir(path.join(targetPath, name), { recursive: true });
                break;

            case 'delete':
                await fs.rm(targetPath, { recursive: true, force: true });
                break;

            case 'rename':
                if (!name) return res.status(400).json({ error: 'Missing new name' });
                const newPath = path.join(path.dirname(targetPath), name);
                await fs.rename(targetPath, newPath);
                break;

            case 'copy':
                if (!dest) return res.status(400).json({ error: 'Missing destination' });
                await fs.cp(targetPath, dest, { recursive: true });
                break;

            case 'move':
                if (!dest) return res.status(400).json({ error: 'Missing destination' });
                await fs.rename(targetPath, dest);
                break;

            default:
                return res.status(400).json({ error: 'Invalid operation type' });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
