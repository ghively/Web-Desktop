import { SearchResult } from '../GlobalSearch';
import { useSettings } from '../../context/exports';
import { Folder, FileText, Image, Music, Video, Archive, Code, Database } from 'lucide-react';

// File type mapping for icons
const FILE_TYPE_ICONS: Record<string, any> = {
    // Documents
    txt: FileText,
    md: FileText,
    pdf: FileText,
    doc: FileText,
    docx: FileText,
    odt: FileText,
    rtf: FileText,

    // Images
    jpg: Image,
    jpeg: Image,
    png: Image,
    gif: Image,
    svg: Image,
    webp: Image,
    ico: Image,

    // Audio
    mp3: Music,
    wav: Music,
    flac: Music,
    ogg: Music,
    m4a: Music,

    // Video
    mp4: Video,
    avi: Video,
    mkv: Video,
    mov: Video,
    webm: Video,

    // Archives
    zip: Archive,
    rar: Archive,
    tar: Archive,
    gz: Archive,
    '7z': Archive,

    // Code
    js: Code,
    ts: Code,
    py: Code,
    java: Code,
    cpp: Code,
    c: Code,
    html: Code,
    css: Code,
    json: Code,
    xml: Code,
    yaml: Code,
    sh: Code,

    // Data
    sql: Database,
    csv: Database,
    db: Database,
    sqlite: Database,
};

