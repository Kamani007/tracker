"""
Scheduled Cache Refresh - Runs daily at 8:00 AM AST (Atlantic Standard Time)
Refreshes ALL chart caches from Azure Blob storage:
- All Data (all_data_full)
- PCE Analysis (chart_PCE, chart_FF, etc.)
- Device Yield (device_yield)
- IV Repeatability (iv_repeatability)
- Standard Deviation (std_dev)

Note: AST = UTC-4 (12:00 PM UTC) or ADT = UTC-3 (11:00 AM UTC during daylight saving)
"""
import threading
import time
from datetime import datetime, timedelta
import schedule
import pytz

def refresh_all_caches():
    """Refresh ALL chart caches from Azure at 8:00 AM AST daily"""
    try:
        ast_tz = pytz.timezone('America/Halifax')  # Atlantic Standard Time
        utc_now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        ast_now = utc_now.astimezone(ast_tz)
        
        print(f"\n{'='*80}")
        print(f"🕐 SCHEDULED CACHE REFRESH")
        print(f"   UTC: {utc_now.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        print(f"   AST: {ast_now.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        print(f"{'='*80}")
        
        from data_processor import (
            get_all_data_full,
            extract_chart_data,
            extract_device_yield_data,
            extract_iv_repeatability_data
        )
        from cache_manager import cache_manager
        
        total_start = time.time()
        
        # 1. Refresh All Data cache
        print("\n📊 1/4 Refreshing All Data (all_data_full)...")
        start_time = time.time()
        all_data = get_all_data_full()
        elapsed = time.time() - start_time
        print(f"   ✅ Done in {elapsed:.2f}s - Batches: {all_data.get('total_batches', 0)}, Sheets: {all_data.get('total_sheets', 0)}")
        cache_manager.set("all_data_full", all_data, ttl=timedelta(hours=24))
        
        # 2. Refresh PCE Analysis charts (all 8 parameters) - also used by Std Dev chart
        print("\n📈 2/4 Refreshing PCE Analysis charts (also used by Std Dev)...")
        start_time = time.time()
        chart_data = extract_chart_data()
        elapsed = time.time() - start_time
        parameters = ['PCE', 'FF', 'Max Power', 'HI', 'I_sc', 'V_oc', 'R_series', 'R_shunt']
        for param in parameters:
            cache_manager.set(f"chart_{param}", chart_data.get(param, []), ttl=timedelta(hours=24))
        print(f"   ✅ Done in {elapsed:.2f}s - Cached {len(parameters)} parameters")
        
        # 3. Refresh Device Yield
        print("\n📉 3/4 Refreshing Device Yield...")
        start_time = time.time()
        device_yield = extract_device_yield_data()
        elapsed = time.time() - start_time
        print(f"   ✅ Done in {elapsed:.2f}s")
        cache_manager.set("device_yield", device_yield, ttl=timedelta(hours=24))
        
        # 4. Refresh IV Repeatability
        print("\n⚡ 4/4 Refreshing IV Repeatability...")
        start_time = time.time()
        iv_repeat = extract_iv_repeatability_data()
        elapsed = time.time() - start_time
        print(f"   ✅ Done in {elapsed:.2f}s")
        cache_manager.set("iv_repeatability", iv_repeat, ttl=timedelta(hours=24))
        
        # Note: Std Dev uses the same chart_data cache (chart_PCE, chart_FF, etc.)
        # so no separate caching needed
        
        total_elapsed = time.time() - total_start
        ast_tz = pytz.timezone('America/Halifax')
        next_refresh_utc = datetime.utcnow().replace(tzinfo=pytz.UTC) + timedelta(days=1)
        next_refresh_ast = next_refresh_utc.astimezone(ast_tz)
        
        print(f"\n{'='*80}")
        print(f"✅ ALL CACHES REFRESHED SUCCESSFULLY!")
        print(f"   Total time: {total_elapsed:.2f}s")
        print(f"   Next refresh: {next_refresh_ast.strftime('%Y-%m-%d 08:00:00 %Z')} (AST)")
        print(f"{'='*80}\n")
        
    except Exception as e:
        print(f"\n❌ CACHE REFRESH FAILED: {e}")
        import traceback
        traceback.print_exc()
        print(f"{'='*80}\n")

def start_scheduler():
    """Start the scheduled cache refresh job"""
    ast_tz = pytz.timezone('America/Halifax')  # Atlantic Standard Time
    utc_now = datetime.utcnow().replace(tzinfo=pytz.UTC)
    ast_now = utc_now.astimezone(ast_tz)
    
    # Calculate UTC time for 8:00 AM AST
    # AST is UTC-4, so 8:00 AM AST = 12:00 PM UTC (or 11:00 AM UTC during ADT)
    is_dst = bool(ast_now.dst())
    utc_schedule_time = "11:00" if is_dst else "12:00"
    
    print("\n🚀 Starting Cache Refresh Scheduler...")
    print(f"   ⏰ Schedule: Daily at 8:00 AM AST")
    print(f"   🕐 Current Time:")
    print(f"      UTC: {utc_now.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    print(f"      AST: {ast_now.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    print(f"   🌍 Timezone: Atlantic {'Daylight' if is_dst else 'Standard'} Time (UTC{ast_now.strftime('%z')})")
    print(f"   📦 Targets: All Data + PCE Analysis + Device Yield + IV Repeatability + Std Dev")
    print(f"   🔄 Action: Fetch from Azure → Update MongoDB cache (all charts)")
    
    # Schedule daily at 8:00 AM AST (12:00 PM UTC or 11:00 AM UTC during DST)
    schedule.every().day.at(utc_schedule_time).do(refresh_all_caches)
    print(f"   ✅ Scheduled job created: Daily at {utc_schedule_time} UTC (8:00 AM AST)")
    
    # Also run immediately on startup to pre-populate cache
    print("   🔧 Running initial cache refresh on startup...")
    refresh_all_caches()
    
    # Run scheduler in background thread
    def run_schedule():
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    scheduler_thread = threading.Thread(target=run_schedule, daemon=True)
    scheduler_thread.start()
    
    # Verify thread started
    time.sleep(0.5)
    if scheduler_thread.is_alive():
        print("✅ Scheduler thread started successfully!")
        print(f"   🔄 Background thread active (checks every 60 seconds)")
    else:
        print("❌ WARNING: Scheduler thread failed to start!")
    
    print("✅ Scheduler initialization complete!\n")

if __name__ == "__main__":
    # For testing
    start_scheduler()
    print("Scheduler running... Press Ctrl+C to stop")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nScheduler stopped")
