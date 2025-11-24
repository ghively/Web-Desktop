import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useWindowManager, useAppLauncher } from '../context/exports';
import {
    // Navigation icons
    Home, Grid3X3, Wrench, Code, Search, Settings,
    // System tray icons
    Wifi, HardDrive, Bell, Battery, Cpu, Activity, Shield,
    // Quick action icons
    Plus, Terminal, Folder, FileText, Zap, Download,
    // Calendar icons
    Calendar, Clock,
    // UI icons
    ChevronDown, X, Minimize2, Maximize2,
    // Other
    User, LogOut
} from 'lucide-react';

// Lazy load components for better performance
const TerminalComponent = lazy(() => import('./Terminal').then(m => ({ default: m.TerminalComponent })));
const FileManager = lazy(() => import('./FileManager').then(m => ({ default: m.FileManager })));
const Notes = lazy(() => import('./Notes').then(m => ({ default: m.Notes })));
const SettingsComponent = lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
const ControlPanel = lazy(() => import('./ControlPanel').then(m => ({ default: m.ControlPanel })));
const ContainerManager = lazy(() => import('./ContainerManager').then(m => ({ default: m.ContainerManager })));
const Monitoring = lazy(() => import('./Monitoring').then(m => ({ default: m.Monitoring })));
const AIIntegration = lazy(() => import('./AIIntegration').then(m => ({ default: m.AIIntegration })));

// Types
interface SystemStatus {
    cpu: number;
    memory: number;
    storage: number;
    network: 'connected' | 'disconnected' | 'weak';
    battery: number | null;
    notifications: number;
}

interface QuickAction {
    id: string;
    label: string;
    icon: React.ElementType;
    action: () => void;
    category: 'system' | 'apps' | 'files' | 'development';
}

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    time: Date;
    type: 'info' | 'warning' | 'error' | 'success';
    read: boolean;
}

// Sub-components

