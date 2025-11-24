import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Shield,
  Wifi,
  Package,
  Activity,
  Terminal,
  Settings,
  Database,
  Lock,
  Unlock,
  Server,
  Cloud,
  Upload,
  Download,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Globe,
  Network,
  Cpu,
  Monitor,
  FileText,
  Archive,
  RefreshCw,
  Plus,
  Wrench,
  ShieldCheck,
  UserCheck,
  Key,
  Users,
  UserCog,
  Building,
  Code,
  TerminalSquare,
  Box,
  PackagePlus,
  PackageMinus,
  PackageOpen,
  PackageSearch,
  PackageCheck,
  PackageX,
  ChevronDown,
  ChevronRight,
  Star,
  StarOff,
  File,
  FileLock,
  FileKey,
  FileSignature,
  FileWarning,
  FileCheck,
  FolderOpen,
  FolderPlus,
  FolderMinus,
  FolderLock,
  FolderSearch,
  Copy,
  Edit
} from 'lucide-react';

interface SystemTool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: ToolCategory;
  status: 'available' | 'configured' | 'error' | 'coming-soon';
  apiEndpoint?: string;
  component?: string;
  features: string[];
  keywords: string[];
  recentlyUsed?: boolean;
  isFavorite?: boolean;
  shortcut?: string;
  version?: string;
  lastUsed?: Date;
  usageCount?: number;
  config?: {
    isConfigured: boolean;
    requiresSetup: boolean;
    setupSteps: string[];
  };
}

interface ToolCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tools: SystemTool[];
}

