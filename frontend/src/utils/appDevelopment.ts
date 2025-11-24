import { AppManifest, SandboxConfig } from '../types/applications';
import { API_CONFIG } from '../config/api';

// App Development Utilities

/**
 * Generate a basic app manifest template
 */
export const generateManifestTemplate = (appId: string, appName: string): Partial<AppManifest> => ({
    id: appId,
    name: appName,
    version: '1.0.0',
    description: `Description of ${appName}`,
    author: 'Your Name',
    license: 'MIT',
    main: 'src/index.tsx',
    type: 'web',
    category: 'utilities',
    tags: ['productivity', 'web-desktop'],
    icon: 'icon.png',
    dependencies: [
        { name: 'react', version: '^18.0.0', type: 'package', required: true },
        { name: 'react-dom', version: '^18.0.0', type: 'package', required: true }
    ],
    permissions: [
        {
            id: 'local-storage',
            name: 'Local Storage',
            description: 'Access to browser local storage',
            type: 'user-data',
            required: false
        }
    ],
    build: {
        buildCommand: 'npm run build',
        buildDependencies: ['typescript', 'vite'],
        outputDirectory: 'dist',
        assets: [
            { source: 'public', target: 'dist', type: 'copy' }
        ]
    },
    package: {
        format: 'zip',
        compression: 'gzip',
        files: [
            { source: 'dist/**/*', target: '/', executable: false },
            { source: 'manifest.json', target: '/', executable: false },
            { source: 'icon.png', target: '/', executable: false }
        ]
    },
    compatibility: {
        platform: 'web-desktop',
        minVersion: '1.0.0'
    }
});

/**
 * Validate app manifest
 */
