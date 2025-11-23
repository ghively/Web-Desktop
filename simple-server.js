const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from backend
app.use(express.static(path.join(__dirname, 'backend')));

// Serve API routes - try to load compiled backend routes
try {
  const serverPath = path.join(__dirname, 'backend', 'dist', 'server.js');
  if (fs.existsSync(serverPath)) {
    console.log('Loading compiled backend server...');
    require(serverPath);
  } else {
    console.log('Compiled backend not found, serving static files only');
  }
} catch (error) {
  console.log('Error loading backend:', error.message);
}

// Serve React frontend on the main route
app.use('/', express.static(path.join(__dirname, 'frontend', 'dist')));

// Fallback to index.html for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Web Desktop v1.0.1 running at http://localhost:${PORT}`);
  console.log(`Features: React Frontend + Backend API`);
});