const db = require('../models/ApiConfig');
const User = require('../models/User');
const axios = require('axios');
const Redis = require('ioredis');
const { sendBackendDownEmail, sendBackendUpEmail } = require('./emailService');
const client = new Redis("rediss://default:"+process.env.UPSTASH_REDIS_REST_TOKEN+"@moving-hagfish-118176.upstash.io:6379");

async function healthChk() {
  const devs = await db.find();
 for(const dev of devs) {
  for(const target of dev.targets) {
    const apiKey=dev.apikey;
    const key="health:"+ apiKey+":"+target;

    const previousStatus = await client.get(key);
    
    try {
        const res= await axios.get(target);
        const newStatus = 'UP';
        if(res.status===200){
        if (previousStatus !== null && previousStatus !== newStatus) {
          const user = await User.findById(dev.userId).select('email');
          if (user && sendBackendUpEmail) {
            await sendBackendUpEmail(user.email, target, apiKey);
          }
        }
        await client.set(key, newStatus);
        }
    } catch (error) {
        const newStatus = 'DOWN';
        if (previousStatus !== null && previousStatus !== newStatus) {
          const user = await User.findById(dev.userId).select('email');
          if (user && sendBackendDownEmail) {
            await sendBackendDownEmail(user.email, target, apiKey);
          }
        }
        await client.set(key, newStatus);
    }
   
  }
}
}



module.exports = {healthChk};

