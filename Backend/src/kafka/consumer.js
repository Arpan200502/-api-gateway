require('dotenv').config({ path: '../.env' });

const { Kafka } = require('kafkajs');
const connectDB = require('../config/mongo');
const Log = require('../models/Log');

const kafka = new Kafka({
  clientId: 'log-consumer',
  brokers: ['127.0.0.1:9092']
});

const consumer = kafka.consumer({ groupId: 'gateway-log-group' });

async function startConsumer() {
  await connectDB();

  await consumer.connect();
  console.log('Consumer connected');

  await consumer.subscribe({ topic: 'gateway-logs', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const log = JSON.parse(message.value.toString());

      await Log.create(log);

      console.log("Saved:", log.path);
    },
  });
}

startConsumer();