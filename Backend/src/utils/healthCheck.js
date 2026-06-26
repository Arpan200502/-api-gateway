const db = require('../models/ApiConfig');
const axios = require('axios');
const Redis = require('ioredis');
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
        await client.set(key, newStatus);
        }
    } catch (error) {
        const newStatus = 'DOWN';
        await client.set(key, newStatus);
    }
   
  }
}
}

module.exports = {healthChk};

