import React, { useState, useEffect } from 'react';
import {
  Terminal, Play, Save, Plus, Trash2, Copy, Download, Upload,
  Search, Filter, Clock, CheckCircle, XCircle, AlertCircle,
  Send, FileText, FolderOpen, Settings, Code, Hash, Eye, EyeOff,
  ChevronDown, ChevronUp, Globe, Shield, Zap, GitBranch, Layers
} from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { Loading } from './ui/Loading';

interface APIRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  params?: Record<string, string>;
  auth?: {
    type: 'none' | 'basic' | 'bearer' | 'apikey';
    username?: string;
    password?: string;
    token?: string;
    key?: string;
    value?: string;
  };
  variables?: Record<string, string>;
}

interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

interface APIHistory {
  id: string;
  request: APIRequest;
  response?: APIResponse;
  error?: string;
  timestamp: number;
}

interface APIEnvironment {
  name: string;
  variables: Record<string, string>;
}

const APITestClient: React.FC<{ windowId: string }> = ({ windowId }) => {
  const { settings } = useSettings();
  const [requests, setRequests] = useState<APIRequest[]>([]);
  const [history, setHistory] = useState<APIHistory[]>([]);
  const [environments, setEnvironments] = useState<APIEnvironment[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [currentRequest, setCurrentRequest] = useState<APIRequest>({
    id: '',
    name: '',
    method: 'GET',
    url: `${settings.backend.apiUrl}/api`,
    headers: {},
    body: '',
    params: {},
    auth: { type: 'none' },
    variables: {}
  });
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHeaders, setShowHeaders] = useState(true);
  const [showBody, setShowBody] = useState(true);
  const [showParams, setShowParams] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'builder' | 'history' | 'environments'>('builder');

  const httpMethods = [
    { method: 'GET', color: 'bg-green-600' },
    { method: 'POST', color: 'bg-blue-600' },
    { method: 'PUT', color: 'bg-yellow-600' },
    { method: 'DELETE', color: 'bg-red-600' },
    { method: 'PATCH', color: 'bg-purple-600' },
    { method: 'HEAD', color: 'bg-gray-600' },
    { method: 'OPTIONS', color: 'bg-indigo-600' }
  ];

  // Sample saved requests
  const sampleRequests: APIRequest[] = [
    {
      id: '1',
      name: 'Get System Status',
      method: 'GET',
      url: '/api/system/status',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      id: '2',
      name: 'Create Container',
      method: 'POST',
      url: '/api/containers',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: 'nginx:latest',
        name: 'test-container'
      })
    }
  ];

  // Sample environments
  const sampleEnvironments: APIEnvironment[] = [
    {
      name: 'Development',
      variables: {
        'baseUrl': settings.backend.apiUrl,
        'apiVersion': 'v1',
        'timeout': '30000'
      }
    },
    {
      name: 'Production',
      variables: {
        'baseUrl': 'https://api.example.com',
        'apiVersion': 'v1',
        'timeout': '60000'
      }
    }
  ];

  useEffect(() => {
    setRequests(sampleRequests);
    setEnvironments(sampleEnvironments);
  }, [settings.backend.apiUrl]);

  const sendRequest = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const startTime = Date.now();

      // Build URL with query parameters
      let url = currentRequest.url;
      if (currentRequest.params && Object.keys(currentRequest.params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(currentRequest.params).forEach(([key, value]) => {
          if (key && value) {
            searchParams.append(key, value);
          }
        });
        url += `?${searchParams.toString()}`;
      }

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: currentRequest.method,
        headers: {
          'Content-Type': 'application/json',
          ...currentRequest.headers
        }
      };

      // Add authentication
      if (currentRequest.auth) {
        switch (currentRequest.auth.type) {
          case 'basic':
            const basicAuth = btoa(`${currentRequest.auth.username}:${currentRequest.auth.password}`);
            fetchOptions.headers = {
              ...fetchOptions.headers,
              'Authorization': `Basic ${basicAuth}`
            };
            break;
          case 'bearer':
            fetchOptions.headers = {
              ...fetchOptions.headers,
              'Authorization': `Bearer ${currentRequest.auth.token}`
            };
            break;
          case 'apikey':
            fetchOptions.headers = {
              ...fetchOptions.headers,
              [currentRequest.auth.key || 'X-API-Key']: currentRequest.auth.value || ''
            };
            break;
        }
      }

      // Add body for POST, PUT, PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(currentRequest.method) && currentRequest.body) {
        fetchOptions.body = currentRequest.body;
      }

      const response = await fetch(url, fetchOptions);
      const responseTime = Date.now() - startTime;

      // Get response headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // Get response body
      const body = await response.text();

      const apiResponse: APIResponse = {
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
        time: responseTime,
        size: new Blob([body]).size
      };

      setResponse(apiResponse);

      // Add to history
      const historyItem: APIHistory = {
        id: `hist-${Date.now()}`,
        request: { ...currentRequest },
        response: apiResponse,
        timestamp: Date.now()
      };
      setHistory(prev => [historyItem, ...prev]);

    } catch (error: any) {
      const historyItem: APIHistory = {
        id: `hist-${Date.now()}`,
        request: { ...currentRequest },
        error: error.message,
        timestamp: Date.now()
      };
      setHistory(prev => [historyItem, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const saveRequest = () => {
    if (!currentRequest.name.trim()) return;

    const request: APIRequest = {
      ...currentRequest,
      id: Date.now().toString()
    };

    setRequests(prev => [...prev, request]);
  };

  const loadRequest = (request: APIRequest) => {
    setCurrentRequest(request);
    setSelectedRequest(request.id);
    setResponse(null);
  };

  const deleteRequest = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
    if (selectedRequest === id) {
      setSelectedRequest(null);
    }
  };

  const duplicateRequest = (request: APIRequest) => {
    const duplicated: APIRequest = {
      ...request,
      id: Date.now().toString(),
      name: `${request.name} (Copy)`
    };
    setRequests(prev => [...prev, duplicated]);
  };

  const updateHeader = (key: string, value: string) => {
    setCurrentRequest(prev => ({
      ...prev,
      headers: {
        ...prev.headers,
        [key]: value
      }
    }));
  };

  const deleteHeader = (key: string) => {
    const newHeaders = { ...currentRequest.headers };
    delete newHeaders[key];
    setCurrentRequest(prev => ({
      ...prev,
      headers: newHeaders
    }));
  };

  const updateParam = (key: string, value: string) => {
    setCurrentRequest(prev => ({
      ...prev,
      params: {
        ...prev.params,
        [key]: value
      }
    }));
  };

  const deleteParam = (key: string) => {
    const newParams = { ...currentRequest.params };
    delete newParams[key];
    setCurrentRequest(prev => ({
      ...prev,
      params: newParams
    }));
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    if (status >= 400 && status < 500) return 'text-orange-400';
    if (status >= 500) return 'text-red-400';
    return 'text-gray-400';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <Terminal size={20} className="text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">API Test Client</h1>
            <p className="text-xs text-gray-400">REST API testing and debugging tool</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={saveRequest}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <Save size={14} />
            Save Request
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700/30">
        {(['builder', 'history', 'environments'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
            }`}
          >
            {tab === 'builder' && 'Request Builder'}
            {tab === 'history' && 'History'}
            {tab === 'environments' && 'Environments'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800/50 border-r border-gray-700/50 overflow-y-auto">
          <div className="p-4 border-b border-gray-700/30">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Saved Requests</h3>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-900/50 border border-gray-700/50 rounded text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-2">
              {requests
                .filter(req => req.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((request) => (
                  <div
                    key={request.id}
                    onClick={() => loadRequest(request)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedRequest === request.id
                        ? 'bg-blue-600/20 border border-blue-600/30'
                        : 'bg-gray-700/30 hover:bg-gray-700/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium text-white ${
                        httpMethods.find(m => m.method === request.method)?.color || 'bg-gray-600'
                      }`}>
                        {request.method}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateRequest(request);
                          }}
                          className="p-1 hover:bg-gray-600 rounded text-gray-400"
                          title="Duplicate"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRequest(request.id);
                          }}
                          className="p-1 hover:bg-gray-600 rounded text-gray-400"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-medium truncate">{request.name}</div>
                    <div className="text-xs text-gray-400 truncate">{request.url}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'builder' && (
            <div className="h-full flex flex-col">
              {/* Request Builder */}
              <div className="p-4 border-b border-gray-700/30">
                <div className="flex items-center gap-3 mb-4">
                  <select
                    value={currentRequest.method}
                    onChange={(e) => setCurrentRequest(prev => ({ ...prev, method: e.target.value as any }))}
                    className="px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500/50 font-medium"
                  >
                    {httpMethods.map(({ method }) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Enter request URL"
                    value={currentRequest.url}
                    onChange={(e) => setCurrentRequest(prev => ({ ...prev, url: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                  />
                  <button
                    onClick={sendRequest}
                    disabled={loading || !currentRequest.url.trim()}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send
                      </>
                    )}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Request name (optional)"
                  value={currentRequest.name}
                  onChange={(e) => setCurrentRequest(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {/* Request Configuration Tabs */}
              <div className="flex border-b border-gray-700/30">
                {[
                  { key: 'headers', label: 'Headers', show: showHeaders, toggle: () => setShowHeaders(!showHeaders) },
                  { key: 'body', label: 'Body', show: showBody, toggle: () => setShowBody(!showBody) },
                  { key: 'params', label: 'Params', show: showParams, toggle: () => setShowParams(!showParams) },
                  { key: 'auth', label: 'Authorization', show: showAuth, toggle: () => setShowAuth(!showAuth) }
                ].map(({ key, label, show, toggle }) => (
                  <button
                    key={key}
                    onClick={toggle}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                      show ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {label}
                    {show ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                ))}
              </div>

              {/* Request Configuration Content */}
              <div className="flex-1 overflow-y-auto">
                {showHeaders && (
                  <div className="p-4 border-b border-gray-700/30">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Headers</h4>
                    <div className="space-y-2">
                      {Object.entries(currentRequest.headers || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newHeaders = { ...currentRequest.headers };
                              delete newHeaders[key];
                              newHeaders[e.target.value] = value;
                              setCurrentRequest(prev => ({ ...prev, headers: newHeaders }));
                            }}
                            className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-gray-100"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateHeader(key, e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-gray-100"
                          />
                          <button
                            onClick={() => deleteHeader(key)}
                            className="p-2 text-red-400 hover:bg-red-600/20 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => updateHeader('', '')}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-2"
                      >
                        <Plus size={14} />
                        Add Header
                      </button>
                    </div>
                  </div>
                )}

                {showBody && (
                  <div className="p-4 border-b border-gray-700/30">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Body</h4>
                    <textarea
                      value={currentRequest.body || ''}
                      onChange={(e) => setCurrentRequest(prev => ({ ...prev, body: e.target.value }))}
                      placeholder="Enter request body (JSON, XML, etc.)"
                      className="w-full h-48 px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                )}

                {showParams && (
                  <div className="p-4 border-b border-gray-700/30">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Query Parameters</h4>
                    <div className="space-y-2">
                      {Object.entries(currentRequest.params || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newParams = { ...currentRequest.params };
                              delete newParams[key];
                              newParams[e.target.value] = value;
                              setCurrentRequest(prev => ({ ...prev, params: newParams }));
                            }}
                            className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-gray-100"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateParam(key, e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-gray-100"
                          />
                          <button
                            onClick={() => deleteParam(key)}
                            className="p-2 text-red-400 hover:bg-red-600/20 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => updateParam('', '')}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-2"
                      >
                        <Plus size={14} />
                        Add Parameter
                      </button>
                    </div>
                  </div>
                )}

                {showAuth && (
                  <div className="p-4 border-b border-gray-700/30">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Authorization</h4>
                    <div className="space-y-3">
                      <select
                        value={currentRequest.auth?.type || 'none'}
                        onChange={(e) => setCurrentRequest(prev => ({
                          ...prev,
                          auth: { ...prev.auth!, type: e.target.value as any }
                        }))}
                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500/50"
                      >
                        <option value="none">No Auth</option>
                        <option value="basic">Basic Auth</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="apikey">API Key</option>
                      </select>

                      {currentRequest.auth?.type === 'basic' && (
                        <>
                          <input
                            type="text"
                            placeholder="Username"
                            value={currentRequest.auth.username || ''}
                            onChange={(e) => setCurrentRequest(prev => ({
                              ...prev,
                              auth: { ...prev.auth!, username: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500"
                          />
                          <input
                            type="password"
                            placeholder="Password"
                            value={currentRequest.auth.password || ''}
                            onChange={(e) => setCurrentRequest(prev => ({
                              ...prev,
                              auth: { ...prev.auth!, password: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500"
                          />
                        </>
                      )}

                      {currentRequest.auth?.type === 'bearer' && (
                        <input
                          type="text"
                          placeholder="Bearer token"
                          value={currentRequest.auth.token || ''}
                          onChange={(e) => setCurrentRequest(prev => ({
                            ...prev,
                            auth: { ...prev.auth!, token: e.target.value }
                          }))}
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500"
                        />
                      )}

                      {currentRequest.auth?.type === 'apikey' && (
                        <>
                          <input
                            type="text"
                            placeholder="Key name (e.g., X-API-Key)"
                            value={currentRequest.auth.key || ''}
                            onChange={(e) => setCurrentRequest(prev => ({
                              ...prev,
                              auth: { ...prev.auth!, key: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500"
                          />
                          <input
                            type="text"
                            placeholder="API key value"
                            value={currentRequest.auth.value || ''}
                            onChange={(e) => setCurrentRequest(prev => ({
                              ...prev,
                              auth: { ...prev.auth!, value: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500"
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Response Section */}
                {response && (
                  <div className="p-4 bg-gray-800/30">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Response</h4>

                    {/* Response Status */}
                    <div className="flex items-center gap-4 mb-4 p-3 bg-gray-900/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${getStatusColor(response.status)}`}>
                          {response.status}
                        </span>
                        <span className="text-gray-400">{response.statusText}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatTime(response.time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash size={14} />
                          {formatBytes(response.size)}
                        </span>
                      </div>
                    </div>

                    {/* Response Body */}
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-400 mb-2">Body</h5>
                      <div className="bg-gray-900/50 p-3 rounded-lg overflow-x-auto">
                        <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                          {response.body || '(no body)'}
                        </pre>
                      </div>
                    </div>

                    {/* Response Headers */}
                    <div>
                      <h5 className="text-xs font-medium text-gray-400 mb-2">Headers</h5>
                      <div className="bg-gray-900/50 p-3 rounded-lg">
                        {Object.entries(response.headers).map(([key, value]) => (
                          <div key={key} className="text-sm text-gray-300 mb-1">
                            <span className="font-medium text-gray-400">{key}:</span> {value}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Request History</h3>
              <div className="space-y-4">
                {history.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Clock size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No request history yet</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-1 rounded font-medium text-white ${
                            httpMethods.find(m => m.method === item.request.method)?.color || 'bg-gray-600'
                          }`}>
                            {item.request.method}
                          </span>
                          <div>
                            <div className="font-medium">{item.request.name || 'Untitled Request'}</div>
                            <div className="text-sm text-gray-400">{item.request.url}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>

                      {item.response && (
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`font-medium ${getStatusColor(item.response.status)}`}>
                            {item.response.status} {item.response.statusText}
                          </span>
                          <span className="text-gray-400">{formatTime(item.response.time)}</span>
                          <span className="text-gray-400">{formatBytes(item.response.size)}</span>
                        </div>
                      )}

                      {item.error && (
                        <div className="text-sm text-red-400">
                          Error: {item.error}
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => loadRequest(item.request)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                          Load Request
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'environments' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Environments</h3>
                <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-2">
                  <Plus size={14} />
                  New Environment
                </button>
              </div>

              <div className="space-y-4">
                {environments.map((env, envIndex) => (
                  <div key={envIndex} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-100">{env.name}</h4>
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-gray-400 hover:text-gray-200">
                          <Settings size={16} />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-400">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(env.variables).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400 min-w-24">{key}:</span>
                          <span className="text-gray-200 font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default APITestClient;