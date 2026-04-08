const express = require('express');

const ports = [5001, 5002, 5003];

ports.forEach((port, index) => {
  const app = express();

  app.use((req, res) => {
    res.send(`Response from SERVER ${index + 1} (port ${port})`);
  });

  app.listen(port, () => {
    console.log(`Server ${index + 1} running on port ${port}`);
  });
});