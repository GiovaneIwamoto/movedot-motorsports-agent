const express = require('express');
const cors = require('cors');

const {connectWithRetry} = require('./config/db_config')
const { getCards } = require('./src/db_integration');
const { request_agent } = require('./src/solver_integration');
const { healthcheck } = require('./src/healthcheck');
const {errorHandler, notFoundHandler} = require('./src/error_handler')

const app = express();
const PORT = process.env.SERVER_PORT;
const router = express.Router();

app.use(cors());
app.use(express.json());
app.use('/', router);

router.get('/api/getcards', getCards);
router.post('/api/agent', request_agent);
router.get('/health', healthcheck)



app.use(errorHandler);
app.use('*', notFoundHandler);

connectWithRetry()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Agent backend server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });