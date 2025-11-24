import React, { useState, useEffect, useRef } from 'react';
import {
    Download, CheckCircle, XCircle, AlertCircle, Shield, Package,
    Settings, FileText, ChevronRight, ChevronDown, HardDrive, Globe, Lock
} from 'lucide-react';
import { MarketplaceApp, SandboxConfig } from '../types/applications';
import { useAccessibility } from '../utils/accessibility';

interface AppInstallerProps {
    app: MarketplaceApp;
    onClose: () => void;
    onInstallComplete: () => void;
    backendUrl: string;
}

export const AppInstaller = ({ app, onClose, onInstallComplete, backendUrl }: AppInstallerProps) => {
    const [stage, setStage] = useState<'review' | 'downloading' | 'installing' | 'completed' | 'error'>('review');
    const { announceStatus, getProgressProps, getModalProps } = useAccessibility();
    const modalRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        permissions: false,
        dependencies: false,
        security: false,
        sandbox: false
    });
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [sandboxConfig, setSandboxConfig] = useState<SandboxConfig>({
        enabled: true,
        type: 'partial',
        restrictions: ['no-system-access', 'limited-network'],
        allowedPaths: [],
        networkAccess: false,
        systemAccess: false
    });

    // Initialize permissions and focus management
    useEffect(() => {
        const initialPermissions: Record<string, boolean> = {};
        app.permissions.forEach(perm => {
            initialPermissions[perm.id] = perm.required;
        });
        setPermissions(initialPermissions);

        // Focus trap for modal
        if (modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ) as NodeListOf<HTMLElement>;

            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }

            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    if (stage === 'review' || stage === 'error') {
                        onClose();
                    }
                }

                if (event.key === 'Tab') {
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    if (event.shiftKey && document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    } else if (!event.shiftKey && document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement.focus();
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [app.permissions, onClose, stage]);

    // Poll installation progress
    useEffect(() => {
        if (!sessionId) return;

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${backendUrl}/api/marketplace/install/${sessionId}`);
                const data = await response.json();

                if (data.status === 'completed') {
                    setStage('completed');
                    setProgress(100);
                    setMessage('Installation completed successfully');
                    announceStatus('Installation completed successfully!', 'assertive');
                    clearInterval(interval);
                    setTimeout(() => onInstallComplete(), 2000);
                } else if (data.status === 'error') {
                    setStage('error');
                    setError(data.message || 'Installation failed');
                    announceStatus('Installation failed', 'assertive');
                    clearInterval(interval);
                } else {
                    setStage('installing');
                    setMessage(data.message || 'Installing...');
                    // Use functional update to avoid dependency on progress state
                    setProgress(prevProgress => {
                        const newProgress = data.progress || prevProgress;
                        announceStatus(`Installation in progress: ${newProgress}%`);
                        return newProgress;
                    });
                }
            } catch (error) {
                console.error('Failed to check installation status:', error);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [sessionId, backendUrl, onInstallComplete, announceStatus]);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handlePermissionChange = (permissionId: string, granted: boolean) => {
        setPermissions(prev => ({
            ...prev,
            [permissionId]: granted
        }));
    };

    const startInstallation = async () => {
        try {
            setStage('downloading');
            setProgress(0);
            setMessage('Starting installation...');

            // Prepare installation request
            const installRequest = {
                url: app.installUrl,
                permissions: Object.keys(permissions).filter(id => permissions[id]),
                sandboxOptions: sandboxConfig
            };

            const response = await fetch(`${backendUrl}/api/marketplace/install`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(installRequest)
            });

            if (!response.ok) {
                throw new Error('Failed to start installation');
            }

            const data = await response.json();
            setSessionId(data.sessionId);

            // Simulate download progress
            let downloadProgress = 0;
            const downloadInterval = setInterval(() => {
                downloadProgress += 10;
                setProgress(downloadProgress);

                if (downloadProgress >= 90) {
                    clearInterval(downloadInterval);
                    setStage('installing');
                    setMessage('Installing application...');
                }
            }, 500);

        } catch (error) {
            setStage('error');
            setError(error instanceof Error ? error.message : 'Installation failed');
        }
    };

    const getPermissionIcon = (type: string) => {
        switch (type) {
            case 'file-system': return <FileText size={16} className="text-blue-400" />;
            case 'network': return <Globe size={16} className="text-green-400" />;
            case 'system': return <Settings size={16} className="text-orange-400" />;
            case 'hardware': return <HardDrive size={16} className="text-purple-400" />;
            default: return <Lock size={16} className="text-gray-400" />;
        }
    };

    const getPermissionTypeColor = (type: string) => {
        switch (type) {
            case 'file-system': return 'text-blue-400 border-blue-400/20 bg-blue-400/10';
            case 'network': return 'text-green-400 border-green-400/20 bg-green-400/10';
            case 'system': return 'text-orange-400 border-orange-400/20 bg-orange-400/10';
            case 'hardware': return 'text-purple-400 border-purple-400/20 bg-purple-400/10';
            default: return 'text-gray-400 border-gray-400/20 bg-gray-400/10';
        }
    };

    const hasRequiredPermissions = app.permissions.filter(p => p.required).every(p => permissions[p.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay">
            <div
                ref={modalRef}
                className="w-full max-w-2xl bg-gray-900 rounded-xl border border-gray-700 overflow-hidden modal-content"
                {...getModalProps(`Install ${app.name}`, 'installer-title')}
            >
                {/* Header */}
                <div className="border-b border-gray-700 p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                            {app.icon ? (
                                <img src={app.icon} alt={app.name} className="w-8 h-8" />
                            ) : (
                                <Package size={24} className="text-gray-400" />
                            )}
                        </div>

                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-100">Install {app.name}</h2>
                            <p className="text-gray-400">{app.description}</p>

                            <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                                <span>Version {app.version}</span>
                                <span>•</span>
                                <span>{(app.size / 1024 / 1024).toFixed(1)}MB</span>
                                <span>•</span>
                                <span>{app.license}</span>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            disabled={stage === 'downloading' || stage === 'installing'}
                        >
                            <XCircle size={20} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Installation Progress */}
                {(stage === 'downloading' || stage === 'installing' || stage === 'completed') && (
                    <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="relative">
                                {stage === 'downloading' && (
                                    <div className="p-3 bg-blue-500/20 rounded-full animate-pulse">
                                        <Download size={24} className="text-blue-400" />
                                    </div>
                                )}
                                {stage === 'installing' && (
                                    <div className="p-3 bg-yellow-500/20 rounded-full animate-pulse">
                                        <Package size={24} className="text-yellow-400 animate-spin" />
                                    </div>
                                )}
                                {stage === 'completed' && (
                                    <div className="p-3 bg-green-500/20 rounded-full">
                                        <CheckCircle size={24} className="text-green-400" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-base font-semibold text-white capitalize">
                                        {stage === 'completed' ? 'Installation Complete' : stage}
                                    </span>
                                    <span className="text-lg font-bold text-white bg-gray-800/50 px-3 py-1 rounded-full">
                                        {progress}%
                                    </span>
                                </div>

                                <div className="relative" {...getProgressProps(progress, 100, `${stage} progress`)}>
                                    <div className="w-full bg-gray-700/80 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                                        <div
                                            className={`h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden progress-enhanced ${
                                                stage === 'completed' ? 'bg-gradient-to-r from-green-500 to-green-400' :
                                                stage === 'installing' ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                                                'bg-gradient-to-r from-blue-500 to-purple-400'
                                            }`}
                                            style={{ width: `${progress}%` }}
                                            aria-hidden="true"
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse shimmer" />
                                        </div>
                                    </div>

                                    {/* Progress milestones */}
                                    <div className="absolute inset-0 flex items-center px-1">
                                        <div className="w-full flex justify-between">
                                            {[25, 50, 75].map(milestone => (
                                                <div
                                                    key={milestone}
                                                    className={`h-1 w-px bg-gray-600 transition-opacity duration-300 ${
                                                        progress >= milestone ? 'opacity-0' : 'opacity-50'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {message && (
                                    <div className="mt-3 p-2 bg-gray-800/60 rounded-lg">
                                        <p className="text-sm text-gray-200 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                            {message}
                                        </p>
                                    </div>
                                )}

                                {/* Additional progress details */}
                                <div className="mt-2 flex items-center justify-between text-xs">
                                    <span className="text-gray-400">
                                        {stage === 'downloading' && 'Downloading package...'}
                                        {stage === 'installing' && 'Installing components...'}
                                        {stage === 'completed' && 'Ready to launch!'}
                                    </span>
                                    <span className="text-gray-500">
                                        {Math.round(progress * 1.5)}s elapsed
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {stage === 'error' && (
                    <div className="p-6 border-b border-gray-700">
                        <div className="flex items-center gap-3">
                            <XCircle size={20} className="text-red-400" />
                            <div>
                                <p className="text-sm font-medium text-red-400">Installation Failed</p>
                                <p className="text-sm text-gray-400">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Review Stage */}
                {stage === 'review' && (
                    <div className="flex-1 overflow-y-auto">
                        {/* Security Status */}
                        <div className="p-6 border-b border-gray-700">
                            <div className="flex items-center gap-3">
                                {app.security.verified ? (
                                    <CheckCircle size={20} className="text-green-400" />
                                ) : (
                                    <AlertCircle size={20} className="text-yellow-400" />
                                )}

                                <div className="flex-1">
                                    <span className="text-sm font-medium text-gray-100">
                                        {app.security.verified ? 'Verified Application' : 'Unverified Application'}
                                    </span>
                                    <p className="text-xs text-gray-400">
                                        {app.security.verified
                                            ? 'This app has been verified for security and quality'
                                            : 'This app has not been verified - install with caution'
                                        }
                                    </p>
                                </div>

                                <Shield size={20} className="text-blue-400" />
                            </div>

                            {app.security.threats.length > 0 && (
                                <div className="mt-3 p-3 bg-red-900/20 border border-red-400/20 rounded-lg">
                                    <p className="text-sm text-red-400">
                                        Security warnings detected: {app.security.threats.join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Permissions */}
                        <div className="p-6 border-b border-gray-700">
                            <button
                                onClick={() => toggleSection('permissions')}
                                className="w-full flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-2">
                                    <Lock size={18} className="text-gray-400" />
                                    <span className="font-medium text-gray-100">Permissions</span>
                                    <span className="text-sm text-gray-400">
                                        ({Object.values(permissions).filter(Boolean).length} granted)
                                    </span>
                                </div>
                                {expandedSections.permissions ? (
                                    <ChevronDown size={18} className="text-gray-400" />
                                ) : (
                                    <ChevronRight size={18} className="text-gray-400" />
                                )}
                            </button>

                            {expandedSections.permissions && (
                                <div className="mt-4 space-y-3">
                                    {app.permissions.map(permission => (
                                        <div
                                            key={permission.id}
                                            className={`p-3 rounded-lg border ${getPermissionTypeColor(permission.type)}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="pt-1">
                                                    {getPermissionIcon(permission.type)}
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-gray-100">
                                                            {permission.name}
                                                        </span>

                                                        {!permission.required && (
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={permissions[permission.id] || false}
                                                                    onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                            </label>
                                                        )}
                                                    </div>

                                                    <p className="text-sm text-gray-300 mt-1">{permission.description}</p>

                                                    {permission.required && (
                                                        <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded">
                                                            <AlertCircle size={12} />
                                                            Required
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Dependencies */}
                        {app.dependencies.length > 0 && (
                            <div className="p-6 border-b border-gray-700">
                                <button
                                    onClick={() => toggleSection('dependencies')}
                                    className="w-full flex items-center justify-between text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <Package size={18} className="text-gray-400" />
                                        <span className="font-medium text-gray-100">Dependencies</span>
                                        <span className="text-sm text-gray-400">({app.dependencies.length})</span>
                                    </div>
                                    {expandedSections.dependencies ? (
                                        <ChevronDown size={18} className="text-gray-400" />
                                    ) : (
                                        <ChevronRight size={18} className="text-gray-400" />
                                    )}
                                </button>

                                {expandedSections.dependencies && (
                                    <div className="mt-4 space-y-2">
                                        {app.dependencies.map(dep => (
                                            <div key={dep.name} className="flex items-center justify-between p-2">
                                                <div className="flex items-center gap-2">
                                                    <Package size={16} className="text-gray-400" />
                                                    <div>
                                                        <span className="text-gray-100">{dep.name}</span>
                                                        <span className="text-gray-400 ml-2">{dep.version}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {dep.required ? (
                                                        <span className="px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded">
                                                            Required
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                                                            Optional
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sandbox Configuration */}
                        <div className="p-6 border-b border-gray-700">
                            <button
                                onClick={() => toggleSection('sandbox')}
                                className="w-full flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-2">
                                    <Shield size={18} className="text-gray-400" />
                                    <span className="font-medium text-gray-100">Sandbox Configuration</span>
                                </div>
                                {expandedSections.sandbox ? (
                                    <ChevronDown size={18} className="text-gray-400" />
                                ) : (
                                    <ChevronRight size={18} className="text-gray-400" />
                                )}
                            </button>

                            {expandedSections.sandbox && (
                                <div className="mt-4 space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Sandbox Type
                                        </label>
                                        <select
                                            value={sandboxConfig.type}
                                            onChange={(e) => setSandboxConfig(prev => ({
                                                ...prev,
                                                type: e.target.value as 'full' | 'partial' | 'none'
                                            }))}
                                            className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="full">Full Isolation</option>
                                            <option value="partial">Partial Isolation</option>
                                            <option value="none">No Isolation (Not Recommended)</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={sandboxConfig.networkAccess}
                                                onChange={(e) => setSandboxConfig(prev => ({
                                                    ...prev,
                                                    networkAccess: e.target.checked
                                                }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                        <span className="text-sm text-gray-300">Allow Network Access</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={sandboxConfig.systemAccess}
                                                onChange={(e) => setSandboxConfig(prev => ({
                                                    ...prev,
                                                    systemAccess: e.target.checked
                                                }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                        <span className="text-sm text-gray-300">Allow System Access</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Installation Summary */}
                        <div className="p-6 bg-gray-800/50">
                            <h4 className="font-medium text-gray-100 mb-3">Installation Summary</h4>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Application Size:</span>
                                    <span className="text-gray-300">{(app.size / 1024 / 1024).toFixed(1)}MB</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Permissions Granted:</span>
                                    <span className="text-gray-300">
                                        {Object.values(permissions).filter(Boolean).length} of {app.permissions.length}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Sandbox Level:</span>
                                    <span className="text-gray-300 capitalize">{sandboxConfig.type}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-400">Dependencies:</span>
                                    <span className="text-gray-300">{app.dependencies.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="p-6 border-t border-gray-700 flex items-center justify-between">
                    <div>
                        {stage === 'review' && !hasRequiredPermissions && (
                            <p className="text-sm text-orange-400">
                                Some required permissions are not granted
                            </p>
                        )}
                        {stage === 'error' && (
                            <button
                                onClick={() => setStage('review')}
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                Try Again
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={stage === 'downloading' || stage === 'installing'}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>

                        {stage === 'review' && (
                            <button
                                onClick={startInstallation}
                                disabled={!hasRequiredPermissions}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Download size={16} />
                                Install
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};