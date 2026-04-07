const Redis = require('ioredis');
const client = new Redis("rediss://default:"+process.env.UPSTASH_REDIS_REST_TOKEN+"@valid-frog-74056.upstash.io:6379");




async function OuterRateLimit(api) {

  const count = await client.incr('ratelimit:'+api);
  if(count===1){
    await client.expire("ratelimit:"+api,60)
  }
  if(count>5){
    return false;
  }else{
    return true;
  }
  
}

async function InnerRateLimit(api,path,limit) {

  const count = await client.incr('ratelimit:'+api+":"+path);
  if(count===1){
    await client.expire("ratelimit:"+api+":"+path,60)
  }
  if(count>limit){
    return false;
  }else{
    return true;
  }
  
}


module.exports = { OuterRateLimit, InnerRateLimit };