const { Client } = require('@upstash/qstash');

const client = new Client({
  token: process.env.QSTASH_TOKEN,
  baseUrl: process.env.QSTASH_URL,
});

async function connectProducer() {
  console.log('QStash producer ready');
}

async function publishLog(logData) {
  try {
    await client.publishJSON({
      url: `${process.env.BACKEND_URL}/logs/ingest`,
      body: logData,
      retries: 3,
    });
  } catch (error) {
    console.error('QStash publish failed:', error);
  }
}

module.exports = { connectProducer, publishLog };
