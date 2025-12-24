// API utility functions for backend server
// Single backend with modular architecture (charts_api.py, data_management_api.py)

import { dataCache, CACHE_KEYS, CACHE_EXPIRATION } from './cache';

// ==================== ENVIRONMENT CONFIGURATION ====================
// 🔧 DEPLOYMENT GUIDE: Comment/Uncomment the appropriate block before deployment

// 🏠 LOCAL DEVELOPMENT - Uncomment for local development
const API_BASE_URL = 'http://localhost:7071/api';
const ENVIRONMENT = 'development';

// 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (testing branch)
// const API_BASE_URL = 'https://rayleigh-solar-backend.onrender.com/api';
// const ENVIRONMENT = 'uat';

// 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (main branch)
// const API_BASE_URL = 'https://rayleigh-tracker-a7e9beesftbyfbbg.canadacentral-01.azurewebsites.net/api';
// const ENVIRONMENT = 'production';

// Export API_BASE_URL so other components can use it consistently
export { API_BASE_URL };

console.log('🚀 API Configuration:', {
  baseURL: API_BASE_URL,
  environment: ENVIRONMENT,
  hostname: window.location.hostname,
  caching: 'Enabled'
});

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Check for API error response
  if (data.success === false) {
    throw new Error(data.error || 'API error');
  }
  
  // Return the full response object to preserve success/data structure
  return data;
};

// Safety Issues API functions
export const safetyAPI = {
  // Get all safety issues (NO CACHE - always fetch fresh from MongoDB)
  getAll: async (limit = null, skip = 0) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (skip > 0) params.append('skip', skip);
    
    const url = `${API_BASE_URL}/safety${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    const result = await handleResponse(response);
    
    return result;
  },

  // Create a new safety issue
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/safety`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return result;
  },

  // Update a safety issue
  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/safety/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return result;
  },

  // Delete a safety issue
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/safety/${id}`, {
      method: 'DELETE',
    });
    const result = await handleResponse(response);
    return result;
  },
};

// Baseline Batches API functions
export const baselineBatchesAPI = {
  // Get all baseline batches
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/baseline-batches`);
    return handleResponse(response);
  },

  // Create a new baseline batch
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/baseline-batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Delete a baseline batch
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/baseline-batches/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// Kudos API functions
export const kudosAPI = {
  // Get all kudos (NO CACHE - always fetch fresh from MongoDB)
  getAll: async (limit = null, skip = 0) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (skip > 0) params.append('skip', skip);
    
    const url = `${API_BASE_URL}/kudos${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    const result = await handleResponse(response);
    
    return result;
  },

  // Create a new kudos entry
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/kudos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return result;
  },

  // Update a kudos entry
  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/kudos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return result;
  },

  // Delete a kudos entry
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/kudos/${id}`, {
      method: 'DELETE',
    });
    const result = await handleResponse(response);
    return result;
  },
};

// ==================== TOP ISSUES (Unified - replaces today/yesterday) ====================
export const topIssuesAPI = {
  // Get all top issues with optional status filter
  getAll: async (limit = null, skip = 0, status = null) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (skip > 0) params.append('skip', skip);
    if (status) params.append('status', status); // 'Pending' or 'Done'
    
    const url = `${API_BASE_URL}/top-issues${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    const result = await handleResponse(response);
    return result;
  },

  // Create a new top issue
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/top-issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  },

  // Update a top issue
  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/top-issues/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  },

  // Delete a top issue
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/top-issues/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(response);
  },
};

// Today's Issues API functions (BACKWARD COMPATIBILITY)
export const todayAPI = {
  // Get all today's issues (NO CACHE - always fetch fresh from MongoDB)
  getAll: async (limit = null, skip = 0) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (skip > 0) params.append('skip', skip);
    
    const url = `${API_BASE_URL}/today${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    const result = await handleResponse(response);
    
    return result;
  },

  // Create a new today's issue
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/today`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return result;
  },

  // Update a today's issue
  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/today/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return result;
  },

  // Delete a today's issue
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/today/${id}`, {
      method: 'DELETE',
    });
    const result = await handleResponse(response);
    return result;
  },
};

