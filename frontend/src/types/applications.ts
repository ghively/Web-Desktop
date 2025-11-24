// Application and Marketplace Type Definitions

export interface AppMetadata {
    id: string;
    name: string;
    displayName: string;
    description: string;
    version: string;
    author: {
        name: string;
        email?: string;
        website?: string;
    };
    category: string;
    subcategory?: string;
    tags: string[];
    icon: string;
    screenshots: string[];
    homepage?: string;
    repository?: string;
    documentation?: string;
    license: string;
    keywords: string[];
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
    downloadCount: number;
    rating: number;
    reviewCount: number;
    size: number;
    dependencies: AppDependency[];
    permissions: AppPermission[];
    compatibility: CompatibilityInfo;
}

export interface AppDependency {
    name: string;
    version: string;
    type: 'package' | 'service' | 'system' | 'runtime';
    required: boolean;
    description?: string;
}

export interface AppPermission {
    id: string;
    name: string;
    description: string;
    type: 'file-system' | 'network' | 'system' | 'hardware' | 'user-data';
    scope?: string[];
    required: boolean;
}

export interface CompatibilityInfo {
    platforms: Platform[];
    architectures: string[];
    minVersion: string;
    maxVersion?: string;
    requirements: SystemRequirement[];
}

export interface Platform {
    name: string;
    supported: boolean;
    notes?: string;
}

export interface SystemRequirement {
    type: 'cpu' | 'memory' | 'disk' | 'gpu' | 'other';
    minimum: string;
    recommended?: string;
    description: string;
}

export interface AppManifest {
    // Core manifest fields
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    homepage?: string;
    repository?: string;

    // Execution configuration
    main: string;
    type: 'web' | 'native' | 'hybrid';
    entry?: {
        web?: string;
        native?: {
            command: string;
            args?: string[];
            workingDirectory?: string;
        };
    };

    // App metadata
    category: string;
    subcategory?: string;
    tags: string[];
    icon: string;
    screenshots?: string[];

    // Dependencies and permissions
    dependencies: AppDependency[];
    permissions: AppPermission[];

    // Build and packaging
    build: BuildConfig;
    package: PackageConfig;

    // Development tools
    development?: DevelopmentConfig;

    // Version compatibility
    compatibility: {
        platform: string;
        minVersion: string;
        maxVersion?: string;
    };
}

export interface BuildConfig {
    buildCommand?: string;
    buildDependencies?: string[];
    outputDirectory?: string;
    assets?: AssetConfig[];
}

export interface AssetConfig {
    source: string;
    target: string;
    type: 'copy' | 'bundle' | 'compress';
}

export interface PackageConfig {
    format: 'zip' | 'tar' | 'directory';
    compression?: 'none' | 'gzip' | 'bzip2' | 'xz';
    files: FileConfig[];
}

export interface FileConfig {
    source: string;
    target: string;
    executable?: boolean;
    permissions?: string;
}

export interface DevelopmentConfig {
    devCommand?: string;
    devServer?: {
        port: number;
        host?: string;
        protocol?: 'http' | 'https';
    };
    watchFiles?: string[];
    hotReload?: boolean;
}

export interface InstalledApp {
    id: string;
    manifest: AppManifest;
    installPath: string;
    installedAt: string;
    lastUsed?: string;
    status: 'installed' | 'running' | 'error' | 'updating' | 'removing';
    version: string;
    updates?: AppUpdate;
    usage: {
        launchCount: number;
        totalTime: number;
        lastLaunch: string;
    };
}

export interface AppUpdate {
    version: string;
    changelog: string[];
    downloadUrl: string;
    size: number;
    mandatory: boolean;
    publishedAt: string;
}

export interface AppCategory {
    id: string;
    name: string;
    displayName: string;
    description: string;
    icon: string;
    subcategories?: AppCategory[];
    featured?: boolean;
    appCount?: number;
}

