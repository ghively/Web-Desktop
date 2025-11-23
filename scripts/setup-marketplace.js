#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Configuration
const MARKETPLACE_DIR = path.join(process.env.HOME || require('os').homedir(), '.web-desktop', 'marketplace');
const APPS_DIR = path.join(MARKETPLACE_DIR, 'apps');

// Sample marketplace apps data
const sampleApps = [
    {
        id: 'calculator',
        name: 'Calculator',
        displayName: 'Calculator',
        description: 'A simple calculator application for basic arithmetic operations',
        version: '1.0.0',
        author: {
            name: 'Web Desktop Team',
            email: 'team@webdesktop.org'
        },
        category: 'utilities',
        tags: ['calculator', 'math', 'utility'],
        icon: '🧮',
        screenshots: [],
        license: 'MIT',
        keywords: ['calculator', 'math', 'arithmetic'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        downloadCount: 1250,
        rating: 4.5,
        reviewCount: 42,
        size: 1024 * 1024, // 1MB
        dependencies: [],
        permissions: [
            {
                id: 'local-storage',
                name: 'Local Storage',
                description: 'Access to browser local storage for saving history',
                type: 'user-data',
                required: false
            }
        ],
        compatibility: {
            platforms: [{ name: 'Web Desktop', supported: true }],
            architectures: ['x86_64', 'arm64'],
            minVersion: '1.0.0',
            requirements: []
        },
        installUrl: 'https://example.com/apps/calculator.zip',
        developer: {
            name: 'Web Desktop Team',
            verified: true,
            rating: 5.0
        },
        security: {
            verified: true,
            threats: [],
            sandbox: {
                enabled: true,
                type: 'full'
            }
        },
        reviews: []
    },
    {
        id: 'text-editor',
        name: 'Text Editor',
        displayName: 'Text Editor Pro',
        description: 'A feature-rich text editor with syntax highlighting and themes',
        version: '2.1.0',
        author: {
            name: 'CodeWorks Inc.',
            email: 'support@codeworks.inc'
        },
        category: 'development',
        tags: ['editor', 'text', 'development', 'syntax'],
        icon: '📝',
        screenshots: [],
        license: 'GPL-3.0',
        keywords: ['text', 'editor', 'syntax', 'development'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        downloadCount: 3450,
        rating: 4.8,
        reviewCount: 128,
        size: 2 * 1024 * 1024, // 2MB
        dependencies: [
            {
                name: 'monaco-editor',
                version: '^0.34.0',
                type: 'package',
                required: true
            }
        ],
        permissions: [
            {
                id: 'file-system',
                name: 'File System Access',
                description: 'Read and write files on the local file system',
                type: 'file-system',
                required: true
            }
        ],
        compatibility: {
            platforms: [{ name: 'Web Desktop', supported: true }],
            architectures: ['x86_64', 'arm64'],
            minVersion: '1.0.0',
            requirements: []
        },
        installUrl: 'https://example.com/apps/text-editor.zip',
        developer: {
            name: 'CodeWorks Inc.',
            verified: true,
            rating: 4.7
        },
        security: {
            verified: true,
            threats: [],
            sandbox: {
                enabled: true,
                type: 'partial'
            }
        },
        reviews: []
    },
    {
        id: 'image-viewer',
        name: 'Image Viewer',
        displayName: 'Image Viewer',
        description: 'View and manage your image collections with various formats support',
        version: '1.2.0',
        author: {
            name: 'Media Labs',
            website: 'https://medialabs.example.com'
        },
        category: 'multimedia',
        tags: ['image', 'viewer', 'gallery', 'photos'],
        icon: '🖼️',
        screenshots: [],
        license: 'MIT',
        keywords: ['image', 'viewer', 'gallery', 'photo'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        downloadCount: 2100,
        rating: 4.3,
        reviewCount: 67,
        size: 1.5 * 1024 * 1024, // 1.5MB
        dependencies: [
            {
                name: 'canvas-api',
                version: '^2.0.0',
                type: 'runtime',
                required: true
            }
        ],
        permissions: [
            {
                id: 'file-system',
                name: 'File System Access',
                description: 'Access image files from the local file system',
                type: 'file-system',
                required: true
            },
            {
                id: 'camera',
                name: 'Camera Access',
                description: 'Access camera for taking photos (optional)',
                type: 'hardware',
                required: false
            }
        ],
        compatibility: {
            platforms: [{ name: 'Web Desktop', supported: true }],
            architectures: ['x86_64', 'arm64'],
            minVersion: '1.0.0',
            requirements: []
        },
        installUrl: 'https://example.com/apps/image-viewer.zip',
        developer: {
            name: 'Media Labs',
            verified: true,
            rating: 4.2
        },
        security: {
            verified: true,
            threats: [],
            sandbox: {
                enabled: true,
                type: 'partial'
            }
        },
        reviews: []
    },
    {
        id: 'notes',
        name: 'Quick Notes',
        displayName: 'Quick Notes',
        description: 'A simple note-taking app with markdown support',
        version: '1.5.0',
        author: {
            name: 'Productivity Apps Co.',
            email: 'hello@productivity-apps.co'
        },
        category: 'productivity',
        tags: ['notes', 'markdown', 'productivity', 'writing'],
        icon: '📋',
        screenshots: [],
        license: 'Apache-2.0',
        keywords: ['notes', 'markdown', 'productivity', 'writing'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        downloadCount: 4890,
        rating: 4.6,
        reviewCount: 203,
        size: 800 * 1024, // 800KB
        dependencies: [
            {
                name: 'marked',
                version: '^4.0.0',
                type: 'package',
                required: true
            }
        ],
        permissions: [
            {
                id: 'local-storage',
                name: 'Local Storage',
                description: 'Store notes in browser local storage',
                type: 'user-data',
                required: true
            },
            {
                id: 'file-system',
                name: 'File System Access',
                description: 'Import and export notes as files',
                type: 'file-system',
                required: false
            }
        ],
        compatibility: {
            platforms: [{ name: 'Web Desktop', supported: true }],
            architectures: ['x86_64', 'arm64'],
            minVersion: '1.0.0',
            requirements: []
        },
        installUrl: 'https://example.com/apps/quick-notes.zip',
        developer: {
            name: 'Productivity Apps Co.',
            verified: true,
            rating: 4.8
        },
        security: {
            verified: true,
            threats: [],
            sandbox: {
                enabled: true,
                type: 'partial'
            }
        },
        reviews: []
    }
];

// Sample categories
const categories = [
    { id: 'productivity', name: 'productivity', displayName: 'Productivity', description: 'Apps for getting work done', icon: 'briefcase' },
    { id: 'development', name: 'development', displayName: 'Development', description: 'Development tools and IDEs', icon: 'code' },
    { id: 'multimedia', name: 'multimedia', displayName: 'Multimedia', description: 'Audio, video, and image applications', icon: 'play-circle' },
    { id: 'games', name: 'games', displayName: 'Games', description: 'Fun and entertainment', icon: 'gamepad-2' },
    { id: 'education', name: 'education', displayName: 'Education', description: 'Learning and educational apps', icon: 'graduation-cap' },
    { id: 'utilities', name: 'utilities', displayName: 'Utilities', description: 'System utilities and tools', icon: 'wrench' },
    { id: 'system', name: 'system', displayName: 'System', description: 'System management and monitoring', icon: 'settings' },
    { id: 'graphics', name: 'graphics', displayName: 'Graphics', description: 'Graphic design and image editing', icon: 'palette' },
    { id: 'network', name: 'network', displayName: 'Network', description: 'Network and communication tools', icon: 'globe' },
    { id: 'office', name: 'office', displayName: 'Office', description: 'Office productivity applications', icon: 'file-text' }
];

async function setupMarketplace() {
    console.log('Setting up Web Desktop Marketplace...');

    try {
        // Create directories
        await fs.mkdir(MARKETPLACE_DIR, { recursive: true });
        await fs.mkdir(APPS_DIR, { recursive: true });

        console.log('✓ Created marketplace directories');

        // Create sample app manifests
        for (const app of sampleApps) {
            const appDir = path.join(APPS_DIR, app.id);
            await fs.mkdir(appDir, { recursive: true });

            // Create manifest.json
            const manifest = {
                id: app.id,
                name: app.name,
                version: app.version,
                description: app.description,
                author: app.author.name,
                license: app.license,
                homepage: app.installUrl,
                main: 'index.html',
                type: 'web',
                category: app.category,
                tags: app.tags,
                icon: app.icon,
                dependencies: app.dependencies,
                permissions: app.permissions,
                build: {
                    buildCommand: 'npm run build',
                    buildDependencies: [],
                    outputDirectory: 'dist'
                },
                package: {
                    format: 'directory',
                    files: [
                        { source: '**/*', target: '/', executable: false }
                    ]
                },
                compatibility: {
                    platform: 'web-desktop',
                    minVersion: '1.0.0'
                }
            };

            await fs.writeFile(
                path.join(appDir, 'manifest.json'),
                JSON.stringify(manifest, null, 2)
            );

            // Create metadata.json
            const metadata = {
                ...app,
                installedAt: new Date().toISOString(),
                fileHash: 'sample-hash-' + Math.random().toString(36),
                securityScan: {
                    safe: true,
                    threats: []
                },
                permissions: app.permissions,
                sandboxConfig: {
                    enabled: true,
                    type: 'partial'
                }
            };

            await fs.writeFile(
                path.join(appDir, 'metadata.json'),
                JSON.stringify(metadata, null, 2)
            );

            // Create a simple HTML file for demo purposes
            const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${app.name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1a1a1a;
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            max-width: 600px;
        }
        h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
            color: #3b82f6;
        }
        .icon {
            font-size: 4em;
            margin-bottom: 20px;
        }
        p {
            font-size: 1.2em;
            line-height: 1.6;
            color: #ccc;
        }
        .info {
            background: #374151;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: left;
        }
        .info h3 {
            margin-top: 0;
            color: #3b82f6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">${app.icon}</div>
        <h1>${app.name}</h1>
        <p>${app.description}</p>
        <div class="info">
            <h3>App Information</h3>
            <p><strong>Version:</strong> ${app.version}</p>
            <p><strong>Author:</strong> ${app.author.name}</p>
            <p><strong>License:</strong> ${app.license}</p>
            <p><strong>Category:</strong> ${app.category}</p>
            <p><strong>Tags:</strong> ${app.tags.join(', ')}</p>
        </div>
    </div>
</body>
</html>`;

            await fs.writeFile(path.join(appDir, 'index.html'), htmlContent);

            console.log(`✓ Created sample app: ${app.name}`);
        }

        // Create categories.json
        await fs.writeFile(
            path.join(APPS_DIR, 'categories.json'),
            JSON.stringify(categories, null, 2)
        );

        console.log('✓ Created categories configuration');

        // Create registry.json with all apps
        await fs.writeFile(
            path.join(APPS_DIR, 'registry.json'),
            JSON.stringify(sampleApps, null, 2)
        );

        console.log('✓ Created app registry');

        console.log('\n🎉 Marketplace setup complete!');
        console.log(`📁 Marketplace directory: ${MARKETPLACE_DIR}`);
        console.log(`📱 Sample apps created: ${sampleApps.length}`);
        console.log('\nYou can now access the marketplace through the app launcher!');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

// Run setup
if (require.main === module) {
    setupMarketplace();
}

module.exports = { setupMarketplace };