// Yesterday's Issues API functions
export const yesterdayAPI = {
  // Get all yesterday's issues (NO CACHE - always fetch fresh from MongoDB)
  getAll: async (limit = null, skip = 0) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (skip > 0) params.append('skip', skip);
    
    const url = `${API_BASE_URL}/yesterday${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    const result = await handleResponse(response);
    
    return result;
  },

  // Create a new yesterday's issue (invalidate cache)
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/yesterday`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    dataCache.delete(CACHE_KEYS.YESTERDAY_ISSUES);
    return result;
  },

  // Update a yesterday's issue
  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/yesterday/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return result;
  },

  // Delete a yesterday's issue
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/yesterday/${id}`, {
      method: 'DELETE',
    });
    const result = await handleResponse(response);
    return result;
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(response);
  },
};

// Chart data API functions
export const chartAPI = {
  // Get available parameters (with caching)
  getParameters: async () => {
    const cached = dataCache.get(CACHE_KEYS.PARAMETERS, CACHE_EXPIRATION.SESSION);
    if (cached) return cached;

    const response = await fetch(`${API_BASE_URL}/charts/parameters`);
    const data = await handleResponse(response);
    
    // Cache the full response to preserve structure
    dataCache.set(CACHE_KEYS.PARAMETERS, data);
    return data;
  },

  // Get data for a specific parameter (with caching)
  getData: async (parameter) => {
    const cacheKey = CACHE_KEYS.PARAMETER_DATA(parameter);
    const cached = dataCache.get(cacheKey, CACHE_EXPIRATION.SESSION);
    if (cached) return cached;

    const response = await fetch(`${API_BASE_URL}/charts/data/${parameter}`);
    const result = await handleResponse(response);
    
    // Cache the full response
    dataCache.set(cacheKey, result);
    return result;
  },

  // Get device yield data with 2.5% quantiles and batch averages (with caching)
  getDeviceYield: async () => {
    const cached = dataCache.get(CACHE_KEYS.DEVICE_YIELD, CACHE_EXPIRATION.SESSION);
    if (cached) return cached;

    const response = await fetch(`${API_BASE_URL}/charts/device-yield`);
    const result = await handleResponse(response);
    
    // Cache the full response
    dataCache.set(CACHE_KEYS.DEVICE_YIELD, result);
    return result;
  },

  // Get IV repeatability data with daily averages for last 10 days (with caching)
  getIVRepeatability: async () => {
    const cached = dataCache.get(CACHE_KEYS.IV_REPEATABILITY, CACHE_EXPIRATION.SESSION);
    if (cached) return cached;

    const response = await fetch(`${API_BASE_URL}/charts/iv-repeatability`);
    const result = await handleResponse(response);
    
    // Cache the full response
    dataCache.set(CACHE_KEYS.IV_REPEATABILITY, result);
    return result;
  },

  // Get standard deviation data for all parameters across batches (with caching)
  getStdDev: async () => {
    const cached = dataCache.get(CACHE_KEYS.STD_DEV, CACHE_EXPIRATION.SESSION);
    if (cached) return cached;

    const response = await fetch(`${API_BASE_URL}/charts/std-dev`);
    const result = await handleResponse(response);
    
    // Cache the full response
    dataCache.set(CACHE_KEYS.STD_DEV, result);
    return result;
  },
};

// Reset API functions
export const resetAPI = {
  resetTodayIssues: async () => {
    const response = await fetch(`${API_BASE_URL}/reset-today`, {
      method: 'POST',
    });
    return handleResponse(response);
  },
};

// Analysis API functions
export const analysisAPI = {
  // Process Excel/CSV file with analysis options
  processFile: async (file, options) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add processing options to form data
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const response = await fetch(`${API_BASE_URL}/analysis/process`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse(response);
  },

  // Download analysis results - Quick Data
  downloadQuickData: async () => {
    const response = await fetch(`${API_BASE_URL}/analysis/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileType: 'quick' }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(error.message || 'Download failed');
    }

    // Handle file download
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    // Get filename from response headers or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'Quick_Data.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return { success: true, filename };
  },

  // Download analysis results - Entire Data
  downloadEntireData: async () => {
    const response = await fetch(`${API_BASE_URL}/analysis/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileType: 'entire' }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(error.message || 'Download failed');
    }

    // Handle file download
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    // Get filename from response headers or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'Entire_Data.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return { success: true, filename };
  },
};

// Stability API functions
export const stabilityAPI = {
  // Get all grid data (with caching)
  getGridData: async () => {
    try {
      const cached = dataCache.get(CACHE_KEYS.STABILITY_GRID, CACHE_EXPIRATION.SESSION);
      if (cached) return cached;

      const response = await fetch(`${API_BASE_URL}/stability/grid-data`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch grid data');
      }
      
      dataCache.set(CACHE_KEYS.STABILITY_GRID, result.gridData);
      return result.gridData;
    } catch (error) {
      console.error('Error fetching grid data:', error);
      throw error;
    }
  },

  // Get all active devices (with caching)
  getDevices: async () => {
    try {
      const cached = dataCache.get(CACHE_KEYS.STABILITY_DEVICES, CACHE_EXPIRATION.SESSION);
      if (cached) return cached;

      const response = await fetch(`${API_BASE_URL}/stability/devices`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch devices');
      }
      
      dataCache.set(CACHE_KEYS.STABILITY_DEVICES, result.devices);
      return result.devices;
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  },

  // Create new device (invalidate cache after creation)
  // Create new device (invalidate cache after creation)
  createDevice: async (deviceData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stability/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceData)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create device');
      }
      
      // Invalidate cache after creation
      dataCache.delete(CACHE_KEYS.STABILITY_GRID);
      dataCache.delete(CACHE_KEYS.STABILITY_DEVICES);
      
      return result.device;
    } catch (error) {
      console.error('Error creating device:', error);
      throw error;
    }
  },

  // Update device by position (invalidate cache after update)
  updateDevice: async (sectionKey, subsectionKey, row, col, deviceData) => {
    try {
      // Build device path in format: section_key/subsection_key/row/col
      const devicePath = `${sectionKey}/${subsectionKey || '_empty_'}/${row}/${col}`;
      const encodedPath = encodeURIComponent(devicePath);
      
      const response = await fetch(
        `${API_BASE_URL}/stability/devices/${encodedPath}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(deviceData)
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update device');
      }
      
      // Invalidate cache after update
      dataCache.delete(CACHE_KEYS.STABILITY_GRID);
      dataCache.delete(CACHE_KEYS.STABILITY_DEVICES);
      
      return result;
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  },

  // Remove device (soft delete) - invalidate cache after deletion
  removeDevice: async (sectionKey, subsectionKey, row, col, removedBy) => {
    try {
      // Build device path in format: section_key/subsection_key/row/col
      const devicePath = `${sectionKey}/${subsectionKey || '_empty_'}/${row}/${col}`;
      const encodedPath = encodeURIComponent(devicePath);
      
      const response = await fetch(
        `${API_BASE_URL}/stability/devices/${encodedPath}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ removedBy })
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove device');
      }
      
      // Invalidate cache after deletion
      dataCache.delete(CACHE_KEYS.STABILITY_GRID);
      dataCache.delete(CACHE_KEYS.STABILITY_DEVICES);
      
      return result;
    } catch (error) {
      console.error('Error removing device:', error);
      throw error;
    }
  },

  // Get history for specific slot
  getHistory: async (sectionKey, subsectionKey, row, col) => {
    try {
      // Build device path in format: section_key/subsection_key/row/col
      const devicePath = `${sectionKey}/${subsectionKey || '_empty_'}/${row}/${col}`;
      const encodedPath = encodeURIComponent(devicePath);
      
      const response = await fetch(
        `${API_BASE_URL}/stability/history/${encodedPath}`
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch history');
      }
      
      return result.history;
    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  },

  // Check for expired devices
  checkExpiredDevices: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stability/check-expired`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to check expired devices');
      }
      
      return result.expired_devices;
    } catch (error) {
      console.error('Error checking expired devices:', error);
      throw error;
    }
  },

  // Process expired devices and get details
  processExpiredDevices: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stability/process-expired`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process expired devices');
      }
      
      return {
        message: result.message,
        processedCount: result.processed_count,
        processedDevices: result.processed_devices
      };
    } catch (error) {
      console.error('Error processing expired devices:', error);
      throw error;
    }
  },

  // Get device performance data (time series graphs) - with caching
  getDevicePerformanceData: async (deviceId) => {
    try {
      const cacheKey = CACHE_KEYS.DEVICE_PERFORMANCE(deviceId);
      const cached = dataCache.get(cacheKey, CACHE_EXPIRATION.SESSION);
      if (cached) return cached;

      const response = await fetch(`${API_BASE_URL}/stability/device-data/${deviceId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch device performance data');
      }
      
      dataCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching device performance data:', error);
      throw error;
    }
  },

  // Force refresh - clears cache and reloads fresh data from Azure
  forceRefresh: async () => {
    try {
      console.log('🔄 Force refreshing stability data...');
      
      // Clear ALL device performance data from frontend cache
      console.log('🗑️ Clearing frontend device cache...');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('device_performance_') || key.startsWith('stability_')) {
          localStorage.removeItem(key);
        }
      });
      
      const response = await fetch(`${API_BASE_URL}/stability/refresh-data`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to refresh data');
      }
      
      console.log('✅ Data refreshed successfully');
      return result;
    } catch (error) {
      console.error('Error force refreshing data:', error);
      throw error;
    }
  }
};

