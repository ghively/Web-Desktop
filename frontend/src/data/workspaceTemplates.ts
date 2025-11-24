import { WorkspaceTemplate, LayoutTemplate } from '../context/types';

/**
 * Predefined workspace templates for different productivity workflows
 * Each template defines a complete workspace setup with specific applications and layouts
 */

// Development Workspace Template
export const DEVELOPMENT_WORKSPACE: WorkspaceTemplate = {
    id: 'development-workspace',
    name: 'Development Workspace',
    description: 'Complete coding environment with IDE, terminal, browser, and documentation',
    category: 'development',
    icon: '💻',
    layout: {
        mode: 'hybrid',
        template: {
            id: 'dev-master-stack',
            name: 'Development Master-Stack',
            description: 'IDE on left, tools on right',
            type: 'master-stack',
            config: {
                masterRatio: 0.65,
                stackDirection: 'right'
            }
        }
    },
    applications: [
        {
            id: 'code-editor',
            title: 'Code Editor',
            applicationCategory: 'development',
            position: { x: 8, y: 48, width: '65%', height: '100%' },
            autoLaunch: true,
            icon: '📝'
        },
        {
            id: 'terminal',
            title: 'Terminal',
            applicationCategory: 'terminal',
            position: { x: '65%', y: 48, width: '35%', height: '50%' },
            autoLaunch: true,
            icon: '⌨️'
        },
        {
            id: 'browser-docs',
            title: 'Documentation Browser',
            applicationCategory: 'browser',
            position: { x: '65%', y: '50%', width: '35%', height: '50%' },
            autoLaunch: false,
            icon: '🌐'
        }
    ],
    windowRules: [
        {
            applicationCategory: 'development',
            rules: {
                defaultPosition: { x: 8, y: 48, width: '65%', height: '100%' },
                alwaysOnTop: false,
                autoGroup: 'Development Tools'
            }
        },
        {
            applicationCategory: 'terminal',
            titlePattern: 'terminal|shell|bash',
            rules: {
                defaultPosition: { x: '65%', y: 48, width: '35%', height: '50%' },
                autoGroup: 'Terminals',
                minimizeOnLaunch: false
            }
        }
    ],
    snapZones: [
        {
            id: 'dev-left-zone',
            edge: 'left',
            bounds: { x: 0, y: 0, width: '65%', height: '100%' },
            action: { type: 'position', config: { width: '65%', height: '100%' } },
            applicationCategories: ['development'],
            priority: 15
        },
        {
            id: 'dev-right-zone',
            edge: 'right',
            bounds: { x: '65%', y: 0, width: '35%', height: '100%' },
            action: { type: 'layout', config: { type: 'tiled' } },
            applicationCategories: ['terminal', 'browser'],
            priority: 15
        }
    ]
};

// System Admin Workspace Template
export const SYSTEM_ADMIN_WORKSPACE: WorkspaceTemplate = {
    id: 'system-admin-workspace',
    name: 'System Admin Workspace',
    description: 'System monitoring and control center with logs and terminal access',
    category: 'system-admin',
    icon: '⚙️',
    layout: {
        mode: 'tiling',
        template: {
            id: 'admin-grid',
            name: 'Admin Grid',
            description: '2x2 grid for system tools',
            type: 'grid',
            config: { rows: 2, cols: 2 }
        }
    },
    applications: [
        {
            id: 'control-center',
            title: 'Control Center',
            applicationCategory: 'system',
            position: { x: 0, y: 0, width: '50%', height: '50%' },
            autoLaunch: true,
            icon: '🎛️'
        },
        {
            id: 'terminal-admin',
            title: 'Admin Terminal',
            applicationCategory: 'terminal',
            position: { x: '50%', y: 0, width: '50%', height: '50%' },
            autoLaunch: true,
            icon: '⌨️'
        },
        {
            id: 'system-monitor',
            title: 'System Monitor',
            applicationCategory: 'monitoring',
            position: { x: 0, y: '50%', width: '50%', height: '50%' },
            autoLaunch: true,
            icon: '📊'
        },
        {
            id: 'log-viewer',
            title: 'Log Viewer',
            applicationCategory: 'system',
            position: { x: '50%', y: '50%', width: '50%', height: '50%' },
            autoLaunch: false,
            icon: '📋'
        }
    ],
    windowRules: [
        {
            applicationCategory: 'system',
            titlePattern: 'control|settings|config',
            rules: {
                defaultPosition: { x: 0, y: 0, width: '50%', height: '50%' },
                alwaysOnTop: false
            }
        },
        {
            applicationCategory: 'terminal',
            titlePattern: 'admin|root|sudo',
            rules: {
                defaultPosition: { x: '50%', y: 0, width: '50%', height: '50%' },
                autoGroup: 'Admin Terminals'
            }
        },
        {
            applicationCategory: 'monitoring',
            rules: {
                defaultPosition: { x: 0, y: '50%', width: '50%', height: '50%' },
                alwaysOnTop: true
            }
        }
    ],
    snapZones: []
};

