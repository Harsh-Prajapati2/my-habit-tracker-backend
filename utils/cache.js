// Simple in-memory cache for single-user app
// TTL-based cache with automatic cleanup

class SimpleCache {
  constructor(defaultTTL = 30000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    return value;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  invalidate(pattern) {
    if (typeof pattern === 'string') {
      // Invalidate all keys containing the pattern
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

// Single instance for the app
const cache = new SimpleCache(30000); // 30 second default TTL

module.exports = cache;