const ApplicationMenu: React.FC<{
    isVisible: boolean;
    onClose: () => void;
    onLaunchApp: (appId: string) => void;
}> = ({ isVisible, onClose, onLaunchApp }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    const appCategories = [
        {
            name: 'System Tools',
            icon: Wrench,
            apps: [
                { id: 'terminal', name: 'Terminal', icon: Terminal, description: 'System command line' },
                { id: 'files', name: 'File Manager', icon: Folder, description: 'Browse files' },
                { id: 'settings', name: 'Settings', icon: Settings, description: 'System configuration' },
                { id: 'control-panel', name: 'Control Panel', icon: Settings, description: 'System management' },
            ]
        },
        {
            name: 'Applications',
            icon: Grid3X3,
            apps: [
                { id: 'notes', name: 'Notes', icon: FileText, description: 'Markdown notes' },
                { id: 'containers', name: 'Containers', icon: HardDrive, description: 'Docker management' },
                { id: 'monitoring', name: 'Monitoring', icon: Activity, description: 'System monitoring' },
                { id: 'ai', name: 'AI Integration', icon: Zap, description: 'AI tools' },
            ]
        },
        {
            name: 'Development',
            icon: Code,
            apps: [
                { id: 'dev-tools', name: 'Developer Tools', icon: Code, description: 'Development utilities' },
                { id: 'vnc', name: 'VNC Client', icon: Terminal, description: 'Remote desktop' },
                { id: 'proxy', name: 'Proxy Manager', icon: Wifi, description: 'Nginx proxy' },
            ]
        }
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div
            ref={menuRef}
            className="fixed top-12 left-2 right-2 sm:left-4 sm:right-auto w-full sm:w-96 max-w-xs sm:max-w-md bg-gray-800/95 backdrop-blur-lg border border-gray-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto"
        >
            <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-100">Applications</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors p-1 hover:bg-gray-700/50 rounded"
                        aria-label="Close menu"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                    {appCategories.map((category) => (
                        <div key={category.name}>
                            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-300">
                                <category.icon size={14} className="flex-shrink-0" />
                                <span className="truncate">{category.name}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 ml-4 sm:ml-6">
                                {category.apps.map((app) => (
                                    <button
                                        key={app.id}
                                        onClick={() => {
                                            onLaunchApp(app.id);
                                            onClose();
                                        }}
                                        className="flex items-center gap-2 p-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                                        title={app.name}
                                    >
                                        <app.icon size={16} className="text-blue-400 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium truncate">{app.name}</div>
                                            <div className="text-xs text-gray-500 truncate hidden sm:block">{app.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const QuickActionsPanel: React.FC<{
    isVisible: boolean;
    onClose: () => void;
    onAction: (action: string) => void;
}> = ({ isVisible, onClose, onAction }) => {
    const panelRef = useRef<HTMLDivElement>(null);

    const quickActions: QuickAction[] = [
        { id: 'new-terminal', label: 'New Terminal', icon: Terminal, action: () => onAction('terminal'), category: 'system' },
        { id: 'new-file', label: 'New File', icon: FileText, action: () => onAction('new-file'), category: 'files' },
        { id: 'file-browser', label: 'File Browser', icon: Folder, action: () => onAction('files'), category: 'files' },
        { id: 'system-monitor', label: 'System Monitor', icon: Activity, action: () => onAction('monitoring'), category: 'system' },
        { id: 'app-store', label: 'App Store', icon: Download, action: () => onAction('marketplace'), category: 'apps' },
        { id: 'ai-assistant', label: 'AI Assistant', icon: Zap, action: () => onAction('ai'), category: 'apps' },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div
            ref={panelRef}
            className="fixed top-12 left-2 right-2 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 w-full sm:w-80 max-w-xs sm:max-w-none bg-gray-800/95 backdrop-blur-lg border border-gray-700 rounded-lg shadow-2xl z-50"
        >
            <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-100">Quick Actions</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors p-1 hover:bg-gray-700/50 rounded"
                        aria-label="Close quick actions"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => {
                                action.action();
                                onClose();
                            }}
                            className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 text-center text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                            title={action.label}
                        >
                            <action.icon size={18} className="text-blue-400 flex-shrink-0" />
                            <span className="text-xs truncate w-full">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SystemTray: React.FC<{
    systemStatus: SystemStatus;
    notifications: NotificationItem[];
    onNotificationClick: () => void;
}> = ({ systemStatus, notifications, onNotificationClick }) => {
    const [showDetails, setShowDetails] = useState(false);
    const trayRef = useRef<HTMLDivElement>(null);

    const getNetworkIcon = () => {
        switch (systemStatus.network) {
            case 'connected': return Wifi;
            case 'weak': return Wifi;
            default: return Wifi;
        }
    };

    const getBatteryIcon = () => {
        if (systemStatus.battery === null) return Battery;
        return Battery;
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
                setShowDetails(false);
            }
        };

        if (showDetails) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDetails]);

    return (
        <>
            <div className="flex items-center gap-3">
                {/* Network Status */}
                <button
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                    title={`Network: ${systemStatus.network}`}
                >
                    <getNetworkIcon size={14} className={systemStatus.network === 'connected' ? 'text-green-400' : 'text-gray-500'} />
                </button>

                {/* Storage */}
                <button
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                    title={`Storage: ${systemStatus.storage}% used`}
                >
                    <HardDrive size={14} className={systemStatus.storage > 80 ? 'text-red-400' : 'text-blue-400'} />
                </button>

                {/* CPU */}
                <button
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                    title={`CPU: ${systemStatus.cpu}%`}
                >
                    <Cpu size={14} className={systemStatus.cpu > 80 ? 'text-red-400' : 'text-blue-400'} />
                </button>

                {/* Battery (if available) */}
                {systemStatus.battery !== null && (
                    <button
                        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                        title={`Battery: ${systemStatus.battery}%`}
                    >
                        <getBatteryIcon size={14} className={
                            systemStatus.battery > 60 ? 'text-green-400' :
                            systemStatus.battery > 20 ? 'text-yellow-400' : 'text-red-400'
                        } />
                    </button>
                )}

                {/* Notifications */}
                <button
                    onClick={onNotificationClick}
                    className="relative flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                    title={`${notifications.length} notifications`}
                >
                    <Bell size={14} />
                    {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {notifications.length > 9 ? '9+' : notifications.length}
                        </span>
                    )}
                </button>

                {/* System Details */}
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                    title="System details"
                >
                    <Activity size={14} />
                </button>
            </div>

            {/* System Details Popup */}
            {showDetails && (
                <div
                    ref={trayRef}
                    className="fixed top-12 right-4 w-72 bg-gray-800/95 backdrop-blur-lg border border-gray-700 rounded-lg shadow-2xl z-50"
                >
                    <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-100 mb-4">System Status</h3>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">CPU Usage</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-20 bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${systemStatus.cpu}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-gray-300">{systemStatus.cpu}%</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Memory</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-20 bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-green-400 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${systemStatus.memory}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-gray-300">{systemStatus.memory}%</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Storage</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-20 bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`${systemStatus.storage > 80 ? 'bg-red-400' : 'bg-yellow-400'} h-2 rounded-full transition-all duration-300`}
                                            style={{ width: `${systemStatus.storage}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-gray-300">{systemStatus.storage}%</span>
                                </div>
                            </div>

                            {systemStatus.battery !== null && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">Battery</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 bg-gray-700 rounded-full h-2">
                                            <div
                                                className={`${
                                                    systemStatus.battery > 60 ? 'bg-green-400' :
                                                    systemStatus.battery > 20 ? 'bg-yellow-400' : 'bg-red-400'
                                                } h-2 rounded-full transition-all duration-300`}
                                                style={{ width: `${systemStatus.battery}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-300">{systemStatus.battery}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const ClockCalendar: React.FC<{
    isVisible: boolean;
    onClose: () => void;
}> = ({ isVisible, onClose }) => {
    const calendarRef = useRef<HTMLDivElement>(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDate(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisible, onClose]);

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const today = currentDate.getDate();

        const days = [];

        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="p-2"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(
                <div
                    key={day}
                    className={`p-2 text-center text-sm rounded cursor-pointer transition-colors
                        ${day === today
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-300 hover:bg-gray-700'
                        }
                    `}
                >
                    {day}
                </div>
            );
        }

        return (
            <div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayHeaders.map(day => (
                        <div key={day} className="text-center text-xs text-gray-400 font-medium">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            </div>
        );
    };

    if (!isVisible) return null;

    return (
        <div
            ref={calendarRef}
            className="fixed top-12 right-64 w-72 bg-gray-800/95 backdrop-blur-lg border border-gray-700 rounded-lg shadow-2xl z-50"
        >
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-100">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {renderCalendar()}

                <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-100">
                            {currentDate.toLocaleTimeString()}
                        </div>
                        <div className="text-sm text-gray-400">
                            {currentDate.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NotificationsPanel: React.FC<{
    isVisible: boolean;
    notifications: NotificationItem[];
    onClose: () => void;
    onClearNotification: (id: string) => void;
    onMarkAsRead: (id: string) => void;
}> = ({ isVisible, notifications, onClose, onClearNotification, onMarkAsRead }) => {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const getNotificationIcon = (type: NotificationItem['type']) => {
        switch (type) {
            case 'error': return '🚨';
            case 'warning': return '⚠️';
            case 'success': return '✅';
            default: return 'ℹ️';
        }
    };

    const getNotificationColor = (type: NotificationItem['type']) => {
        switch (type) {
            case 'error': return 'text-red-400';
            case 'warning': return 'text-yellow-400';
            case 'success': return 'text-green-400';
            default: return 'text-blue-400';
        }
    };

    return (
        <div
            ref={panelRef}
            className="fixed top-12 right-4 w-96 bg-gray-800/95 backdrop-blur-lg border border-gray-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col"
        >
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-100">Notifications</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {notifications.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <Bell size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No notifications</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-3 rounded-lg border transition-all duration-200 ${
                                    notification.read
                                        ? 'bg-gray-700/30 border-gray-700'
                                        : 'bg-gray-700/50 border-blue-700/30'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-2 flex-1">
                                        <span className={getNotificationColor(notification.type)}>
                                            {getNotificationIcon(notification.type)}
                                        </span>
                                        <div className="flex-1">
                                            <div className={`font-medium text-sm ${
                                                notification.read ? 'text-gray-400' : 'text-gray-200'
                                            }`}>
                                                {notification.title}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {notification.message}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-2">
                                                {notification.time.toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {!notification.read && (
                                            <button
                                                onClick={() => onMarkAsRead(notification.id)}
                                                className="text-gray-400 hover:text-blue-400 transition-colors"
                                                title="Mark as read"
                                            >
                                                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onClearNotification(notification.id)}
                                            className="text-gray-400 hover:text-red-400 transition-colors"
                                            title="Clear notification"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Main DesktopHeader Component
export const DesktopHeader: React.FC = () => {
    const { openWindow } = useWindowManager();
    const { openLauncher } = useAppLauncher();

    // State management
    const [showAppMenu, setShowAppMenu] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // System status
    const [systemStatus, setSystemStatus] = useState<SystemStatus>({
        cpu: 0,
        memory: 0,
        storage: 0,
        network: 'disconnected',
        battery: null,
        notifications: 0
    });

    // Notifications
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Fetch system status
    const fetchSystemStatus = useCallback(async () => {
        try {
            // This would integrate with your backend APIs
            // For now, we'll simulate with mock data
            const response = await fetch('/api/system/status');
            if (response.ok) {
                const data = await response.json();
                setSystemStatus({
                    cpu: Math.round(data.cpu || Math.random() * 100),
                    memory: Math.round(data.memory || Math.random() * 100),
                    storage: Math.round(data.storage || Math.random() * 100),
                    network: data.network || 'connected',
                    battery: data.battery || null,
                    notifications: notifications.length
                });
            }
        } catch (error) {
            console.error('Failed to fetch system status:', error);
            // Fallback to mock data
            setSystemStatus(prev => ({
                ...prev,
                cpu: Math.round(Math.random() * 100),
                memory: Math.round(Math.random() * 100),
                notifications: notifications.length
            }));
        }
    }, [notifications.length]);

    // Fetch system status every 5 seconds
    useEffect(() => {
        fetchSystemStatus();
        const interval = setInterval(fetchSystemStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchSystemStatus]);

    // Launch applications
    const launchApplication = useCallback((appId: string) => {
        const appLaunchMap: Record<string, { title: string; component: React.ComponentType<{ windowId: string }> }> = {
            'terminal': {
                title: 'Terminal',
                component: TerminalComponent
            },
            'files': {
                title: 'Files',
                component: FileManager
            },
            'notes': {
                title: 'Notes',
                component: Notes
            },
            'settings': {
                title: 'Settings',
                component: SettingsComponent
            },
            'control-panel': {
                title: 'Control Panel',
                component: ControlPanel
            },
            'containers': {
                title: 'Containers',
                component: ContainerManager
            },
            'monitoring': {
                title: 'Monitoring',
                component: Monitoring
            },
            'ai': {
                title: 'AI Integration',
                component: AIIntegration
            }
        };

        const app = appLaunchMap[appId];
        if (app) {
            openWindow(app.title,
                <Suspense fallback={<div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                </div>}>
                    <app.component windowId={`${appId}-${Date.now()}`} />
                </Suspense>
            );
        }
    }, [openWindow]);

    const handleQuickAction = useCallback((action: string) => {
        launchApplication(action);
    }, [launchApplication]);

    const handleNotificationClick = useCallback(() => {
        setShowNotifications(!showNotifications);
    }, [showNotifications]);

    const clearNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    }, []);

    // Add a sample notification for demonstration
    useEffect(() => {
        const sampleNotification: NotificationItem = {
            id: '1',
            title: 'Welcome to Desktop',
            message: 'Your desktop environment is ready to use',
            time: new Date(),
            type: 'info',
            read: false
        };

        // Only add if we don't have any notifications
        if (notifications.length === 0) {
            setNotifications([sampleNotification]);
        }
    }, []);

    return (
        <>
            <div className="fixed top-0 left-0 right-0 h-12 bg-gray-900/90 backdrop-blur-lg border-b border-gray-700 flex items-center justify-between px-4 z-50">
                {/* Main Navigation */}
                <div className="flex items-center gap-1 md:gap-2">
                    {/* Control Center / Home */}
                    <button
                        onClick={() => launchApplication('control-panel')}
                        className="flex items-center gap-1 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 min-w-0"
                        title="Control Center"
                    >
                        <Home size={16} className="flex-shrink-0" />
                        <span className="hidden sm:inline truncate">Control Center</span>
                    </button>

                    {/* Applications Menu */}
                    <button
                        onClick={() => setShowAppMenu(!showAppMenu)}
                        className="flex items-center gap-1 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 min-w-0"
                        title="Applications"
                    >
                        <Grid3X3 size={16} className="flex-shrink-0" />
                        <span className="hidden sm:inline truncate">Applications</span>
                        <ChevronDown size={12} className={`transition-transform duration-200 ${showAppMenu ? 'rotate-180' : ''} flex-shrink-0`} />
                    </button>

                    {/* System Tools */}
                    <button
                        onClick={() => launchApplication('terminal')}
                        className="flex items-center gap-1 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 min-w-0"
                        title="System Tools"
                    >
                        <Wrench size={16} className="flex-shrink-0" />
                        <span className="hidden sm:inline truncate">System Tools</span>
                    </button>

                    {/* Development */}
                    <button
                        onClick={() => launchApplication('ai')}
                        className="flex items-center gap-1 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 min-w-0"
                        title="Development"
                    >
                        <Code size={16} className="flex-shrink-0" />
                        <span className="hidden sm:inline truncate">Development</span>
                    </button>

                    {/* Separator */}
                    <div className="h-6 w-px bg-gray-700 mx-1 md:mx-2 hidden sm:block" />

                    {/* Quick Actions */}
                    <button
                        onClick={() => setShowQuickActions(!showQuickActions)}
                        className="flex items-center gap-1 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 min-w-0"
                        title="Quick Actions"
                    >
                        <Plus size={16} className="flex-shrink-0" />
                        <span className="hidden sm:inline truncate">Quick Actions</span>
                    </button>

                    {/* App Launcher */}
                    <button
                        onClick={openLauncher}
                        className="flex items-center gap-1 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 min-w-0"
                        title="Launch apps (Alt+Space)"
                    >
                        <Search size={16} className="flex-shrink-0" />
                        <span className="hidden sm:inline truncate">Launch</span>
                    </button>

                    {/* Settings */}
                    <button
                        onClick={() => launchApplication('settings')}
                        className="flex items-center gap-1 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 min-w-0"
                        title="Settings"
                    >
                        <Settings size={16} className="flex-shrink-0" />
                        <span className="hidden sm:inline truncate">Settings</span>
                    </button>
                </div>

                {/* Right Side - System Tray and Time */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* System Tray */}
                    <SystemTray
                        systemStatus={systemStatus}
                        notifications={notifications}
                        onNotificationClick={handleNotificationClick}
                    />

                    {/* Separator */}
                    <div className="h-6 w-px bg-gray-700 hidden sm:block" />

                    {/* Clock/Calendar */}
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="flex items-center gap-1 px-2 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 min-w-0"
                        title="Calendar"
                    >
                        <Clock size={16} className="flex-shrink-0" />
                        <span className="hidden xs:inline truncate">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="hidden md:inline truncate ml-1">
                            {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <ChevronDown size={12} className={`transition-transform duration-200 ${showCalendar ? 'rotate-180' : ''} flex-shrink-0`} />
                    </button>
                </div>
            </div>

            {/* Floating Panels */}
            <ApplicationMenu
                isVisible={showAppMenu}
                onClose={() => setShowAppMenu(false)}
                onLaunchApp={launchApplication}
            />

            <QuickActionsPanel
                isVisible={showQuickActions}
                onClose={() => setShowQuickActions(false)}
                onAction={handleQuickAction}
            />

            <ClockCalendar
                isVisible={showCalendar}
                onClose={() => setShowCalendar(false)}
            />

            <NotificationsPanel
                isVisible={showNotifications}
                notifications={notifications}
                onClose={() => setShowNotifications(false)}
                onClearNotification={clearNotification}
                onMarkAsRead={markAsRead}
            />
        </>
    );
};