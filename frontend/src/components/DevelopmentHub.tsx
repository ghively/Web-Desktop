import React, { useState, useEffect } from 'react';
import {
  Terminal, Container, Monitor, Code, Database, GitBranch,
  Bug, Play, Settings, Activity, FolderOpen, Plus, ChevronRight,
  Cpu, HardDrive, Network, Zap, Clock, AlertCircle, CheckCircle,
  Wrench, Package, Rocket, TestTube, Server
} from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { Loading } from './ui/Loading';

// Import components for development tools
import { ContainerManager } from './ContainerManager';
import { VNCClient } from './VNCClient';
import BuildToolsStudio from './BuildToolsStudio';
import APITestClient from './APITestClient';

interface DevTool {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  status: 'active' | 'inactive' | 'error';
  component: string;
  category: 'containers' | 'remote' | 'build' | 'editing' | 'testing' | 'database' | 'git' | 'debug';
  metrics?: {
    cpu?: number;
    memory?: number;
    disk?: number;
    network?: number;
  };
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  framework?: string;
  icon: React.ReactNode;
  commands: {
    setup?: string[];
    build?: string[];
    test?: string[];
    run?: string[];
  };
}

interface Workspace {
  id: string;
  name: string;
  path: string;
  lastAccessed: number;
  type: 'node' | 'python' | 'java' | 'cpp' | 'rust' | 'go' | 'web' | 'unknown';
  status: 'active' | 'idle';
  tools: string[];
}

