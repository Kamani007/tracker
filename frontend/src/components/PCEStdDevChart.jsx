import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Text } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { chartAPI, fileDownloadAPI } from '../lib/api';

const PCEStdDevChart = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedParameters, setSelectedParameters] = useState(['PCE']); // Default to show PCE only
  const [isDownloading, setIsDownloading] = useState(false);

  // Color mapping for parameters (matching ParameterChart & DeviceYieldChart colors)
  const parameterColors = {
    'PCE': '#3b82f6',        // Blue
    'FF': '#10b981',         // Green  
    'Max Power': '#f59e0b',  // Orange
    'HI': '#ef4444',         // Red
    'I_sc': '#8b5cf6',       // Purple
    'V_oc': '#06b6d4',       // Cyan
    'R_series': '#f97316',   // Orange (darker)
    'R_shunt': '#84cc16'     // Lime
  };

  // Parameter info with units (matching ParameterChart)
  const parameterInfo = {
    'PCE': { label: 'PCE', unit: '%' },
    'FF': { label: 'FF', unit: '%' },
    'Max Power': { label: 'Max Power', unit: 'mW/cm²' },
    'HI': { label: 'HI', unit: '%' },
    'I_sc': { label: 'I_sc', unit: 'mA/cm²' },
    'V_oc': { label: 'V_oc', unit: 'V' },
    'R_series': { label: 'R_series', unit: 'Ω·cm²' },
    'R_shunt': { label: 'R_shunt', unit: 'Ω·cm²' }
  };

  useEffect(() => {
    const loadStdDevData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await chartAPI.getStdDev();
        if (response.success) {
          setData(response.data);
        } else {
          setError('Failed to load std dev data');
        }
      } catch (err) {
        console.error('Error loading std dev data:', err);
        setError('Failed to load std dev data');
      } finally {
        setLoading(false);
      }
    };

    loadStdDevData();
  }, []);

  const toggleParameter = (param) => {
    setSelectedParameters(prev => {
      if (prev.includes(param)) {
        // Remove parameter (but keep at least one selected)
        return prev.length > 1 ? prev.filter(p => p !== param) : prev;
      } else {
        // Add parameter
        return [...prev, param];
      }
    });
  };

  const selectAllParameters = () => {
    if (data && data.parameters) {
      setSelectedParameters(data.parameters);
    }
  };

  const clearAllParameters = () => {
    setSelectedParameters(['PCE']); // Keep at least PCE selected
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-balance">PCE Std Dev</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <div className="text-gray-500">Loading std dev data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || !data.parameters || data.parameters.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-balance">PCE Std Dev</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <div className="text-red-500">{error || 'No std dev data available'}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart (batches on X-axis, std dev values on Y-axis)
  const chartData = data.batches.map((batch, batchIndex) => {
    const dataPoint = { batch };
    
    data.parameters.forEach(param => {
      if (data.std_devs[param] && data.std_devs[param][batchIndex] !== undefined) {
        dataPoint[param] = data.std_devs[param][batchIndex];
      }
    });
    
    return dataPoint;
  });

  // Calculate Y-axis domain to show std dev range properly
  const calculateYAxisDomain = () => {
    if (!selectedParameters.length || !data) return ['auto', 'auto'];
    
    let allValues = [];
    
    // Include std dev values for selected parameters
    selectedParameters.forEach(param => {
      if (data.std_devs[param]) {
        allValues.push(...data.std_devs[param]);
      }
    });
    
    if (allValues.length === 0) return ['auto', 'auto'];
    
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal;
    const padding = range * 0.15; // 15% padding
    
    return [Math.max(0, minVal - padding), maxVal + padding];
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold">{`Batch: ${label}`}</p>
          {payload.filter(entry => selectedParameters.includes(entry.dataKey)).map((entry, index) => {
            const param = entry.dataKey;
            const info = parameterInfo[param] || {};
            
            return (
              <div key={index} className="text-sm mt-1">
                <div style={{ color: entry.color }}>
                  {info.label || param} Std Dev: {entry.value?.toFixed(3)}{info.unit}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const handleDownloadFile = async () => {
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold text-balance">PCE Std Dev</CardTitle>
            <div className="text-sm text-gray-500 mb-4">
              Standard deviation of PCE Analysis parameters across batches
            </div>
          </div>
          <Button 
            onClick={handleDownloadFile}
            disabled={isDownloading}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download Data'}
          </Button>
        </div>
        
        {/* Parameter Selection Controls */}
        <div className="space-y-3">
          {/* Control Buttons */}
          <div className="flex space-x-2">
            <Button
              onClick={selectAllParameters}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              onClick={clearAllParameters}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Clear All
            </Button>
            <span className="text-xs text-gray-500 self-center ml-2">
              Selected: {selectedParameters.length} parameter{selectedParameters.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Parameter Selection Buttons */}
          <div className="w-full overflow-x-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
            <div className="flex space-x-2 min-w-max pb-2">
              {data && data.parameters && data.parameters.map((param) => (
                <Button
                  key={param}
                  onClick={() => toggleParameter(param)}
                  variant={selectedParameters.includes(param) ? 'default' : 'outline'}
                  size="sm"
                  className={`whitespace-nowrap transition-all duration-200 ${
                    selectedParameters.includes(param)
                      ? 'shadow-lg transform scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: selectedParameters.includes(param) ? parameterColors[param] : 'transparent',
                    borderColor: parameterColors[param],
                    color: selectedParameters.includes(param) ? 'white' : parameterColors[param]
                  }}
                >
                  {parameterInfo[param]?.label || param}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 40, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="batch" 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              domain={calculateYAxisDomain()}
              allowDecimals={false}
              tickFormatter={(value) => Math.round(value)}
              label={{ value: 'Standard Deviation', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Render line charts for std dev values (only for selected parameters) */}
            {selectedParameters.map((param) => (
              <Line
                key={param}
                type="monotone"
                dataKey={param}
                stroke={parameterColors[param]}
                strokeWidth={3}
                dot={{ 
                  fill: parameterColors[param], 
                  strokeWidth: 2, 
                  r: 6,
                  stroke: '#ffffff'
                }}
                activeDot={{ 
                  r: 8, 
                  fill: parameterColors[param], 
                  stroke: '#ffffff', 
                  strokeWidth: 2 
                }}
                connectNulls={false}
                label={{
                  position: 'top',
                  fill: parameterColors[param],
                  fontSize: 16,
                  fontWeight: 'bold',
                  formatter: (value) => value ? value.toFixed(3) : ''
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* Legend - Only show selected parameters */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          {selectedParameters.map(param => (
            <div key={param} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: parameterColors[param] }}
              />
              <span className="text-gray-600">
                {parameterInfo[param]?.label || param} Std Dev
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          Lower standard deviation indicates more consistent batch performance
        </div>
      </CardContent>
    </Card>
  );
};

export default PCEStdDevChart;
