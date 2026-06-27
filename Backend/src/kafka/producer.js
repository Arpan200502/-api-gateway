const { Kafka } = require('kafkajs');

const kafkaConfig = {
  clientId: 'api-gateway',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
};

if (process.env.KAFKA_USERNAME) {
  kafkaConfig.ssl = true;
  kafkaConfig.sasl = {
    mechanism: 'scram-sha-256',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  };
}

const kafka = new Kafka(kafkaConfig);

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