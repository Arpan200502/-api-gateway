const express = require('express');
const axios = require('axios');
const router = express.Router();
const { OuterRateLimit, InnerRateLimit } = require('../middleware/rateLimit');
const { getCache, setCache } = require('../middleware/cache');
const { getServer } = require('../utils/loadBalancer');

const db = require('../config/db');

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
    

    const cacheKey= "cache:"+apiKey+":"+Path;

  if(redirectUrl.cache){
    const checkCache = await getCache(cacheKey);
    if(checkCache !== null){
      return res.status(200).send(checkCache);
    }
   }
    
    const targets = devDetails.targets;

    const lbKey = "lb:" + apiKey;

    const selected = await getServer(targets, lbKey);

    const targetUrl = selected + req.path;
    

    // Strip headers that break the forwarded request
    const { host, 'content-length': cl, connection, ...cleanHeaders } = req.headers;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: cleanHeaders,
      data: req.method !== 'GET' ? req.body : undefined,
      params: req.query
    });
    const data=response.data;
    const ttl=redirectUrl.cacheTTL;
    if(redirectUrl.cache){
     await setCache(cacheKey, data, ttl);
    }
    res.status(response.status).send(data);

    
  } catch (error) {
    console.error('Gateway error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Error forwarding request',
      detail: error.message 
    });
  }
});

module.exports = router;

