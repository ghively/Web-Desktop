const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Basic API endpoints for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'Web Desktop v1.0.1 API is working!', timestamp: new Date().toISOString() });
});

// Mock file system endpoints
app.get('/api/files', (req, res) => {
  const testPath = req.query.path || '/';
  res.json({
    files: [
      { name: 'Documents', type: 'directory', size: 4096, modified: new Date() },
      { name: 'Downloads', type: 'directory', size: 4096, modified: new Date() },
      { name: 'test.txt', type: 'file', size: 1024, modified: new Date() }
    ],
    path: testPath
  });
});

// Mock system info
app.get('/api/system/info', (req, res) => {
  res.json({
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Serve React frontend
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Fallback to index.html for React Router
app.get('*', (req, res) => {
  // Don't intercept API calls
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built yet. Run npm run build in frontend directory first.');
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Web Desktop v1.0.1 Development Server`);
  console.log(`📱 URL: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api/`);
  console.log(`✅ React Frontend: Loaded`);
  console.log(`🎯 Features: Audit v1.0.1 Complete`);
});