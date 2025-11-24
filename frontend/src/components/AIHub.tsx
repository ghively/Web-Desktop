import React, { useState, useEffect, useRef } from 'react';
import {
  Brain, MessageSquare, Code, FileText, Image, BarChart3, Languages, Zap, Settings, Send,
  Save, Trash2, Copy, Download, Upload, RefreshCw, Play, Pause, CheckCircle, XCircle, AlertTriangle,
  Plus, Edit, Eye, EyeOff, Search, Filter, Star, Clock, TrendingUp, Cpu, Globe, Server, TestTube
} from 'lucide-react';

interface AIProvider {
  id: string;
  name: string;
  type: 'ollama' | 'openrouter' | 'openai' | 'anthropic' | 'custom';
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  models: AIModel[];
  config?: Record<string, any>;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  context?: number;
  pricing?: {
    input: number;
    output: number;
  };
  capabilities?: string[];
  description?: string;
  parameters?: {
    size?: string;
    quantization?: string;
    format?: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  provider?: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  metadata?: Record<string, any>;
}

interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  provider: string;
  created: string;
  updated: string;
  metadata?: Record<string, any>;
}

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  variables: string[];
  tags: string[];
  favorite: boolean;
  usage_count: number;
}

interface CodeGenerationTask {
  id: string;
  language: string;
  prompt: string;
  code: string;
  explanation?: string;
  model: string;
  provider: string;
  timestamp: string;
}

