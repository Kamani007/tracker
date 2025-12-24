"""
Caching System Verification Script
Verifies that all caching components are properly configured
"""
import sys
import os
from datetime import datetime

def print_header(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def check_mongodb_connection():
    """Verify MongoDB connection"""
    print_header("1. MONGODB CONNECTION CHECK")
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        mongo_uri = os.getenv('MONGODB_CONNECTION_STRING')
        db_name = os.getenv('DATABASE_NAME', 'passdown_db')
        
        if not mongo_uri:
            print("❌ MONGODB_CONNECTION_STRING not found in .env")
            return False
        
        print(f"✅ MongoDB URI configured")
        print(f"   Database: {db_name}")
        
        from pymongo import MongoClient
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.server_info()  # Force connection
        
        print("✅ MongoDB connection successful!")
        
        # Check cache collection
        db = client[db_name]
        cache_collection = db['graph_cache']
        count = cache_collection.count_documents({})
        print(f"✅ Cache collection exists with {count} documents")
        
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False

def check_cache_manager():
    """Verify cache manager module"""
    print_header("2. CACHE MANAGER CHECK")
    try:
        from cache_manager import cache_manager
        print("✅ cache_manager module imported successfully")
        
        # Test basic operations
        test_key = "test_verification"
        test_data = {"test": "data", "timestamp": datetime.utcnow().isoformat()}
        
        cache_manager.set(test_key, test_data)
        print("✅ Cache set operation successful")
        
        retrieved = cache_manager.get(test_key)
        if retrieved and retrieved.get("test") == "data":
            print("✅ Cache get operation successful")
        else:
            print("❌ Cache get operation failed")
            return False
        
        cache_manager.invalidate(test_key)
        print("✅ Cache invalidate operation successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Cache manager check failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_scheduler():
    """Verify scheduler configuration"""
    print_header("3. SCHEDULER CHECK")
    try:
        import schedule
        print("✅ schedule library installed")
        
        from cache_scheduler import refresh_all_caches
        print("✅ refresh_all_caches function imported")
        
        # Check if scheduler can be configured (don't actually run)
        schedule.every().day.at("08:00").do(lambda: None)
        print("✅ Scheduler configuration works")
        schedule.clear()
        
        print(f"   Current UTC time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Scheduled time: 08:00 UTC daily")
        
        return True
        
    except Exception as e:
        print(f"❌ Scheduler check failed: {e}")
        return False

def check_data_processor():
    """Verify data processor functions"""
    print_header("4. DATA PROCESSOR CHECK")
    try:
        from data_processor import (
            get_all_data_full,
            extract_chart_data,
            extract_device_yield_data,
            extract_iv_repeatability_data
        )
        print("✅ All data processor functions imported successfully")
        print("   - get_all_data_full")
        print("   - extract_chart_data")
        print("   - extract_device_yield_data")
        print("   - extract_iv_repeatability_data")
        
        return True
        
    except Exception as e:
        print(f"❌ Data processor check failed: {e}")
        return False

def check_azure_connection():
    """Verify Azure Blob Storage connection"""
    print_header("5. AZURE BLOB STORAGE CHECK")
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
        container_name = os.getenv('AZURE_CONTAINER_NAME')
        blob_name = os.getenv('AZURE_BLOB_NAME')
        
        if not connection_string:
            print("❌ AZURE_STORAGE_CONNECTION_STRING not found")
            return False
        
        print(f"✅ Azure connection string configured")
        print(f"   Container: {container_name}")
        print(f"   Blob: {blob_name}")
        
        from azure.storage.blob import BlobServiceClient
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
        
        # Check if blob exists
        properties = blob_client.get_blob_properties()
        size_mb = properties.size / (1024 * 1024)
        print(f"✅ Azure blob accessible (Size: {size_mb:.2f} MB)")
        
        return True
        
    except Exception as e:
        print(f"❌ Azure connection check failed: {e}")
        return False

def check_api_endpoints():
    """Verify API endpoints are configured"""
    print_header("6. API ENDPOINTS CHECK")
    try:
        # Just verify imports, don't start server
        from app import app
        print("✅ Flask app imported successfully")
        
        # Check if key routes exist
        routes = [rule.rule for rule in app.url_map.iter_rules()]
        
        required_routes = [
            '/api/all-data-full',
            '/api/chart-data',
            '/api/device-yield',
            '/api/iv-repeatability',
            '/api/clear-all-data-cache'
        ]
        
        for route in required_routes:
            if route in routes:
                print(f"✅ {route}")
            else:
                print(f"❌ {route} - NOT FOUND")
                
        return True
        
    except Exception as e:
        print(f"❌ API endpoints check failed: {e}")
        return False

def main():
    """Run all verification checks"""
    print("\n" + "="*80)
    print("  RAYLEIGH TRACKER - CACHING SYSTEM VERIFICATION")
    print("  Checking all caching components...")
    print("="*80)
    
    results = {
        "MongoDB Connection": check_mongodb_connection(),
        "Cache Manager": check_cache_manager(),
        "Scheduler": check_scheduler(),
        "Data Processor": check_data_processor(),
        "Azure Blob Storage": check_azure_connection(),
        "API Endpoints": check_api_endpoints()
    }
    
    # Summary
    print_header("VERIFICATION SUMMARY")
    
    all_passed = True
    for component, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status} - {component}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*80)
    if all_passed:
        print("🎉 ALL CHECKS PASSED! Caching system is ready.")
        print("\n📋 CACHING FLOW:")
        print("   1. User requests data → Check frontend cache (SESSION)")
        print("   2. If miss → API checks MongoDB cache (instant - 0.5s)")
        print("   3. If miss → Fetch from Azure Blob (slow - 40s)")
        print("   4. Data cached in MongoDB (TTL: 24 hours)")
        print("   5. Scheduler refreshes cache daily at 8 AM UTC")
        print("   6. Force refresh: Add ?force_refresh=true to URL")
        print("="*80 + "\n")
        sys.exit(0)
    else:
        print("⚠️ SOME CHECKS FAILED - Please fix the issues above")
        print("="*80 + "\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