// Media Workspace Template
export const MEDIA_WORKSPACE: WorkspaceTemplate = {
    id: 'media-workspace',
    name: 'Media Workspace',
    description: 'Entertainment hub with media player, file browser, and streaming tools',
    category: 'media',
    icon: '🎬',
    layout: {
        mode: 'floating',
        template: {
            id: 'media-centered',
            name: 'Media Center',
            description: 'Large media viewer with side panels',
            type: 'custom',
            config: {
                mainArea: { x: '10%', y: '5%', width: '60%', height: '80%' },
                sidePanel: { x: '70%', y: '5%', width: '25%', height: '80%' }
            }
        }
    },
    applications: [
        {
            id: 'media-player',
            title: 'Media Player',
            applicationCategory: 'media',
            position: { x: '10%', y: '5%', width: '60%', height: '80%' },
            autoLaunch: true,
            icon: '🎥'
        },
        {
            id: 'file-browser',
            title: 'File Browser',
            applicationCategory: 'file-manager',
            position: { x: '70%', y: '5%', width: '25%', height: '40%' },
            autoLaunch: false,
            icon: '📁'
        },
        {
            id: 'media-playlist',
            title: 'Playlist',
            applicationCategory: 'media',
            position: { x: '70%', y: '45%', width: '25%', height: '40%' },
            autoLaunch: false,
            icon: '🎵'
        }
    ],
    windowRules: [
        {
            applicationCategory: 'media',
            rules: {
                defaultPosition: { x: '10%', y: '5%', width: '60%', height: '80%' },
                alwaysOnTop: false
            }
        },
        {
            applicationCategory: 'file-manager',
            titlePattern: 'media|video|music',
            rules: {
                defaultPosition: { x: '70%', y: '5%', width: '25%', height: '40%' },
                autoGroup: 'Media Files'
            }
        }
    ],
    snapZones: [
        {
            id: 'media-main-zone',
            edge: 'custom',
            bounds: { x: '10%', y: '5%', width: '60%', height: '80%' },
            action: { type: 'maximize' },
            applicationCategories: ['media'],
            priority: 20
        }
    ]
};

// AI Development Workspace Template
export const AI_DEVELOPMENT_WORKSPACE: WorkspaceTemplate = {
    id: 'ai-development-workspace',
    name: 'AI Development Workspace',
    description: 'AI/ML development environment with chat, code, and visualization tools',
    category: 'ai-development',
    icon: '🤖',
    layout: {
        mode: 'hybrid',
        template: {
            id: 'ai-master-stack',
            name: 'AI Development Layout',
            description: 'IDE main, AI tools on right',
            type: 'master-stack',
            config: {
                masterRatio: 0.6,
                stackDirection: 'right'
            }
        }
    },
    applications: [
        {
            id: 'ai-code-editor',
            title: 'AI Code Editor',
            applicationCategory: 'development',
            position: { x: 8, y: 48, width: '60%', height: '100%' },
            autoLaunch: true,
            icon: '🤖'
        },
        {
            id: 'ai-chat',
            title: 'AI Assistant',
            applicationCategory: 'ai',
            position: { x: '60%', y: 48, width: '40%', height: '40%' },
            autoLaunch: true,
            icon: '💬'
        },
        {
            id: 'ai-notebook',
            title: 'Jupyter Notebook',
            applicationCategory: 'development',
            position: { x: '60%', y: '40%', width: '40%', height: '30%' },
            autoLaunch: false,
            icon: '📓'
        },
        {
            id: 'ai-visualizer',
            title: 'Data Visualizer',
            applicationCategory: 'ai',
            position: { x: '60%', y: '70%', width: '40%', height: '30%' },
            autoLaunch: false,
            icon: '📈'
        }
    ],
    windowRules: [
        {
            applicationCategory: 'development',
            titlePattern: 'jupyter|notebook|python',
            rules: {
                defaultPosition: { x: 8, y: 48, width: '60%', height: '100%' },
                autoGroup: 'AI Development'
            }
        },
        {
            applicationCategory: 'ai',
            rules: {
                defaultPosition: { x: '60%', y: 48, width: '40%', height: '40%' },
                autoGroup: 'AI Tools'
            }
        }
    ],
    snapZones: [
        {
            id: 'ai-dev-zone',
            edge: 'left',
            bounds: { x: 0, y: 0, width: '60%', height: '100%' },
            action: { type: 'position', config: { width: '60%', height: '100%' } },
            applicationCategories: ['development'],
            priority: 18
        },
        {
            id: 'ai-tools-zone',
            edge: 'right',
            bounds: { x: '60%', y: 0, width: '40%', height: '100%' },
            action: { type: 'layout', config: { type: 'tiled' } },
            applicationCategories: ['ai'],
            priority: 18
        }
    ]
};

