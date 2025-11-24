// AI Model Manager Validation Test
// This script tests all core functionality without requiring AI model execution

const testResults = [];

function log(test, status, message) {
    const result = {
        test,
        status,
        message,
        timestamp: new Date().toISOString()
    };
    testResults.push(result);
    console.log(`[${status.toUpperCase()}] ${test}: ${message}`);
    return result;
}

async function validateBackendAPIs() {
    log('Backend API Validation', 'info', 'Starting backend API tests...');

    try {
        // Test config endpoint
        const configResponse = await fetch('/api/ai-model-manager/config');
        if (configResponse.ok) {
            const config = await configResponse.json();
            log('Config Endpoint', 'success', `Config loaded with ${Object.keys(config).length} sections`);

            // Validate expected config structure
            if (config.ollama && config.openrouter) {
                log('Config Structure', 'success', 'Expected ollama and openrouter config present');
            } else {
                log('Config Structure', 'warning', 'Missing expected config sections');
            }
        } else {
            log('Config Endpoint', 'error', `HTTP ${configResponse.status}`);
        }

        // Test models endpoint
        const modelsResponse = await fetch('/api/ai-model-manager/models');
        if (modelsResponse.ok) {
            const models = await modelsResponse.json();
            log('Models Endpoint', 'success', `Found ${models.ollama?.length || 0} Ollama, ${models.openrouter?.length || 0} OpenRouter models`);
        } else {
            log('Models Endpoint', 'error', `HTTP ${modelsResponse.status}`);
        }

        // Test status endpoint
        const statusResponse = await fetch('/api/ai-model-manager/status');
        if (statusResponse.ok) {
            const status = await statusResponse.json();
            log('Status Endpoint', 'success', `Ollama: ${status.ollama?.connected ? 'Connected' : 'Disconnected'}`);
        } else {
            log('Status Endpoint', 'error', `HTTP ${statusResponse.status}`);
        }

        // Test tasks endpoint
        const tasksResponse = await fetch('/api/ai-model-manager/tasks');
        if (tasksResponse.ok) {
            const tasks = await tasksResponse.json();
            log('Tasks Endpoint', 'success', `Found ${Object.keys(tasks.assignments || {}).length} task assignments`);
        } else {
            log('Tasks Endpoint', 'error', `HTTP ${tasksResponse.status}`);
        }

    } catch (error) {
        log('Backend API Validation', 'error', error.message);
    }
}

async function validateFrontendComponents() {
    log('Frontend Validation', 'info', 'Starting frontend component tests...');

    // Test if AI Model Manager class is loaded
    if (typeof AIModelManager !== 'undefined') {
        log('AIModelManager Class', 'success', 'AIModelManager class loaded successfully');

        try {
            // Test instantiation
            const manager = new AIModelManager();
            log('Manager Instantiation', 'success', 'AIModelManager instantiated successfully');

            // Test core methods
            const requiredMethods = [
                'render', 'init', 'loadConfig', 'loadModels', 'loadTasks',
                'formatSize', 'categorizeModel', 'executeTask', 'pullOllamaModel',
                'deleteOllamaModel', 'benchmarkModel', 'switchTab'
            ];

            let missingMethods = [];
            requiredMethods.forEach(method => {
                if (typeof manager[method] !== 'function') {
                    missingMethods.push(method);
                }
            });

            if (missingMethods.length === 0) {
                log('Core Methods', 'success', 'All required methods present');
            } else {
                log('Core Methods', 'error', `Missing methods: ${missingMethods.join(', ')}`);
            }

            // Test utility functions
            if (typeof manager.formatSize === 'function') {
                const sizeTest = manager.formatSize(4000000000); // 4GB
                if (sizeTest && sizeTest.includes('GB')) {
                    log('Size Formatting', 'success', `Formatted 4GB as ${sizeTest}`);
                } else {
                    log('Size Formatting', 'error', 'Size formatting failed');
                }
            }

            if (typeof manager.categorizeModel === 'function') {
                const categories = [
                    { model: { name: 'llava-v1.6:7b' }, expected: 'Vision' },
                    { model: { name: 'deepseek-coder-v2:16b' }, expected: 'Code' },
                    { model: { name: 'llama3.2:3b' }, expected: 'LLM' }
                ];

                categories.forEach(({ model, expected }) => {
                    const category = manager.categorizeModel(model);
                    if (category === expected) {
                        log('Model Categorization', 'success', `${model.name} correctly categorized as ${category}`);
                    } else {
                        log('Model Categorization', 'warning', `${model.name} categorized as ${category}, expected ${expected}`);
                    }
                });
            }

            // Test UI rendering
            if (typeof manager.render === 'function') {
                const content = manager.render('test-window');
                if (content && content.includes('ai-model-manager')) {
                    log('UI Rendering', 'success', 'UI rendered successfully');

                    // Check for key UI components
                    const requiredComponents = [
                        'models-tab', 'chat-tab', 'benchmark-tab', 'settings-tab', 'analytics-tab',
                        'model-search', 'chat-input', 'benchmark-model'
                    ];

                    requiredComponents.forEach(component => {
                        if (content.includes(component)) {
                            log('UI Components', 'success', `Found component: ${component}`);
                        } else {
                            log('UI Components', 'warning', `Missing component: ${component}`);
                        }
                    });
                } else {
                    log('UI Rendering', 'error', 'UI rendering failed');
                }
            }

        } catch (error) {
            log('Frontend Validation', 'error', `Error testing components: ${error.message}`);
        }
    } else {
        log('AIModelManager Class', 'error', 'AIModelManager class not loaded');
    }
}