const SystemTools: React.FC<{ windowId?: string }> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showRecentlyUsedOnly, setShowRecentlyUsedOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']));
  const [tools, setTools] = useState<SystemTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const categories: ToolCategory[] = [
    {
      id: 'storage',
      name: 'Storage & Backup',
      description: 'Manage disks, storage pools, and backup systems',
      icon: HardDrive,
      color: 'blue',
      tools: [
        {
          id: 'storage-pools',
          name: 'Storage Pools',
          description: 'Manage multiple disks and storage pools with unified access',
          icon: HardDrive,
          category: { id: 'storage', name: 'Storage & Backup', description: '', icon: HardDrive, color: 'blue', tools: [] },
          status: 'available',
          apiEndpoint: '/api/storage-pools',
          component: 'StoragePools',
          features: ['Local disks', 'Network storage', 'Auto-mount', 'Usage monitoring'],
          keywords: ['storage', 'disks', 'pools', 'mount', 'filesystem'],
          recentlyUsed: true,
          isFavorite: true,
          shortcut: 'Ctrl+Alt+S',
          version: '1.0.0',
          usageCount: 15,
          config: { isConfigured: true, requiresSetup: false, setupSteps: [] }
        },
        {
          id: 'backup-manager',
          name: 'Backup Manager',
          description: 'Automated backup system with scheduling and restoration',
          icon: Archive,
          category: { id: 'storage', name: 'Storage & Backup', description: '', icon: HardDrive, color: 'blue', tools: [] },
          status: 'coming-soon',
          apiEndpoint: '/api/backup',
          component: 'BackupManager',
          features: ['Scheduled backups', 'Incremental backups', 'Cloud storage', 'Restore wizard'],
          keywords: ['backup', 'restore', 'archive', 'schedule'],
          config: { isConfigured: false, requiresSetup: true, setupSteps: ['Configure backup destination', 'Set schedule', 'Select folders'] }
        }
      ]
    },
    {
      id: 'devices',
      name: 'Device Management',
      description: 'Manage hardware devices and drivers',
      icon: Monitor,
      color: 'purple',
      tools: [
        {
          id: 'device-manager',
          name: 'Device Manager',
          description: 'Manage connected hardware devices and peripherals',
          icon: Monitor,
          category: { id: 'devices', name: 'Device Management', description: '', icon: Monitor, color: 'purple', tools: [] },
          status: 'coming-soon',
          apiEndpoint: '/api/devices',
          component: 'DeviceManager',
          features: ['USB devices', 'Printers', 'Audio devices', 'Display management'],
          keywords: ['devices', 'hardware', 'usb', 'printer', 'audio'],
          config: { isConfigured: true, requiresSetup: false, setupSteps: [] }
        }
      ]
    },
    {
      id: 'network',
      name: 'Network Tools',
      description: 'Monitor and manage network connections and services',
      icon: Network,
      color: 'green',
      tools: [
        {
          id: 'network-monitor',
          name: 'Network Monitor',
          description: 'Real-time network traffic monitoring and analysis',
          icon: Activity,
          category: { id: 'network', name: 'Network Tools', description: '', icon: Network, color: 'green', tools: [] },
          status: 'coming-soon',
          apiEndpoint: '/api/network/monitor',
          component: 'NetworkMonitor',
          features: ['Bandwidth usage', 'Connection monitoring', 'Protocol analysis'],
          keywords: ['network', 'monitor', 'traffic', 'bandwidth'],
          config: { isConfigured: true, requiresSetup: false, setupSteps: [] }
        }
      ]
    },
    {
      id: 'system',
      name: 'System Administration',
      description: 'System-level administration and monitoring tools',
      icon: Settings,
      color: 'orange',
      tools: [
        {
          id: 'service-manager',
          name: 'Service Manager',
          description: 'Manage system services and daemons',
          icon: Server,
          category: { id: 'system', name: 'System Administration', description: '', icon: Settings, color: 'orange', tools: [] },
          status: 'coming-soon',
          apiEndpoint: '/api/services',
          component: 'ServiceManager',
          features: ['Start/stop services', 'Service configuration', 'Startup management'],
          keywords: ['services', 'daemons', 'startup', 'systemd'],
          config: { isConfigured: true, requiresSetup: false, setupSteps: [] }
        },
        {
          id: 'process-manager',
          name: 'Process Manager',
          description: 'Monitor and manage running processes',
          icon: Cpu,
          category: { id: 'system', name: 'System Administration', description: '', icon: Settings, color: 'orange', tools: [] },
          status: 'coming-soon',
          apiEndpoint: '/api/processes',
          component: 'ProcessManager',
          features: ['Process monitoring', 'Resource usage', 'Process control'],
          keywords: ['processes', 'tasks', 'cpu', 'memory'],
          config: { isConfigured: true, requiresSetup: false, setupSteps: [] }
        }
      ]
    },
    {
      id: 'security',
      name: 'Security Tools',
      description: 'Security management and access control tools',
      icon: Shield,
      color: 'red',
      tools: [
        {
          id: 'firewall-manager',
          name: 'Firewall Manager',
          description: 'Configure and manage firewall rules',
          icon: Shield,
          category: { id: 'security', name: 'Security Tools', description: '', icon: Shield, color: 'red', tools: [] },
          status: 'coming-soon',
          apiEndpoint: '/api/firewall',
          component: 'FirewallManager',
          features: ['Rule management', 'Port blocking', 'Traffic filtering'],
          keywords: ['firewall', 'security', 'rules', 'blocking'],
          config: { isConfigured: false, requiresSetup: true, setupSteps: ['Configure firewall', 'Set default policy'] }
        }
      ]
    },
    {
      id: 'development',
      name: 'Development Tools',
      description: 'Development and package management tools',
      icon: Code,
      color: 'indigo',
      tools: [
        {
          id: 'package-manager',
          name: 'Package Manager',
          description: 'Manage software packages and dependencies',
          icon: Package,
          category: { id: 'development', name: 'Development Tools', description: '', icon: Code, color: 'indigo', tools: [] },
          status: 'available',
          apiEndpoint: '/api/packages',
          component: 'PackageManager',
          features: ['Package installation', 'Dependency management', 'Repository management'],
          keywords: ['packages', 'software', 'dependencies', 'repository'],
          recentlyUsed: true,
          isFavorite: true,
          shortcut: 'Ctrl+Alt+P',
          version: '1.0.0',
          usageCount: 8,
          config: { isConfigured: true, requiresSetup: false, setupSteps: [] }
        }
      ]
    }
  ];

  useEffect(() => {
    // Load tools from categories
    const allTools = categories.flatMap(category =>
      category.tools.map(tool => ({
        ...tool,
        category: category
      }))
    );
    setTools(allTools);
    setIsLoading(false);
  }, []);

  const filteredTools = tools.filter(tool => {
    const matchesSearch = searchQuery === '' ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || tool.category.id === selectedCategory;

    const matchesFavorites = !showFavoritesOnly || tool.isFavorite;

    const matchesRecentlyUsed = !showRecentlyUsedOnly || tool.recentlyUsed;

    return matchesSearch && matchesCategory && matchesFavorites && matchesRecentlyUsed;
  });

  const getStatusIcon = (status: SystemTool['status']) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'configured':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'coming-soon':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: SystemTool['status']) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'configured':
        return 'Configured';
      case 'error':
        return 'Error';
      case 'coming-soon':
        return 'Coming Soon';
      default:
        return 'Unknown';
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleFavorite = (toolId: string) => {
    setTools(tools.map(tool =>
      tool.id === toolId ? { ...tool, isFavorite: !tool.isFavorite } : tool
    ));
  };

  const launchTool = (tool: SystemTool) => {
    // Update usage statistics
    setTools(tools.map(t =>
      t.id === tool.id
        ? {
            ...t,
            usageCount: (t.usageCount || 0) + 1,
            lastUsed: new Date(),
            recentlyUsed: true
          }
        : t
    ));

    if (tool.status === 'coming-soon') {
      alert(`${tool.name} is coming soon!`);
      return;
    }

    // Integration with window manager would go here
    console.log(`Launching ${tool.name}...`);
    // This would integrate with the window manager to open the tool
  };

  const ToolCard: React.FC<{ tool: SystemTool }> = ({ tool }) => (
    <div
      className={`
        relative bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer
        transition-all duration-200 hover:border-gray-600 hover:shadow-lg
        hover:transform hover:scale-105 group
        ${tool.status === 'coming-soon' ? 'opacity-75' : ''}
      `}
      onClick={() => launchTool(tool)}
    >
      {/* Favorite button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(tool.id);
        }}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {tool.isFavorite ? (
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
        ) : (
          <StarOff className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Tool icon and status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${tool.category.color}-900 bg-opacity-20 text-${tool.category.color}-400`}>
            <tool.icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-100 group-hover:text-blue-400 transition-colors">
              {tool.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(tool.status)}
              <span className="text-xs text-gray-500">{getStatusText(tool.status)}</span>
              {tool.version && (
                <span className="text-xs text-gray-500">v{tool.version}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-400 mb-3 line-clamp-2">
        {tool.description}
      </p>

      {/* Features */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-1">
          {tool.features.slice(0, 2).map((feature, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded"
            >
              {feature}
            </span>
          ))}
          {tool.features.length > 2 && (
            <span className="text-xs px-2 py-1 bg-gray-700 text-gray-400 rounded">
              +{tool.features.length - 2} more
            </span>
          )}
        </div>
      </div>

      {/* Usage stats */}
      {(tool.usageCount || tool.recentlyUsed || tool.shortcut) && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {tool.usageCount && (
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {tool.usageCount} uses
              </span>
            )}
            {tool.recentlyUsed && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recent
              </span>
            )}
          </div>
          {tool.shortcut && (
            <span className="font-mono bg-gray-700 px-1 py-0.5 rounded">
              {tool.shortcut}
            </span>
          )}
        </div>
      )}

      {/* Configuration required badge */}
      {tool.config?.requiresSetup && !tool.config.isConfigured && (
        <div className="absolute top-2 left-2">
          <span className="text-xs px-2 py-1 bg-yellow-900 bg-opacity-50 text-yellow-400 rounded-full">
            Setup Required
          </span>
        </div>
      )}
    </div>
  );

  const CategorySection: React.FC<{ category: ToolCategory }> = ({ category }) => {
    const categoryTools = filteredTools.filter(tool => tool.category.id === category.id);
    const isExpanded = expandedCategories.has(category.id);

    if (categoryTools.length === 0) return null;

    return (
      <div className="mb-6">
        <button
          onClick={() => toggleCategoryExpansion(category.id)}
          className="flex items-center gap-3 mb-4 w-full group"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${category.color}-900 bg-opacity-20 text-${category.color}-400`}>
              <category.icon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-gray-100">{category.name}</h2>
              <p className="text-sm text-gray-400">{category.description}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
              {categoryTools.length}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ml-14">
            {categoryTools.map(tool => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading System Tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <Wrench className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">System Tools</h1>
        </div>
        <p className="text-gray-400">
          Professional system administration and utility tools for power users and IT administrators
        </p>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tools, features, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                showFavoritesOnly
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Star className="w-4 h-4" />
              Favorites
            </button>

            <button
              onClick={() => setShowRecentlyUsedOnly(!showRecentlyUsedOnly)}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                showRecentlyUsedOnly
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              Recent
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {filteredTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Wrench className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No tools found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search or filters to find the tools you need
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setShowFavoritesOnly(false);
                setShowRecentlyUsedOnly(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Categorized Tools */}
            {selectedCategory === 'all' && (
              categories.map(category => (
                <CategorySection key={category.id} category={category} />
              ))
            )}

            {/* Specific Category */}
            {selectedCategory !== 'all' && (
              <div>
                {categories
                  .filter(category => category.id === selectedCategory)
                  .map(category => (
                    <div key={category.id}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredTools.map(tool => (
                          <ToolCard key={tool.id} tool={tool} />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SystemTools;