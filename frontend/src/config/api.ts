/**
 * Centralized API Configuration
 * Provides cross-platform compatibility and deployment flexibility
 */

// Get API base URL from environment variables or use defaults based on current hostname
const getApiBaseUrl = (): string => {
    // Check for explicit environment variable first (for production/CI)
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }

    // Check for development environment variable
    if (import.meta.env.VITE_API_HOST && import.meta.env.VITE_API_PORT) {
        return `http://${import.meta.env.VITE_API_HOST}:${import.meta.env.VITE_API_PORT}`;
    }

    // Default to current hostname with port detection logic
    const hostname = window.location.hostname;
    const port = import.meta.env.VITE_API_PORT || '3001';

    // Use the same hostname as the frontend for direct API access
    return `http://${hostname}:${port}`;
};

// Get WebSocket base URL with proper protocol detection
const getWsBaseUrl = (): string => {
    // Check for explicit environment variable first
    if (import.meta.env.VITE_WS_BASE_URL) {
        return import.meta.env.VITE_WS_BASE_URL;
    }

    // Derive from API base URL with WebSocket protocol
    const apiUrl = getApiBaseUrl();
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    return wsUrl;
};

// Get VNC WebSocket URL (can be customized separately)
const getVncUrl = (): string => {
    // Check for explicit environment variable first
    if (import.meta.env.VITE_VNC_URL) {
        return import.meta.env.VITE_VNC_URL;
    }

    // Default to WebSocket base URL
    return getWsBaseUrl();
};

// Export configuration object
export const API_CONFIG = {
    // Base URLs
    apiUrl: getApiBaseUrl(),
    wsUrl: getWsBaseUrl(),
    vncUrl: getVncUrl(),

    // API endpoints (without base URL for flexibility)
    endpoints: {
        // File system
        fs: '/api/fs',
        fsUpload: '/api/fs/upload',
        fsCopy: '/api/fs/copy',
        fsMove: '/api/fs/move',
        fsRename: '/api/fs/rename',
        fsDelete: '/api/fs/delete',
        fsRead: '/api/fs/read',

        // System
        system: '/api/system',
        systemInfo: '/api/system/info',
        systemStats: '/api/system/stats',

        // Containers
        containers: '/api/containers',
        containerStats: '/api/containers/stats',

        // Apps
        apps: '/api/apps',

        // Packages
        packages: '/api/packages',

        // Notes
        notes: '/api/notes',

        // Shares
        shares: '/api/shares',

        // VNC
        vnc: '/api/vnc',

        // Nginx Proxy
        nginxProxy: '/api/nginx-proxy',

        // Control Panel
        controlPanel: '/api/control-panel',

        // Marketplace
        marketplace: '/api/marketplace',

        // AI Integration
        aiIntegration: '/api/ai-integration',

        // File Servers
        fileServers: '/api/file-servers',

        // Smart Storage
        smartStorage: '/api/smart-storage',

        // Storage Pools
        storagePools: '/api/storage-pools',

        // System Monitoring
        systemMonitoring: '/api/system-monitoring',

        // WiFi Management
        wifiManagement: '/api/wifi-management',

        // Power Management
        powerManagement: '/api/power-management',

        // Home Assistant
        homeAssistant: '/api/home-assistant',

        // Media Server
        mediaServer: '/api/media-server',

        // File Metadata
        fileMetadata: '/api/file-metadata',

        // AI Model Manager
        aiModelManager: '/api/ai-model-manager',

        // Comprehensive Settings
        comprehensiveSettings: '/api/comprehensive-settings',

        // RDP
        rdp: '/api/rdp',
    },

    // Helper function to get full endpoint URL
    getEndpointUrl: (endpoint: keyof typeof API_CONFIG.endpoints): string => {
        return `${API_CONFIG.apiUrl}${API_CONFIG.endpoints[endpoint]}`;
    },

    // Helper function for WebSocket URLs
    getWebSocketUrl: (path: string = ''): string => {
        return `${API_CONFIG.wsUrl}${path}`;
    },

    // Helper function for VNC WebSocket URLs
    getVncWebSocketUrl: (path: string = ''): string => {
        return `${API_CONFIG.vncUrl}${path}`;
    },
};

// Export individual helpers for convenience
export const { getEndpointUrl, getWebSocketUrl, getVncWebSocketUrl } = API_CONFIG;

// Default export
export default API_CONFIG;