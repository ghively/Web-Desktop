import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, Download, Star, Shield, Filter, Grid, List,
    Package, ExternalLink, AlertCircle, CheckCircle, XCircle,
    RefreshCw, Trash2,
    FileText, Code, Palette, Gamepad2, Briefcase, GraduationCap, Globe,
    Settings, Wrench, Play
} from 'lucide-react';
import {
    MarketplaceApp, AppCategory, InstalledApp, InstallationProgress
} from '../types/applications';
import { AppInstaller } from './AppInstaller';
import { useSettings } from '../context/exports';

export const Marketplace = () => {
    const { settings } = useSettings();

    // State management
    const [apps, setApps] = useState<MarketplaceApp[]>([]);
    const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
    const [categories, setCategories] = useState<AppCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<'name' | 'rating' | 'downloads' | 'updated'>('name');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedApp, setSelectedApp] = useState<MarketplaceApp | null>(null);
    const [showInstaller, setShowInstaller] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [activeTab, setActiveTab] = useState<'browse' | 'installed' | 'updates'>('browse');
    const [installations] = useState<Record<string, InstallationProgress>>({});

    // Category icons mapping
    const categoryIcons: Record<string, unknown> = {
        productivity: Briefcase,
        development: Code,
        multimedia: Play,
        games: Gamepad2,
        education: GraduationCap,
        utilities: Wrench,
        system: Settings,
        graphics: Palette,
        network: Globe,
        office: FileText
    };

    // Fetch apps from marketplace
    const fetchApps = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '12',
                sort: sortBy,
                ...(selectedCategory !== 'all' && { category: selectedCategory }),
                ...(searchQuery && { search: searchQuery })
            });

            const response = await fetch(`${settings.backend.apiUrl}/api/marketplace/apps?${params}`);

            if (!response.ok) {
                throw new Error('Failed to fetch apps');
            }

            const data = await response.json();
            setApps(data.apps);
            setTotalPages(Math.ceil(data.total / 12));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch apps');
            setApps([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, selectedCategory, sortBy, searchQuery, settings.backend.apiUrl]);

    // Fetch installed apps
    const fetchInstalledApps = useCallback(async () => {
        try {
            const response = await fetch(`${settings.backend.apiUrl}/api/marketplace/installed`);
            if (response.ok) {
                const data = await response.json();
                setInstalledApps(data.apps);
            }
        } catch (error) {
            console.error('Failed to fetch installed apps:', error);
        }
    }, [settings.backend.apiUrl]);

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch(`${settings.backend.apiUrl}/api/marketplace/categories`);
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    }, [settings.backend.apiUrl]);

    // Install app
    const handleInstallApp = (app: MarketplaceApp) => {
        setSelectedApp(app);
        setShowInstaller(true);
    };

    // Uninstall app
    const handleUninstallApp = async (appId: string) => {
        if (!confirm('Are you sure you want to uninstall this app?')) {
            return;
        }

        try {
            const response = await fetch(`${settings.backend.apiUrl}/api/marketplace/apps/${appId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchInstalledApps();
                await fetchApps();
            } else {
                throw new Error('Failed to uninstall app');
            }
        } catch (error) {
            alert('Failed to uninstall app: ' + error);
        }
    };

    // Check for updates
    const checkForUpdates = async (appId: string) => {
        try {
            const response = await fetch(`${settings.backend.apiUrl}/api/marketplace/apps/${appId}/updates`);
            if (response.ok) {
                const data = await response.json();
                if (data.hasUpdates) {
                    alert(`Update available: ${data.latestVersion}`);
                } else {
                    alert('App is up to date');
                }
            }
        } catch {
            alert('Failed to check for updates');
        }
    };

    // Initialize data
    useEffect(() => {
        fetchApps();
        fetchInstalledApps();
        fetchCategories();
    }, [currentPage, selectedCategory, sortBy, searchQuery, fetchApps, fetchCategories, fetchInstalledApps]);

    // Auto-refresh installation progress
    useEffect(() => {
        const interval = setInterval(() => {
            Object.keys(installations).forEach(() => {
                // Check installation status
            });
        }, 2000);

        return () => clearInterval(interval);
    }, [installations]);

    // Render app card
    const renderAppCard = (app: MarketplaceApp) => {
        const isInstalled = installedApps.some(installed => installed.id === app.id);
        const CategoryIcon = categoryIcons[app.category] || Package;
        const isInstalling = Object.values(installations).some(inst => inst.appId === app.id);

        return (
            <div
                key={app.id}
                className="group bg-gray-800/80 rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer hover:bg-gray-800 backdrop-blur-sm transform hover:-translate-y-1"
                onClick={() => setSelectedApp(app)}
                role="button"
                tabIndex={0}
                aria-label={`Install ${app.name}`}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedApp(app);
                    }
                }}
            >
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* App Header */}
                <div className="p-4 relative">
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gray-700/80 group-hover:bg-gray-600/80 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                            {app.icon ? (
                                <img src={app.icon} alt={app.name} className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
                            ) : (
                                <CategoryIcon size={24} className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-100 truncate group-hover:text-white transition-colors duration-300">{app.name}</h3>
                                {app.security.verified && (
                                    <Shield size={16} className="text-green-400 flex-shrink-0 group-hover:text-green-300 transition-colors duration-300" />
                                )}
                            </div>

                            <p className="text-sm text-gray-400 line-clamp-2 group-hover:text-gray-300 transition-colors duration-300">{app.description}</p>

                            <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1">
                                    <Star size={14} className="text-yellow-400 fill-current group-hover:text-yellow-300 transition-colors duration-300" />
                                    <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{app.rating.toFixed(1)}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Download size={14} className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300" />
                                    <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{app.downloadCount}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Package size={14} className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300" />
                                    <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{(app.size / 1024 / 1024).toFixed(1)}MB</span>
                                </div>
                            </div>

                            {/* Tags */}
                            {app.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {app.tags.slice(0, 3).map(tag => (
                                        <span
                                            key={tag}
                                            className="px-2 py-1 bg-gray-700/80 group-hover:bg-gray-600/80 text-xs text-gray-300 group-hover:text-gray-200 rounded transition-all duration-300"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                    {app.tags.length > 3 && (
                                        <span className="px-2 py-1 bg-gray-700/80 group-hover:bg-gray-600/80 text-xs text-gray-300 group-hover:text-gray-200 rounded transition-all duration-300">
                                            +{app.tags.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 bg-gray-900/90 group-hover:bg-gray-900/80 border-t border-gray-700 transition-all duration-300">
                    {isInstalling ? (
                        <div className="flex items-center gap-2 text-blue-400">
                            <RefreshCw size={16} className="animate-spin" />
                            <span className="text-sm">Installing...</span>
                        </div>
                    ) : isInstalled ? (
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Launch app
                                }}
                                className="flex-1 px-3 py-1 bg-green-600/80 hover:bg-green-600 text-white text-sm rounded transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-600/20 flex items-center justify-center gap-1"
                                aria-label={`Launch ${app.name}`}
                            >
                                <Play size={14} />
                                Launch
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    checkForUpdates(app.id);
                                }}
                                className="px-3 py-1 bg-blue-600/80 hover:bg-blue-600 text-white text-sm rounded transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-600/20"
                                aria-label={`Check updates for ${app.name}`}
                            >
                                <RefreshCw size={14} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleUninstallApp(app.id);
                                }}
                                className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white text-sm rounded transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-600/20"
                                aria-label={`Uninstall ${app.name}`}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleInstallApp(app);
                            }}
                            className="w-full px-3 py-1 bg-blue-600/80 hover:bg-blue-600 text-white text-sm rounded transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-600/20 flex items-center justify-center gap-2"
                            aria-label={`Install ${app.name}`}
                        >
                            <Download size={14} />
                            Install
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // App detail modal
    const renderAppDetail = () => {
        if (!selectedApp) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-700">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
                                {selectedApp.icon ? (
                                    <img src={selectedApp.icon} alt={selectedApp.name} className="w-12 h-12" />
                                ) : (
                                    <Package size={32} className="text-gray-400" />
                                )}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-gray-100">{selectedApp.name}</h2>
                                    {selectedApp.security.verified && (
                                        <Shield size={20} className="text-green-400" />
                                    )}
                                </div>

                                <p className="text-gray-400 mt-1">{selectedApp.description}</p>

                                <div className="flex items-center gap-4 mt-3">
                                    <div className="flex items-center gap-1">
                                        <Star size={16} className="text-yellow-400 fill-current" />
                                        <span className="text-gray-300">{selectedApp.rating.toFixed(1)}</span>
                                        <span className="text-gray-500">({selectedApp.reviewCount} reviews)</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Download size={16} className="text-gray-400" />
                                        <span className="text-gray-300">{selectedApp.downloadCount.toLocaleString()} downloads</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Package size={16} className="text-gray-400" />
                                        <span className="text-gray-300">{(selectedApp.size / 1024 / 1024).toFixed(1)}MB</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                                    <span>Version {selectedApp.version}</span>
                                    <span>•</span>
                                    <span>By {selectedApp.author.name}</span>
                                    <span>•</span>
                                    <span>{selectedApp.license}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedApp(null)}
                                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <XCircle size={20} className="text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-3 gap-6">
                            {/* Main Content */}
                            <div className="col-span-2 space-y-6">
                                {/* Screenshots */}
                                {selectedApp.screenshots.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-100 mb-3">Screenshots</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedApp.screenshots.map((screenshot, index) => (
                                                <img
                                                    key={index}
                                                    src={screenshot}
                                                    alt={`Screenshot ${index + 1}`}
                                                    className="w-full h-48 object-cover rounded-lg border border-gray-700"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-100 mb-3">Description</h3>
                                    <p className="text-gray-400 whitespace-pre-wrap">{selectedApp.description}</p>
                                </div>

                                {/* Permissions */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-100 mb-3">Permissions</h3>
                                    <div className="space-y-2">
                                        {selectedApp.permissions.map(permission => (
                                            <div key={permission.id} className="flex items-center gap-2">
                                                {permission.required ? (
                                                    <AlertCircle size={16} className="text-orange-400" />
                                                ) : (
                                                    <CheckCircle size={16} className="text-green-400" />
                                                )}
                                                <div>
                                                    <span className="text-gray-300">{permission.name}</span>
                                                    <p className="text-sm text-gray-500">{permission.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Dependencies */}
                                {selectedApp.dependencies.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-100 mb-3">Dependencies</h3>
                                        <div className="space-y-2">
                                            {selectedApp.dependencies.map(dep => (
                                                <div key={dep.name} className="flex items-center gap-2">
                                                    <Package size={16} className="text-gray-400" />
                                                    <span className="text-gray-300">
                                                        {dep.name} ({dep.version})
                                                    </span>
                                                    {dep.required && (
                                                        <span className="px-2 py-1 bg-red-900 text-red-300 text-xs rounded">
                                                            Required
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Actions */}
                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            handleInstallApp(selectedApp);
                                            setSelectedApp(null);
                                        }}
                                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Download size={16} />
                                        Install App
                                    </button>

                                    {selectedApp.homepage && (
                                        <a
                                            href={selectedApp.homepage}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={16} />
                                            Website
                                        </a>
                                    )}

                                    {selectedApp.repository && (
                                        <a
                                            href={selectedApp.repository}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Code size={16} />
                                            Source Code
                                        </a>
                                    )}
                                </div>

                                {/* Categories */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Category</h4>
                                    <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg">
                                        {selectedApp.category}
                                    </span>
                                </div>

                                {/* Tags */}
                                {selectedApp.tags.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Tags</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedApp.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-1 bg-gray-800 text-gray-300 text-sm rounded"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Security Info */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Security</h4>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex items-center gap-2">
                                            {selectedApp.security.verified ? (
                                                <CheckCircle size={14} className="text-green-400" />
                                            ) : (
                                                <XCircle size={14} className="text-red-400" />
                                            )}
                                            <span className="text-gray-300">
                                                {selectedApp.security.verified ? 'Verified' : 'Not Verified'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className="text-blue-400" />
                                            <span className="text-gray-300">
                                                {selectedApp.security.sandbox.type} sandbox
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Header */}
            <div className="border-b border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold text-gray-100">Application Marketplace</h1>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-lg transition-colors ${
                                showFilters ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-800 text-gray-400'
                            }`}
                        >
                            <Filter size={18} />
                        </button>

                        <div className="flex items-center bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded transition-colors ${
                                    viewMode === 'grid' ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded transition-colors ${
                                    viewMode === 'list' ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search for apps..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-800 text-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-4 mt-4">
                    {['browse', 'installed', 'updates'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as 'browse' | 'installed' | 'updates')}
                            className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                                activeTab === tab
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="border-b border-gray-700 p-4 bg-gray-800/50">
                    <div className="grid grid-cols-4 gap-4">
                        {/* Category Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Categories</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.displayName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sort By */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'name' | 'rating' | 'downloads' | 'updated')}
                                className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="name">Name</option>
                                <option value="rating">Rating</option>
                                <option value="downloads">Downloads</option>
                                <option value="updated">Recently Updated</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="relative">
                                <RefreshCw size={48} className="text-blue-400 animate-spin mb-4" />
                                <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" />
                            </div>
                            <p className="text-gray-300 font-medium">Loading Marketplace</p>
                            <p className="text-gray-500 text-sm mt-1">Fetching latest applications...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center max-w-md">
                            <div className="relative mb-4">
                                <AlertCircle size={64} className="text-red-400 mx-auto" />
                                <div className="absolute inset-0 bg-red-400/10 rounded-full animate-pulse" />
                            </div>
                            <h3 className="text-red-400 font-semibold text-lg mb-2">Failed to Load</h3>
                            <p className="text-gray-400 mb-4">{error}</p>
                            <button
                                onClick={fetchApps}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                            >
                                <RefreshCw size={16} />
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : activeTab === 'browse' && apps.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <Package size={64} className="text-gray-500 mx-auto mb-4" />
                            <h3 className="text-gray-400 font-semibold text-lg mb-2">No Applications Found</h3>
                            <p className="text-gray-500">Try adjusting your search or filters</p>
                        </div>
                    </div>
                ) : activeTab === 'browse' ? (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                        {apps.map(renderAppCard)}
                    </div>
                ) : activeTab === 'installed' ? (
                    <div className="space-y-4">
                        {installedApps.length > 0 ? (
                            installedApps.map((app) => (
                                <div key={app.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                                                <Package size={20} className="text-gray-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-100">{app.manifest.name}</h3>
                                                <p className="text-sm text-gray-400">{app.manifest.description}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => checkForUpdates(app.id)}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                                            >
                                                <RefreshCw size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleUninstallApp(app.id)}
                                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                No installed apps found
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        Updates feature coming soon
                    </div>
                )}

                {/* Pagination */}
                {activeTab === 'browse' && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
                        >
                            Previous
                        </button>

                        <span className="text-gray-400">
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* App Detail Modal */}
            {renderAppDetail()}

            {/* App Installer Modal */}
            {showInstaller && selectedApp && (
                <AppInstaller
                    app={selectedApp}
                    onClose={() => {
                        setShowInstaller(false);
                        setSelectedApp(null);
                    }}
                    onInstallComplete={() => {
                        setShowInstaller(false);
                        setSelectedApp(null);
                        fetchInstalledApps();
                        fetchApps();
                    }}
                    backendUrl={settings.backend.apiUrl}
                />
            )}
        </div>
    );
};