// NEW Stability Samples API (Position-Independent System)
export const stabilitySamplesAPI = {
  // Get grid data (sample counts by temperature, NOT position-based)
  getGridData: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stability/samples/grid-data`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch grid data');
      }
      
      return result.gridData;
    } catch (error) {
      console.error('Error fetching stability samples grid data:', error);
      throw error;
    }
  },

  // Batch add multiple samples at once
  batchAddSamples: async (samples) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stability/samples/batch-add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ samples })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add samples');
      }
      
      return result;
    } catch (error) {
      console.error('Error batch adding samples:', error);
      throw error;
    }
  },

  // Get active samples (optionally filter by temperature or test type)
  getActiveSamples: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.temperature) params.append('temperature', filters.temperature);
      if (filters.testType) params.append('testType', filters.testType);
      
      const url = `${API_BASE_URL}/stability/samples/active${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch active samples');
      }
      
      return result.samples;
    } catch (error) {
      console.error('Error fetching active samples:', error);
      throw error;
    }
  },

  // Get history for a specific temperature (all completed samples)
  getHistory: async (testType, temperature) => {
    try {
      const params = new URLSearchParams();
      params.append('testType', testType);
      if (temperature) params.append('temperature', temperature);
      
      const response = await fetch(`${API_BASE_URL}/stability/samples/history?${params.toString()}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch history');
      }
      
      return result.samples || [];
    } catch (error) {
      console.error('Error fetching sample history:', error);
      throw error;
    }
  },

  // Remove specific samples (soft delete: active -> completed)
  removeSamples: async (deviceIds) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stability/samples/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceIds: deviceIds })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove samples');
      }
      
      return result;
    } catch (error) {
      console.error('Error removing samples:', error);
      throw error;
    }
  },

  // Remove ALL samples from a specific temperature section
  removeAllSamples: async (testType, temperature) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stability/samples/remove-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          test_type: testType, 
          temperature: temperature
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove all samples');
      }
      
      return result;
    } catch (error) {
      console.error('Error removing all samples:', error);
      throw error;
    }
  },

  // Get specific sample by device ID
  getSampleById: async (deviceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stability/samples/by-id?deviceId=${encodeURIComponent(deviceId)}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch sample');
      }
      
      return result.sample;
    } catch (error) {
      console.error('Error fetching sample by ID:', error);
      throw error;
    }
  },

  // Update specific sample
  updateSample: async (deviceId, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stability/samples/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_id: deviceId, ...updates })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update sample');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating sample:', error);
      throw error;
    }
  },

  // Get device performance data (reuse from old API - CSV data unchanged)
  getDevicePerformanceData: async (deviceId) => {
    try {
      const cacheKey = CACHE_KEYS.DEVICE_PERFORMANCE(deviceId);
      const cached = dataCache.get(cacheKey, CACHE_EXPIRATION.SESSION);
      if (cached) return cached;

      const response = await fetch(`${API_BASE_URL}/stability/device-data/${deviceId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch device performance data');
      }
      
      dataCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching device performance data:', error);
      throw error;
    }
  }
};

