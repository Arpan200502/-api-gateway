const Redis = require('ioredis');
const express = require('express');
const axios = require('axios');
const router = express.Router();


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


const db=[
  {apikey:"abc123",
  routes:[
      {path:"/",targetURL:"https://backend-ufna.onrender.com/",cache:true,rateLimit:3}
  ]},
   {apikey:"abc124",
  routes:[
      {path:"/posts",targetURL:"https://jsonplaceholder.typicode.com",cache:true,rateLimit:100}
  ]},

   {apikey:"abc125",
  routes:[
      {path:"/dummy",targetURL:"https://backend-ufna.onrender.com/",cache:true,rateLimit:100}
  ]},

]
router.use(async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if(!apiKey){
      return res.status(400).json({error:"not api key"});
    }

    const devDetails = db.find(route => route.apikey === apiKey)

    if(!devDetails){
      return res.status(401).json({error:"not dev found"});
    }


    const redirectUrl = devDetails.routes.find(route => route.path === req.path)
    if(!redirectUrl){
      return res.status(404).json({error:"not found"});
    }


    const checkOuterRateLimit= await OuterRateLimit(apiKey);
    if(!checkOuterRateLimit){
       return res.status(429).json({error:"Gateway Rate Limit Exceeded"});
    }

    const Path=redirectUrl.path;
    const PathLimit=redirectUrl.rateLimit;

    const checkInnerRateLimit= await InnerRateLimit(apiKey,Path,PathLimit);
    if(!checkInnerRateLimit){
       return res.status(429).json({error:"Custom Devs Rate Limit Exceeded"});
    }
    
    const targetUrl = redirectUrl.targetURL+req.path;

    // Strip headers that break the forwarded request
    const { host, 'content-length': cl, connection, ...cleanHeaders } = req.headers;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: cleanHeaders,
      data: req.method !== 'GET' ? req.body : undefined,
      params: req.query
    });

    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('Gateway error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Error forwarding request',
      detail: error.message 
    });
  }
});

module.exports = router;