export interface MarketplaceApp extends AppMetadata {
    installUrl: string;
    sourceUrl?: string;
    developer: {
        name: string;
        email?: string;
        website?: string;
        verified: boolean;
        rating: number;
    };
    security: SecurityInfo;
    reviews: AppReview[];
}

export interface SecurityInfo {
    verified: boolean;
    scanDate?: string;
    threats: string[];
    permissions: AppPermission[];
    sandbox: SandboxConfig;
    signature?: string;
}

export interface SandboxConfig {
    enabled: boolean;
    type: 'full' | 'partial' | 'none';
    restrictions: string[];
    allowedPaths?: string[];
    networkAccess?: boolean;
    systemAccess?: boolean;
}

export interface AppReview {
    id: string;
    userId: string;
    username: string;
    rating: number;
    title: string;
    content: string;
    version: string;
    createdAt: string;
    helpful: number;
    verified: boolean;
}

export interface MarketplaceSearchResult {
    apps: MarketplaceApp[];
    categories: AppCategory[];
    total: number;
    page: number;
    pageSize: number;
    facets: SearchFacet[];
}

export interface SearchFacet {
    field: string;
    values: FacetValue[];
}

export interface FacetValue {
    value: string;
    count: number;
}

export interface InstallationProgress {
    appId: string;
    stage: 'downloading' | 'extracting' | 'installing' | 'configuring' | 'completed' | 'error';
    progress: number;
    message: string;
    error?: string;
}

export interface AppSandbox {
    id: string;
    appId: string;
    type: 'iframe' | 'webview' | 'process' | 'container';
    config: SandboxConfig;
    isActive: boolean;
    allowedPermissions: string[];
    resourceLimits: ResourceLimits;
}

export interface ResourceLimits {
    memory?: number;
    cpu?: number;
    disk?: number;
    network?: number;
    processes?: number;
}

export interface DeveloperTools {
    appId: string;
    manifest: AppManifest;
    tools: {
        debugger: boolean;
        console: boolean;
        inspector: boolean;
        profiler: boolean;
        editor: boolean;
    };
    capabilities: {
        fileAccess: boolean;
        networkAccess: boolean;
        systemAccess: boolean;
        debugEndpoint: string;
    };
}

// API Request/Response Types
export interface InstallAppRequest {
    url?: string;
    manifestId?: string;
    version?: string;
    permissions?: string[];
    sandboxOptions?: Partial<SandboxConfig>;
}

export interface InstallAppResponse {
    appId: string;
    sessionId: string;
    estimatedTime: number;
    steps: string[];
}

export interface MarketplaceConfig {
    enabled: boolean;
    sources: MarketplaceSource[];
    security: SecurityConfig;
    autoUpdate: boolean;
    updateInterval: number;
    cacheTimeout: number;
}

export interface MarketplaceSource {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    trusted: boolean;
    priority: number;
    lastSync?: string;
    appCount?: number;
}

export interface SecurityConfig {
    requireSignature: boolean;
    scanForMalware: boolean;
    sandboxByDefault: boolean;
    allowedPermissions: string[];
    blockedPermissions: string[];
    trustedDevelopers: string[];
}

// Module System Types
export interface AppModule {
    id: string;
    name: string;
    version: string;
    exports: ModuleExport[];
    imports: ModuleImport[];
    type: 'component' | 'service' | 'library' | 'plugin';
    sandboxed: boolean;
}

export interface ModuleExport {
    name: string;
    type: 'function' | 'class' | 'object' | 'constant';
    api?: string;
    description?: string;
}

export interface ModuleImport {
    module: string;
    version?: string;
    alias?: string;
    required: boolean;
}

// Error Types
export interface AppError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
}

// Event Types
export interface AppEvent {
    type: 'install' | 'uninstall' | 'launch' | 'close' | 'update' | 'error';
    appId: string;
    timestamp: string;
    data?: Record<string, unknown>;
}