// Batch Processing API functions
export const batchAPI = {
  // Get current location of all batches (with caching)
  getCurrentLocation: async () => {
    try {
      const cached = dataCache.get(CACHE_KEYS.BATCH_LOCATION, CACHE_EXPIRATION.MEDIUM);
      if (cached) return cached;

      const response = await fetch(`${API_BASE_URL}/batches/current-location`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch batch locations');
      }
      
      dataCache.set(CACHE_KEYS.BATCH_LOCATION, result.data);
      return result.data;
    } catch (error) {
      console.error('Error fetching batch locations:', error);
      throw error;
    }
  },

  // Health check for batch processing
  healthCheck: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/batches/health`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error checking batch health:', error);
      throw error;
    }
  },

  // Get all batch priorities
  getPriorities: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/batches/priorities`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching batch priorities:', error);
      throw error;
    }
  },

  // Update priority for a specific batch
  updatePriority: async (batchId, priority) => {
    try {
      const response = await fetch(`${API_BASE_URL}/batches/priorities/${batchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error updating batch priority:', error);
      throw error;
    }
  },

  // Save batch location snapshot to history
  saveLocationSnapshot: async (batches) => {
    try {
      const response = await fetch(`${API_BASE_URL}/batches/location/snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batches }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error saving batch location snapshot:', error);
      throw error;
    }
  },

  // Get batch location history
  getLocationHistory: async (days = 7) => {
    try {
      const response = await fetch(`${API_BASE_URL}/batches/location/history?days=${days}`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching batch location history:', error);
      throw error;
    }
  }
};