export const validateManifest = (manifest: AppManifest): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Required fields
    const requiredFields = ['id', 'name', 'version', 'description', 'author', 'license', 'main', 'type'];
    for (const field of requiredFields) {
        if (!manifest[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    // ID format validation
    if (manifest.id && !/^[a-z0-9._-]+$/i.test(manifest.id)) {
        errors.push('App ID can only contain alphanumeric characters, dots, hyphens, and underscores');
    }

    // Version format validation
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
        errors.push('Version must follow semantic versioning (x.y.z)');
    }

    // App type validation
    if (manifest.type && !['web', 'native', 'hybrid'].includes(manifest.type)) {
        errors.push('App type must be one of: web, native, hybrid');
    }

    // Category validation
    const validCategories = [
        'productivity', 'development', 'multimedia', 'games', 'education',
        'utilities', 'system', 'graphics', 'network', 'office'
    ];
    if (manifest.category && !validCategories.includes(manifest.category)) {
        errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    // Dependencies validation
    if (manifest.dependencies) {
        manifest.dependencies.forEach((dep, index) => {
            if (!dep.name) {
                errors.push(`Dependency ${index + 1} is missing name`);
            }
            if (!dep.version) {
                errors.push(`Dependency ${index + 1} is missing version`);
            }
            if (!dep.type || !['package', 'service', 'system', 'runtime'].includes(dep.type)) {
                errors.push(`Dependency ${index + 1} has invalid type`);
            }
        });
    }

    // Permissions validation
    if (manifest.permissions) {
        manifest.permissions.forEach((perm, index) => {
            if (!perm.name) {
                errors.push(`Permission ${index + 1} is missing name`);
            }
            if (!perm.description) {
                errors.push(`Permission ${index + 1} is missing description`);
            }
            if (!perm.type || !['file-system', 'network', 'system', 'hardware', 'user-data'].includes(perm.type)) {
                errors.push(`Permission ${index + 1} has invalid type`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Create a default sandbox configuration
 */
export const createDefaultSandboxConfig = (): SandboxConfig => ({
    enabled: true,
    type: 'partial',
    restrictions: ['no-system-access', 'limited-network', 'no-file-system-access'],
    allowedPaths: [],
    networkAccess: false,
    systemAccess: false
});

/**
 * Generate app package structure
 */
export const generateAppStructure = (manifest: AppManifest): Record<string, string> => {
    const structure: Record<string, string> = {};

    // manifest.json
    structure['manifest.json'] = JSON.stringify(manifest, null, 2);

    // Basic React app structure
    if (manifest.type === 'web') {
        structure['src/index.tsx'] = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
`;

        structure['src/App.tsx'] = `
import React, { useState } from 'react';
import './styles.css';

export const App: React.FC = () => {
    const [count, setCount] = useState(0);

    return (
        <div className="app">
            <header className="app-header">
                <h1>${manifest.name}</h1>
                <p>${manifest.description}</p>
            </header>

            <main className="app-main">
                <div className="counter">
                    <button onClick={() => setCount(count - 1)}>-</button>
                    <span>{count}</span>
                    <button onClick={() => setCount(count + 1)}>+</button>
                </div>
            </main>
        </div>
    );
};
`;

        structure['src/styles.css'] = `
.app {
    font-family: Arial, sans-serif;
    text-align: center;
    padding: 20px;
}

.app-header {
    margin-bottom: 30px;
}

.app-header h1 {
    color: #333;
    margin-bottom: 10px;
}

.app-header p {
    color: #666;
}

.app-main {
    display: flex;
    justify-content: center;
    align-items: center;
}

.counter {
    display: flex;
    align-items: center;
    gap: 15px;
}

.counter button {
    padding: 8px 16px;
    font-size: 16px;
    border: 1px solid #ddd;
    background: #f5f5f5;
    cursor: pointer;
    border-radius: 4px;
}

.counter button:hover {
    background: #e9e9e9;
}

.counter span {
    font-size: 18px;
    font-weight: bold;
    min-width: 30px;
}
`;

        structure['index.html'] = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${manifest.name}</title>
    <link rel="stylesheet" href="./src/styles.css">
</head>
<body>
    <div id="root"></div>
    <script type="module" src="./src/index.tsx"></script>
</body>
</html>
`;

        structure['package.json'] = JSON.stringify({
            name: manifest.id,
            version: manifest.version,
            description: manifest.description,
            type: 'module',
            scripts: {
                dev: 'vite',
                build: 'tsc && vite build',
                preview: 'vite preview'
            },
            dependencies: {
                react: '^18.0.0',
                'react-dom': '^18.0.0'
            },
            devDependencies: {
                '@types/react': '^18.0.0',
                '@types/react-dom': '^18.0.0',
                '@vitejs/plugin-react': '^4.0.0',
                typescript: '^5.0.0',
                vite: '^4.0.0'
            }
        }, null, 2);

        structure['tsconfig.json'] = JSON.stringify({
            compilerOptions: {
                target: 'ES2020',
                useDefineForClassFields: true,
                lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                module: 'ESNext',
                skipLibCheck: true,
                moduleResolution: 'bundler',
                allowImportingTsExtensions: true,
                resolveJsonModule: true,
                isolatedModules: true,
                noEmit: true,
                jsx: 'react-jsx',
                strict: true,
                noUnusedLocals: true,
                noUnusedParameters: true,
                noFallthroughCasesInSwitch: true
            },
            include: ['src'],
            references: [{ path: './tsconfig.node.json' }]
        }, null, 2);

        structure['tsconfig.node.json'] = JSON.stringify({
            compilerOptions: {
                composite: true,
                skipLibCheck: true,
                module: 'ESNext',
                moduleResolution: 'bundler',
                allowSyntheticDefaultImports: true
            },
            include: ['vite.config.ts']
        }, null, 2);

        structure['vite.config.ts'] = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: './index.html'
        }
    }
});
`;
    }

    // README.md
    structure['README.md'] = `
# ${manifest.name}

${manifest.description}

## Installation

1. Download the app package
2. Install through Web Desktop Marketplace
3. Launch from app launcher

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## License

${manifest.license}

## Author

${manifest.author}
`;

    return structure;
};

/**
 * Calculate app bundle size
 */
export const calculateBundleSize = async (): Promise<number> => {
    // This would be implemented in a real environment
    // For now, return a mock size
    return Math.random() * 10 * 1024 * 1024; // 0-10MB
};

/**
 * Create app icon from text
 */
export const generateAppIcon = (text: string, size: number = 256): string => {
    // This would generate an SVG icon in a real environment
    // For now, return a data URL placeholder
    return `data:image/svg+xml;base64,${btoa(`
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${size}" height="${size}" fill="#3b82f6"/>
            <text x="${size/2}" y="${size/2}" text-anchor="middle" dy=".3em"
                  fill="white" font-size="${size/4}" font-family="Arial, sans-serif">
                ${text.charAt(0).toUpperCase()}
            </text>
        </svg>
    `)}`;
};

/**
 * Validate app package
 */
export const validateAppPackage = async (packagePath: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    size: number;
}> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        // Check if manifest.json exists
        // Validate manifest structure
        // Check required files
        // Validate file permissions
        // Check for security issues
        // Calculate package size

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            size: await calculateBundleSize(packagePath)
        };
    } catch (error) {
        errors.push(`Package validation failed: ${error}`);
        return {
            valid: false,
            errors,
            warnings,
            size: 0
        };
    }
};

/**
 * Generate app signature for security
 */
export const generateAppSignature = async (): Promise<string> => {
    // This would use crypto to generate a real signature
    // For now, return a mock signature
    return crypto.randomUUID();
};

/**
 * Verify app signature
 */
export const verifyAppSignature = async (): Promise<boolean> => {
    // This would verify the signature using crypto
    // For now, return true for mock implementation
    return true;
};

/**
 * Create development environment configuration
 */
export const createDevConfig = (manifest: AppManifest) => ({
    port: 3000,
    host: 'localhost',
    https: false,
    hotReload: true,
    proxy: {
        '/api': {
            target: API_CONFIG.apiUrl,
            changeOrigin: true
        }
    },
    environment: {
        APP_ID: manifest.id,
        APP_VERSION: manifest.version,
        DEV_MODE: 'true'
    }
});

/**
 * Generate app bundle
 */
export const createAppBundle = async (): Promise<{ success: boolean; errors: string[] }> => {
    const errors: string[] = [];

    try {
        // Validate manifest would happen here in a real implementation
        // Build the app based on type would happen here
        // Create final app package and sign it would happen here
        // Generate checksum

        return {
            success: errors.length === 0,
            errors
        };
    } catch (error) {
        errors.push(`Bundle creation failed: ${error}`);
        return {
            success: false,
            errors
        };
    }
};