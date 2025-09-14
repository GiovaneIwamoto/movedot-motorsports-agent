async function healthcheck(req, res){
    res.json({ status: 'OK', message: 'Agent backend is running' })
}

module.exports = { healthcheck };
