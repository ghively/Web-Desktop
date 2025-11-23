import { useState, useEffect } from 'react';
import {
    Code, Terminal, Settings, Package, FileText, Zap, Bug, Play, Save,
    RefreshCw, Download, Upload, Eye, EyeOff, Plus, Trash2, Edit3,
    FolderOpen, GitBranch, TestTube, Rocket, Shield, Database, Globe,
    Monitor, Smartphone, Tablet, ChevronRight, ChevronDown, Copy, Check,
    AlertCircle, CheckCircle, XCircle, Info, Clock, Cpu, HardDrive,
    Activity, GitCommit, GitMerge, GitPullRequest, Layers
} from 'lucide-react';
import { DeveloperTools as DeveloperToolsType, AppManifest, AppModule } from '../types/applications';

interface DeveloperToolsProps {
    windowId: string;
    appId?: string;
    manifest?: AppManifest;
}

export const DeveloperTools = ({ windowId, appId, manifest }: DeveloperToolsProps) => {
    const [activeTab, setActiveTab] = useState<'editor' | 'console' | 'debugger' | 'profiler' | 'inspector' | 'network'>('editor');
    const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
        fileExplorer: true,
        properties: true,
        console: false,
        network: false
    });
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState('');
    const [consoleLogs, setConsoleLogs] = useState<Array<{type: 'log' | 'error' | 'warn' | 'info'; message: string; timestamp: Date}>>([]);
    const [networkRequests, setNetworkRequests] = useState<Array<{id: string; method: string; url: string; status: number; time: number}>>([]);
    const [performance, setPerformance] = useState({
        cpu: 0,
        memory: 0,
        network: 0
    });
    const [modules, setModules] = useState<AppModule[]>([]);
    const [showBuildPanel, setShowBuildPanel] = useState(false);
    const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
    const [buildOutput, setBuildOutput] = useState<string[]>([]);

    // Initialize with sample modules if manifest is available
    useEffect(() => {
        if (manifest) {
            setModules([
                {
                    id: `${manifest.id}-main`,
                    name: 'Main Module',
                    version: manifest.version,
                    exports: [
                        { name: 'App', type: 'class', description: 'Main application class' },
                        { name: 'init', type: 'function', description: 'Initialize application' }
                    ],
                    imports: [
                        { module: 'react', version: '^18.0.0', required: true },
                        { module: 'lucide-react', version: '^0.263.0', required: true }
                    ],
                    type: 'component',
                    sandboxed: true
                }
            ]);
        }
    }, [manifest]);

    // Mock performance monitoring
    useEffect(() => {
        const interval = setInterval(() => {
            setPerformance({
                cpu: Math.random() * 100,
                memory: Math.random() * 100,
                network: Math.random() * 100
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const togglePanel = (panel: string) => {
        setExpandedPanels(prev => ({
            ...prev,
            [panel]: !prev[panel]
        }));
    };

    const addConsoleLog = (type: 'log' | 'error' | 'warn' | 'info', message: string) => {
        setConsoleLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
    };

    const addNetworkRequest = (method: string, url: string, status: number) => {
        const request = {
            id: Math.random().toString(36),
            method,
            url,
            status,
            time: Math.random() * 1000
        };
        setNetworkRequests(prev => [...prev, request]);
    };

    const buildApp = async () => {
        setBuildStatus('building');
        setBuildOutput(['Starting build process...', 'Compiling TypeScript...', 'Bundling assets...']);

        // Simulate build process
        setTimeout(() => {
            setBuildOutput(prev => [...prev, 'Optimizing bundle...', 'Generating source maps...']);
        }, 1000);

        setTimeout(() => {
            setBuildOutput(prev => [...prev, 'Build completed successfully!']);
            setBuildStatus('success');
        }, 2000);
    };

    const runTests = () => {
        addConsoleLog('info', 'Running test suite...');
        addConsoleLog('log', '✓ Component tests passed');
        addConsoleLog('log', '✓ Integration tests passed');
        addConsoleLog('log', '✓ E2E tests passed');
        addConsoleLog('info', 'All tests completed successfully');
    };

    const deployApp = () => {
        addConsoleLog('info', 'Starting deployment process...');
        addConsoleLog('log', 'Building production bundle...');
        addConsoleLog('log', 'Uploading to deployment server...');
        addConsoleLog('log', '✓ Deployment successful');
    };

    const renderFileExplorer = () => (
        <div className="h-full flex flex-col">
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-100">File Explorer</span>
                <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                        <Plus size={14} className="text-gray-400" />
                    </button>
                    <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                        <FolderOpen size={14} className="text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
                        <FolderOpen size={14} className="text-blue-400" />
                        <span className="text-sm text-gray-300">src</span>
                    </div>

                    <div className="ml-4 space-y-1">
                        <div
                            className={`flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer ${
                                selectedFile === 'App.tsx' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => {
                                setSelectedFile('App.tsx');
                                setFileContent('// App.tsx\nexport const App = () => {\n  return <div>Hello World</div>;\n};');
                            }}
                        >
                            <Code size={14} className="text-blue-400" />
                            <span className="text-sm text-gray-300">App.tsx</span>
                        </div>

                        <div
                            className={`flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer ${
                                selectedFile === 'index.ts' ? 'bg-gray-700' : ''
                            }`}
                            onClick={() => {
                                setSelectedFile('index.ts');
                                setFileContent('// index.ts\nexport * from \'./App\';');
                            }}
                        >
                            <Code size={14} className="text-blue-400" />
                            <span className="text-sm text-gray-300">index.ts</span>
                        </div>

                        <div className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
                            <FileText size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-300">styles.css</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
                        <FolderOpen size={14} className="text-blue-400" />
                        <span className="text-sm text-gray-300">public</span>
                    </div>

                    <div className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
                        <FileText size={14} className="text-green-400" />
                        <span className="text-sm text-gray-300">package.json</span>
                    </div>

                    <div className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
                        <FileText size={14} className="text-yellow-400" />
                        <span className="text-sm text-gray-300">manifest.json</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCodeEditor = () => (
        <div className="h-full flex flex-col">
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-100">
                    {selectedFile || 'Select a file to edit'}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (selectedFile) {
                                addConsoleLog('info', `Saved ${selectedFile}`);
                            }
                        }}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                    >
                        <Save size={14} className="text-gray-400" />
                    </button>
                    <button
                        onClick={() => {
                            addConsoleLog('info', 'Formatting code...');
                            setTimeout(() => addConsoleLog('log', 'Code formatted successfully'), 500);
                        }}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                    >
                        <Edit3 size={14} className="text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-gray-950 p-4 overflow-auto">
                {selectedFile ? (
                    <textarea
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        className="w-full h-full bg-transparent text-green-400 font-mono text-sm outline-none resize-none"
                        spellCheck={false}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <FileText size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Select a file to start editing</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="p-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
                <span>{selectedFile || 'No file selected'}</span>
                <div className="flex items-center gap-4">
                    <span>UTF-8</span>
                    <span>JavaScript</span>
                    <span>LF</span>
                </div>
            </div>
        </div>
    );

    const renderConsole = () => (
        <div className="h-full flex flex-col">
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-100">Console</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setConsoleLogs([])}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                    >
                        <Trash2 size={14} className="text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {consoleLogs.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <Terminal size={32} className="mx-auto mb-4 opacity-50" />
                        <p>No console messages</p>
                    </div>
                ) : (
                    consoleLogs.map((log, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-gray-500 text-xs mt-0.5">
                                {log.timestamp.toLocaleTimeString()}
                            </span>
                            <div className={`flex-1 ${
                                log.type === 'error' ? 'text-red-400' :
                                log.type === 'warn' ? 'text-yellow-400' :
                                log.type === 'info' ? 'text-blue-400' :
                                'text-gray-300'
                            }`}>
                                {log.message}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 border-t border-gray-700">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Enter command..."
                        className="flex-1 px-3 py-2 bg-gray-800 text-gray-100 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                addConsoleLog('log', `> ${e.currentTarget.value}`);
                                e.currentTarget.value = '';
                            }
                        }}
                    />
                    <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                        Execute
                    </button>
                </div>
            </div>
        </div>
    );

    const renderDebugger = () => (
        <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
                {/* Performance Metrics */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-100 mb-4">Performance Metrics</h3>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-400">CPU Usage</span>
                                <span className="text-sm text-gray-300">{performance.cpu.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${performance.cpu}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-400">Memory Usage</span>
                                <span className="text-sm text-gray-300">{performance.memory.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${performance.memory}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-400">Network Activity</span>
                                <span className="text-sm text-gray-300">{performance.network.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${performance.network}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Module Information */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-100 mb-4">Loaded Modules</h3>
                    <div className="space-y-2">
                        {modules.map(module => (
                            <div key={module.id} className="p-3 bg-gray-800 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-100">{module.name}</span>
                                    <span className="text-xs text-gray-400">v{module.version}</span>
                                </div>
                                <div className="text-xs text-gray-400">
                                    <div>Exports: {module.exports.length}</div>
                                    <div>Imports: {module.imports.length}</div>
                                    <div>Type: {module.type}</div>
                                    <div>Sandboxed: {module.sandboxed ? 'Yes' : 'No'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Build Controls */}
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Build & Deploy</h3>
                <div className="flex gap-3">
                    <button
                        onClick={buildApp}
                        disabled={buildStatus === 'building'}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded transition-colors flex items-center gap-2"
                    >
                        {buildStatus === 'building' ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <Rocket size={16} />
                        )}
                        Build
                    </button>

                    <button
                        onClick={runTests}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
                    >
                        <TestTube size={16} />
                        Test
                    </button>

                    <button
                        onClick={deployApp}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center gap-2"
                    >
                        <Upload size={16} />
                        Deploy
                    </button>
                </div>

                {buildOutput.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-900 rounded-lg text-sm font-mono text-green-400 max-h-32 overflow-y-auto">
                        {buildOutput.map((line, index) => (
                            <div key={index}>{line}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderNetwork = () => (
        <div className="h-full flex flex-col">
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-100">Network Requests</span>
                <button
                    onClick={() => setNetworkRequests([])}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                    <Trash2 size={14} className="text-gray-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {networkRequests.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <Globe size={32} className="mx-auto mb-4 opacity-50" />
                        <p>No network requests</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-700">
                        {networkRequests.map(request => (
                            <div key={request.id} className="p-3 hover:bg-gray-800 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-mono px-2 py-1 rounded ${
                                            request.method === 'GET' ? 'bg-green-900/50 text-green-300' :
                                            request.method === 'POST' ? 'bg-blue-900/50 text-blue-300' :
                                            'bg-gray-700 text-gray-300'
                                        }`}>
                                            {request.method}
                                        </span>
                                        <span className="text-sm text-gray-300">{request.url}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-1 rounded ${
                                            request.status >= 200 && request.status < 300 ? 'bg-green-900/50 text-green-300' :
                                            request.status >= 400 ? 'bg-red-900/50 text-red-300' :
                                            'bg-yellow-900/50 text-yellow-300'
                                        }`}>
                                            {request.status}
                                        </span>
                                        <span className="text-xs text-gray-400">{request.time.toFixed(0)}ms</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Header */}
            <div className="border-b border-gray-700">
                <div className="flex items-center gap-1 p-2">
                    {[
                        { id: 'editor', icon: Code, label: 'Editor' },
                        { id: 'console', icon: Terminal, label: 'Console' },
                        { id: 'debugger', icon: Bug, label: 'Debugger' },
                        { id: 'network', icon: Globe, label: 'Network' }
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-gray-800 text-gray-100'
                                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                                }`}
                            >
                                <Icon size={16} />
                                <span className="text-sm">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex">
                {/* Sidebar */}
                <div className="w-64 border-r border-gray-700 flex flex-col">
                    {/* File Explorer */}
                    <div className="flex-1 flex flex-col border-b border-gray-700">
                        {expandedPanels.fileExplorer ? renderFileExplorer() : (
                            <div className="p-3">
                                <button
                                    onClick={() => togglePanel('fileExplorer')}
                                    className="w-full flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
                                >
                                    <ChevronRight size={16} />
                                    File Explorer
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Properties Panel */}
                    {expandedPanels.properties && (
                        <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-gray-100">Properties</span>
                                <button
                                    onClick={() => togglePanel('properties')}
                                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                                >
                                    <EyeOff size={14} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-gray-400">App ID:</span>
                                    <span className="ml-2 text-gray-300">{appId || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Status:</span>
                                    <span className="ml-2 text-green-400">Running</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Version:</span>
                                    <span className="ml-2 text-gray-300">{manifest?.version || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 flex">
                    <div className="flex-1">
                        {activeTab === 'editor' && renderCodeEditor()}
                        {activeTab === 'console' && renderConsole()}
                        {activeTab === 'debugger' && renderDebugger()}
                        {activeTab === 'network' && renderNetwork()}
                    </div>

                    {/* Right Sidebar - Console Panel */}
                    {expandedPanels.console && (
                        <div className="w-80 border-l border-gray-700">
                            {renderConsole()}
                        </div>
                    )}
                </div>
            </div>

            {/* Status Bar */}
            <div className="border-t border-gray-700 p-2 flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Cpu size={12} />
                        <span>{performance.cpu.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <HardDrive size={12} />
                        <span>{performance.memory.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Activity size={12} />
                        <span>{networkRequests.length} requests</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span>{appId || 'No app loaded'}</span>
                    <span>Ready</span>
                </div>
            </div>
        </div>
    );
};