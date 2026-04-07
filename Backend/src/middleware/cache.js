const Redis = require('ioredis');
const client = new Redis("rediss://default:"+process.env.UPSTASH_REDIS_REST_TOKEN+"@valid-frog-74056.upstash.io:6379");

async function getCache(key) {

  const result= await client.get(key);

  try {
  return JSON.parse(result);
    } catch {
  return result;
    }
}

async function setCache(key, data, ttl) {
  const setcache = await client.set(key, JSON.stringify(data), 'EX', ttl);
}

module.exports = { getCache, setCache };