/**
 * Application-wide cache utility
 * Caches data in memory during runtime to avoid repeated Azure/API calls
 */

class DataCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @param {number} maxAge - Maximum age in milliseconds (optional)
   * @returns {any|null} Cached data or null if not found/expired
   */
  get(key, maxAge = null) {
    if (!this.cache.has(key)) {
      return null;
    }

    // Check if data is expired
    if (maxAge !== null && this.timestamps.has(key)) {
      const timestamp = this.timestamps.get(key);
      const age = Date.now() - timestamp;
      if (age > maxAge) {
        console.log(`🕒 Cache expired for key: ${key}`);
        this.delete(key);
        return null;
      }
    }

    console.log(`✅ Cache hit for key: ${key}`);
    return this.cache.get(key);
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  set(key, data) {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now());
    console.log(`💾 Cached data for key: ${key}`);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
    console.log(`🗑️ Deleted cache for key: ${key}`);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    console.log('🗑️ Cleared all cache');
  }

  /**
   * Get cache size
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get all cache keys
   * @returns {string[]}
   */
  keys() {
    return Array.from(this.cache.keys());
  }
}

// Export singleton instance
export const dataCache = new DataCache();

// Cache keys constants
export const CACHE_KEYS = {
  // Dashboard data
  TODAY_ISSUES: 'today_issues',
  YESTERDAY_ISSUES: 'yesterday_issues',
  SAFETY_ISSUES: 'safety_issues',
  KUDOS_ENTRIES: 'kudos_entries',
  
  // Chart data
  PARAMETERS: 'chart_parameters',
  DEVICE_YIELD: 'chart_device_yield',
  IV_REPEATABILITY: 'chart_iv_repeatability',
  STD_DEV: 'chart_std_dev',
  PARAMETER_DATA: (param) => `chart_parameter_${param}`,
  
  // Stability data
  STABILITY_GRID: 'stability_grid_data',
  STABILITY_DEVICES: 'stability_devices',
  DEVICE_PERFORMANCE: (deviceId) => `device_performance_${deviceId}`,
  
  // All Data
  ALL_DATA_FULL: 'all_data_full',
  
  // Batch data
  BATCH_LOCATION: 'batch_current_location',
};

// Cache expiration times (in milliseconds)
export const CACHE_EXPIRATION = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 15 * 60 * 1000,    // 15 minutes
  LONG: 60 * 60 * 1000,      // 1 hour
  SESSION: null,              // Until page reload (no expiration during runtime)
};

export default dataCache;
