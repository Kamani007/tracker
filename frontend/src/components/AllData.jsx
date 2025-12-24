import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, RefreshCw, Download } from "lucide-react";
import Navigation from "./Navigation";
import BoxPlot from "./BoxPlot";
import { dataCache, CACHE_KEYS, CACHE_EXPIRATION } from "../lib/cache";
import { fileDownloadAPI, API_BASE_URL } from "../lib/api";

const AllData = () => {
  const [allDataInfo, setAllDataInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastLoadedTime, setLastLoadedTime] = useState(null);
  
  // CACHED DATA
  const [cachedData, setCachedData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Selection states
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [selectedParameters, setSelectedParameters] = useState(['PCE']);
  
  // Chart data
  const [boxPlotData, setBoxPlotData] = useState(null);
  
  // Available options
  const [availableBatches, setAvailableBatches] = useState([]);
  
  const parameters = [
    { key: 'PCE', label: 'PCE (%)', color: '#3b82f6' },
    { key: 'FF', label: 'FF (%)', color: '#10b981' },
    { key: 'Max Power', label: 'Max Power (mW/cm²)', color: '#f59e0b' },
    { key: 'HI', label: 'HI (%)', color: '#ef4444' },
    { key: 'I_sc', label: 'J_sc (mA/cm²)', color: '#8b5cf6' },
    { key: 'V_oc', label: 'V_oc (V)', color: '#06b6d4' },
    { key: 'R_series', label: 'R_series (Ω·cm²)', color: '#f97316' },
    { key: 'R_shunt', label: 'R_shunt (Ω·cm²)', color: '#84cc16' }
  ];

  // Load data once on mount
  useEffect(() => {
    loadAllDataFull();
  }, []);

  // Filter when selections change
  useEffect(() => {
    console.log('🆕🆕🆕 BRAND NEW AllData.jsx LOADED! 🆕🆕🆕');
    
    if (selectedBatches.length > 0 && selectedParameters.length > 0 && cachedData) {
      console.log('✅ Running filter with:');
      console.log('   Selected batches:', selectedBatches);
      console.log('   Selected parameters:', selectedParameters);
      filterBoxPlotData();
    } else {
      console.log('❌ Not filtering - missing selections or data');
      setBoxPlotData(null);
    }
  }, [selectedBatches, selectedParameters, cachedData]);

  const loadAllDataFull = async (forceFresh = false) => {
    try {
      setLoading(true);
      setDataLoading(true);
      setError(null);
      
      // Two-layer caching: Frontend (instant) → Backend MongoDB (0.5s) → Azure (40s)
      if (forceFresh) {
        console.log('🔄 Force refresh: Clearing frontend cache + telling backend to bypass MongoDB...');
        dataCache.clear();
      }
      
      // LAYER 1: Check frontend JavaScript cache first (instant - same session)
      if (!forceFresh) {
        const cached = dataCache.get(CACHE_KEYS.ALL_DATA_FULL, CACHE_EXPIRATION.SESSION);
        if (cached) {
          console.log('⚡ INSTANT: Frontend cache HIT (0.001s)');
          setCachedData(cached);
          setAllDataInfo(cached);
          setAvailableBatches(cached.batches || []);
          setLastLoadedTime(new Date().toLocaleString());
          setLoading(false);
          setDataLoading(false);
          return;
        }
      }
      
      console.log('🚀 Frontend cache MISS → Fetching from backend MongoDB cache...');
      const startTime = Date.now();
      
      // LAYER 2: Fetch from backend (MongoDB cache or Azure)
      // If force_refresh=true, backend bypasses MongoDB and fetches from Azure
      const url = forceFresh 
        ? `${API_BASE_URL}/all-data-full?force_refresh=true`
        : `${API_BASE_URL}/all-data-full`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`✅ Data loaded in ${loadTime}s:`, {
        batches: data.total_batches,
        sheets: data.total_sheets,
        parameters: data.parameters?.length
      });
      
      // Check for baseline split data
      if (data.batch_stats && data.batch_stats.PCE) {
        const pceStats = data.batch_stats.PCE;
        console.log('📊 PCE stats count:', pceStats.length);
        console.log('📊 First 5 batch names:', pceStats.slice(0, 5).map(s => ({
          batch: s.batch,
          is_baseline: s.is_baseline,
          color: s.color
        })));
      }
      
      // Cache in frontend
      dataCache.set(CACHE_KEYS.ALL_DATA_FULL, data);
      setCachedData(data);
      setAllDataInfo(data);
      setAvailableBatches(data.batches || []);
      setLastLoadedTime(new Date().toLocaleString());
      
    } catch (err) {
      console.error('❌ Failed to load data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setDataLoading(false);
    }
  };

  const handleDownloadData = async () => {
    setIsDownloading(true);
    try {
      await fileDownloadAPI.downloadFile('data.xlsx');
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download data.xlsx: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const filterBoxPlotData = () => {
    console.log('🔍 FILTERING STARTED');
    
    if (!cachedData?.batch_stats) {
      console.log('❌ No batch_stats in cached data');
      setBoxPlotData(null);
      return;
    }
    
    const filtered = {};
    
    selectedParameters.forEach(param => {
      const allStats = cachedData.batch_stats[param] || [];
      console.log(`📊 ${param}: ${allStats.length} total entries`);
      
      // Filter by selected batches - match if batch name contains selected batch
      const matchedStats = allStats.filter(stat => {
        const batchName = stat.batch || '';
        const matches = selectedBatches.some(selected => batchName.includes(selected));
        return matches;
      });
      
      console.log(`📊 ${param}: ${matchedStats.length} entries after filter`);
      console.log(`📊 ${param}: Matched batches:`, matchedStats.map(s => s.batch));
      
      filtered[param] = matchedStats;
    });
    
    console.log('✅ FILTERING COMPLETE:', Object.keys(filtered).map(k => `${k}: ${filtered[k].length}`));
    setBoxPlotData(filtered);
  };

  const handleBatchToggle = (batchId, checked) => {
    if (checked) {
      setSelectedBatches(prev => [...prev, batchId]);
    } else {
      setSelectedBatches(prev => prev.filter(id => id !== batchId));
    }
  };

  const handleSelectAllBatches = () => {
    if (selectedBatches.length === availableBatches.length) {
      setSelectedBatches([]);
    } else {
      setSelectedBatches([...availableBatches]);
    }
  };

  const handleParameterToggle = (paramKey, checked) => {
    if (checked) {
      setSelectedParameters(prev => [...prev, paramKey]);
    } else {
      setSelectedParameters(prev => prev.filter(key => key !== paramKey));
    }
  };

  const handleSelectAllParameters = () => {
    if (selectedParameters.length === parameters.length) {
      setSelectedParameters(['PCE']);
    } else {
      setSelectedParameters(parameters.map(p => p.key));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg font-semibold">Loading Data from Azure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          {lastLoadedTime && (
            <p className="text-xs text-green-500">✓ Loaded at {lastLoadedTime}</p>
          )}
          <div className="ml-auto mr-32 flex gap-2">
            <Button onClick={handleDownloadData} variant="outline" size="sm" disabled={isDownloading}>
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download Data'}
            </Button>
            <Button onClick={() => loadAllDataFull(true)} variant="outline" size="sm" disabled={dataLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
              {dataLoading ? 'Loading...' : 'Refresh Data'}
            </Button>
          </div>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Box Plot Analysis</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribution analysis with baseline splits (Blue=Normal, Red=Baseline)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selection Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              {/* Batch Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Batch Selection</h4>
                  <Button variant="outline" size="sm" onClick={handleSelectAllBatches}>
                    {selectedBatches.length === availableBatches.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableBatches.map(batchId => (
                    <div key={batchId} className="flex items-center space-x-2">
                      <Checkbox
                        id={`batch-${batchId}`}
                        checked={selectedBatches.includes(batchId)}
                        onCheckedChange={(checked) => handleBatchToggle(batchId, checked)}
                      />
                      <label htmlFor={`batch-${batchId}`} className="text-sm font-medium">
                        {batchId}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {selectedBatches.length} of {availableBatches.length} selected
                </div>
              </div>

              {/* Parameter Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Parameter Selection</h4>
                  <Button variant="outline" size="sm" onClick={handleSelectAllParameters}>
                    {selectedParameters.length === parameters.length ? 'Reset' : 'Select All'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {parameters.map(param => (
                    <Button
                      key={param.key}
                      onClick={() => handleParameterToggle(param.key, !selectedParameters.includes(param.key))}
                      variant={selectedParameters.includes(param.key) ? 'default' : 'outline'}
                      size="sm"
                      style={{
                        backgroundColor: selectedParameters.includes(param.key) ? param.color : 'transparent',
                        borderColor: param.color,
                        color: selectedParameters.includes(param.key) ? 'white' : param.color
                      }}
                    >
                      {param.label}
                    </Button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {selectedParameters.length} of {parameters.length} selected
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-gradient-to-r from-blue-50 to-red-50 dark:from-blue-900/20 dark:to-red-900/20 rounded-lg border border-gray-300 dark:border-gray-700 p-4">
              <h4 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-200">Color Legend</h4>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-6 border-2 border-blue-500 bg-blue-500 bg-opacity-30 rounded"></div>
                  <span className="font-bold text-blue-600 text-base">BLUE = Normal</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-6 border-2 border-red-500 bg-red-500 bg-opacity-20 rounded" style={{borderStyle: 'dashed'}}></div>
                  <span className="font-bold text-red-600 text-base">RED = Baseline</span>
                </div>
              </div>
            </div>

            {/* Box Plots - Horizontally Scrollable */}
            <div style={{ width: '100%', minHeight: '400px' }}>
              {boxPlotData && selectedParameters.length > 0 ? (
                <div className="space-y-8">
                  {selectedParameters.map(param => {
                    const paramData = boxPlotData[param] || [];
                    const boxWidth = 100; // Width per box - more spacious
                    const totalWidth = Math.max(1400, paramData.length * boxWidth + 200); // Min 1400px with more padding
                    
                    return (
                      <div key={param}>
                        <h4 className="text-sm font-medium mb-3">
                          {parameters.find(p => p.key === param)?.label || param}
                        </h4>
                        <div className="overflow-x-auto pb-4" style={{ maxWidth: '100%' }}>
                          <div style={{ minWidth: `${totalWidth}px` }}>
                            <BoxPlot 
                              data={paramData} 
                              width={totalWidth}
                              height={300}
                              color={parameters.find(p => p.key === param)?.color || '#3b82f6'}
                              unit={parameters.find(p => p.key === param)?.label?.includes('%') ? '%' : ''}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p>Select batches and parameters to view box plots</p>
                    <p className="text-xs mt-1">Statistical distribution will be displayed here</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AllData;
