import React, { useState, useEffect } from 'react';
import {
  Terminal, Play, Square, Settings, FolderOpen, Clock, CheckCircle, XCircle,
  AlertCircle, Wrench, Package, Zap, Rocket, HardDrive, Plus, Trash2, Save,
  RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff, FileText, Code, GitBranch,
  Cpu, Activity, Filter, Search, Copy, Download, Upload, Monitor, Layers
} from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { Loading } from './ui/Loading';

interface BuildTask {
  id: string;
  name: string;
  type: 'make' | 'cmake' | 'gradle' | 'maven' | 'npm' | 'yarn' | 'cargo' | 'go' | 'custom';
  command: string;
  workingDirectory: string;
  environment?: Record<string, string>;
  args?: string[];
  status: 'idle' | 'running' | 'success' | 'error' | 'cancelled';
  output: string[];
  error: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  exitCode?: number;
  progress?: number;
  artifacts?: string[];
}

interface BuildConfig {
  name: string;
  type: BuildTask['type'];
  buildFile: string;
  targets: string[];
  defaultTarget: string;
  cleanCommand?: string;
  testCommand?: string;
  installCommand?: string;
  dependencies?: string[];
}

interface WorkspaceProject {
  id: string;
  name: string;
  path: string;
  buildType: BuildTask['type'];
  config: BuildConfig;
  lastBuild?: BuildTask;
  buildHistory: BuildTask[];
}

