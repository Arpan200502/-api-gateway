const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function connectProducer() {
  await producer.connect();
  console.log('Kafka producer connected');
}
async function publishLog(logData) {
  try {
    await producer.send({
      topic: 'gateway-logs',
      messages: [{ value: JSON.stringify(logData) }]
      
    });
    console.log("LOG FUNCTION CALLED");
  } catch (error) {
    console.error("Kafka log failed:", error);
  }

}


module.exports = { connectProducer, publishLog };