// File Download API functions
export const fileDownloadAPI = {
  // Download a file from Azure Blob Storage
  downloadFile: async (filename) => {
    try {
      const url = `${API_BASE_URL}/download-azure-file?filename=${encodeURIComponent(filename)}`;
      
      // Fetch the file
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Download failed' }));
        throw new Error(errorData.message || `Failed to download ${filename}`);
      }
      
      // Get the blob from response
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log(`✅ Successfully downloaded ${filename}`);
      return { success: true, message: `Downloaded ${filename}` };
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
};

// Track Progress API functions
export const trackProgressAPI = {
  // Work Packages
  getAllWorkPackages: async () => {
    const response = await fetch(`${API_BASE_URL}/track-progress/work-packages`);
    const result = await handleResponse(response);
    return result.data || result;
  },

  getWorkPackage: async (wpId) => {
    const response = await fetch(`${API_BASE_URL}/track-progress/work-packages/${wpId}`);
    const result = await handleResponse(response);
    return result.data || result;
  },

  createWorkPackage: async (data) => {
    const response = await fetch(`${API_BASE_URL}/track-progress/work-packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return result.data || result;
  },

  updateWorkPackage: async (wpId, data) => {
    const response = await fetch(`${API_BASE_URL}/track-progress/work-packages/${wpId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  },

  deleteWorkPackage: async (wpId) => {
    const response = await fetch(`${API_BASE_URL}/track-progress/work-packages/${wpId}`, {
      method: 'DELETE',
    });
    return await handleResponse(response);
  },

  // Tasks
  addTask: async (wpId, taskData) => {
    const response = await fetch(`${API_BASE_URL}/track-progress/work-packages/${wpId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    const result = await handleResponse(response);
    return result.data || result;
  },

  updateTask: async (wpId, taskId, taskData) => {
    const response = await fetch(`${API_BASE_URL}/track-progress/work-packages/${wpId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    return await handleResponse(response);
  },

  deleteTask: async (wpId, taskId) => {
    const response = await fetch(`${API_BASE_URL}/track-progress/work-packages/${wpId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    return await handleResponse(response);
  },

  // Subtasks
  addSubtask: async (wpId, taskId, subtaskData) => {
    const response = await fetch(`${API_BASE_URL}/track-progress/work-packages/${wpId}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subtaskData),
    });
    const result = await handleResponse(response);
    return result.data || result;
  },

  updateSubtask: async (wpId, taskId, subtaskId, subtaskData) => {
    const response = await fetch(`${API_BASE_URL}/track-progress/work-packages/${wpId}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subtaskData),
    });
    return await handleResponse(response);
  },

  deleteSubtask: async (wpId, taskId, subtaskId) => {
    const response = await fetch(`${API_BASE_URL}/track-progress/work-packages/${wpId}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
    });
    return await handleResponse(response);
  },
};