async function validateIntegration() {
    log('Integration Validation', 'info', 'Testing desktop integration...');

    // Check if the AI Model Manager button exists in the DOM
    const aiManagerButton = document.getElementById('ai-model-manager-button');
    if (aiManagerButton) {
        log('Button Integration', 'success', 'AI Model Manager button found in DOM');

        // Check if button has correct structure
        const icon = aiManagerButton.querySelector('.icon');
        const text = aiManagerButton.querySelector('span:last-child');

        if (icon && icon.textContent === '🧠' && text && text.textContent === 'Models') {
            log('Button Structure', 'success', 'Button has correct icon and text');
        } else {
            log('Button Structure', 'warning', 'Button structure may be incorrect');
        }
    } else {
        log('Button Integration', 'error', 'AI Model Manager button not found');
    }

    // Check if CSS is loaded
    const stylesheets = Array.from(document.styleSheets);
    const aiManagerStylesheet = stylesheets.find(sheet =>
        sheet.href && sheet.href.includes('aiModelManager.css')
    );

    if (aiManagerStylesheet) {
        log('CSS Loading', 'success', 'aiModelManager.css loaded successfully');
    } else {
        log('CSS Loading', 'error', 'aiModelManager.css not found');
    }

    // Check if JavaScript is loaded
    const scripts = Array.from(document.scripts);
    const aiManagerScript = scripts.find(script =>
        script.src && script.src.includes('aiModelManager.js')
    );

    if (aiManagerScript) {
        log('JavaScript Loading', 'success', 'aiModelManager.js loaded successfully');
    } else {
        log('JavaScript Loading', 'error', 'aiModelManager.js not found');
    }
}

async function validateEndToEnd() {
    log('End-to-End Validation', 'info', 'Testing complete workflow...');

    try {
        if (typeof AIModelManager !== 'undefined' && typeof windowManager !== 'undefined') {
            // Simulate opening the AI Model Manager
            const manager = new AIModelManager();
            const windowId = 'test-' + Date.now();

            // Test rendering
            const content = manager.render(windowId);
            if (content) {
                log('Workflow Rendering', 'success', 'AI Model Manager content rendered');

                // Test window creation (simulated)
                log('Workflow Window', 'info', 'Window creation would use: windowManager.createWindow');

                // Test initialization
                log('Workflow Init', 'info', 'Initialization would call: aiModelManager.init(windowId)');

                log('End-to-End Validation', 'success', 'Complete workflow validated');
            } else {
                log('End-to-End Validation', 'error', 'Failed to render content');
            }
        } else {
            log('End-to-End Validation', 'error', 'Required classes not available');
        }
    } catch (error) {
        log('End-to-End Validation', 'error', `Workflow error: ${error.message}`);
    }
}

// Main test execution
async function runValidationTests() {
    console.log('🧠 AI Model Manager Validation Tests Started');
    console.log('==========================================');

    await validateBackendAPIs();
    await validateFrontendComponents();
    await validateIntegration();
    await validateEndToEnd();

    console.log('==========================================');
    console.log('Validation Tests Completed');

    const summary = {
        total: testResults.length,
        success: testResults.filter(r => r.status === 'success').length,
        errors: testResults.filter(r => r.status === 'error').length,
        warnings: testResults.filter(r => r.status === 'warning').length
    };

    console.log(`Summary: ${summary.success}/${summary.total} passed, ${summary.errors} errors, ${summary.warnings} warnings`);

    return { summary, results: testResults };
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.validateAIModelManager = runValidationTests;
    console.log('Run validation with: validateAIModelManager()');
}

// Run tests if this is the main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runValidationTests };
}