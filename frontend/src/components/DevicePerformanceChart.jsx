import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceArea } from 'recharts';
import { Button } from './ui/button';

const DevicePerformanceChart = ({ deviceId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedParameters, setSelectedParameters] = useState(['PCE']); // Default to PCE

  // Color mapping for parameters
  const parameterColors = {
    'PCE': '#3b82f6',        // Blue
    'FF': '#10b981',         // Green  
    'Max_Power': '#f59e0b',  // Orange
    'HI': '#ef4444',         // Red
    'J_sc': '#8b5cf6',       // Purple
    'V_oc': '#06b6d4',       // Cyan
    'R_series': '#f97316',   // Orange (darker)
    'R_shunt': '#84cc16'     // Lime
  };

  // Parameter info with units
  const parameterInfo = {
    'PCE': { label: 'PCE', unit: '%' },
    'FF': { label: 'FF', unit: '%' },
    'Max_Power': { label: 'Max Power', unit: 'mW' },
    'HI': { label: 'HI', unit: '%' },
    'J_sc': { label: 'J_sc', unit: 'mA/cm²' },
    'V_oc': { label: 'V_oc', unit: 'V' },
    'R_series': { label: 'R_series', unit: 'Ω·cm²' },
    'R_shunt': { label: 'R_shunt', unit: 'Ω·cm²' }
  };

  // Load device performance data
  useEffect(() => {
    const loadDeviceData = async () => {
      if (!deviceId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Import stabilityAPI dynamically to avoid circular dependencies
        const { stabilityAPI } = await import('../lib/api');
        const result = await stabilityAPI.getDevicePerformanceData(deviceId);

        setData(result);
        console.log('✅ Device performance data loaded:', result);
        console.log('🎯 T80 INFO CHECK:', {
          has_t80_info: !!result.t80_info,
          t80_info_details: result.t80_info
        });
      } catch (err) {
        // Don't show error if device has no data yet (test still running)
        if (err.message && !err.message.includes('No data found')) {
          console.error('❌ Error loading device performance data:', err);
        }
        setError(err.message || 'Failed to load device performance data');
      } finally {
        setLoading(false);
      }
    };

    loadDeviceData();
  }, [deviceId]);

  const toggleParameter = (param) => {
    setSelectedParameters(prev => {
      if (prev.includes(param)) {
        // Don't allow deselecting if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== param);
      } else {
        // Limit to 6 parameters to avoid overcrowding
        return prev.length < 6 ? [...prev, param] : prev;
      }
    });
  };

  const selectAllParameters = () => {
    if (data && data.available_parameters) {
      // Select first 6 parameters
      setSelectedParameters(data.available_parameters.slice(0, 6));
    }
  };

  const clearAllParameters = () => {
    setSelectedParameters(['PCE']); // Keep at least PCE
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg text-white">
          <p className="font-semibold">{`Time: ${label} hrs`}</p>
          {payload.filter(entry => selectedParameters.includes(entry.dataKey)).map((entry, index) => {
            const param = entry.dataKey;
            const info = parameterInfo[param] || {};
            
            return (
              <div key={index} className="text-sm mt-1" style={{ color: entry.color }}>
                {info.label || param}: {entry.value?.toFixed(3)}{info.unit}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Show empty graph structure with message
  const showEmptyGraph = !deviceId || loading || error || !data || !data.time_series || data.time_series.length === 0;
  const emptyMessage = loading 
    ? 'Loading device performance data...' 
    : !deviceId 
    ? 'Enter a Device ID to view performance data' 
    : error || 'No performance data available for this device';

  // Create dummy data for empty graph to show structure
  const emptyGraphData = [
    { time_hrs: 0, PCE: null },
    { time_hrs: 100, PCE: null }
  ];

  const chartData = showEmptyGraph ? emptyGraphData : data.time_series;

  return (
    <div className="space-y-3">
      {/* T80 Info Banner - only show when we have valid T80 data */}
      {!showEmptyGraph && data.t80_info && data.t80_info.has_t80 && (
        <div className="bg-green-900/20 border border-green-600 rounded px-3 py-2 text-sm">
          <span className="text-green-400 font-semibold">✅ T80 Reached</span>
          <span className="text-gray-300 ml-2">
            at {data.t80_info.t80_hours} hours | 
            Baseline PCE: {data.t80_info.initial_pce?.toFixed(2)}% | 
            Threshold: {data.t80_info.t80_pce?.toFixed(2)}%
          </span>
        </div>
      )}

      {/* Parameter Selection Controls - only show when we have data */}
      {!showEmptyGraph && (
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Button
              onClick={selectAllParameters}
              variant="outline"
              size="sm"
              className="text-xs bg-gray-800 text-white border-gray-600"
            >
              Select All
            </Button>
            <Button
              onClick={clearAllParameters}
              variant="outline"
              size="sm"
              className="text-xs bg-gray-800 text-white border-gray-600"
            >
              Clear All
            </Button>
            <span className="text-xs text-gray-400 self-center ml-2">
              Selected: {selectedParameters.length} parameter{selectedParameters.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Parameter Selection Buttons */}
          <div className="w-full overflow-x-auto">
            <div className="flex space-x-2 min-w-max pb-2">
              {data.available_parameters && data.available_parameters.map((param) => (
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
      )}

      {/* Chart Area - Always maintain minimum height */}
      {showEmptyGraph ? (
        <div className="flex items-center justify-center bg-gray-900/50 rounded border border-gray-700" style={{ minHeight: '470px' }}>
          <div className="text-gray-400 text-center text-sm">{emptyMessage}</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
          >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="time_hrs" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            label={{ value: 'Time (hours)', position: 'insideBottom', offset: -5, style: { fill: '#94a3b8', fontSize: 12 } }}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* T80 Reference Line - show 80% threshold when we have T80 info */}
          {!showEmptyGraph && data.t80_info && data.t80_info.t80_pce && (
            <ReferenceLine 
              y={data.t80_info.t80_pce} 
              stroke="#22c55e" 
              strokeDasharray="5 5" 
              strokeWidth={2}
              label={{ 
                value: `T80 (${data.t80_info.t80_pce.toFixed(2)}%)`, 
                position: 'right',
                fill: '#22c55e',
                fontSize: 12,
                fontWeight: 'bold'
              }}
            />
          )}
          
          {/* Empty state message overlay */}
          {showEmptyGraph && (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize={14}>
              {emptyMessage}
            </text>
          )}
          
          {/* Render lines for selected parameters - only when we have data */}
          {!showEmptyGraph && selectedParameters.map(param => (
            <Line
              key={param}
              type="monotone"
              dataKey={param}
              stroke={parameterColors[param]}
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                
                // Check if this dot is at the T80 timestamp
                const isT80Dot = data.t80_info?.has_t80 && 
                                 data.t80_info?.t80_hours && 
                                 payload?.time_hrs === data.t80_info.t80_hours;
                
                if (isT80Dot) {
                  // T80 dot: white dot with white circle around it (with gap)
                  return (
                    <g>
                      {/* Outer white circle with gap */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                      {/* Inner dot - white color */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="#ffffff"
                        strokeWidth={0}
                      />
                    </g>
                  );
                } else {
                  // Normal dot: parameter color
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={parameterColors[param]}
                      strokeWidth={2}
                    />
                  );
                }
              }}
              activeDot={{ 
                r: 5, 
                fill: parameterColors[param], 
                stroke: '#ffffff', 
                strokeWidth: 2 
              }}
              connectNulls={false}
            />
          ))}
          
          {/* T80 Reference Lines - only when we have T80 data */}
          {!showEmptyGraph && (() => {
            console.log('🔍 T80 REFERENCE LINE CHECK:', {
              has_t80: data.t80_info?.has_t80,
              t80_hours: data.t80_info?.t80_hours,
              t80_pce: data.t80_info?.t80_pce,
              will_render_vertical: !!(data.t80_info?.has_t80 && data.t80_info?.t80_hours),
              will_render_horizontal: !!(data.t80_info?.has_t80 && data.t80_info?.t80_pce && selectedParameters.includes('PCE'))
            });
            return null;
          })()}
        </LineChart>
      </ResponsiveContainer>
      )}

      {/* Legend - only show when we have data */}
      {!showEmptyGraph && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {selectedParameters.map(param => (
            <div key={param} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: parameterColors[param] }}
              />
              <span className="text-gray-300">
                {parameterInfo[param]?.label || param}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DevicePerformanceChart;
