const cache = new Map();

export function setCache(key, value, ttlSeconds) {
  const expiry = Date.now() + (ttlSeconds * 1000);
  cache.set(key, { value, expiry });
}

export function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  
  return item.value;
}

export function clearCache() {
  cache.clear();
}

// Clean expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, item] of cache.entries()) {
      if (now > item.expiry) {
        cache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
