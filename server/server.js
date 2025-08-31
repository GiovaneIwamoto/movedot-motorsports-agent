const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL || 'http://localhost:5000';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Agent backend is running' });
});


app.post('/api/agent', (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  console.log(`Received prompt: ${prompt}`);

  // Resposta de teste fixa
  res.json({
    response: 'Esta é uma resposta de teste!',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Agent backend server running on port ${PORT}`);
  console.log(`📡 Python agent URL: ${PYTHON_AGENT_URL}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});