const BuildToolsStudio: React.FC<{ windowId: string }> = ({ windowId }) => {
  const { settings } = useSettings();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [buildTasks, setBuildTasks] = useState<BuildTask[]>([]);
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showOutput, setShowOutput] = useState<Record<string, boolean>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [newProjectModal, setNewProjectModal] = useState(false);
  const [customCommand, setCustomCommand] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('build');

  // Build system configurations
  const buildSystemConfigs: Record<string, BuildConfig> = {
    make: {
      name: 'Make',
      type: 'make',
      buildFile: 'Makefile',
      targets: ['all', 'build', 'clean', 'install', 'test'],
      defaultTarget: 'all',
      cleanCommand: 'make clean',
      testCommand: 'make test',
      installCommand: 'make install'
    },
    cmake: {
      name: 'CMake',
      type: 'cmake',
      buildFile: 'CMakeLists.txt',
      targets: ['all', 'build', 'clean', 'install', 'test', 'package'],
      defaultTarget: 'all',
      cleanCommand: 'cmake --build . --target clean',
      testCommand: 'ctest',
      installCommand: 'cmake --install .'
    },
    gradle: {
      name: 'Gradle',
      type: 'gradle',
      buildFile: 'build.gradle',
      targets: ['build', 'clean', 'test', 'jar', 'install', 'run'],
      defaultTarget: 'build',
      cleanCommand: './gradlew clean',
      testCommand: './gradlew test',
      installCommand: './gradlew install'
    },
    maven: {
      name: 'Maven',
      type: 'maven',
      buildFile: 'pom.xml',
      targets: ['compile', 'package', 'clean', 'test', 'install', 'deploy'],
      defaultTarget: 'compile',
      cleanCommand: 'mvn clean',
      testCommand: 'mvn test',
      installCommand: 'mvn install'
    },
    npm: {
      name: 'NPM',
      type: 'npm',
      buildFile: 'package.json',
      targets: ['build', 'test', 'start', 'install', 'clean', 'dev'],
      defaultTarget: 'build',
      cleanCommand: 'npm run clean',
      testCommand: 'npm test',
      installCommand: 'npm install'
    },
    cargo: {
      name: 'Cargo (Rust)',
      type: 'cargo',
      buildFile: 'Cargo.toml',
      targets: ['build', 'run', 'test', 'clean', 'install', 'check'],
      defaultTarget: 'build',
      cleanCommand: 'cargo clean',
      testCommand: 'cargo test',
      installCommand: 'cargo install --path .'
    }
  };

  // Mock project data
  const mockProjects: WorkspaceProject[] = [
    {
      id: '1',
      name: 'Web Desktop Frontend',
      path: '/home/ghively/Git/Web-Desktop/frontend',
      buildType: 'npm',
      config: buildSystemConfigs.npm,
      buildHistory: []
    },
    {
      id: '2',
      name: 'Backend API',
      path: '/home/ghively/Git/Web-Desktop/backend',
      buildType: 'npm',
      config: buildSystemConfigs.npm,
      buildHistory: []
    },
    {
      id: '3',
      name: 'Sample C++ Project',
      path: '/home/ghively/projects/cpp-app',
      buildType: 'cmake',
      config: buildSystemConfigs.cmake,
      buildHistory: []
    }
  ];

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        // In a real implementation, this would scan the workspace for build files
        setProjects(mockProjects);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      // In a real implementation, this would check build status
      // For now, we'll just simulate
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const runBuild = async (projectId: string, target: string = 'build') => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const taskId = `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const buildCommand = getBuildCommand(project.config.type, target, project.config);

    const newTask: BuildTask = {
      id: taskId,
      name: `${project.name} - ${target}`,
      type: project.config.type,
      command: buildCommand,
      workingDirectory: project.path,
      status: 'running',
      output: [],
      error: '',
      startTime: Date.now(),
      progress: 0
    };

    setBuildTasks(prev => [newTask, ...prev]);
    setRunningTasks(prev => new Set(prev).add(taskId));
    setShowOutput(prev => ({ ...prev, [taskId]: true }));

    // Simulate build process
    try {
      // In a real implementation, this would call the backend API
      await simulateBuild(taskId, buildCommand);
    } catch (error) {
      console.error('Build failed:', error);
    }
  };

  const simulateBuild = async (taskId: string, command: string) => {
    const steps = [
      'Starting build process...',
      'Reading configuration...',
      'Compiling source files...',
      'Linking objects...',
      'Generating artifacts...',
      'Build completed successfully!'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));

      setBuildTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            output: [...task.output, `[${new Date().toLocaleTimeString()}] ${steps[i]}`],
            progress: ((i + 1) / steps.length) * 100
          };
        }
        return task;
      }));
    }

    setBuildTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          status: 'success',
          endTime: Date.now(),
          duration: Date.now() - (task.startTime || 0),
          exitCode: 0,
          artifacts: ['main', 'libapp.so', 'config.json']
        };
      }
      return task;
    }));

    setRunningTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  };

  const getBuildCommand = (type: string, target: string, config: BuildConfig): string => {
    switch (type) {
      case 'make':
        return `make ${target}`;
      case 'cmake':
        if (target === 'build') return 'cmake --build .';
        return `cmake --build . --target ${target}`;
      case 'gradle':
        return `./gradlew ${target}`;
      case 'maven':
        return `mvn ${target}`;
      case 'npm':
        return `npm run ${target}`;
      case 'cargo':
        return `cargo ${target}`;
      case 'go':
        if (target === 'build') return 'go build';
        return `go ${target}`;
      default:
        return target;
    }
  };

  const stopBuild = (taskId: string) => {
    setBuildTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          status: 'cancelled',
          endTime: Date.now(),
          duration: task.startTime ? Date.now() - task.startTime : 0
        };
      }
      return task;
    }));

    setRunningTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  };

  const clearHistory = () => {
    setBuildTasks([]);
    setShowOutput({});
  };

  const getTaskIcon = (status: BuildTask['status']) => {
    switch (status) {
      case 'running':
        return <Activity className="text-blue-400 animate-pulse" size={16} />;
      case 'success':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'error':
        return <XCircle className="text-red-400" size={16} />;
      case 'cancelled':
        return <Square className="text-yellow-400" size={16} />;
      default:
        return <Clock className="text-gray-400" size={16} />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const filteredTasks = buildTasks.filter(task => {
    const matchesSearch = searchQuery === '' ||
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.command.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <Loading
          variant="spinner"
          text="Loading Build Tools Studio..."
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <Terminal size={20} className="text-green-400" />
          <div>
            <h1 className="text-xl font-bold">Build Tools Studio</h1>
            <p className="text-xs text-gray-400">Professional build system management</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg transition-all hover:scale-105 ${
              autoRefresh ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Auto Refresh"
          >
            <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={clearHistory}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-all hover:scale-105"
            title="Clear History"
          >
            <Trash2 size={16} />
          </button>
          <div className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
            {runningTasks.size} running
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Projects Sidebar */}
        <div className="w-64 bg-gray-800/50 border-r border-gray-700/50 overflow-y-auto">
          <div className="p-4 border-b border-gray-700/30">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Projects</h3>
            <button
              onClick={() => setNewProjectModal(true)}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={14} />
              Add Project
            </button>
          </div>

          <div className="p-4">
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedProject === project.id
                      ? 'bg-blue-600/20 border border-blue-600/30'
                      : 'bg-gray-700/30 hover:bg-gray-700/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {project.config.type === 'npm' && <Package size={16} className="text-blue-400" />}
                    {project.config.type === 'cmake' && <Code size={16} className="text-green-400" />}
                    {project.config.type === 'make' && <Terminal size={16} className="text-yellow-400" />}
                    {project.config.type === 'gradle' && <Zap size={16} className="text-purple-400" />}
                    {project.config.type === 'maven' && <Rocket size={16} className="text-red-400" />}
                    {project.config.type === 'cargo' && <Monitor size={16} className="text-orange-400" />}
                    <span className="text-sm font-medium truncate">{project.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 truncate">{project.path}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-400">{project.config.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedProject && (() => {
            const project = projects.find(p => p.id === selectedProject);
            if (!project) return null;

            return (
              <>
                {/* Build Controls */}
                <div className="p-4 bg-gray-800/30 border-b border-gray-700/30">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTarget}
                          onChange={(e) => setSelectedTarget(e.target.value)}
                          className="px-3 py-1 bg-gray-900/50 border border-gray-700/50 rounded text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                        >
                          {project.config.targets.map((target) => (
                            <option key={target} value={target}>
                              {target.charAt(0).toUpperCase() + target.slice(1)}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => runBuild(project.id, selectedTarget)}
                          disabled={runningTasks.size > 0}
                          className="px-4 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm flex items-center gap-2 transition-colors"
                        >
                          <Play size={14} />
                          {selectedTarget.charAt(0).toUpperCase() + selectedTarget.slice(1)}
                        </button>

                        {project.config.cleanCommand && (
                          <button
                            onClick={() => runBuild(project.id, 'clean')}
                            disabled={runningTasks.size > 0}
                            className="px-4 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded text-sm flex items-center gap-2 transition-colors"
                          >
                            <Trash2 size={14} />
                            Clean
                          </button>
                        )}

                        {project.config.testCommand && (
                          <button
                            onClick={() => runBuild(project.id, 'test')}
                            disabled={runningTasks.size > 0}
                            className="px-4 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm flex items-center gap-2 transition-colors"
                          >
                            <CheckCircle size={14} />
                            Test
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex items-center gap-3 p-4 bg-gray-800/50 border-b border-gray-700/30">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search build history..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="all">All Status</option>
                    <option value="running">Running</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Build History */}
                <div className="flex-1 overflow-y-auto p-4">
                  {filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Terminal size={48} className="mb-4 opacity-50" />
                      <div className="text-lg font-medium mb-2">No build history</div>
                      <div className="text-sm">Start a build to see the results</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredTasks.map((task) => (
                        <div
                          key={task.id}
                          className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden"
                        >
                          {/* Task Header */}
                          <div className="p-4 border-b border-gray-700/30">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                {getTaskIcon(task.status)}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate">{task.name}</h4>
                                  <p className="text-sm text-gray-400 font-mono truncate">{task.command}</p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <span className={`text-xs px-2 py-1 rounded-full border ${
                                      task.status === 'success' ? 'bg-green-900/20 border-green-700/50 text-green-400' :
                                      task.status === 'error' ? 'bg-red-900/20 border-red-700/50 text-red-400' :
                                      task.status === 'running' ? 'bg-blue-900/20 border-blue-700/50 text-blue-400' :
                                      task.status === 'cancelled' ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-400' :
                                      'bg-gray-800/50 border-gray-700/50 text-gray-400'
                                    } font-medium`}>
                                      {task.status}
                                    </span>
                                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                                      <Clock size={12} />
                                      {task.duration ? formatDuration(task.duration) : 'Running...'}
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                                      <FolderOpen size={12} />
                                      {task.workingDirectory.split('/').pop()}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setShowOutput(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                  className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg transition-all hover:scale-105"
                                  title={showOutput[task.id] ? 'Hide Output' : 'Show Output'}
                                >
                                  {showOutput[task.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                                {task.status === 'running' && (
                                  <button
                                    onClick={() => stopBuild(task.id)}
                                    className="p-1.5 bg-red-600 hover:bg-red-700 text-red-400 rounded-lg transition-all hover:scale-105"
                                    title="Stop Build"
                                  >
                                    <Square size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Progress Bar */}
                            {task.status === 'running' && task.progress !== undefined && (
                              <div className="mt-3">
                                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-blue-400 h-full transition-all duration-300"
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Build Output */}
                          {showOutput[task.id] && (
                            <div className="p-4 bg-gray-900/30">
                              <div className="font-mono text-xs bg-gray-900/50 p-3 rounded max-h-64 overflow-y-auto">
                                {task.output.length > 0 ? (
                                  task.output.map((line, index) => (
                                    <div key={index} className="text-gray-300 mb-1">
                                      {line}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-gray-500">No output available</div>
                                )}
                              </div>

                              {task.artifacts && task.artifacts.length > 0 && (
                                <div className="mt-3">
                                  <h5 className="text-sm font-medium text-gray-300 mb-2">Artifacts</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {task.artifacts.map((artifact, index) => (
                                      <span key={index} className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                                        {artifact}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {!selectedProject && (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Terminal size={48} className="mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">No Project Selected</div>
                <div className="text-sm">Select a project from the sidebar to start building</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuildToolsStudio;