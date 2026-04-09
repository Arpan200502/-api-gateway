require('dotenv').config({ path: '../.env' });
const express = require('express');
const gatewayRoute = require('./routes/gateway');
const { healthChk } = require('./utils/healthCheck');

const app = express();

app.use(express.json()); 


app.use('/gateway', gatewayRoute);

const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await healthChk();
  console.log('Health checks done, ready to serve');
});
setInterval(healthChk, 15 * 60 * 1000);