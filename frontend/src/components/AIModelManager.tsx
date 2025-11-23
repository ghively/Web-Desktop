import React, { useState, useEffect } from 'react';
import { Brain, Cpu, Globe, Settings, Download, Trash2, Play, CheckCircle, XCircle, AlertTriangle, RefreshCw, Zap, Clock, DollarSign, Server, MessageSquare, Code, FileText, Image, BarChart3, Languages, BookOpen, TestTube, Copy, Save, Key, Eye, EyeOff } from 'lucide-react';

interface Model {
  name: string;
  size?: number;
  modified_at?: string;
  digest?: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
    format?: string;
    families?: string[];
  };
  id?: string;
  provider?: string;
  context?: number;
  pricing?: {
    input: number;
    output: number;
  };
}

interface TaskAssignment {
  preferredModel: string;
  provider: 'ollama' | 'openrouter';
  fallbackModel: string;
  fallbackProvider: 'ollama' | 'openrouter';
}

interface Config {
  ollama: {
    host: string;
    port: number;
    enabled: boolean;
  };
  openrouter: {
    apiKey: string;
    enabled: boolean;
    baseUrl: string;
  };
  taskAssignments: Record<string, TaskAssignment>;
}

interface Status {
  ollama: {
    enabled: boolean;
    connected: boolean;
    models: Model[];
  };
  openrouter: {
    enabled: boolean;
    configured: boolean;
    connected: boolean;
    models: Model[];
  };
}

const AIModelManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('models');
  const [config, setConfig] = useState<Config | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [models, setModels] = useState<{ ollama: Model[], openrouter: Model[] }>({ ollama: [], openrouter: [] });
  const [selectedTask, setSelectedTask] = useState('file-analysis');
  const [testPrompt, setTestPrompt] = useState('Analyze this text and provide a summary.');
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const TASK_DEFINITIONS = {
    'file-analysis': { name: 'File Analysis', icon: FileText, color: 'text-blue-600' },
    'code-generation': { name: 'Code Generation', icon: Code, color: 'text-green-600' },
    'text-generation': { name: 'Text Generation', icon: MessageSquare, color: 'text-purple-600' },
    'image-analysis': { name: 'Image Analysis', icon: Image, color: 'text-orange-600' },
    'document-processing': { name: 'Document Processing', icon: FileText, color: 'text-red-600' },
    'chat-assistant': { name: 'Chat Assistant', icon: MessageSquare, color: 'text-indigo-600' },
    'data-analysis': { name: 'Data Analysis', icon: BarChart3, color: 'text-teal-600' },
    'translation': { name: 'Translation', icon: Languages, color: 'text-pink-600' }
  };

  useEffect(() => {
    loadConfig();
    loadStatus();
    loadModels();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/ai-model-manager/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/ai-model-manager/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const loadModels = async () => {
    try {
      const response = await fetch('/api/ai-model-manager/models');
      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const saveConfig = async (newConfig: Partial<Config>) => {
    try {
      const response = await fetch('/api/ai-model-manager/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      if (response.ok) {
        await loadConfig();
        await loadStatus();
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const pullModel = async (model: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai-model-manager/ollama/pull/${model}`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadModels();
        await loadStatus();
      }
    } catch (error) {
      console.error('Failed to pull model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteModel = async (model: string) => {
    if (!confirm(`Are you sure you want to delete ${model}?`)) return;

    try {
      const response = await fetch(`/api/ai-model-manager/ollama/models/${model}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadModels();
        await loadStatus();
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  };

  const testModel = async (taskType: string) => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/ai-model-manager/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType,
          prompt: testPrompt,
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('Failed to test model:', error);
      setTestResult({ error: 'Failed to execute test' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskAssignment = async (taskType: string, assignment: TaskAssignment) => {
    try {
      const response = await fetch(`/api/ai-model-manager/tasks/${taskType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment),
      });

      if (response.ok) {
        await loadConfig();
      }
    } catch (error) {
      console.error('Failed to update task assignment:', error);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}/M tokens`;
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-600" />
          AI Model Manager
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage Ollama and OpenRouter models with intelligent task routing
        </p>
      </div>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-green-600" />
                Ollama
              </h3>
              {status.ollama.connected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <div>Host: {config?.ollama.host}:{config?.ollama.port}</div>
              <div>Models: {status.ollama.models.length}</div>
              <div>Status: {status.ollama.connected ? 'Connected' : 'Disconnected'}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                OpenRouter
              </h3>
              {status.openrouter.connected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <div>API Key: {status.openrouter.configured ? 'Configured' : 'Not configured'}</div>
              <div>Models: {status.openrouter.models.length}</div>
              <div>Status: {status.openrouter.connected ? 'Connected' : 'Disconnected'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('models')}
            className={`px-6 py-3 font-medium text-sm border-b-2 ${
              activeTab === 'models'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Server className="w-4 h-4 inline mr-2" />
            Models
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-6 py-3 font-medium text-sm border-b-2 ${
              activeTab === 'tasks'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Task Assignment
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-3 font-medium text-sm border-b-2 ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-6 py-3 font-medium text-sm border-b-2 ${
              activeTab === 'test'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <TestTube className="w-4 h-4 inline mr-2" />
            Test Models
          </button>
        </div>

        {/* Models Tab */}
        {activeTab === 'models' && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Local Models (Ollama)</h3>
              {models.ollama.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Cpu className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No local models installed</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {models.ollama.map((model) => (
                    <div key={model.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{model.name}</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteModel(model.name)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>Size: {formatFileSize(model.size)}</div>
                        <div>Modified: {model.modified_at ? new Date(model.modified_at).toLocaleDateString() : 'Unknown'}</div>
                        {model.details?.parameter_size && (
                          <div>Parameters: {model.details.parameter_size}</div>
                        )}
                        {model.details?.quantization_level && (
                          <div>Quantization: {model.details.quantization_level}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cloud Models (OpenRouter)</h3>
              {models.openrouter.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Configure OpenRouter API key to access cloud models</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {models.openrouter.map((model) => (
                    <div key={model.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{model.name}</h4>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          {model.provider}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>Context: {model.context?.toLocaleString()} tokens</div>
                        {model.pricing && (
                          <div className="flex justify-between">
                            <span>Input: {formatPrice(model.pricing.input)}</span>
                            <span>Output: {formatPrice(model.pricing.output)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Task Assignment Tab */}
        {activeTab === 'tasks' && config && (
          <div className="p-6">
            <div className="space-y-6">
              {Object.entries(TASK_DEFINITIONS).map(([taskType, definition]) => {
                const Icon = definition.icon;
                const assignment = config.taskAssignments[taskType];

                return (
                  <div key={taskType} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className={`w-5 h-5 ${definition.color}`} />
                      <h4 className="font-medium text-gray-900 dark:text-white">{definition.name}</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Preferred Model
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={assignment.provider}
                            onChange={(e) => {
                              const newAssignment = { ...assignment, provider: e.target.value as 'ollama' | 'openrouter' };
                              updateTaskAssignment(taskType, newAssignment);
                            }}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="ollama">Ollama</option>
                            <option value="openrouter">OpenRouter</option>
                          </select>

                          <select
                            value={assignment.preferredModel}
                            onChange={(e) => {
                              const newAssignment = { ...assignment, preferredModel: e.target.value };
                              updateTaskAssignment(taskType, newAssignment);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {(assignment.provider === 'ollama' ? models.ollama : models.openrouter).map((model) => (
                              <option key={model.name || model.id} value={model.name || model.id}>
                                {model.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Fallback Model
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={assignment.fallbackProvider}
                            onChange={(e) => {
                              const newAssignment = { ...assignment, fallbackProvider: e.target.value as 'ollama' | 'openrouter' };
                              updateTaskAssignment(taskType, newAssignment);
                            }}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="ollama">Ollama</option>
                            <option value="openrouter">OpenRouter</option>
                          </select>

                          <select
                            value={assignment.fallbackModel}
                            onChange={(e) => {
                              const newAssignment = { ...assignment, fallbackModel: e.target.value };
                              updateTaskAssignment(taskType, newAssignment);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {(assignment.fallbackProvider === 'ollama' ? models.ollama : models.openrouter).map((model) => (
                              <option key={model.name || model.id} value={model.name || model.id}>
                                {model.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && config && (
          <div className="p-6">
            <div className="space-y-6">
              {/* Ollama Configuration */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  Ollama Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Host
                    </label>
                    <input
                      type="text"
                      value={config.ollama.host}
                      onChange={(e) => {
                        const newConfig = {
                          ...config,
                          ollama: { ...config.ollama, host: e.target.value }
                        };
                        setConfig(newConfig);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Port
                    </label>
                    <input
                      type="number"
                      value={config.ollama.port}
                      onChange={(e) => {
                        const newConfig = {
                          ...config,
                          ollama: { ...config.ollama, port: parseInt(e.target.value) }
                        };
                        setConfig(newConfig);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ollama-enabled"
                    checked={config.ollama.enabled}
                    onChange={(e) => {
                      const newConfig = {
                        ...config,
                        ollama: { ...config.ollama, enabled: e.target.checked }
                      };
                      setConfig(newConfig);
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="ollama-enabled" className="text-sm text-gray-700 dark:text-gray-300">
                    Enable Ollama
                  </label>
                </div>
              </div>

              {/* OpenRouter Configuration */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  OpenRouter Configuration
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={config.openrouter.apiKey}
                      onChange={(e) => {
                        const newConfig = {
                          ...config,
                          openrouter: { ...config.openrouter, apiKey: e.target.value }
                        };
                        setConfig(newConfig);
                      }}
                      placeholder="Enter your OpenRouter API key"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenRouter</a>
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="openrouter-enabled"
                    checked={config.openrouter.enabled}
                    onChange={(e) => {
                      const newConfig = {
                        ...config,
                        openrouter: { ...config.openrouter, enabled: e.target.checked }
                      };
                      setConfig(newConfig);
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="openrouter-enabled" className="text-sm text-gray-700 dark:text-gray-300">
                    Enable OpenRouter
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => saveConfig(config)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Configuration
                </button>
                <button
                  onClick={() => {
                    loadConfig();
                    loadStatus();
                    loadModels();
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Test Configuration</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Task Type
                    </label>
                    <select
                      value={selectedTask}
                      onChange={(e) => setSelectedTask(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {Object.entries(TASK_DEFINITIONS).map(([taskType, definition]) => (
                        <option key={taskType} value={taskType}>
                          {definition.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Test Prompt
                    </label>
                    <textarea
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter a test prompt..."
                    />
                  </div>

                  <button
                    onClick={() => testModel(selectedTask)}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Run Test
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Test Results</h3>

                {testResult ? (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    {testResult.error ? (
                      <div className="text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-5 h-5 inline mr-2" />
                        {testResult.error}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="font-medium">Success</span>
                          <span className="text-gray-600 dark:text-gray-400">
                            • Provider: {testResult.provider}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            • Model: {testResult.model}
                          </span>
                          {testResult.fallback && (
                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs rounded">
                              Fallback
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Response:</h4>
                          <div className="bg-white dark:bg-gray-900 rounded p-3 text-sm text-gray-700 dark:text-gray-300">
                            {testResult.result?.response || testResult.result?.choices?.[0]?.message?.content || JSON.stringify(testResult.result, null, 2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TestTube className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Run a test to see results</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIModelManager;