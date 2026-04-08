const Redis = require('ioredis');
const client = new Redis("rediss://default:"+process.env.UPSTASH_REDIS_REST_TOKEN+"@valid-frog-74056.upstash.io:6379");

async function getServer(targets,lbKey) {

   const count= await client.incr(lbKey);

   if(count===1){
    await client.expire(lbKey,60);
   }
    
  return targets[count % targets.length];
}

module.exports = { getServer };