// Communication Workspace Template
export const COMMUNICATION_WORKSPACE: WorkspaceTemplate = {
    id: 'communication-workspace',
    name: 'Communication Workspace',
    description: 'Social and professional communication hub with messaging and video tools',
    category: 'communication',
    icon: '💬',
    layout: {
        mode: 'floating',
        template: {
            id: 'comm-vertical',
            name: 'Communication Layout',
            description: 'Vertical split for communication tools',
            type: 'vertical',
            config: { ratio: 0.7 }
        }
    },
    applications: [
        {
            id: 'main-browser',
            title: 'Browser',
            applicationCategory: 'browser',
            position: { x: 8, y: 48, width: '70%', height: '100%' },
            autoLaunch: true,
            icon: '🌐'
        },
        {
            id: 'chat-app',
            title: 'Chat App',
            applicationCategory: 'communication',
            position: { x: '70%', y: 48, width: '30%', height: '60%' },
            autoLaunch: true,
            icon: '💬'
        },
        {
            id: 'video-call',
            title: 'Video Call',
            applicationCategory: 'communication',
            position: { x: '70%', y: '60%', width: '30%', height: '40%' },
            autoLaunch: false,
            icon: '📹'
        }
    ],
    windowRules: [
        {
            applicationCategory: 'browser',
            rules: {
                defaultPosition: { x: 8, y: 48, width: '70%', height: '100%' },
                alwaysOnTop: false
            }
        },
        {
            applicationCategory: 'communication',
            rules: {
                defaultPosition: { x: '70%', y: 48, width: '30%', height: '60%' },
                autoGroup: 'Communication Apps'
            }
        }
    ],
    snapZones: []
};

// General Productivity Workspace Template
export const GENERAL_WORKSPACE: WorkspaceTemplate = {
    id: 'general-workspace',
    name: 'General Workspace',
    description: 'Balanced workspace for general productivity and multitasking',
    category: 'general',
    icon: '📋',
    layout: {
        mode: 'hybrid',
        template: {
            id: 'general-grid',
            name: 'General Grid',
            description: 'Flexible grid layout',
            type: 'grid',
            config: { rows: 2, cols: 2 }
        }
    },
    applications: [
        {
            id: 'general-browser',
            title: 'Browser',
            applicationCategory: 'browser',
            position: { x: 0, y: 0, width: '50%', height: '50%' },
            autoLaunch: false,
            icon: '🌐'
        },
        {
            id: 'general-notes',
            title: 'Notes',
            applicationCategory: 'notes',
            position: { x: '50%', y: 0, width: '50%', height: '50%' },
            autoLaunch: false,
            icon: '📝'
        },
        {
            id: 'general-files',
            title: 'File Manager',
            applicationCategory: 'file-manager',
            position: { x: 0, y: '50%', width: '50%', height: '50%' },
            autoLaunch: false,
            icon: '📁'
        },
        {
            id: 'general-terminal',
            title: 'Terminal',
            applicationCategory: 'terminal',
            position: { x: '50%', y: '50%', width: '50%', height: '50%' },
            autoLaunch: false,
            icon: '⌨️'
        }
    ],
    windowRules: [],
    snapZones: []
};

// Export all workspace templates
export const DEFAULT_WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
    DEVELOPMENT_WORKSPACE,
    SYSTEM_ADMIN_WORKSPACE,
    MEDIA_WORKSPACE,
    AI_DEVELOPMENT_WORKSPACE,
    COMMUNICATION_WORKSPACE,
    GENERAL_WORKSPACE
];

// Helper function to get template by ID
export const getWorkspaceTemplateById = (id: string): WorkspaceTemplate | undefined => {
    return DEFAULT_WORKSPACE_TEMPLATES.find(template => template.id === id);
};

// Helper function to get templates by category
export const getWorkspaceTemplatesByCategory = (category: WorkspaceTemplate['category']): WorkspaceTemplate[] => {
    return DEFAULT_WORKSPACE_TEMPLATES.filter(template => template.category === category);
};

// Helper function to get all workspace templates
export const getAllWorkspaceTemplates = (): WorkspaceTemplate[] => {
    return DEFAULT_WORKSPACE_TEMPLATES;
};