export class FileSearchProvider {
    private apiUrl: string;
    private cache: Map<string, SearchResult[]> = new Map();
    private cacheTimeout = 30000; // 30 seconds

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    private getFileIcon(fileName: string): any {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return FILE_TYPE_ICONS[ext || ''] || FileText;
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    async search(query: string, limit: number = 10): Promise<SearchResult[]> {
        if (!query.trim() || query.length < 2) return [];

        const cacheKey = `files_${query}_${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const response = await fetch(
                `${this.apiUrl}/api/fs/search?q=${encodeURIComponent(query)}&limit=${limit}`
            );

            if (!response.ok) {
                throw new Error('File search failed');
            }

            const data = await response.json();
            const results: SearchResult[] = data.files?.map((file: any) => ({
                id: `file-${file.path}`,
                title: file.name,
                description: `${file.isDirectory ? 'Directory' : this.formatFileSize(file.size)} • ${file.path}`,
                category: 'file' as const,
                icon: file.isDirectory ? Folder : this.getFileIcon(file.name),
                action: async () => {
                    // Store the selected file in session storage for file manager to pick up
                    sessionStorage.setItem('selectedFile', JSON.stringify(file));
                },
                metadata: {
                    path: file.path,
                    type: file.isDirectory ? 'directory' : 'file',
                    size: file.size,
                    modified: file.modified,
                    extension: file.name.split('.').pop()?.toLowerCase()
                }
            })) || [];

            // Cache the results
            this.cache.set(cacheKey, results);

            // Clear cache after timeout
            setTimeout(() => {
                this.cache.delete(cacheKey);
            }, this.cacheTimeout);

            return results;
        } catch (error) {
            console.error('File search error:', error);
            return [];
        }
    }

    async searchByExtension(extension: string, limit: number = 20): Promise<SearchResult[]> {
        try {
            const response = await fetch(
                `${this.apiUrl}/api/fs/search?ext=${encodeURIComponent(extension)}&limit=${limit}`
            );

            if (!response.ok) return [];

            const data = await response.json();
            return data.files?.map((file: any) => ({
                id: `file-${file.path}`,
                title: file.name,
                description: `${this.formatFileSize(file.size)} • ${file.path}`,
                category: 'file' as const,
                icon: this.getFileIcon(file.name),
                action: () => {
                    sessionStorage.setItem('selectedFile', JSON.stringify(file));
                },
                metadata: {
                    path: file.path,
                    type: 'file',
                    size: file.size,
                    modified: file.modified,
                    extension: file.name.split('.').pop()?.toLowerCase()
                }
            })) || [];
        } catch (error) {
            console.error('Extension search error:', error);
            return [];
        }
    }

    clearCache(): void {
        this.cache.clear();
    }
}

export class ApplicationSearchProvider {
    private cache: SearchResult[] | null = null;
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    async search(query: string): Promise<SearchResult[]> {
        // Return cached results if available
        if (this.cache) {
            return this.filterResults(this.cache, query);
        }

        try {
            // Fetch installed applications
            const [packagesResponse, marketplaceResponse] = await Promise.all([
                fetch(`${this.apiUrl}/api/packages/installed`),
                fetch(`${this.apiUrl}/api/marketplace/installed`).catch(() => null)
            ]);

            const results: SearchResult[] = [];

            // Process system packages
            if (packagesResponse.ok) {
                const packagesData = await packagesResponse.json();
                if (packagesData.apps) {
                    results.push(...packagesData.apps.map((app: any) => ({
                        id: `app-${app.id || app.name}`,
                        title: app.name,
                        description: app.description || 'System application',
                        category: 'application' as const,
                        icon: app.icon || '📦',
                        action: () => {
                            // Launch logic would be handled by the caller
                            sessionStorage.setItem('launchApp', JSON.stringify(app));
                        },
                        metadata: {
                            source: 'packages',
                            exec: app.exec,
                            categories: app.categories || []
                        }
                    })));
                }
            }

            // Process marketplace apps
            if (marketplaceResponse && marketplaceResponse.ok) {
                const marketplaceData = await marketplaceResponse.json();
                if (marketplaceData.apps) {
                    results.push(...marketplaceData.apps.map((app: any) => ({
                        id: `app-${app.manifest.id}`,
                        title: app.manifest.name,
                        description: app.manifest.description || 'Web application',
                        category: 'application' as const,
                        icon: app.manifest.icon || '🌐',
                        action: () => {
                            sessionStorage.setItem('launchWebApp', JSON.stringify(app));
                        },
                        metadata: {
                            source: 'marketplace',
                            installPath: app.installPath,
                            category: app.manifest.category
                        }
                    })));
                }
            }

            this.cache = results;
            return this.filterResults(results, query);
        } catch (error) {
            console.error('Application search error:', error);
            return [];
        }
    }

    private filterResults(results: SearchResult[], query: string): SearchResult[] {
        if (!query.trim()) return results;

        const queryLower = query.toLowerCase();
        return results.filter(app =>
            app.title.toLowerCase().includes(queryLower) ||
            (app.description && app.description.toLowerCase().includes(queryLower)) ||
            (app.metadata?.categories && app.metadata.categories.some((cat: string) =>
                cat.toLowerCase().includes(queryLower)
            ))
        );
    }

    refreshCache(): void {
        this.cache = null;
    }
}

export class SettingsSearchProvider {
    private settingsIndex: SearchResult[] = [];

    constructor() {
        this.buildSettingsIndex();
    }

    private buildSettingsIndex(): void {
        // This would be expanded with actual settings from the application
        this.settingsIndex = [
            {
                id: 'setting-appearance-wallpaper',
                title: 'Wallpaper',
                description: 'Change desktop background image or color',
                category: 'setting' as const,
                icon: '🖼️',
                action: () => {
                    sessionStorage.setItem('navigateToSetting', JSON.stringify({
                        category: 'appearance',
                        section: 'wallpaper'
                    }));
                },
                metadata: {
                    category: 'appearance',
                    section: 'wallpaper',
                    keywords: ['background', 'theme', 'desktop']
                }
            },
            {
                id: 'setting-appearance-theme',
                title: 'Theme',
                description: 'Switch between light and dark themes',
                category: 'setting' as const,
                icon: '🎨',
                action: () => {
                    sessionStorage.setItem('navigateToSetting', JSON.stringify({
                        category: 'appearance',
                        section: 'theme'
                    }));
                },
                metadata: {
                    category: 'appearance',
                    section: 'theme',
                    keywords: ['dark', 'light', 'color']
                }
            },
            {
                id: 'setting-network-wifi',
                title: 'WiFi Settings',
                description: 'Manage wireless network connections',
                category: 'setting' as const,
                icon: '📶',
                action: () => {
                    sessionStorage.setItem('navigateToSetting', JSON.stringify({
                        category: 'network',
                        section: 'wifi'
                    }));
                },
                metadata: {
                    category: 'network',
                    section: 'wifi',
                    keywords: ['wireless', 'network', 'connection']
                }
            },
            {
                id: 'setting-privacy-security',
                title: 'Security',
                description: 'Privacy and security settings',
                category: 'setting' as const,
                icon: '🔒',
                action: () => {
                    sessionStorage.setItem('navigateToSetting', JSON.stringify({
                        category: 'privacy',
                        section: 'security'
                    }));
                },
                metadata: {
                    category: 'privacy',
                    section: 'security',
                    keywords: ['privacy', 'security', 'protection']
                }
            },
            {
                id: 'setting-keyboard-shortcuts',
                title: 'Keyboard Shortcuts',
                description: 'Configure custom keyboard shortcuts',
                category: 'setting' as const,
                icon: '⌨️',
                action: () => {
                    sessionStorage.setItem('navigateToSetting', JSON.stringify({
                        category: 'shortcuts',
                        section: 'keyboard'
                    }));
                },
                metadata: {
                    category: 'shortcuts',
                    section: 'keyboard',
                    keywords: ['hotkey', 'keybinding', 'shortcut']
                }
            },
            {
                id: 'setting-notifications',
                title: 'Notifications',
                description: 'Manage system notifications',
                category: 'setting' as const,
                icon: '🔔',
                action: () => {
                    sessionStorage.setItem('navigateToSetting', JSON.stringify({
                        category: 'notifications',
                        section: 'general'
                    }));
                },
                metadata: {
                    category: 'notifications',
                    section: 'general',
                    keywords: ['alert', 'notification', 'reminder']
                }
            }
        ];
    }

    search(query: string): SearchResult[] {
        if (!query.trim()) return [];

        const queryLower = query.toLowerCase();
        const keywords = queryLower.split(' ').filter(word => word.length > 0);

        return this.settingsIndex
            .filter(setting => {
                const titleMatch = setting.title.toLowerCase().includes(queryLower);
                const descriptionMatch = setting.description?.toLowerCase().includes(queryLower);
                const keywordsMatch = setting.metadata?.keywords?.some((keyword: string) =>
                    keyword.toLowerCase().includes(queryLower)
                );
                const partialMatch = keywords.some(keyword =>
                    setting.title.toLowerCase().includes(keyword) ||
                    (setting.description && setting.description.toLowerCase().includes(keyword))
                );

                return titleMatch || descriptionMatch || keywordsMatch || partialMatch;
            })
            .map(setting => ({
                ...setting,
                score: this.calculateScore(setting, queryLower, keywords)
            }))
            .sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    private calculateScore(setting: SearchResult, query: string, keywords: string[]): number {
        let score = 0;
        const titleLower = setting.title.toLowerCase();
        const descriptionLower = setting.description?.toLowerCase() || '';

        // Exact title match gets highest score
        if (titleLower === query) score += 100;

        // Title starts with query
        if (titleLower.startsWith(query)) score += 50;

        // Title contains query
        if (titleLower.includes(query)) score += 25;

        // Description contains query
        if (descriptionLower.includes(query)) score += 10;

        // Keyword matches
        if (setting.metadata?.keywords) {
            setting.metadata.keywords.forEach((keyword: string) => {
                if (keyword.toLowerCase() === query) score += 15;
                if (keyword.toLowerCase().includes(query)) score += 5;
            });
        }

        // Partial word matches
        keywords.forEach(keyword => {
            if (titleLower.includes(keyword)) score += 3;
            if (descriptionLower.includes(keyword)) score += 1;
        });

        return score;
    }
}

export class CommandSearchProvider {
    private commands: SearchResult[] = [];

    constructor() {
        this.buildCommandsIndex();
    }

    private buildCommandsIndex(): void {
        this.commands = [
            {
                id: 'cmd-shutdown',
                title: 'Shutdown',
                description: 'Power off the system',
                category: 'command' as const,
                icon: '⏻',
                action: () => {
                    sessionStorage.setItem('executeCommand', JSON.stringify({
                        command: 'shutdown',
                        confirmation: true
                    }));
                }
            },
            {
                id: 'cmd-reboot',
                title: 'Reboot',
                description: 'Restart the system',
                category: 'command' as const,
                icon: '🔄',
                action: () => {
                    sessionStorage.setItem('executeCommand', JSON.stringify({
                        command: 'reboot',
                        confirmation: true
                    }));
                }
            },
            {
                id: 'cmd-logout',
                title: 'Logout',
                description: 'Sign out of current session',
                category: 'command' as const,
                icon: '🚪',
                action: () => {
                    sessionStorage.setItem('executeCommand', JSON.stringify({
                        command: 'logout',
                        confirmation: false
                    }));
                }
            },
            {
                id: 'cmd-lock',
                title: 'Lock Screen',
                description: 'Lock the desktop session',
                category: 'command' as const,
                icon: '🔒',
                action: () => {
                    sessionStorage.setItem('executeCommand', JSON.stringify({
                        command: 'lock',
                        confirmation: false
                    }));
                }
            },
            {
                id: 'cmd-suspend',
                title: 'Suspend',
                description: 'Put the system to sleep',
                category: 'command' as const,
                icon: '😴',
                action: () => {
                    sessionStorage.setItem('executeCommand', JSON.stringify({
                        command: 'suspend',
                        confirmation: false
                    }));
                }
            },
            {
                id: 'cmd-screenshot',
                title: 'Screenshot',
                description: 'Capture the entire screen',
                category: 'command' as const,
                icon: '📸',
                action: () => {
                    sessionStorage.setItem('executeCommand', JSON.stringify({
                        command: 'screenshot',
                        confirmation: false
                    }));
                }
            },
            {
                id: 'cmd-terminal',
                title: 'New Terminal',
                description: 'Open a new terminal window',
                category: 'command' as const,
                icon: '💻',
                action: () => {
                    sessionStorage.setItem('executeCommand', JSON.stringify({
                        command: 'open-terminal',
                        confirmation: false
                    }));
                }
            },
            {
                id: 'cmd-file-manager',
                title: 'Open File Manager',
                description: 'Open the file manager',
                category: 'command' as const,
                icon: '📁',
                action: () => {
                    sessionStorage.setItem('executeCommand', JSON.stringify({
                        command: 'open-file-manager',
                        confirmation: false
                    }));
                }
            }
        ];
    }

    search(query: string): SearchResult[] {
        if (!query.trim()) return this.commands;

        const queryLower = query.toLowerCase();

        return this.commands
            .filter(cmd =>
                cmd.title.toLowerCase().includes(queryLower) ||
                (cmd.description && cmd.description.toLowerCase().includes(queryLower))
            )
            .map(cmd => ({
                ...cmd,
                score: this.calculateCommandScore(cmd, queryLower)
            }))
            .sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    private calculateCommandScore(command: SearchResult, query: string): number {
        const titleLower = command.title.toLowerCase();
        const descriptionLower = command.description?.toLowerCase() || '';

        if (titleLower === query) return 100;
        if (titleLower.startsWith(query)) return 50;
        if (titleLower.includes(query)) return 25;
        if (descriptionLower.includes(query)) return 10;

        return 0;
    }
}