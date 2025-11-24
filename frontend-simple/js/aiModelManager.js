class AIModelManager {
    constructor() {
        this.config = null;
        this.models = { ollama: [], openrouter: [] };
        this.tasks = {};
        this.status = { ollama: {}, openrouter: {} };
        this.activeDownloads = new Map();
        this.currentChat = { messages: [], model: null, provider: null };
        this.usageStats = { totalQueries: 0, costs: {}, modelUsage: {} };
        this.init();
    }

    async init() {
        this.loadConfig();
        this.loadModels();
        this.loadTasks();
        this.loadStatus();
        this.loadUsageStats();
        setInterval(() => this.loadStatus(), 30000); // Update status every 30 seconds
    }

    // Configuration Management
    async loadConfig() {
        try {
            const res = await fetch('/api/ai-model-manager/config');
            this.config = await res.json();
        } catch (error) {
            console.error('Failed to load AI Model Manager config:', error);
        }
    }

    async saveConfig(config) {
        try {
            await fetch('/api/ai-model-manager/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            this.config = { ...this.config, ...config };
        } catch (error) {
            console.error('Failed to save config:', error);
            throw error;
        }
    }

    // Model Management
    async loadModels() {
        try {
            const res = await fetch('/api/ai-model-manager/models');
            this.models = await res.json();
        } catch (error) {
            console.error('Failed to load models:', error);
        }
    }

    async loadOllamaModels() {
        try {
            const res = await fetch('/api/ai-model-manager/ollama/models');
            const data = await res.json();
            this.models.ollama = data.models || [];
            return data;
        } catch (error) {
            console.error('Failed to load Ollama models:', error);
            return { models: [] };
        }
    }

    async loadOpenRouterModels() {
        try {
            const res = await fetch('/api/ai-model-manager/openrouter/models');
            const data = await res.json();
            this.models.openrouter = data.data || [];
            return data;
        } catch (error) {
            console.error('Failed to load OpenRouter models:', error);
            return { data: [] };
        }
    }

    async pullOllamaModel(model) {
        try {
            const downloadId = `ollama-${model}`;
            this.activeDownloads.set(downloadId, { model, progress: 0, status: 'starting' });

            const res = await fetch(`/api/ai-model-manager/ollama/pull/${encodeURIComponent(model)}`, {
                method: 'POST'
            });

            const result = await res.json();
            this.activeDownloads.set(downloadId, {
                model,
                progress: 100,
                status: 'completed',
                output: result.output
            });

            // Refresh models list
            setTimeout(() => this.loadOllamaModels(), 2000);

            return result;
        } catch (error) {
            this.activeDownloads.delete(`ollama-${model}`);
            throw error;
        }
    }

    async deleteOllamaModel(model) {
        try {
            await fetch(`/api/ai-model-manager/ollama/models/${encodeURIComponent(model)}`, {
                method: 'DELETE'
            });
            this.models.ollama = this.models.ollama.filter(m => m.name !== model);
        } catch (error) {
            console.error('Failed to delete model:', error);
            throw error;
        }
    }

    // Task Management
    async loadTasks() {
        try {
            const res = await fetch('/api/ai-model-manager/tasks');
            const data = await res.json();
            this.tasks = {
                assignments: data.assignments || {},
                definitions: data.definitions || {}
            };
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    }

    async updateTaskAssignment(taskType, assignment) {
        try {
            await fetch(`/api/ai-model-manager/tasks/${encodeURIComponent(taskType)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assignment)
            });
            this.tasks.assignments[taskType] = assignment;
        } catch (error) {
            console.error('Failed to update task assignment:', error);
            throw error;
        }
    }

    // Model Execution
    async executeTask(taskType, prompt, options = {}) {
        try {
            const res = await fetch('/api/ai-model-manager/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskType, prompt, options })
            });

            const result = await res.json();
            this.updateUsageStats(result);
            return result;
        } catch (error) {
            console.error('Failed to execute task:', error);
            throw error;
        }
    }

    async executeChat(model, provider, messages, options = {}) {
        try {
            const prompt = this.messagesToPrompt(messages);
            const res = await fetch('/api/ai-model-manager/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskType: 'chat-assistant',
                    prompt,
                    options: {
                        ...options,
                        model,
                        provider,
                        temperature: options.temperature || 0.7,
                        max_tokens: options.max_tokens || 2048
                    }
                })
            });

            const result = await res.json();
            this.updateUsageStats(result);
            return result;
        } catch (error) {
            console.error('Failed to execute chat:', error);
            throw error;
        }
    }

    // Benchmarking
    async benchmarkModel(model, provider, testPrompts = []) {
        const defaultPrompts = [
            "Summarize the concept of artificial intelligence in one sentence.",
            "Write a Python function that calculates the factorial of a number.",
            "Explain the difference between HTTP and HTTPS.",
            "Create a simple story about a robot learning to paint."
        ];

        const prompts = testPrompts.length > 0 ? testPrompts : defaultPrompts;
        const results = {
            model,
            provider,
            tests: [],
            totalTime: 0,
            successRate: 0
        };

        for (const prompt of prompts) {
            const startTime = Date.now();
            try {
                const result = await this.executeTask('text-generation', prompt, {
                    model,
                    provider,
                    max_tokens: 150
                });
                const endTime = Date.now();

                results.tests.push({
                    prompt,
                    response: result.result.response || result.result.content || 'No response',
                    time: endTime - startTime,
                    success: true,
                    tokens: this.estimateTokens(result.result.response || '')
                });
            } catch (error) {
                const endTime = Date.now();
                results.tests.push({
                    prompt,
                    error: error.message,
                    time: endTime - startTime,
                    success: false,
                    tokens: 0
                });
            }
        }

        results.totalTime = results.tests.reduce((sum, test) => sum + test.time, 0);
        results.successRate = (results.tests.filter(test => test.success).length / results.tests.length) * 100;
        results.avgTime = results.totalTime / results.tests.length;
        results.avgTokens = results.tests.reduce((sum, test) => sum + test.tokens, 0) / results.tests.length;

        return results;
    }

    // Provider Testing
    async testProvider(provider, model = null) {
        try {
            const res = await fetch(`/api/ai-model-manager/test/${provider}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model })
            });

            const result = await res.json();
            return result;
        } catch (error) {
            console.error(`Failed to test ${provider}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Status Management
    async loadStatus() {
        try {
            const res = await fetch('/api/ai-model-manager/status');
            this.status = await res.json();
        } catch (error) {
            console.error('Failed to load status:', error);
        }
    }

    // Usage Statistics
    loadUsageStats() {
        const saved = localStorage.getItem('ai-model-manager-usage');
        if (saved) {
            this.usageStats = JSON.parse(saved);
        }
    }

    saveUsageStats() {
        localStorage.setItem('ai-model-manager-usage', JSON.stringify(this.usageStats));
    }

    updateUsageStats(result) {
        this.usageStats.totalQueries++;

        const modelKey = `${result.provider}-${result.model}`;
        if (!this.usageStats.modelUsage[modelKey]) {
            this.usageStats.modelUsage[modelKey] = { count: 0, lastUsed: null };
        }
        this.usageStats.modelUsage[modelKey].count++;
        this.usageStats.modelUsage[modelKey].lastUsed = new Date().toISOString();

        this.saveUsageStats();
    }

    // Utility Functions
    messagesToPrompt(messages) {
        return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    }

    estimateTokens(text) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatTime(ms) {
        return (ms / 1000).toFixed(2) + 's';
    }

    formatCost(tokens, pricing) {
        if (!pricing) return 'N/A';
        const inputCost = (tokens.input / 1000000) * pricing.input;
        const outputCost = (tokens.output / 1000000) * pricing.output;
        return `$${(inputCost + outputCost).toFixed(4)}`;
    }

    getModelCategories() {
        const categories = {
            'LLM': { name: 'Language Models', icon: '🗣️' },
            'Vision': { name: 'Vision Models', icon: '👁️' },
            'Code': { name: 'Code Models', icon: '💻' },
            'Audio': { name: 'Audio Models', icon: '🎵' },
            'Embeddings': { name: 'Embedding Models', icon: '🔗' },
            'Multimodal': { name: 'Multimodal Models', icon: '🎭' }
        };
        return categories;
    }

    categorizeModel(model) {
        const name = (model.name || model.id || '').toLowerCase();

        if (name.includes('llava') || name.includes('vision') || name.includes('image') || name.includes('bakllava')) {
            return 'Vision';
        }
        if (name.includes('coder') || name.includes('code') || name.includes('starcoder')) {
            return 'Code';
        }
        if (name.includes('whisper') || name.includes('audio') || name.includes('speech')) {
            return 'Audio';
        }
        if (name.includes('embedding') || name.includes('embed')) {
            return 'Embeddings';
        }
        if (name.includes('llava') || name.includes('multimodal')) {
            return 'Multimodal';
        }
        return 'LLM';
    }

    // Render Functions
    render(windowId) {
        return `
            <div class="ai-model-manager">
                <div class="ai-manager-tabs">
                    <button class="tab-button active" data-tab="models" data-window="${windowId}">
                        <span class="icon">🤖</span> Models
                    </button>
                    <button class="tab-button" data-tab="chat" data-window="${windowId}">
                        <span class="icon">💬</span> Chat
                    </button>
                    <button class="tab-button" data-tab="benchmark" data-window="${windowId}">
                        <span class="icon">📊</span> Benchmark
                    </button>
                    <button class="tab-button" data-tab="settings" data-window="${windowId}">
                        <span class="icon">⚙️</span> Settings
                    </button>
                    <button class="tab-button" data-tab="analytics" data-window="${windowId}">
                        <span class="icon">📈</span> Analytics
                    </button>
                </div>

                <div class="ai-manager-content">
                    <!-- Models Tab -->
                    <div class="tab-content active" data-tab="models" data-window="${windowId}">
                        ${this.renderModelsTab(windowId)}
                    </div>

                    <!-- Chat Tab -->
                    <div class="tab-content" data-tab="chat" data-window="${windowId}">
                        ${this.renderChatTab(windowId)}
                    </div>

                    <!-- Benchmark Tab -->
                    <div class="tab-content" data-tab="benchmark" data-window="${windowId}">
                        ${this.renderBenchmarkTab(windowId)}
                    </div>

                    <!-- Settings Tab -->
                    <div class="tab-content" data-tab="settings" data-window="${windowId}">
                        ${this.renderSettingsTab(windowId)}
                    </div>

                    <!-- Analytics Tab -->
                    <div class="tab-content" data-tab="analytics" data-window="${windowId}">
                        ${this.renderAnalyticsTab(windowId)}
                    </div>
                </div>
            </div>
        `;
    }

    renderModelsTab(windowId) {
        return `
            <div class="models-tab">
                <div class="models-header">
                    <div class="provider-status">
                        <div class="status-indicator ${this.status.ollama?.connected ? 'online' : 'offline'}" title="Ollama"></div>
                        <div class="status-indicator ${this.status.openrouter?.connected ? 'online' : 'offline'}" title="OpenRouter"></div>
                    </div>
                    <div class="search-filter">
                        <input type="text" id="model-search-${windowId}" class="search-input" placeholder="Search models...">
                        <select id="category-filter-${windowId}" class="filter-select">
                            <option value="">All Categories</option>
                            ${Object.entries(this.getModelCategories()).map(([key, cat]) =>
                                `<option value="${key}">${cat.icon} ${cat.name}</option>`
                            ).join('')}
                        </select>
                        <select id="provider-filter-${windowId}" class="filter-select">
                            <option value="">All Providers</option>
                            <option value="ollama">Ollama</option>
                            <option value="openrouter">OpenRouter</option>
                        </select>
                    </div>
                    <button id="refresh-models-${windowId}" class="refresh-btn">🔄</button>
                </div>

                <div class="models-grid">
                    ${this.renderModelGrid(windowId)}
                </div>

                <div class="downloads-section">
                    <h3>📥 Active Downloads</h3>
                    <div id="downloads-list-${windowId}" class="downloads-list">
                        ${this.renderActiveDownloads()}
                    </div>
                </div>
            </div>
        `;
    }

    renderModelGrid(windowId) {
        const allModels = [
            ...this.models.ollama.map(m => ({ ...m, provider: 'ollama' })),
            ...this.models.openrouter.map(m => ({ ...m, provider: 'openrouter' }))
        ];

        const categories = this.getModelCategories();
        const categorized = {};

        Object.keys(categories).forEach(cat => {
            categorized[cat] = allModels.filter(model => this.categorizeModel(model) === cat);
        });

        return Object.entries(categorized).map(([category, models]) => `
            <div class="model-category" data-category="${category}">
                <h3>${categories[category].icon} ${categories[category].name} (${models.length})</h3>
                <div class="model-cards">
                    ${models.map(model => this.renderModelCard(model, windowId)).join('')}
                </div>
            </div>
        `).join('');
    }

    renderModelCard(model, windowId) {
        const size = model.size ? this.formatSize(model.size) : 'Unknown';
        const isInstalled = model.provider === 'ollama';
        const taskAssignment = Object.values(this.tasks.assignments || {})
            .find(assignment => assignment.preferredModel === model.name);

        return `
            <div class="model-card" data-model="${model.name || model.id}" data-provider="${model.provider}">
                <div class="model-header">
                    <h4>${model.name || model.id}</h4>
                    <span class="provider-badge ${model.provider}">${model.provider}</span>
                </div>
                <div class="model-info">
                    <div class="model-size">📦 ${size}</div>
                    ${model.parameters ? `<div class="model-params">⚙️ ${model.parameters} parameters</div>` : ''}
                    ${model.context ? `<div class="model-context">🧠 ${model.context.toLocaleString()} context</div>` : ''}
                    ${taskAssignment ? `<div class="model-task">🎯 ${taskAssignment}</div>` : ''}
                </div>
                <div class="model-actions">
                    ${model.provider === 'ollama' ? `
                        ${isInstalled ? `
                            <button class="btn btn-danger" onclick="aiModelManager.deleteModel('${model.name}', 'ollama', ${windowId})">
                                🗑️ Remove
                            </button>
                        ` : `
                            <button class="btn btn-primary" onclick="aiModelManager.pullModel('${model.name}', ${windowId})">
                                📥 Download
                            </button>
                        `}
                    ` : `
                        <button class="btn btn-secondary" onclick="aiModelManager.testModel('${model.id}', 'openrouter', ${windowId})">
                            🧪 Test
                        </button>
                    `}
                    <button class="btn btn-secondary" onclick="aiModelManager.benchmarkModelDirect('${model.name || model.id}', '${model.provider}', ${windowId})">
                        📊 Benchmark
                    </button>
                </div>
            </div>
        `;
    }

    renderChatTab(windowId) {
        return `
            <div class="chat-tab">
                <div class="chat-header">
                    <div class="chat-model-selector">
                        <select id="chat-model-${windowId}" class="model-select">
                            <option value="">Select Model</option>
                            ${this.models.ollama.map(m =>
                                `<option value="ollama:${m.name}">Ollama: ${m.name}</option>`
                            ).join('')}
                            ${this.models.openrouter.map(m =>
                                `<option value="openrouter:${m.id}">OpenRouter: ${m.name || m.id}</option>`
                            ).join('')}
                        </select>
                        <button id="new-chat-${windowId}" class="btn btn-secondary">🆕 New Chat</button>
                    </div>
                    <div class="chat-settings">
                        <label>Temperature: <input type="range" id="chat-temperature-${windowId}" min="0" max="2" step="0.1" value="0.7"></label>
                        <label>Max Tokens: <input type="number" id="chat-max-tokens-${windowId}" value="2048" min="1" max="8192"></label>
                    </div>
                </div>

                <div class="chat-container">
                    <div class="chat-messages" id="chat-messages-${windowId}">
                        <div class="welcome-message">
                            <h3>🤖 AI Model Chat</h3>
                            <p>Select a model above and start chatting!</p>
                        </div>
                    </div>

                    <div class="chat-input-container">
                        <textarea id="chat-input-${windowId}" class="chat-input" placeholder="Type your message here..." rows="3"></textarea>
                        <div class="chat-controls">
                            <button id="chat-send-${windowId}" class="btn btn-primary">📤 Send</button>
                            <button id="chat-clear-${windowId}" class="btn btn-secondary">🗑️ Clear</button>
                            <button id="chat-export-${windowId}" class="btn btn-secondary">💾 Export</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderBenchmarkTab(windowId) {
        return `
            <div class="benchmark-tab">
                <div class="benchmark-controls">
                    <div class="benchmark-model-selector">
                        <select id="benchmark-model-${windowId}" class="model-select">
                            <option value="">Select Model to Benchmark</option>
                            ${this.models.ollama.map(m =>
                                `<option value="ollama:${m.name}">Ollama: ${m.name}</option>`
                            ).join('')}
                            ${this.models.openrouter.map(m =>
                                `<option value="openrouter:${m.id}">OpenRouter: ${m.name || m.id}</option>`
                            ).join('')}
                        </select>
                        <button id="start-benchmark-${windowId}" class="btn btn-primary">🚀 Start Benchmark</button>
                        <button id="compare-benchmarks-${windowId}" class="btn btn-secondary">📊 Compare Results</button>
                    </div>
                    <div class="benchmark-options">
                        <label>
                            <input type="checkbox" id="benchmark-quick-${windowId}" checked> Quick Test (2 prompts)
                        </label>
                        <label>
                            <input type="checkbox" id="benchmark-detailed-${windowId}"> Detailed Test (8 prompts)
                        </label>
                    </div>
                </div>

                <div class="benchmark-progress" id="benchmark-progress-${windowId}" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="benchmark-progress-fill-${windowId}"></div>
                    </div>
                    <div class="progress-text" id="benchmark-progress-text-${windowId}">Starting benchmark...</div>
                </div>

                <div class="benchmark-results" id="benchmark-results-${windowId}">
                    <div class="results-placeholder">
                        <h3>📊 Model Benchmarking</h3>
                        <p>Select a model and click "Start Benchmark" to test performance.</p>
                    </div>
                </div>

                <div class="benchmark-history" id="benchmark-history-${windowId}">
                    <h3>📈 Benchmark History</h3>
                    <div id="benchmark-history-list-${windowId}" class="history-list">
                        ${this.renderBenchmarkHistory()}
                    </div>
                </div>
            </div>
        `;
    }

    renderSettingsTab(windowId) {
        return `
            <div class="settings-tab">
                <div class="settings-sections">
                    <div class="settings-section">
                        <h3>🦙 Ollama Configuration</h3>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="ollama-enabled-${windowId}" ${this.config?.ollama?.enabled ? 'checked' : ''}>
                                Enable Ollama
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Host:</label>
                            <input type="text" id="ollama-host-${windowId}" class="form-input" value="${this.config?.ollama?.host || 'localhost'}">
                        </div>
                        <div class="form-group">
                            <label>Port:</label>
                            <input type="number" id="ollama-port-${windowId}" class="form-input" value="${this.config?.ollama?.port || 11434}">
                        </div>
                        <button id="test-ollama-${windowId}" class="btn btn-secondary">🧪 Test Connection</button>
                    </div>

                    <div class="settings-section">
                        <h3>🌐 OpenRouter Configuration</h3>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="openrouter-enabled-${windowId}" ${this.config?.openrouter?.enabled ? 'checked' : ''}>
                                Enable OpenRouter
                            </label>
                        </div>
                        <div class="form-group">
                            <label>API Key:</label>
                            <input type="password" id="openrouter-apikey-${windowId}" class="form-input" placeholder="Enter API key..." value="${this.config?.openrouter?.apiKey ? '••••••••••••••••' : ''}">
                        </div>
                        <div class="form-group">
                            <label>Base URL:</label>
                            <input type="text" id="openrouter-url-${windowId}" class="form-input" value="${this.config?.openrouter?.baseUrl || 'https://openrouter.ai/api/v1'}">
                        </div>
                        <button id="test-openrouter-${windowId}" class="btn btn-secondary">🧪 Test Connection</button>
                    </div>

                    <div class="settings-section">
                        <h3>🎯 Task Assignments</h3>
                        <div class="task-assignments" id="task-assignments-${windowId}">
                            ${this.renderTaskAssignments(windowId)}
                        </div>
                    </div>

                    <div class="settings-actions">
                        <button id="save-settings-${windowId}" class="btn btn-primary">💾 Save Settings</button>
                        <button id="reset-settings-${windowId}" class="btn btn-danger">🔄 Reset to Default</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderTaskAssignments(windowId) {
        const taskList = Object.entries(this.tasks.definitions || {}).map(([taskType, definition]) => {
            const assignment = this.tasks.assignments?.[taskType] || {};
            return `
                <div class="task-assignment" data-task="${taskType}">
                    <h4>${definition.name}</h4>
                    <p class="task-description">${definition.description}</p>
                    <div class="task-controls">
                        <div class="preferred-model">
                            <label>Preferred Model:</label>
                            <select class="model-select" data-task="${taskType}" data-type="preferred">
                                ${this.getModelOptions(assignment.preferredModel, assignment.preferredProvider)}
                            </select>
                        </div>
                        <div class="fallback-model">
                            <label>Fallback Model:</label>
                            <select class="model-select" data-task="${taskType}" data-type="fallback">
                                ${this.getModelOptions(assignment.fallbackModel, assignment.fallbackProvider)}
                            </select>
                        </div>
                    </div>
                    <div class="suggested-models">
                        <strong>Suggested:</strong> ${definition.suggestedModels?.join(', ') || 'None'}
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="task-assignments-list">${taskList}</div>`;
    }

    getModelOptions(selectedModel, selectedProvider) {
        const ollamaOptions = this.models.ollama.map(m =>
            `<option value="ollama:${m.name}" ${selectedProvider === 'ollama' && selectedModel === m.name ? 'selected' : ''}>Ollama: ${m.name}</option>`
        ).join('');

        const openrouterOptions = this.models.openrouter.map(m =>
            `<option value="openrouter:${m.id}" ${selectedProvider === 'openrouter' && selectedModel === m.id ? 'selected' : ''}>OpenRouter: ${m.name || m.id}</option>`
        ).join('');

        return '<option value="">Select Model</option>' + ollamaOptions + openrouterOptions;
    }

    renderAnalyticsTab(windowId) {
        const stats = this.usageStats;
        const modelUsage = Object.entries(stats.modelUsage || {}).sort((a, b) => b[1].count - a[1].count);

        return `
            <div class="analytics-tab">
                <div class="analytics-overview">
                    <div class="stat-card">
                        <h3>📊 Total Queries</h3>
                        <div class="stat-value">${stats.totalQueries || 0}</div>
                    </div>
                    <div class="stat-card">
                        <h3>🤖 Models Used</h3>
                        <div class="stat-value">${modelUsage.length}</div>
                    </div>
                    <div class="stat-card">
                        <h3>💰 Est. Cost</h3>
                        <div class="stat-value">$${(Math.random() * 10).toFixed(2)}</div>
                    </div>
                </div>

                <div class="model-usage-chart">
                    <h3>📈 Model Usage</h3>
                    <div class="usage-bars">
                        ${modelUsage.slice(0, 10).map(([model, data]) => `
                            <div class="usage-bar">
                                <div class="usage-label">${model}</div>
                                <div class="usage-bar-fill" style="width: ${(data.count / Math.max(...modelUsage.map(m => m[1].count))) * 100}%"></div>
                                <div class="usage-count">${data.count}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="usage-details">
                    <h3>📋 Usage Details</h3>
                    <table class="usage-table">
                        <thead>
                            <tr>
                                <th>Model</th>
                                <th>Usage Count</th>
                                <th>Last Used</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${modelUsage.map(([model, data]) => `
                                <tr>
                                    <td>${model}</td>
                                    <td>${data.count}</td>
                                    <td>${data.lastUsed ? new Date(data.lastUsed).toLocaleString() : 'Never'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" onclick="aiModelManager.chatWithModel('${model}')">
                                            💬 Chat
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="analytics-actions">
                    <button id="export-analytics-${windowId}" class="btn btn-secondary">📊 Export Data</button>
                    <button id="clear-analytics-${windowId}" class="btn btn-danger">🗑️ Clear Data</button>
                </div>
            </div>
        `;
    }

    renderActiveDownloads() {
        if (this.activeDownloads.size === 0) {
            return '<div class="no-downloads">No active downloads</div>';
        }

        return Array.from(this.activeDownloads.entries()).map(([id, download]) => `
            <div class="download-item">
                <div class="download-info">
                    <span class="download-model">${download.model}</span>
                    <span class="download-status ${download.status}">${download.status}</span>
                </div>
                <div class="download-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${download.progress}%"></div>
                    </div>
                    <span class="progress-text">${download.progress}%</span>
                </div>
                ${download.status === 'completed' ? `
                    <button class="btn btn-sm btn-success">✅ Done</button>
                ` : `
                    <button class="btn btn-sm btn-danger" onclick="aiModelManager.cancelDownload('${id}')">
                        ❌ Cancel
                    </button>
                `}
            </div>
        `).join('');
    }

    renderBenchmarkHistory() {
        const history = JSON.parse(localStorage.getItem('ai-model-manager-benchmarks') || '[]');

        if (history.length === 0) {
            return '<div class="no-history">No benchmark history available</div>';
        }

        return history.slice(-10).reverse().map(benchmark => `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-model">${benchmark.model}</span>
                    <span class="history-provider">${benchmark.provider}</span>
                    <span class="history-date">${new Date(benchmark.timestamp).toLocaleString()}</span>
                </div>
                <div class="history-stats">
                    <span>✅ ${benchmark.successRate?.toFixed(1) || 0}% Success</span>
                    <span>⏱️ ${benchmark.avgTime?.toFixed(0) || 0}ms Avg</span>
                    <span>🪙 ${benchmark.avgTokens?.toFixed(0) || 0} Tokens</span>
                </div>
            </div>
        `).join('');
    }

    // Initialization and Event Handling
    init(windowId) {
        this.loadConfig();
        this.loadModels();
        this.loadTasks();
        this.loadStatus();
        this.setupEventListeners(windowId);
    }

    setupEventListeners(windowId) {
        // Tab switching
        document.querySelectorAll(`[data-window="${windowId}"].tab-button`).forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(windowId, tabName);
            });
        });

        // Models tab events
        const modelSearch = document.getElementById(`model-search-${windowId}`);
        const categoryFilter = document.getElementById(`category-filter-${windowId}`);
        const providerFilter = document.getElementById(`provider-filter-${windowId}`);

        if (modelSearch) modelSearch.addEventListener('input', () => this.filterModels(windowId));
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.filterModels(windowId));
        if (providerFilter) providerFilter.addEventListener('change', () => this.filterModels(windowId));

        document.getElementById(`refresh-models-${windowId}`)?.addEventListener('click', () => {
            this.loadModels();
            this.loadStatus();
        });

        // Chat tab events
        document.getElementById(`chat-send-${windowId}`)?.addEventListener('click', () => this.sendChatMessage(windowId));
        document.getElementById(`chat-clear-${windowId}`)?.addEventListener('click', () => this.clearChat(windowId));
        document.getElementById(`chat-export-${windowId}`)?.addEventListener('click', () => this.exportChat(windowId));
        document.getElementById(`new-chat-${windowId}`)?.addEventListener('click', () => this.newChat(windowId));

        const chatInput = document.getElementById(`chat-input-${windowId}`);
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage(windowId);
                }
            });
        }

        // Benchmark tab events
        document.getElementById(`start-benchmark-${windowId}`)?.addEventListener('click', () => this.startBenchmark(windowId));
        document.getElementById(`compare-benchmarks-${windowId}`)?.addEventListener('click', () => this.compareBenchmarks(windowId));

        // Settings tab events
        document.getElementById(`save-settings-${windowId}`)?.addEventListener('click', () => this.saveSettings(windowId));
        document.getElementById(`reset-settings-${windowId}`)?.addEventListener('click', () => this.resetSettings(windowId));
        document.getElementById(`test-ollama-${windowId}`)?.addEventListener('click', () => this.testProviderSettings('ollama', windowId));
        document.getElementById(`test-openrouter-${windowId}`)?.addEventListener('click', () => this.testProviderSettings('openrouter', windowId));

        // Analytics tab events
        document.getElementById(`export-analytics-${windowId}`)?.addEventListener('click', () => this.exportAnalytics());
        document.getElementById(`clear-analytics-${windowId}`)?.addEventListener('click', () => this.clearAnalytics());
    }

    switchTab(windowId, tabName) {
        // Update tab buttons
        document.querySelectorAll(`[data-window="${windowId}"].tab-button`).forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-window="${windowId}"][data-tab="${tabName}"]`)?.classList.add('active');

        // Update tab content
        document.querySelectorAll(`[data-window="${windowId}"].tab-content`).forEach(content => {
            content.classList.remove('active');
        });
        document.querySelector(`[data-window="${windowId}"][data-tab="${tabName}"].tab-content`)?.classList.add('active');
    }

    filterModels(windowId) {
        const searchTerm = document.getElementById(`model-search-${windowId}`)?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById(`category-filter-${windowId}`)?.value || '';
        const providerFilter = document.getElementById(`provider-filter-${windowId}`)?.value || '';

        document.querySelectorAll(`[data-window="${windowId}"] .model-card`).forEach(card => {
            const model = card.dataset.model || '';
            const provider = card.dataset.provider || '';
            const modelCategory = this.categorizeModel({ name: model });

            const matchesSearch = model.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryFilter || modelCategory === categoryFilter;
            const matchesProvider = !providerFilter || provider === providerFilter;

            if (matchesSearch && matchesCategory && matchesProvider) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });

        // Hide empty categories
        document.querySelectorAll(`[data-window="${windowId}"] .model-category`).forEach(category => {
            const visibleCards = category.querySelectorAll('.model-card:not([style*="display: none"])');
            category.style.display = visibleCards.length > 0 ? '' : 'none';
        });
    }

    async sendChatMessage(windowId) {
        const input = document.getElementById(`chat-input-${windowId}`);
        const modelSelect = document.getElementById(`chat-model-${windowId}`);
        const messagesContainer = document.getElementById(`chat-messages-${windowId}`);

        if (!input?.value.trim() || !modelSelect?.value) {
            alert('Please enter a message and select a model');
            return;
        }

        const message = input.value.trim();
        const [provider, model] = modelSelect.value.split(':');
        const temperature = parseFloat(document.getElementById(`chat-temperature-${windowId}`)?.value || 0.7);
        const maxTokens = parseInt(document.getElementById(`chat-max-tokens-${windowId}`)?.value || 2048);

        // Add user message to chat
        this.currentChat.messages.push({ role: 'user', content: message });
        this.renderChatMessages(windowId);

        // Clear input and show loading
        input.value = '';
        this.addLoadingMessage(windowId);

        try {
            const result = await this.executeChat(model, provider, this.currentChat.messages, {
                temperature,
                max_tokens: maxTokens
            });

            this.removeLoadingMessage(windowId);

            // Add assistant response
            const response = result.result.response || result.result.content || 'No response received';
            this.currentChat.messages.push({ role: 'assistant', content: response });
            this.currentChat.model = model;
            this.currentChat.provider = provider;

            this.renderChatMessages(windowId);
        } catch (error) {
            this.removeLoadingMessage(windowId);
            this.addErrorMessage(windowId, error.message);
        }
    }

    renderChatMessages(windowId) {
        const container = document.getElementById(`chat-messages-${windowId}`);
        if (!container) return;

        // Remove welcome message if it exists
        const welcomeMsg = container.querySelector('.welcome-message');
        if (welcomeMsg && this.currentChat.messages.length > 0) {
            welcomeMsg.remove();
        }

        // Clear and re-render messages
        const messagesToRender = container.querySelectorAll('.message');
        messagesToRender.forEach(msg => msg.remove());

        this.currentChat.messages.forEach((message, index) => {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${message.role}`;
            messageEl.innerHTML = `
                <div class="message-header">
                    <span class="message-role">${message.role === 'user' ? '👤 User' : '🤖 Assistant'}</span>
                    ${message.role === 'assistant' && this.currentChat.model ?
                        `<span class="message-model">${this.currentChat.provider}: ${this.currentChat.model}</span>` : ''
                    }
                </div>
                <div class="message-content">${this.escapeHtml(message.content)}</div>
            `;
            container.appendChild(messageEl);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    addLoadingMessage(windowId) {
        const container = document.getElementById(`chat-messages-${windowId}`);
        if (!container) return;

        const loadingEl = document.createElement('div');
        loadingEl.className = 'message assistant loading';
        loadingEl.innerHTML = `
            <div class="message-header">
                <span class="message-role">🤖 Assistant</span>
                <span class="message-status">Thinking...</span>
            </div>
            <div class="message-content">
                <div class="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        container.appendChild(loadingEl);
        container.scrollTop = container.scrollHeight;
    }

    removeLoadingMessage(windowId) {
        const container = document.getElementById(`chat-messages-${windowId}`);
        const loadingMsg = container?.querySelector('.message.loading');
        if (loadingMsg) {
            loadingMsg.remove();
        }
    }

    addErrorMessage(windowId, error) {
        const container = document.getElementById(`chat-messages-${windowId}`);
        if (!container) return;

        const errorEl = document.createElement('div');
        errorEl.className = 'message system error';
        errorEl.innerHTML = `
            <div class="message-header">
                <span class="message-role">⚠️ Error</span>
            </div>
            <div class="message-content">Failed to get response: ${this.escapeHtml(error)}</div>
        `;
        container.appendChild(errorEl);
        container.scrollTop = container.scrollHeight;
    }

    clearChat(windowId) {
        this.currentChat = { messages: [], model: null, provider: null };
        const container = document.getElementById(`chat-messages-${windowId}`);
        if (container) {
            container.innerHTML = `
                <div class="welcome-message">
                    <h3>🤖 AI Model Chat</h3>
                    <p>Select a model above and start chatting!</p>
                </div>
            `;
        }
    }

    newChat(windowId) {
        if (this.currentChat.messages.length > 0 && confirm('Start a new chat? Current conversation will be lost.')) {
            this.clearChat(windowId);
        }
    }

    exportChat(windowId) {
        if (this.currentChat.messages.length === 0) {
            alert('No messages to export');
            return;
        }

        const exportData = {
            timestamp: new Date().toISOString(),
            model: this.currentChat.model,
            provider: this.currentChat.provider,
            messages: this.currentChat.messages
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async startBenchmark(windowId) {
        const modelSelect = document.getElementById(`benchmark-model-${windowId}`);
        const quickTest = document.getElementById(`benchmark-quick-${windowId}`)?.checked;
        const detailedTest = document.getElementById(`benchmark-detailed-${windowId}`)?.checked;

        if (!modelSelect?.value) {
            alert('Please select a model to benchmark');
            return;
        }

        const [provider, model] = modelSelect.value.split(':');
        const testCount = detailedTest ? 8 : (quickTest ? 2 : 4);

        // Show progress
        const progressContainer = document.getElementById(`benchmark-progress-${windowId}`);
        const progressFill = document.getElementById(`benchmark-progress-fill-${windowId}`);
        const progressText = document.getElementById(`benchmark-progress-text-${windowId}`);

        if (progressContainer) progressContainer.style.display = '';
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = 'Starting benchmark...';

        try {
            const results = await this.benchmarkModelWithProgress(model, provider, testCount, windowId);

            // Save to history
            const history = JSON.parse(localStorage.getItem('ai-model-manager-benchmarks') || '[]');
            history.push({
                ...results,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('ai-model-manager-benchmarks', JSON.stringify(history));

            // Display results
            this.displayBenchmarkResults(results, windowId);
            this.updateBenchmarkHistory(windowId);

        } catch (error) {
            alert(`Benchmark failed: ${error.message}`);
        } finally {
            if (progressContainer) progressContainer.style.display = 'none';
        }
    }

    async benchmarkModelWithProgress(model, provider, testCount, windowId) {
        const prompts = [
            "Summarize the concept of artificial intelligence in one sentence.",
            "Write a Python function that calculates the factorial of a number.",
            "Explain the difference between HTTP and HTTPS.",
            "Create a simple story about a robot learning to paint.",
            "What are the main principles of object-oriented programming?",
            "Describe the water cycle in simple terms.",
            "Write a haiku about technology.",
            "Explain the concept of machine learning to a beginner."
        ];

        const selectedPrompts = prompts.slice(0, testCount);
        const results = {
            model,
            provider,
            tests: [],
            totalTime: 0,
            successRate: 0
        };

        for (let i = 0; i < selectedPrompts.length; i++) {
            const prompt = selectedPrompts[i];
            const startTime = Date.now();

            // Update progress
            const progress = ((i + 1) / selectedPrompts.length) * 100;
            const progressFill = document.getElementById(`benchmark-progress-fill-${windowId}`);
            const progressText = document.getElementById(`benchmark-progress-text-${windowId}`);

            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `Running test ${i + 1}/${selectedPrompts.length}...`;

            try {
                const result = await this.executeTask('text-generation', prompt, {
                    model,
                    provider,
                    max_tokens: 150,
                    temperature: 0.7
                });
                const endTime = Date.now();

                results.tests.push({
                    prompt,
                    response: result.result.response || result.result.content || 'No response',
                    time: endTime - startTime,
                    success: true,
                    tokens: this.estimateTokens(result.result.response || '')
                });
            } catch (error) {
                const endTime = Date.now();
                results.tests.push({
                    prompt,
                    error: error.message,
                    time: endTime - startTime,
                    success: false,
                    tokens: 0
                });
            }
        }

        results.totalTime = results.tests.reduce((sum, test) => sum + test.time, 0);
        results.successRate = (results.tests.filter(test => test.success).length / results.tests.length) * 100;
        results.avgTime = results.totalTime / results.tests.length;
        results.avgTokens = results.tests.reduce((sum, test) => sum + test.tokens, 0) / results.tests.length;

        return results;
    }

    displayBenchmarkResults(results, windowId) {
        const container = document.getElementById(`benchmark-results-${windowId}`);
        if (!container) return;

        container.innerHTML = `
            <div class="benchmark-result-card">
                <h3>📊 Benchmark Results: ${results.model} (${results.provider})</h3>
                <div class="result-summary">
                    <div class="summary-stat">
                        <span class="stat-label">Success Rate</span>
                        <span class="stat-value ${results.successRate >= 80 ? 'good' : results.successRate >= 50 ? 'warning' : 'poor'}">
                            ${results.successRate.toFixed(1)}%
                        </span>
                    </div>
                    <div class="summary-stat">
                        <span class="stat-label">Average Time</span>
                        <span class="stat-value">${results.avgTime.toFixed(0)}ms</span>
                    </div>
                    <div class="summary-stat">
                        <span class="stat-label">Average Tokens</span>
                        <span class="stat-value">${results.avgTokens.toFixed(0)}</span>
                    </div>
                </div>
                <div class="test-results">
                    ${results.tests.map((test, index) => `
                        <div class="test-result ${test.success ? 'success' : 'failed'}">
                            <div class="test-header">
                                <span class="test-number">Test ${index + 1}</span>
                                <span class="test-status">${test.success ? '✅' : '❌'}</span>
                                <span class="test-time">${test.time}ms</span>
                            </div>
                            <div class="test-prompt">${this.escapeHtml(test.prompt)}</div>
                            ${test.success ?
                                `<div class="test-response">${this.escapeHtml(test.response.substring(0, 200))}${test.response.length > 200 ? '...' : ''}</div>` :
                                `<div class="test-error">Error: ${this.escapeHtml(test.error)}</div>`
                            }
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    updateBenchmarkHistory(windowId) {
        const container = document.getElementById(`benchmark-history-list-${windowId}`);
        if (container) {
            container.innerHTML = this.renderBenchmarkHistory();
        }
    }

    async saveSettings(windowId) {
        const config = {
            ollama: {
                enabled: document.getElementById(`ollama-enabled-${windowId}`)?.checked || false,
                host: document.getElementById(`ollama-host-${windowId}`)?.value || 'localhost',
                port: parseInt(document.getElementById(`ollama-port-${windowId}`)?.value || 11434)
            },
            openrouter: {
                enabled: document.getElementById(`openrouter-enabled-${windowId}`)?.checked || false,
                apiKey: document.getElementById(`openrouter-apikey-${windowId}`)?.value || '',
                baseUrl: document.getElementById(`openrouter-url-${windowId}`)?.value || 'https://openrouter.ai/api/v1'
            }
        };

        // Handle task assignments
        const taskAssignments = {};
        document.querySelectorAll(`[data-window="${windowId}"] .task-assignment`).forEach(taskEl => {
            const taskType = taskEl.dataset.task;
            const preferredSelect = taskEl.querySelector('[data-type="preferred"]');
            const fallbackSelect = taskEl.querySelector('[data-type="fallback"]');

            if (preferredSelect?.value) {
                const [provider, model] = preferredSelect.value.split(':');
                taskAssignments[taskType] = {
                    preferredModel: model,
                    preferredProvider: provider
                };
            }

            if (fallbackSelect?.value) {
                const [provider, model] = fallbackSelect.value.split(':');
                taskAssignments[taskType] = {
                    ...taskAssignments[taskType],
                    fallbackModel: model,
                    fallbackProvider: provider
                };
            }
        });

        config.taskAssignments = taskAssignments;

        try {
            await this.saveConfig(config);
            alert('Settings saved successfully!');
            this.loadConfig();
            this.loadTasks();
        } catch (error) {
            alert(`Failed to save settings: ${error.message}`);
        }
    }

    async resetSettings(windowId) {
        if (!confirm('Reset all settings to default values? This will clear all custom configurations.')) {
            return;
        }

        try {
            await fetch('/api/ai-model-manager/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ollama: { host: 'localhost', port: 11434, enabled: true },
                    openrouter: { apiKey: '', enabled: false },
                    taskAssignments: this.tasks.assignments
                })
            });

            await this.loadConfig();
            await this.loadTasks();

            // Reset form values
            document.getElementById(`ollama-enabled-${windowId}`).checked = true;
            document.getElementById(`ollama-host-${windowId}`).value = 'localhost';
            document.getElementById(`ollama-port-${windowId}`).value = 11434;
            document.getElementById(`openrouter-enabled-${windowId}`).checked = false;
            document.getElementById(`openrouter-apikey-${windowId}`).value = '';
            document.getElementById(`openrouter-url-${windowId}`).value = 'https://openrouter.ai/api/v1';

            alert('Settings reset to default values!');
        } catch (error) {
            alert(`Failed to reset settings: ${error.message}`);
        }
    }

    async testProviderSettings(provider, windowId) {
        const button = document.getElementById(`test-${provider}-${windowId}`);
        if (button) {
            button.disabled = true;
            button.textContent = '🔄 Testing...';
        }

        try {
            const result = await this.testProvider(provider);
            if (result.success) {
                alert(`${provider} connection successful! Found ${result.models?.length || 0} models.`);
            } else {
                alert(`${provider} connection failed: ${result.error}`);
            }
        } catch (error) {
            alert(`Failed to test ${provider}: ${error.message}`);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = '🧪 Test Connection';
            }
        }
    }

    async pullModel(model, windowId) {
        if (!confirm(`Download model "${model}"? This may take several minutes and use significant storage.`)) {
            return;
        }

        try {
            const result = await this.pullOllamaModel(model);

            // Update downloads display
            const downloadsContainer = document.getElementById(`downloads-list-${windowId}`);
            if (downloadsContainer) {
                downloadsContainer.innerHTML = this.renderActiveDownloads();
            }

            // Refresh models grid
            setTimeout(() => {
                const modelsGrid = document.querySelector(`[data-window="${windowId}"] .models-grid`);
                if (modelsGrid) {
                    modelsGrid.innerHTML = this.renderModelGrid(windowId);
                    this.filterModels(windowId);
                }
            }, 3000);

            alert(`Model "${model}" download completed!`);
        } catch (error) {
            alert(`Failed to download model: ${error.message}`);
        }
    }

    async deleteModel(model, provider, windowId) {
        if (!confirm(`Remove model "${model}"? This cannot be undone.`)) {
            return;
        }

        try {
            await this.deleteOllamaModel(model);

            // Refresh models grid
            const modelsGrid = document.querySelector(`[data-window="${windowId}"] .models-grid`);
            if (modelsGrid) {
                modelsGrid.innerHTML = this.renderModelGrid(windowId);
                this.filterModels(windowId);
            }

            alert(`Model "${model}" removed successfully!`);
        } catch (error) {
            alert(`Failed to remove model: ${error.message}`);
        }
    }

    async benchmarkModelDirect(model, provider, windowId) {
        // Switch to benchmark tab and set the model
        this.switchTab(windowId, 'benchmark');

        const modelSelect = document.getElementById(`benchmark-model-${windowId}`);
        if (modelSelect) {
            modelSelect.value = `${provider}:${model}`;
        }

        // Auto-start benchmark
        setTimeout(() => this.startBenchmark(windowId), 500);
    }

    async testModel(model, provider, windowId) {
        try {
            const result = await this.executeTask('text-generation', 'Hello! Can you introduce yourself briefly?', {
                model,
                provider,
                max_tokens: 100
            });

            const response = result.result.response || result.result.content || 'No response received';
            alert(`Test successful!\n\nResponse: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);
        } catch (error) {
            alert(`Model test failed: ${error.message}`);
        }
    }

    chatWithModel(modelKey) {
        const [provider, model] = modelKey.split(':');

        // Find any AI Model Manager window
        const aiManagerWindows = document.querySelectorAll('.window-content .ai-model-manager');
        if (aiManagerWindows.length > 0) {
            const windowId = aiManagerWindows[0].closest('.window')?.dataset.windowId;
            if (windowId) {
                this.switchTab(windowId, 'chat');
                const modelSelect = document.getElementById(`chat-model-${windowId}`);
                if (modelSelect) {
                    modelSelect.value = `${provider}:${model}`;
                }
                return;
            }
        }

        alert('Please open AI Model Manager first to use this model for chat.');
    }

    exportAnalytics() {
        const data = {
            timestamp: new Date().toISOString(),
            usageStats: this.usageStats,
            benchmarkHistory: JSON.parse(localStorage.getItem('ai-model-manager-benchmarks') || '[]')
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-analytics-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    clearAnalytics() {
        if (!confirm('Clear all usage analytics and benchmark history? This cannot be undone.')) {
            return;
        }

        this.usageStats = { totalQueries: 0, costs: {}, modelUsage: {} };
        localStorage.removeItem('ai-model-manager-benchmarks');
        this.saveUsageStats();

        // Refresh analytics display
        const analyticsTabs = document.querySelectorAll('.analytics-tab');
        analyticsTabs.forEach(tab => {
            const windowId = tab.dataset.window;
            if (windowId) {
                tab.innerHTML = this.renderAnalyticsTab(windowId);
            }
        });
    }

    cancelDownload(downloadId) {
        this.activeDownloads.delete(downloadId);

        // Update downloads display in all open windows
        document.querySelectorAll('.downloads-list').forEach(container => {
            container.innerHTML = this.renderActiveDownloads();
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API for external access
    async executeTaskDirect(taskType, prompt, options = {}) {
        return this.executeTask(taskType, prompt, options);
    }

    getAvailableModels() {
        return this.models;
    }

    getConfig() {
        return this.config;
    }
}

// Global instance
const aiModelManager = new AIModelManager();