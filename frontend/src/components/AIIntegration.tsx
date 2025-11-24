import React, { useState, useEffect } from 'react';
import { Brain, Search, Zap, Shield, Plus, Check, AlertTriangle, TrendingUp, FileText, Workflow as WorkflowIcon } from 'lucide-react';

interface AIService {
  name: string;
  type: 'local' | 'cloud';
  capabilities: string[];
  status?: 'active' | 'inactive' | 'error';
}

interface FileAnalysis {
  path: string;
  category: string;
  tags: string[];
  confidence: number;
  summary?: string;
}

interface SearchResult {
  path: string;
  name: string;
  score: number;
  type: 'file' | 'directory';
  size: number;
  modified: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  triggers: string[];
  actions: Array<{
    type: string;
    description?: string;
    config?: Record<string, unknown>;
  }>;
}

interface SecurityEvent {
  id: string;
  type: 'anomaly' | 'threat' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  title?: string;
  timestamp: string;
  resolved: boolean;
}


interface Recommendation {
  type: string;
  severity: string;
  title: string;
  description: string;
  solution: string;
}

interface AIIntegrationProps {
  windowId?: string;
}

const AIIntegration: React.FC<AIIntegrationProps> = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'search' | 'workflows' | 'security' | 'performance'>('overview');
  const [services, setServices] = useState<AIService[]>([]);
  const [fileAnalyses, setFileAnalyses] = useState<FileAnalysis[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAIServices();
    loadWorkflows();
    loadSecurityEvents();
    loadRecommendations();
  }, []);

  const loadAIServices = async () => {
    try {
      const response = await fetch('/api/ai-integration/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data.map((service: AIService) => ({ ...service, status: 'active' })));
      }
    } catch (error) {
      console.error('Failed to load AI services:', error);
    }
  };

  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/ai-integration/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadSecurityEvents = async () => {
    try {
      const response = await fetch('/api/ai-integration/security/events');
      if (response.ok) {
        const data = await response.json();
        setSecurityEvents(data);
      }
    } catch (error) {
      console.error('Failed to load security events:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await fetch('/api/ai-integration/performance/recommendations');
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const analyzeFiles = async (filePaths: string[]) => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-integration/files/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePaths })
      });

      if (response.ok) {
        const data = await response.json();
        setFileAnalyses(data);
      }
    } catch (error) {
      console.error('Failed to analyze files:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/ai-integration/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          context: process.env.HOME || '/',
          limit: 50
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveSecurityEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/ai-integration/security/events/${eventId}/resolve`, {
        method: 'PUT'
      });

      if (response.ok) {
        loadSecurityEvents();
      }
    } catch (error) {
      console.error('Failed to resolve security event:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Brain className="w-6 h-6 text-purple-500" />
            <span>AI/ML Integration</span>
          </h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">AI Services Active:</span>
            <span className="bg-green-600 px-2 py-1 rounded-full text-xs">
              {services.filter(s => s.status === 'active').length}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mt-4">
          {[
            { id: 'overview' as const, label: 'Overview', icon: Brain },
            { id: 'files' as const, label: 'File Analysis', icon: FileText },
            { id: 'search' as const, label: 'Smart Search', icon: Search },
            { id: 'workflows' as const, label: 'Workflows', icon: WorkflowIcon },
            { id: 'security' as const, label: 'Security', icon: Shield },
            { id: 'performance' as const, label: 'Performance', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* AI Services Grid */}
            <div>
              <h2 className="text-xl font-semibold mb-4">AI Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{service.name}</h3>
                      <span className={`w-2 h-2 rounded-full ${
                        service.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                      }`}></span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span>{service.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Capabilities:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {service.capabilities.map((cap, idx) => (
                            <span key={idx} className="bg-purple-600 bg-opacity-30 px-2 py-1 rounded text-xs">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{fileAnalyses.length}</div>
                    <div className="text-sm text-gray-400">Files Analyzed</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <WorkflowIcon className="w-8 h-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{workflows.filter(w => w.active).length}</div>
                    <div className="text-sm text-gray-400">Active Workflows</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Shield className="w-8 h-8 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold">{securityEvents.filter(e => !e.resolved).length}</div>
                    <div className="text-sm text-gray-400">Pending Events</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{recommendations.length}</div>
                    <div className="text-sm text-gray-400">Recommendations</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Smart File Organization</h2>
              <button
                onClick={() => {
                  const files = ['/home/user/Documents', '/home/user/Downloads', '/home/user/Desktop'];
                  analyzeFiles(files);
                }}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Analyze Files</span>
              </button>
            </div>

            {fileAnalyses.length > 0 && (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">File</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Tags</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Confidence</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileAnalyses.map((analysis, index) => (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="px-4 py-3 text-sm">{analysis.path}</td>
                        <td className="px-4 py-3 text-sm">{analysis.category}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {analysis.tags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="bg-purple-600 bg-opacity-30 px-2 py-1 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                            {analysis.tags.length > 3 && (
                              <span className="text-xs text-gray-400">+{analysis.tags.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={getConfidenceColor(analysis.confidence)}>
                            {(analysis.confidence * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {analysis.summary ? (
                            analysis.summary.length > 50 ?
                              analysis.summary.substring(0, 50) + '...' :
                              analysis.summary
                          ) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                placeholder="Enter search query..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={performSearch}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium mb-3">Search Results ({searchResults.length})</h3>
                <div className="space-y-2">
                  {searchResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm">
                          <div className="font-medium">{result.name}</div>
                          <div className="text-gray-400 text-xs">{result.path}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-purple-400">{(result.score * 100).toFixed(1)}% match</div>
                        <div className="text-gray-400 text-xs">{new Date(result.modified).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Security Intelligence</h2>
              <button
                onClick={loadSecurityEvents}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              {securityEvents.map((event) => (
                <div key={event.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className={`w-5 h-5 ${getSeverityColor(event.severity)}`} />
                        <span className="font-medium">{event.title || event.type}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          event.severity === 'critical' ? 'bg-red-600' :
                          event.severity === 'high' ? 'bg-orange-600' :
                          event.severity === 'medium' ? 'bg-yellow-600' :
                          'bg-green-600'
                        }`}>
                          {event.severity}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{event.description}</p>
                      <div className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {event.resolved ? (
                        <span className="flex items-center space-x-1 text-green-400 text-sm">
                          <Check className="w-4 h-4" />
                          <span>Resolved</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => resolveSecurityEvent(event.id)}
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Performance Optimization</h2>
              <button
                onClick={loadRecommendations}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                Analyze
              </button>
            </div>

            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                        <span className="font-medium">{rec.title}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          rec.severity === 'high' ? 'bg-red-600' :
                          rec.severity === 'medium' ? 'bg-yellow-600' :
                          'bg-blue-600'
                        }`}>
                          {rec.severity}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm">{rec.description}</p>
                    </div>
                    <button className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm transition-colors">
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'workflows' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">AI Workflows</h2>
              <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create Workflow</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{workflow.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        workflow.active ? 'bg-green-500' : 'bg-gray-500'
                      }`}></span>
                      <span className="text-xs">
                        {workflow.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{workflow.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {workflow.triggers.length} triggers, {workflow.actions.length} actions
                    </div>
                    <button className="text-purple-400 hover:text-purple-300 text-sm">
                      Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIIntegration;
