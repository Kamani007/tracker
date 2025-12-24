"""
Unified Cache Manager for All Graph Data
Pre-processes and caches all graph data in MongoDB
"""
import json
import threading
import time
from datetime import datetime, timedelta
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

class CacheManager:
    """Manages caching for all graph data"""
    
    def __init__(self):
        # MongoDB connection
        self.mongo_uri = os.getenv('MONGODB_CONNECTION_STRING')
        self.db_name = os.getenv('DATABASE_NAME', 'passdown_db')
        self.client = None
        self.db = None
        self.cache_collection = None
        
        # Cache configuration
        self.cache_ttl = timedelta(hours=1)  # Cache expires after 1 hour
        self.refresh_interval = 1800  # Refresh every 30 minutes (seconds)
        
        # Background thread
        self.refresh_thread = None
        self.stop_refresh = False
        
        # Connect to MongoDB
        self._connect()
        
    def _connect(self):
        """Connect to MongoDB"""
        try:
            if not self.mongo_uri:
                print("⚠️ MongoDB connection string not configured")
                return False
                
            self.client = MongoClient(self.mongo_uri)
            self.db = self.client[self.db_name]
            self.cache_collection = self.db['graph_cache']
            
            # Create TTL index for automatic expiration
            self.cache_collection.create_index(
                "expires_at",
                expireAfterSeconds=0
            )
            
            print("✅ Cache Manager connected to MongoDB")
            return True
            
        except Exception as e:
            print(f"❌ Cache Manager MongoDB connection failed: {e}")
            return False
    
    def get(self, cache_key):
        """
        Get cached data by key
        
        Args:
            cache_key: Unique identifier for cached data (e.g., "chart_PCE", "device_yield")
            
        Returns:
            dict: Cached data or None if not found/expired
        """
        try:
            if self.cache_collection is None:
                return None
                
            cached = self.cache_collection.find_one({
                "key": cache_key,
                "expires_at": {"$gt": datetime.utcnow()}
            })
            
            if cached:
                print(f"✅ Cache HIT: {cache_key}")
                return cached.get('data')
            else:
                print(f"⚠️ Cache MISS: {cache_key}")
                return None
                
        except Exception as e:
            print(f"❌ Error getting cache for {cache_key}: {e}")
            return None
    
    def set(self, cache_key, data, ttl=None):
        """
        Store data in cache
        
        Args:
            cache_key: Unique identifier
            data: Data to cache (must be JSON-serializable)
            ttl: Time to live (timedelta), defaults to self.cache_ttl
        """
        try:
            if self.cache_collection is None:
                print(f"❌ Cannot cache {cache_key}: MongoDB not connected!")
                print(f"   mongo_uri exists: {bool(self.mongo_uri)}")
                print(f"   client: {self.client}")
                print(f"   db: {self.db}")
                return False
                
            ttl = ttl or self.cache_ttl
            expires_at = datetime.utcnow() + ttl
            
            self.cache_collection.update_one(
                {"key": cache_key},
                {
                    "$set": {
                        "key": cache_key,
                        "data": data,
                        "updated_at": datetime.utcnow(),
                        "expires_at": expires_at
                    }
                },
                upsert=True
            )
            
            print(f"✅ Cached: {cache_key} (expires: {expires_at})")
            return True
            
        except Exception as e:
            print(f"❌ Error caching {cache_key}: {e}")
            return False
    
    def invalidate(self, cache_key=None):
        """
        Invalidate cache
        
        Args:
            cache_key: Specific key to invalidate, or None to clear all
        """
        try:
            if self.cache_collection is None:
                print(f"⚠️ Cannot invalidate cache - MongoDB not connected")
                return False
                
            if cache_key:
                result = self.cache_collection.delete_one({"key": cache_key})
                if result.deleted_count > 0:
                    print(f"🗑️ Successfully invalidated cache: {cache_key}")
                else:
                    print(f"⚠️ Cache key not found (already deleted?): {cache_key}")
            else:
                result = self.cache_collection.delete_many({})
                print(f"🗑️ Cleared all cache ({result.deleted_count} documents)")
                
            return True
            
        except Exception as e:
            print(f"❌ Error invalidating cache: {e}")
            return False
    
    def get_or_compute(self, cache_key, compute_func, ttl=None):
        """
        Get from cache or compute and cache
        
        Args:
            cache_key: Cache key
            compute_func: Function to call if cache miss (should return data)
            ttl: Time to live
            
        Returns:
            Cached or computed data
        """
        # Try cache first
        cached = self.get(cache_key)
        if cached is not None:
            return cached
        
        # Cache miss - compute
        print(f"🔄 Computing: {cache_key}")
        data = compute_func()
        
        # Store in cache
        self.set(cache_key, data, ttl)
        
        return data
    
    def start_background_refresh(self, refresh_functions):
        """
        Start background thread to refresh cache periodically
        
        Args:
            refresh_functions: Dict of {cache_key: function_to_call}
        """
        def refresh_loop():
            print("🔄 Starting cache refresh background thread")
            while not self.stop_refresh:
                try:
                    print(f"\n🔄 Refreshing cache at {datetime.now()}")
                    
                    for cache_key, func in refresh_functions.items():
                        try:
                            print(f"  ⏳ Refreshing {cache_key}...")
                            data = func()
                            self.set(cache_key, data)
                            print(f"  ✅ Refreshed {cache_key}")
                        except Exception as e:
                            print(f"  ❌ Error refreshing {cache_key}: {e}")
                    
                    print(f"✅ Cache refresh complete\n")
                    
                except Exception as e:
                    print(f"❌ Error in refresh loop: {e}")
                
                # Sleep until next refresh
                time.sleep(self.refresh_interval)
        
        self.stop_refresh = False
        self.refresh_thread = threading.Thread(target=refresh_loop, daemon=True)
        self.refresh_thread.start()
        print(f"✅ Background refresh started (interval: {self.refresh_interval}s)")
    
    def stop_background_refresh(self):
        """Stop background refresh thread"""
        self.stop_refresh = True
        if self.refresh_thread:
            self.refresh_thread.join(timeout=5)
        print("⏹️ Background refresh stopped")
    
    def get_cache_stats(self):
        """Get cache statistics"""
        try:
            if self.cache_collection is None:
                return {"error": "Cache not available"}
            
            total = self.cache_collection.count_documents({})
            active = self.cache_collection.count_documents({
                "expires_at": {"$gt": datetime.utcnow()}
            })
            
            return {
                "total_entries": total,
                "active_entries": active,
                "expired_entries": total - active
            }
            
        except Exception as e:
            return {"error": str(e)}

# Global cache instance
cache_manager = CacheManager()