const DevelopmentHub: React.FC<{ windowId: string }> = ({ windowId }) => {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<DevTool[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    uptime: 0
  });

  const categories = [
    { id: 'all', name: 'All Tools', icon: <Wrench size={16} /> },
    { id: 'containers', name: 'Containers', icon: <Container size={16} /> },
    { id: 'remote', name: 'Remote Dev', icon: <Monitor size={16} /> },
    { id: 'build', name: 'Build Tools', icon: <Package size={16} /> },
    { id: 'editing', name: 'Editors', icon: <Code size={16} /> },
    { id: 'testing', name: 'Testing', icon: <TestTube size={16} /> },
    { id: 'database', name: 'Database', icon: <Database size={16} /> },
    { id: 'git', name: 'Git', icon: <GitBranch size={16} /> },
    { id: 'debug', name: 'Debugging', icon: <Bug size={16} /> },
  ];

  const projectTemplates: ProjectTemplate[] = [
    {
      id: 'react-ts',
      name: 'React + TypeScript',
      description: 'Modern React application with TypeScript',
      language: 'TypeScript',
      framework: 'React',
      icon: <Code size={20} />,
      commands: {
        setup: ['npm install', 'npx tsc --init'],
        build: ['npm run build'],
        test: ['npm test'],
        run: ['npm run dev']
      }
    },
    {
      id: 'node-express',
      name: 'Node.js Express API',
      description: 'RESTful API server with Express.js',
      language: 'JavaScript',
      framework: 'Express',
      icon: <Server size={20} />,
      commands: {
        setup: ['npm init -y', 'npm install express'],
        build: ['echo "No build step required"'],
        test: ['npm test'],
        run: ['npm start']
      }
    },
    {
      id: 'python-flask',
      name: 'Python Flask App',
      description: 'Web application with Flask framework',
      language: 'Python',
      framework: 'Flask',
      icon: <Zap size={20} />,
      commands: {
        setup: ['pip install flask', 'pip install -r requirements.txt'],
        build: ['echo "No build step required"'],
        test: ['python -m pytest'],
        run: ['python app.py']
      }
    },
    {
      id: 'cpp-cmake',
      name: 'C++ with CMake',
      description: 'C++ project with CMake build system',
      language: 'C++',
      framework: 'CMake',
      icon: <Terminal size={20} />,
      commands: {
        setup: ['cmake -B build', 'cmake --build build'],
        build: ['cmake --build build --config Release'],
        test: ['ctest --test-dir build'],
        run: ['./build/main']
      }
    },
    {
      id: 'rust-cargo',
      name: 'Rust Project',
      description: 'Rust application with Cargo',
      language: 'Rust',
      icon: <Rocket size={20} />,
      commands: {
        setup: ['cargo build'],
        build: ['cargo build --release'],
        test: ['cargo test'],
        run: ['cargo run']
      }
    }
  ];

  const defaultTools: DevTool[] = [
    {
      id: 'container-manager',
      name: 'Container Manager',
      icon: <Container size={20} />,
      description: 'Docker container management with advanced features',
      status: 'active',
      component: 'ContainerManager',
      category: 'containers',
      metrics: { cpu: 15, memory: 256 }
    },
    {
      id: 'vnc-client',
      name: 'VNC Client',
      icon: <Monitor size={20} />,
      description: 'Remote desktop connections for development environments',
      status: 'active',
      component: 'VNCClient',
      category: 'remote'
    },
    {
      id: 'build-studio',
      name: 'Build Tools Studio',
      icon: <Package size={20} />,
      description: 'Interface for Make, CMake, Gradle, Maven builds',
      status: 'active',
      component: 'BuildToolsStudio',
      category: 'build'
    },
    {
      id: 'code-editor',
      name: 'Code Editor',
      icon: <Code size={20} />,
      description: 'Lightweight code editor with syntax highlighting',
      status: 'inactive',
      component: 'CodeEditor',
      category: 'editing'
    },
    {
      id: 'api-tester',
      name: 'API Test Client',
      icon: <Terminal size={20} />,
      description: 'REST API client for testing endpoints',
      status: 'inactive',
      component: 'APITestClient',
      category: 'testing'
    },
    {
      id: 'database-manager',
      name: 'Database Manager',
      icon: <Database size={20} />,
      description: 'Database connection and management interface',
      status: 'inactive',
      component: 'DatabaseManager',
      category: 'database'
    },
    {
      id: 'git-client',
      name: 'Git Client',
      icon: <GitBranch size={20} />,
      description: 'Git repository management and operations',
      status: 'inactive',
      component: 'GitClient',
      category: 'git'
    },
    {
      id: 'debug-tools',
      name: 'Debug Tools',
      icon: <Bug size={20} />,
      description: 'Application debugging and profiling',
      status: 'inactive',
      component: 'DebugTools',
      category: 'debug'
    }
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load tools status
        setTools(defaultTools);
        setTemplates(projectTemplates);

        // Load system stats
        const response = await fetch(`${settings.backend.apiUrl}/api/system-monitoring/stats`);
        if (response.ok) {
          const data = await response.json();
          setSystemStats({
            cpu: data.cpu || 0,
            memory: data.memory || 0,
            disk: data.disk || 0,
            network: data.network || 0,
            uptime: data.uptime || 0
          });
        }

        // Load workspaces (mock data for now)
        setWorkspaces([
          {
            id: '1',
            name: 'Web Desktop Frontend',
            path: '/home/ghively/Git/Web-Desktop/frontend',
            lastAccessed: Date.now(),
            type: 'web',
            status: 'active',
            tools: ['code-editor', 'build-studio', 'api-tester']
          },
          {
            id: '2',
            name: 'Backend API',
            path: '/home/ghively/Git/Web-Desktop/backend',
            lastAccessed: Date.now() - 3600000,
            type: 'node',
            status: 'idle',
            tools: ['code-editor', 'database-manager', 'debug-tools']
          }
        ]);
      } catch (error) {
        console.error('Failed to load development hub data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [settings.backend.apiUrl]);

  const filteredTools = selectedCategory === 'all'
    ? tools
    : tools.filter(tool => tool.category === selectedCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'inactive': return 'text-gray-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-900/20 border-green-700/50';
      case 'inactive': return 'bg-gray-800/50 border-gray-700/50';
      case 'error': return 'bg-red-900/20 border-red-700/50';
      default: return 'bg-gray-800/50 border-gray-700/50';
    }
  };

  const getWorkspaceIcon = (type: string) => {
    switch (type) {
      case 'node':
      case 'web':
        return <Code size={16} className="text-green-400" />;
      case 'python':
        return <Zap size={16} className="text-blue-400" />;
      case 'java':
        return <Server size={16} className="text-orange-400" />;
      case 'cpp':
      case 'rust':
        return <Terminal size={16} className="text-red-400" />;
      case 'go':
        return <Rocket size={16} className="text-cyan-400" />;
      default:
        return <FolderOpen size={16} className="text-gray-400" />;
    }
  };

  const openTool = (tool: DevTool) => {
    // This would integrate with the window manager to open the tool
    console.log(`Opening tool: ${tool.name} (${tool.component})`);

    // Component mapping for development tools
    const componentMap: Record<string, React.ComponentType<{ windowId: string }>> = {
      'ContainerManager': ContainerManager,
      'VNCClient': VNCClient,
      'BuildToolsStudio': BuildToolsStudio,
      'APITestClient': APITestClient,
    };

    // In a real implementation, this would use the window manager to open the component
    // For now, we'll just log the action and show which component would be opened
    const Component = componentMap[tool.component];
    if (Component) {
      console.log(`Would open component: ${Component.name}`);
    }
  };

  const createProject = (template: ProjectTemplate) => {
    // This would open a dialog to create a new project from template
    console.log(`Creating project from template: ${template.name}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <Loading
          variant="spinner"
          text="Loading Development Hub..."
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <Terminal size={24} className="text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">Development Hub</h1>
            <p className="text-xs text-gray-400">Professional Development Environment</p>
          </div>
        </div>

        {/* System Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-blue-400" />
            <span>{systemStats.cpu.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive size={14} className="text-green-400" />
            <span>{(systemStats.memory / 1024).toFixed(1)}GB</span>
          </div>
          <div className="flex items-center gap-2">
            <Network size={14} className="text-purple-400" />
            <span>{systemStats.network.toFixed(0)}Mb/s</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-yellow-400" />
            <span>{Math.floor(systemStats.uptime / 3600)}h</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800/50 border-r border-gray-700/50 overflow-y-auto">
          {/* Categories */}
          <div className="p-4 border-b border-gray-700/30">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Categories</h3>
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  }`}
                >
                  {category.icon}
                  <span>{category.name}</span>
                  {selectedCategory === category.id && <ChevronRight size={14} className="ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Workspaces */}
          <div className="p-4 border-b border-gray-700/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">Workspaces</h3>
              <button className="p-1 hover:bg-gray-700 rounded">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="p-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getWorkspaceIcon(workspace.type)}
                    <span className="text-xs font-medium truncate">{workspace.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{workspace.path}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      workspace.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-xs text-gray-400">{workspace.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Tools Grid */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wrench size={20} />
              Development Tools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => openTool(tool)}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-blue-600/50 hover:bg-gray-800/70 cursor-pointer transition-all hover:shadow-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-gray-900/50 rounded-lg">
                      {tool.icon}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBg(tool.status)} ${getStatusColor(tool.status)} font-medium`}>
                      {tool.status}
                    </span>
                  </div>

                  <h3 className="font-semibold mb-2">{tool.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">{tool.description}</p>

                  {tool.metrics && (
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {tool.metrics.cpu && (
                        <div className="flex items-center gap-1">
                          <Cpu size={12} />
                          <span>{tool.metrics.cpu}%</span>
                        </div>
                      )}
                      {tool.metrics.memory && (
                        <div className="flex items-center gap-1">
                          <HardDrive size={12} />
                          <span>{tool.metrics.memory}MB</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Project Templates */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FolderOpen size={20} />
              Project Templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-green-600/50 hover:bg-gray-800/70 cursor-pointer transition-all hover:shadow-lg"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-gray-900/50 rounded-lg">
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{template.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{template.language}</span>
                        {template.framework && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="text-xs text-gray-400">{template.framework}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-3">{template.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{Object.keys(template.commands).length} commands</span>
                    </div>
                    <button
                      onClick={() => createProject(template)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Create
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentHub;