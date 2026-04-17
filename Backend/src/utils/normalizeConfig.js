
const DEFAULTS = {
  cache: false,
  cacheTTL: 60,
  rateLimit: 100
};

function normalizeConfig(raw) {
  let { targets, routes } = raw;

 
  if (!Array.isArray(targets)) {
    targets = [targets];
  }


  if (!Array.isArray(routes)) {
    routes = [routes];
  }


  const cleanRoutes = routes
    .filter(r => r.path) 
    .map(r => ({
      path: r.path,
      cache: r.cache ?? DEFAULTS.cache,
      cacheTTL: r.cacheTTL ?? DEFAULTS.cacheTTL,
      rateLimit: r.rateLimit ?? DEFAULTS.rateLimit
    }));

  return {
    targets,
    routes: cleanRoutes
  };
}

module.exports = normalizeConfig;