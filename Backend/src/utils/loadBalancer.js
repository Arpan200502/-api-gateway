const Redis = require('ioredis');
const client = new Redis("rediss://default:"+process.env.UPSTASH_REDIS_REST_TOKEN+"@valid-frog-74056.upstash.io:6379");



async function getServer(apiKey, targets, lbKey) {
  // 1. filter healthy targets
  const healthyTargets = [];
  for(const target of targets) {
    const key = "health:" + apiKey + ":" + target;
    const status = await client.get(key);
    if(status === "UP") {
      healthyTargets.push(target);
    }
  }
  if(healthyTargets.length === 0) return null;

  const count= await client.incr(lbKey);

   if(count===1){
    await client.expire(lbKey,60);
   }
    
  return healthyTargets[count % healthyTargets.length]; 
  }
module.exports = { getServer }