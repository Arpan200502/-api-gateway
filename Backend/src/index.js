require('dotenv').config({ path: '../.env' });
const express = require('express');
const gatewayRoute = require('./routes/gateway');
const { healthChk } = require('./utils/healthCheck');
const { connectProducer} = require('./kafka/producer');
const authMiddleware = require('./middleware/auth');
require('./kafka/consumer');

const app = express();
app.use(express.json()); 


app.use('/auth', require('./routes/auth'));

// protect dev routes
app.use('/dev', authMiddleware, require('./routes/dev'));

// protect logs
app.use('/logs', authMiddleware, require('./routes/logs'));

app.use('/gateway', gatewayRoute);



const PORT = 3000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  await connectProducer();
  console.log('KAFKA UP!!!');
  await healthChk();
  console.log('Health checks done, ready to serve');
});

setInterval(healthChk, 15 * 60 * 1000);