const express = require('express');
const axios = require('axios');
const router = express.Router();

const { OuterRateLimit, InnerRateLimit } = require('../middleware/rateLimit');
const { getCache, setCache } = require('../middleware/cache');
const { getServer } = require('../utils/loadBalancer');
const { publishLog } = require('../kafka/producer');
const ApiConfig = require('../models/ApiConfig');

router.use(async (req, res) => {
  const start = Date.now();
  const ip = req.socket.remoteAddress;

  let selected = null;
  let cacheStatus = "MISS";

  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      await publishLog({
        path: req.path,
        method: req.method,
        status: 400,
        ip,
        error: "No API key",
        timestamp: new Date()
      });
      return res.status(400).json({ error: "not api key" });
    }

    const devDetails = await ApiConfig.findOne({ apikey: apiKey });
    const userId = devDetails?.userId; // ✅ added

    if (!devDetails) {
      await publishLog({
        apiKey,
        userId,
        path: req.path,
        method: req.method,
        status: 401,
        ip,
        error: "Invalid API key",
        timestamp: new Date()
      });
      return res.status(401).json({ error: "not dev found" });
    }

    const redirectUrl = devDetails.routes.find(route => route.path === req.path);

    if (!redirectUrl) {
      await publishLog({
        apiKey,
        userId,
        path: req.path,
        method: req.method,
        status: 404,
        ip,
        error: "Route not found",
        timestamp: new Date()
      });
      return res.status(404).json({ error: "not found" });
    }

    const checkOuterRateLimit = await OuterRateLimit(apiKey);
    if (!checkOuterRateLimit) {
      await publishLog({
        apiKey,
        userId,
        path: req.path,
        method: req.method,
        status: 429,
        ip,
        error: "Outer rate limit exceeded",
        timestamp: new Date()
      });
      return res.status(429).json({ error: "Gateway Rate Limit Exceeded" });
    }

    const Path = redirectUrl.path;
    const PathLimit = redirectUrl.rateLimit;

    const checkInnerRateLimit = await InnerRateLimit(apiKey, Path, PathLimit);
    if (!checkInnerRateLimit) {
      await publishLog({
        apiKey,
        userId,
        path: req.path,
        method: req.method,
        status: 429,
        ip,
        error: "Inner rate limit exceeded",
        timestamp: new Date()
      });
      return res.status(429).json({ error: "Custom Devs Rate Limit Exceeded" });
    }

    const cacheKey = "cache:" + apiKey + ":" + Path;

    if (redirectUrl.cache) {
      const checkCache = await getCache(cacheKey);
      if (checkCache !== null) {
        cacheStatus = "HIT";

        await publishLog({
          apiKey,
          userId,
          path: req.path,
          method: req.method,
          status: 200,
          cache: "HIT",
          backend: null,
          responseTime: Date.now() - start,
          ip,
          timestamp: new Date()
        });

        return res.status(200).send(checkCache);
      }
    }

    const targets = devDetails.targets;
    const lbKey = "lb:" + apiKey;

    selected = await getServer(apiKey, targets, lbKey);

    if (selected === null) {
      await publishLog({
        apiKey,
        userId,
        path: req.path,
        method: req.method,
        status: 503,
        cache: "MISS",
        backend: null,
        ip,
        error: "All backends are down",
        timestamp: new Date()
      });

      return res.status(503).json({ error: "All backends are down" });
    }

    const targetUrl = selected + req.path;

    const { host, 'content-length': cl, connection, ...cleanHeaders } = req.headers;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: cleanHeaders,
      data: req.method !== 'GET' ? req.body : undefined,
      params: req.query
    });

    const data = response.data;
    const ttl = redirectUrl.cacheTTL;

    if (redirectUrl.cache) {
      await setCache(cacheKey, data, ttl);
    }

    const responseTime = Date.now() - start;

    await publishLog({
      apiKey,
      userId,
      path: req.path,
      method: req.method,
      status: response.status,
      backend: selected,
      cache: cacheStatus,
      responseTime,
      ip,
      timestamp: new Date()
    });

    res.status(response.status).send(data);

  } catch (error) {
    const responseTime = Date.now() - start;

    await publishLog({
      userId: null, // fallback
      path: req.path,
      method: req.method,
      status: 500,
      backend: selected,
      cache: cacheStatus,
      responseTime,
      ip,
      error: error.message,
      timestamp: new Date()
    });

    console.error('Gateway error:', error.response?.data || error.message);

    res.status(500).json({
      error: 'Error forwarding request',
      detail: error.message
    });
  }
});

module.exports = router;