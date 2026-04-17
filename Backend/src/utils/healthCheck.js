const db = require('../models/ApiConfig');
const axios = require('axios');
const Redis = require('ioredis');
const client = new Redis("rediss://default:"+process.env.UPSTASH_REDIS_REST_TOKEN+"@valid-frog-74056.upstash.io:6379");



async function healthChk() {
  const devs = await db.find();
 for(const dev of devs) {
  for(const target of dev.targets) {
    const apiKey=dev.apikey;
    const key="health:"+ apiKey+":"+target;
    
    try {
        const res= await axios.get(target);
        if(res.status===200){
        await client.set(key,"UP");
        }
    } catch (error) {
        await client.set(key,"DOWN");
    }
   
  }
}
}



module.exports = {healthChk};

