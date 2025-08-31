const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL // from .env

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Agent backend is running' });
});


app.post('/api/agent', async (req, res) => {
  const {prompt} = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  console.log(`Received prompt: ${prompt}`);

  try {
    const response = await axios.post(
      process.env.PYTHON_AGENT_URL + '/solve',
      { prompt },
      { headers: { 'Content-Type': 'application/json' } }
    );

    res.json({
      response: response.data.response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao chamar o solver Python:', error.message);
    res.status(500).json({ error: 'Erro ao se comunicar com o solver Python' });
  }
});


app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong'
  });
});

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
