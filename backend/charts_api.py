"""
Charts API Module
Handles all chart-related endpoints with caching
"""
import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from flask import jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path for data_processor import
import sys
sys.path.insert(0, os.path.dirname(__file__))

try:
    from data_processor import extract_chart_data, extract_device_yield_data, extract_iv_repeatability_data
    DATA_PROCESSOR_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Data processor not available: {e}")
    DATA_PROCESSOR_AVAILABLE = False

try:
    from cache_manager import cache_manager
    CACHE_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Cache manager not available: {e}")
    CACHE_AVAILABLE = False
    cache_manager = None

class ChartsAPI:
    """Charts API class handling all chart-related endpoints"""
    
    def __init__(self):
        self.available_parameters = [
            "PCE", "FF", "Max Power", "HI", 
            "I_sc", "V_oc", "R_series", "R_shunt"
        ]
        self.use_cache = CACHE_AVAILABLE and cache_manager is not None
    
    def get_parameters(self):
        """Get list of available parameters"""
        try:
            return jsonify({
                "success": True,
                "parameters": self.available_parameters
            }), 200
        except Exception as e:
            logging.error(f"Error getting parameters: {e}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    
    def get_chart_data(self, parameter):
        """Get chart data for a specific parameter (with MongoDB caching + force refresh support)"""
        try:
            if not DATA_PROCESSOR_AVAILABLE:
                return jsonify({
                    "success": False,
                    "error": "Data processor not available"
                }), 500
            
            if parameter not in self.available_parameters:
                return jsonify({
                    "success": False,
                    "error": f"Invalid parameter: {parameter}"
                }), 400
            
            # Check if force refresh requested
            from flask import request
            force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
            
            if force_refresh:
                # Force refresh: bypass cache, fetch from Azure, update cache
                print(f"🔄 FORCE REFRESH: {parameter} - bypassing cache...")
                parameter_data = self._extract_parameter_data(parameter)
                if self.use_cache:
                    cache_manager.set(f"chart_{parameter}", parameter_data, ttl=timedelta(hours=24))
                    print(f"✅ MongoDB cache updated for {parameter}")
            elif self.use_cache:
                # Try MongoDB cache first (instant - 0.5s)
                cache_key = f"chart_{parameter}"
                parameter_data = cache_manager.get_or_compute(
                    cache_key,
                    lambda: self._extract_parameter_data(parameter)
                )
            else:
                # No cache - fetch directly
                parameter_data = self._extract_parameter_data(parameter)
            
            return jsonify({
                "success": True,
                "parameter": parameter,
                "data": parameter_data
            }), 200
            
        except Exception as e:
            logging.error(f"Error getting chart data for {parameter}: {e}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    
    def _extract_parameter_data(self, parameter):
        """Extract data for a specific parameter (helper for caching)"""
        all_chart_data = extract_chart_data()
        return all_chart_data.get(parameter, [])
    
    def get_device_yield(self):
        """Get device yield data with quantiles (with caching)"""
        try:
            if not DATA_PROCESSOR_AVAILABLE:
                return jsonify({
                    "success": False,
                    "error": "Data processor not available"
                }), 500
            
            # Try to get from cache
            if self.use_cache:
                device_yield_data = cache_manager.get_or_compute(
                    "device_yield",
                    extract_device_yield_data
                )
            else:
                device_yield_data = extract_device_yield_data()
            
            return jsonify({
                "success": True,
                "data": device_yield_data
            }), 200
            
        except Exception as e:
            logging.error(f"Error getting device yield data: {e}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    
    def get_iv_repeatability(self):
        """Get IV repeatability data (with caching)"""
        try:
            if not DATA_PROCESSOR_AVAILABLE:
                return jsonify({
                    "success": False,
                    "error": "Data processor not available"
                }), 500
            
            # Try to get from cache
            if self.use_cache:
                iv_data = cache_manager.get_or_compute(
                    "iv_repeatability",
                    extract_iv_repeatability_data
                )
            else:
                iv_data = extract_iv_repeatability_data()
            
            return jsonify({
                "success": True,
                "data": iv_data
            }), 200
            
        except Exception as e:
            logging.error(f"Error getting IV repeatability data: {e}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    
    def get_std_dev(self):
        """Get standard deviation data for all parameters across batches (uses same cached data as PCE Analysis)"""
        try:
            if not DATA_PROCESSOR_AVAILABLE:
                return jsonify({
                    "success": False,
                    "error": "Data processor not available"
                }), 500
            
            # Use the SAME cached data as PCE Analysis graphs
            # This ensures Std Dev shows identical data to PCE/FF/etc. graphs
            all_chart_data = {}
            if self.use_cache:
                for param in self.available_parameters:
                    cache_key = f"chart_{param}"
                    param_data = cache_manager.get_or_compute(
                        cache_key,
                        lambda p=param: self._extract_parameter_data(p)
                    )
                    all_chart_data[param] = param_data
            else:
                all_chart_data = extract_chart_data()
            
            # Prepare std dev data structure
            std_dev_data = {
                "parameters": self.available_parameters,
                "batches": [],
                "std_devs": {}
            }
            
            # Initialize std_devs dict for each parameter
            for param in self.available_parameters:
                std_dev_data["std_devs"][param] = []
            
            # Extract batches from the first parameter's data
            if all_chart_data and self.available_parameters:
                first_param = self.available_parameters[0]
                param_data = all_chart_data.get(first_param, [])
                std_dev_data["batches"] = [item.get("batch", "") for item in param_data]
            
            # Extract std dev values for each parameter
            for param in self.available_parameters:
                param_data = all_chart_data.get(param, [])
                std_dev_data["std_devs"][param] = [
                    item.get("std", 0) for item in param_data
                ]
            
            return jsonify({
                "success": True,
                "data": std_dev_data
            }), 200
            
        except Exception as e:
            logging.error(f"Error getting std dev data: {e}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    
    # Aliases for backward compatibility with app.py
    def get_device_yield_data(self):
        """Alias for get_device_yield"""
        return self.get_device_yield()
    
    def get_iv_repeatability_data(self):
        """Alias for get_iv_repeatability"""
        return self.get_iv_repeatability()

# Lazy singleton instance - will be created on first access
_charts_api_instance = None

def get_charts_api():
    """Get or create the singleton charts API instance"""
    global _charts_api_instance
    if _charts_api_instance is None:
        _charts_api_instance = ChartsAPI()
    return _charts_api_instance

# For backward compatibility
class ChartsAPIProxy:
    """Proxy class that delegates to the lazy-loaded singleton"""
    def __getattr__(self, name):
        return getattr(get_charts_api(), name)

charts_api = ChartsAPIProxy()
