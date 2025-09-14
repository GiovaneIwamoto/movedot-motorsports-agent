const axios = require('axios');

async function request_agent(req, res) {
    const {prompt} = req.body;

    if (!prompt) {s
        return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`Received prompt: ${prompt}`);

    try {
        const response = await axios.post(
        'http://' + process.env.SOLVER_ADDR +':'+process.env.SOLVER_PORT+ '/solve',
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
}



module.exports = { request_agent };