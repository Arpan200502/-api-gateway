require('dotenv').config({ path: '../.env' });
const express = require('express');
const gatewayRoute = require('./routes/gateway');
const { healthChk } = require('./utils/healthCheck');
const { connectProducer} = require('./kafka/producer');
const authMiddleware = require('./middleware/auth');
require('./kafka/consumer');

const app = express();
app.use(express.json());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:8080'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});


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