const AIHub: React.FC<{ windowId?: string }> = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'models' | 'prompts' | 'code' | 'analytics' | 'settings'>('chat');
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [codeHistory, setCodeHistory] = useState<CodeGenerationTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories for prompt templates
  const promptCategories = [
    'Code Generation', 'Data Analysis', 'Creative Writing', 'Documentation',
    'Problem Solving', 'Learning', 'Translation', 'Summarization', 'Custom'
  ];

  // Programming languages for code generation
  const programmingLanguages = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
    'PHP', 'Ruby', 'Swift', 'Kotlin', 'SQL', 'HTML', 'CSS', 'Shell'
  ];

  useEffect(() => {
    loadProviders();
    loadConversations();
    loadPromptTemplates();
    loadCodeHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/ai-integration/providers');
      const data = await response.json();
      setProviders(data);
      if (data.length > 0 && !selectedProvider) {
        setSelectedProvider(data[0].id);
        const firstProvider = data[0];
        if (firstProvider.models.length > 0 && !selectedModel) {
          setSelectedModel(firstProvider.models[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load AI providers:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/ai-integration/conversations');
      const data = await response.json();
      setConversations(data);
      if (data.length > 0 && !currentConversation) {
        setCurrentConversation(data[0]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadPromptTemplates = async () => {
    try {
      const response = await fetch('/api/ai-integration/prompts');
      const data = await response.json();
      setPromptTemplates(data);
    } catch (error) {
      console.error('Failed to load prompt templates:', error);
    }
  };

  const loadCodeHistory = async () => {
    try {
      const response = await fetch('/api/ai-integration/code-history');
      const data = await response.json();
      setCodeHistory(data);
    } catch (error) {
      console.error('Failed to load code history:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedModel || !selectedProvider) return;

    setIsLoading(true);

    try {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: messageInput,
        timestamp: new Date().toISOString()
      };

      let conversation = currentConversation;
      if (!conversation) {
        // Create new conversation
        const newConversation: ChatConversation = {
          id: Date.now().toString(),
          title: messageInput.slice(0, 50) + (messageInput.length > 50 ? '...' : ''),
          messages: [userMessage],
          model: selectedModel,
          provider: selectedProvider,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        };
        conversation = newConversation;
        setCurrentConversation(conversation);
        setConversations(prev => [conversation, ...prev]);
      } else {
        // Add to existing conversation
        conversation.messages.push(userMessage);
        setCurrentConversation({ ...conversation });
        setConversations(prev =>
          prev.map(c => c.id === conversation.id ? conversation : c)
        );
      }

      setMessageInput('');

      const response = await fetch('/api/ai-integration/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageInput,
          model: selectedModel,
          provider: selectedProvider,
          conversationId: conversation.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: result.id,
          role: 'assistant',
          content: result.content,
          timestamp: result.timestamp,
          model: result.model,
          provider: result.provider,
          tokens: result.tokens,
          metadata: result.metadata
        };

        conversation.messages.push(assistantMessage);
        conversation.updated = new Date().toISOString();
        setCurrentConversation({ ...conversation });
        setConversations(prev =>
          prev.map(c => c.id === conversation.id ? conversation : c)
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCode = async (language: string, prompt: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-integration/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          prompt,
          model: selectedModel,
          provider: selectedProvider
        })
      });

      const result = await response.json();

      if (response.ok) {
        const codeTask: CodeGenerationTask = {
          id: Date.now().toString(),
          language,
          prompt,
          code: result.code,
          explanation: result.explanation,
          model: result.model,
          provider: result.provider,
          timestamp: new Date().toISOString()
        };

        setCodeHistory(prev => [codeTask, ...prev]);
        setActiveTab('code');
      }
    } catch (error) {
      console.error('Failed to generate code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePromptTemplate = async (template: Omit<PromptTemplate, 'id' | 'usage_count'>) => {
    try {
      const response = await fetch('/api/ai-integration/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });

      if (response.ok) {
        const saved = await response.json();
        setPromptTemplates(prev => [saved, ...prev]);
      }
    } catch (error) {
      console.error('Failed to save prompt template:', error);
    }
  };

  const exportConversation = (conversation: ChatConversation) => {
    const data = JSON.stringify(conversation, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await fetch(`/api/ai-integration/conversations/${conversationId}`, {
        method: 'DELETE'
      });

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
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

  const filteredPrompts = promptTemplates.filter(prompt =>
    prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold">AI Hub</h1>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              {providers.find(p => p.id === selectedProvider)?.models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'models'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Server className="w-4 h-4" />
            Models
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'prompts'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Prompts
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'code'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Code className="w-4 h-4" />
            Code
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 px-4 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex">
            {/* Conversations Sidebar */}
            <div className="w-64 border-r border-gray-800 bg-gray-850 overflow-y-auto">
              <div className="p-4 border-b border-gray-800">
                <button
                  onClick={() => {
                    setCurrentConversation(null);
                    setMessageInput('');
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Conversation
                </button>
              </div>

              <div className="p-2">
                {conversations.map(conversation => (
                  <div
                    key={conversation.id}
                    onClick={() => setCurrentConversation(conversation)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                      currentConversation?.id === conversation.id
                        ? 'bg-blue-600/20 border border-blue-500'
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{conversation.title}</div>
                        <div className="text-xs text-gray-400">
                          {conversation.messages.length} messages
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(conversation.updated).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                        className="p-1 hover:bg-red-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {currentConversation ? (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {currentConversation.messages.map(message => (
                      <div
                        key={message.id}
                        className={`mb-6 ${
                          message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                        }`}
                      >
                        <div className={`max-w-3xl ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-100'
                        } rounded-lg p-4`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              message.role === 'user' ? 'bg-blue-700' : 'bg-gray-700'
                            }`}>
                              {message.role === 'user' ? (
                                <MessageSquare className="w-4 h-4" />
                              ) : (
                                <Brain className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium mb-1">
                                {message.role === 'user' ? 'You' : `${message.provider} - ${message.model}`}
                              </div>
                              <div className="whitespace-pre-wrap">{message.content}</div>
                              {message.tokens && (
                                <div className="text-xs mt-2 opacity-70">
                                  {message.tokens.total} tokens
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="border-t border-gray-800 p-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        disabled={isLoading}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={isLoading || !messageInput.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Start a Conversation</h3>
                    <p className="text-gray-400">Choose a model and start chatting with AI</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Models Tab */}
        {activeTab === 'models' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {providers.map(provider => (
                <div key={provider.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {provider.type === 'ollama' ? (
                        <Cpu className="w-5 h-5 text-green-600" />
                      ) : (
                        <Globe className="w-5 h-5 text-blue-600" />
                      )}
                      {provider.name}
                    </h3>
                    <div className={`w-3 h-3 rounded-full ${
                      provider.connected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>

                  <div className="space-y-3">
                    {provider.models.map(model => (
                      <div key={model.id} className="bg-gray-700 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{model.name}</h4>
                          {model.capabilities && (
                            <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                              {model.capabilities.length} capabilities
                            </span>
                          )}
                        </div>

                        {model.context && (
                          <div className="text-xs text-gray-400 mb-1">
                            Context: {model.context.toLocaleString()} tokens
                          </div>
                        )}

                        {model.pricing && (
                          <div className="text-xs text-gray-400 mb-2">
                            <div>Input: {formatPrice(model.pricing.input)}</div>
                            <div>Output: {formatPrice(model.pricing.output)}</div>
                          </div>
                        )}

                        {model.description && (
                          <div className="text-xs text-gray-500">{model.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prompts Tab */}
        {activeTab === 'prompts' && (
          <div className="flex-1 flex">
            {/* Prompts List */}
            <div className="w-80 border-r border-gray-800 overflow-y-auto">
              <div className="p-4 border-b border-gray-800">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search prompts..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-2">
                {filteredPrompts.map(prompt => (
                  <div
                    key={prompt.id}
                    className="p-3 bg-gray-800 rounded-lg mb-2 hover:bg-gray-750 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{prompt.name}</h4>
                      <button
                        className={`p-1 rounded transition-colors ${
                          prompt.favorite ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'
                        }`}
                      >
                        <Star className="w-3 h-3" fill={prompt.favorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{prompt.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                        {prompt.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {prompt.usage_count} uses
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {prompt.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-700 text-gray-300 px-1 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt Editor */}
            <div className="flex-1 p-6">
              <div className="h-full flex flex-col">
                <h3 className="text-xl font-semibold mb-4">Create New Prompt</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      placeholder="Prompt name..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none">
                      {promptCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      placeholder="Describe your prompt..."
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Template</label>
                    <textarea
                      placeholder="Enter your prompt template... Use {{variable}} for placeholders"
                      rows={8}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none resize-none font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="tag1, tag2, tag3..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors">
                      <Save className="w-4 h-4" />
                      Save Template
                    </button>
                    <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2 transition-colors">
                      <TestTube className="w-4 h-4" />
                      Test
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Code Tab */}
        {activeTab === 'code' && (
          <div className="flex-1 flex">
            {/* Code Generation Interface */}
            <div className="flex-1 p-6">
              <div className="h-full flex flex-col">
                <h3 className="text-xl font-semibold mb-4">Code Generation</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                  <div>
                    <label className="block text-sm font-medium mb-2">Language</label>
                    <select
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none mb-4"
                      defaultValue="javascript"
                    >
                      {programmingLanguages.map(lang => (
                        <option key={lang} value={lang.toLowerCase()}>{lang}</option>
                      ))}
                    </select>

                    <label className="block text-sm font-medium mb-2">Prompt</label>
                    <textarea
                      placeholder="Describe the code you want to generate..."
                      rows={10}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none resize-none font-mono text-sm mb-4"
                    />

                    <button
                      onClick={() => generateCode('javascript', 'Example prompt')}
                      disabled={isLoading}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Code className="w-4 h-4" />
                      )}
                      Generate Code
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Generated Code</label>
                    <div className="h-96 bg-gray-950 border border-gray-700 rounded-lg p-4 font-mono text-sm text-green-400 overflow-auto">
                      <pre>{`// Generated code will appear here
function example() {
  console.log("Hello, World!");
}`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Code History */}
            <div className="w-80 border-l border-gray-800 overflow-y-auto">
              <div className="p-4 border-b border-gray-800">
                <h4 className="font-medium">Recent Generations</h4>
              </div>

              <div className="p-2">
                {codeHistory.map(task => (
                  <div key={task.id} className="p-3 bg-gray-800 rounded-lg mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                        {task.language}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(task.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2 line-clamp-2">{task.prompt}</p>
                    <div className="flex gap-2">
                      <button className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors">
                        View
                      </button>
                      <button className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors">
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Usage Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-500">
                    {conversations.reduce((sum, c) => sum + c.messages.length, 0)}
                  </div>
                  <div className="text-sm text-gray-400">Total Messages</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-500">{conversations.length}</div>
                  <div className="text-sm text-gray-400">Conversations</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-500">{codeHistory.length}</div>
                  <div className="text-sm text-gray-400">Code Generations</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-500">{promptTemplates.length}</div>
                  <div className="text-sm text-gray-400">Prompt Templates</div>
                </div>
              </div>

              {/* Model Usage */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Model Usage</h3>
                <div className="space-y-3">
                  {providers.map(provider => (
                    <div key={provider.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {provider.type === 'ollama' ? (
                          <Cpu className="w-5 h-5 text-green-600" />
                        ) : (
                          <Globe className="w-5 h-5 text-blue-600" />
                        )}
                        <span>{provider.name}</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {provider.models.length} models
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Token Usage Chart Placeholder */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Token Usage Trends</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Usage analytics coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIHub;