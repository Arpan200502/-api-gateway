require('dotenv').config({ path: '../.env' });
const express = require('express');
const gatewayRoute = require('./routes/gateway');

const app = express();

app.use(express.json()); // for POST body



app.use('/gateway', gatewayRoute);

app.post('/userinput',(res , req)=>{
  const userData=req.body;
  console.log(userData);
})









const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});