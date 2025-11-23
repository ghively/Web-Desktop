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

export default router;
