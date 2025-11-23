import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const router = express.Router();

// Configuration storage
const CONFIG_FILE = path.join(process.env.HOME || '', '.web-desktop', 'ai-model-manager.json');

// Default configuration
const DEFAULT_CONFIG = {
  ollama: {
    host: 'localhost',
    port: 11434,
    enabled: true
  },
  openrouter: {
    apiKey: '',
    enabled: false,
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  taskAssignments: {
    'file-analysis': {
      preferredModel: 'llama3.2:3b',
      provider: 'ollama',
      fallbackModel: 'llama3.2:1b',
      fallbackProvider: 'ollama'
    },
    'code-generation': {
      preferredModel: 'deepseek-coder-v2:16b',
      provider: 'ollama',
      fallbackModel: 'codellama:13b',
      fallbackProvider: 'ollama'
    },
    'text-generation': {
      preferredModel: 'llama3.1:8b',
      provider: 'ollama',
      fallbackModel: 'gpt-3.5-turbo',
      fallbackProvider: 'openrouter'
    },
    'image-analysis': {
      preferredModel: 'llava-v1.6:7b',
      provider: 'ollama',
      fallbackModel: 'llava-v1.5:7b',
      fallbackProvider: 'ollama'
    },
    'document-processing': {
      preferredModel: 'qwen2.5:14b',
      provider: 'ollama',
      fallbackModel: 'gpt-4o-mini',
      fallbackProvider: 'openrouter'
    },
    'chat-assistant': {
      preferredModel: 'llama3.1:70b',
      provider: 'ollama',
      fallbackModel: 'claude-3-haiku',
      fallbackProvider: 'openrouter'
    }
  }
};

// Task definitions with model requirements
const TASK_DEFINITIONS = {
  'file-analysis': {
    name: 'File Analysis',
    description: 'Analyze file content, metadata, and categorize files',
    requirements: ['text-processing'],
    suggestedModels: ['llama3.2:3b', 'qwen2.5:7b', 'phi3.5:3.8b']
  },
  'code-generation': {
    name: 'Code Generation',
    description: 'Generate, review, and optimize code',
    requirements: ['code-understanding'],
    suggestedModels: ['deepseek-coder-v2:16b', 'codellama:13b', 'starcoder2:15b']
  },
  'text-generation': {
    name: 'Text Generation',
    description: 'Generate creative and analytical text content',
    requirements: ['creativity', 'knowledge'],
    suggestedModels: ['llama3.1:8b', 'mixtral:8x7b', 'qwen2.5:14b']
  },
  'image-analysis': {
    name: 'Image Analysis',
    description: 'Analyze images and extract visual information',
    requirements: ['vision'],
    suggestedModels: ['llava-v1.6:7b', 'llava-v1.5:7b', 'bakllava:7b']
  },
  'document-processing': {
    name: 'Document Processing',
    description: 'Process and understand complex documents',
    requirements: ['document-understanding', 'reasoning'],
    suggestedModels: ['qwen2.5:14b', 'llama3.1:70b', 'mixtral:8x7b']
  },
  'chat-assistant': {
    name: 'Chat Assistant',
    description: 'General conversation and assistance',
    requirements: ['conversational', 'knowledge'],
    suggestedModels: ['llama3.1:70b', 'mixtral:8x22b', 'claude-3-opus']
  },
  'data-analysis': {
    name: 'Data Analysis',
    description: 'Analyze datasets and generate insights',
    requirements: ['reasoning', 'math'],
    suggestedModels: ['qwen2.5:32b', 'llama3.1:70b', 'gpt-4']
  },
  'translation': {
    name: 'Translation',
    description: 'Translate text between languages',
    requirements: ['multilingual'],
    suggestedModels: ['llama3.1:8b', 'qwen2.5:14b', 'nllb-200:3.3b']
  }
};

// OpenRouter model catalog (popular models)
const OPENROUTER_MODELS = [
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', context: 200000, pricing: { input: 15, output: 75 } },
  { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', context: 200000, pricing: { input: 3, output: 15 } },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', context: 200000, pricing: { input: 0.25, output: 1.25 } },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', context: 128000, pricing: { input: 10, output: 30 } },
  { id: 'openai/gpt-4', name: 'GPT-4', provider: 'openai', context: 8192, pricing: { input: 30, output: 60 } },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', context: 16385, pricing: { input: 0.5, output: 1.5 } },
  { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'google', context: 32768, pricing: { input: 0.25, output: 0.5 } },
  { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B Instruct', provider: 'meta', context: 8192, pricing: { input: 0.88, output: 0.88 } },
  { id: 'mistralai/mixtral-8x22b-instruct', name: 'Mixtral 8x22B Instruct', provider: 'mistralai', context: 65536, pricing: { input: 0.65, output: 0.65 } }
];

// Configuration management
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch (error) {
    return DEFAULT_CONFIG;
  }
}

async function saveConfig(config: any) {
  try {
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

// Ollama API functions
async function callOllamaAPI(host: string, port: number, endpoint: string, data?: any) {
  try {
    const response = await fetch(`http://${host}:${port}/api/${endpoint}`, {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    throw new Error(`Failed to call Ollama API: ${error}`);
  }
}

// OpenRouter API functions
async function callOpenRouterAPI(apiKey: string, endpoint: string, data: any) {
  try {
    const response = await fetch(`https://openrouter.ai/api/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Web Desktop AI Manager'
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    throw new Error(`Failed to call OpenRouter API: ${error}`);
  }
}

// Model execution with task routing
async function executeModelTask(taskType: string, prompt: string, options: any = {}) {
  const config = await loadConfig();
  const taskAssignment = config.taskAssignments[taskType];

  if (!taskAssignment) {
    throw new Error(`Unknown task type: ${taskType}`);
  }

  // Try preferred model first
  try {
    if (taskAssignment.provider === 'ollama' && config.ollama.enabled) {
      const result = await executeOllamaModel(
        config.ollama.host,
        config.ollama.port,
        taskAssignment.preferredModel,
        prompt,
        options
      );
      return {
        provider: 'ollama',
        model: taskAssignment.preferredModel,
        result,
        taskType
      };
    } else if (taskAssignment.provider === 'openrouter' && config.openrouter.enabled) {
      const result = await executeOpenRouterModel(
        config.openrouter.apiKey,
        taskAssignment.preferredModel,
        prompt,
        options
      );
      return {
        provider: 'openrouter',
        model: taskAssignment.preferredModel,
        result,
        taskType
      };
    }
  } catch (error) {
    console.warn(`Preferred model failed, trying fallback: ${error}`);

    // Try fallback model
    try {
      if (taskAssignment.fallbackProvider === 'ollama' && config.ollama.enabled) {
        const result = await executeOllamaModel(
          config.ollama.host,
          config.ollama.port,
          taskAssignment.fallbackModel,
          prompt,
          options
        );
        return {
          provider: 'ollama',
          model: taskAssignment.fallbackModel,
          result,
          taskType,
          fallback: true
        };
      } else if (taskAssignment.fallbackProvider === 'openrouter' && config.openrouter.enabled) {
        const result = await executeOpenRouterModel(
          config.openrouter.apiKey,
          taskAssignment.fallbackModel,
          prompt,
          options
        );
        return {
          provider: 'openrouter',
          model: taskAssignment.fallbackModel,
          result,
          taskType,
          fallback: true
        };
      }
    } catch (fallbackError) {
      throw new Error(`Both primary and fallback models failed: ${fallbackError}`);
    }
  }

  throw new Error('No suitable model available for task');
}

async function executeOllamaModel(host: string, port: number, model: string, prompt: string, options: any = {}) {
  const data = {
    model,
    prompt,
    stream: false,
    options: {
      temperature: options.temperature || 0.7,
      top_p: options.top_p || 0.9,
      max_tokens: options.max_tokens || 2048,
      ...options.ollamaOptions
    }
  };

  const response = await callOllamaAPI(host, port, 'generate', data);
  return response;
}

async function executeOpenRouterModel(apiKey: string, model: string, prompt: string, options: any = {}) {
  const data = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: options.temperature || 0.7,
    max_tokens: options.max_tokens || 2048,
    top_p: options.top_p || 0.9,
    ...options.openrouterOptions
  };

  const response = await callOpenRouterAPI(apiKey, 'chat/completions', data);
  return response;
}

// Routes

// Get configuration
router.get('/config', async (req, res) => {
  try {
    const config = await loadConfig();
    // Don't send API key to frontend for security
    const safeConfig = {
      ...config,
      openrouter: {
        ...config.openrouter,
        apiKey: config.openrouter.apiKey ? '***CONFIGURED***' : ''
      }
    };
    res.json(safeConfig);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

// Update configuration
router.post('/config', async (req, res) => {
  try {
    const config = await loadConfig();
    const updatedConfig = { ...config, ...req.body };

    // Preserve API key if not provided in update
    if (req.body.openrouter && !req.body.openrouter.apiKey) {
      updatedConfig.openrouter.apiKey = config.openrouter.apiKey;
    }

    await saveConfig(updatedConfig);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Get Ollama models
router.get('/ollama/models', async (req, res) => {
  try {
    const config = await loadConfig();
    if (!config.ollama.enabled) {
      return res.json({ models: [] });
    }

    const response = await callOllamaAPI(config.ollama.host, config.ollama.port, 'tags');
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Ollama models' });
  }
});

// Get OpenRouter models
router.get('/openrouter/models', async (req, res) => {
  try {
    const config = await loadConfig();
    if (!config.openrouter.enabled || !config.openrouter.apiKey) {
      return res.json({ models: [] });
    }

    const response = await callOpenRouterAPI(config.openrouter.apiKey, 'models', {});
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch OpenRouter models' });
  }
});

// Get all available models (combined)
router.get('/models', async (req, res) => {
  try {
    const config = await loadConfig();
    const models = {
      ollama: [],
      openrouter: OPENROUTER_MODELS
    };

    // Get Ollama models
    if (config.ollama.enabled) {
      try {
        const ollamaResponse = await callOllamaAPI(config.ollama.host, config.ollama.port, 'tags');
        models.ollama = ollamaResponse.models || [];
      } catch (error) {
        console.warn('Failed to fetch Ollama models:', error);
      }
    }

    // Get OpenRouter models
    if (config.openrouter.enabled && config.openrouter.apiKey) {
      try {
        const openrouterResponse = await callOpenRouterAPI(config.openrouter.apiKey, 'models', {});
        models.openrouter = openrouterResponse.data || [];
      } catch (error) {
        console.warn('Failed to fetch OpenRouter models:', error);
      }
    }

    res.json(models);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Pull Ollama model
router.post('/ollama/pull/:model', async (req, res) => {
  try {
    const { model } = req.params;
    const config = await loadConfig();

    if (!config.ollama.enabled) {
      return res.status(400).json({ error: 'Ollama is not enabled' });
    }

    // Start pulling process
    const pullProcess = spawn('ollama', ['pull', model], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    pullProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });

    pullProcess.stderr?.on('data', (data) => {
      output += data.toString();
    });

    pullProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully pulled model: ${model}`);
      } else {
        console.error(`Failed to pull model: ${model}`, output);
      }
    });

    res.json({
      message: `Started pulling model: ${model}`,
      output: output.trim()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to pull model' });
  }
});

// Delete Ollama model
router.delete('/ollama/models/:model', async (req, res) => {
  try {
    const { model } = req.params;
    const config = await loadConfig();

    if (!config.ollama.enabled) {
      return res.status(400).json({ error: 'Ollama is not enabled' });
    }

    const response = await callOllamaAPI(config.ollama.host, config.ollama.port, 'delete', { name: model });
    res.json({ success: true, message: `Deleted model: ${model}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

// Get task assignments
router.get('/tasks', async (req, res) => {
  try {
    const config = await loadConfig();
    res.json({
      assignments: config.taskAssignments,
      definitions: TASK_DEFINITIONS
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load task assignments' });
  }
});

// Update task assignment
router.post('/tasks/:taskType', async (req, res) => {
  try {
    const { taskType } = req.params;
    const assignment = req.body;

    if (!TASK_DEFINITIONS[taskType]) {
      return res.status(400).json({ error: 'Unknown task type' });
    }

    const config = await loadConfig();
    config.taskAssignments[taskType] = assignment;
    await saveConfig(config);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task assignment' });
  }
});

// Execute task
router.post('/execute', async (req, res) => {
  try {
    const { taskType, prompt, options } = req.body;

    if (!taskType || !prompt) {
      return res.status(400).json({ error: 'Task type and prompt are required' });
    }

    const result = await executeModelTask(taskType, prompt, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to execute task: ${error}` });
  }
});

// Test model connection
router.post('/test/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { model } = req.body;

    if (provider === 'ollama') {
      const config = await loadConfig();
      const response = await callOllamaAPI(config.ollama.host, config.ollama.port, 'tags');
      res.json({ success: true, models: response.models });
    } else if (provider === 'openrouter') {
      const config = await loadConfig();
      if (!config.openrouter.apiKey) {
        return res.status(400).json({ error: 'OpenRouter API key not configured' });
      }
      const response = await callOpenRouterAPI(config.openrouter.apiKey, 'models', {});
      res.json({ success: true, models: response.data });
    } else {
      res.status(400).json({ error: 'Unknown provider' });
    }
  } catch (error) {
    res.status(500).json({ error: `Failed to test ${provider} connection` });
  }
});

// Get model status
router.get('/status', async (req, res) => {
  try {
    const config = await loadConfig();
    const status = {
      ollama: {
        enabled: config.ollama.enabled,
        connected: false,
        models: []
      },
      openrouter: {
        enabled: config.openrouter.enabled,
        configured: !!config.openrouter.apiKey,
        connected: false,
        models: []
      }
    };

    // Check Ollama status
    if (config.ollama.enabled) {
      try {
        const response = await callOllamaAPI(config.ollama.host, config.ollama.port, 'tags');
        status.ollama.connected = true;
        status.ollama.models = response.models || [];
      } catch (error) {
        status.ollama.connected = false;
      }
    }

    // Check OpenRouter status
    if (config.openrouter.enabled && config.openrouter.apiKey) {
      try {
        const response = await callOpenRouterAPI(config.openrouter.apiKey, 'models', {});
        status.openrouter.connected = true;
        status.openrouter.models = response.data || [];
      } catch (error) {
        status.openrouter.connected = false;
      }
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;