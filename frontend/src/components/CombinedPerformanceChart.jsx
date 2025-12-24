import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { Button } from './ui/button';

const CombinedPerformanceChart = ({ deviceIds, history }) => {
  const [combinedData, setCombinedData] = useState([]);
  const [devicesData, setDevicesData] = useState([]); // Store device data with T80 info
  const [loading, setLoading] = useState(false);
  const [selectedParameters, setSelectedParameters] = useState(['PCE']); // Default to PCE

  // Color palette for different devices
  const deviceColors = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Orange
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Dark Orange
    '#84cc16', // Lime
    '#ec4899', // Pink
    '#14b8a6', // Teal
  ];

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

  // Load and combine data from all devices
  useEffect(() => {
    const loadCombinedData = async () => {
      if (!deviceIds || deviceIds.length === 0) {
        setCombinedData([]);
        return;
      }

      try {
        setLoading(true);

        // Import stabilityAPI dynamically
        const { stabilityAPI } = await import('../lib/api');

        // Fetch data for all devices
        const allDeviceData = await Promise.all(
          deviceIds.map(async (deviceId) => {
            try {
              const data = await stabilityAPI.getDevicePerformanceData(deviceId);
              console.log(`✅ Data for ${deviceId}:`, data);
              return { deviceId, data };
            } catch (err) {
              // Device may not have data yet (test still running)
              console.log(`⚠️ No data for ${deviceId}:`, err.message);
              return { deviceId, data: null };
            }
          })
        );

        console.log('📦 All device data loaded:', allDeviceData);

        // Store device data for T80 info access
        setDevicesData(allDeviceData);

        // Combine data by timestamp
        const timeMap = new Map();

        allDeviceData.forEach(({ deviceId, data }, index) => {
          console.log(`Processing ${deviceId}:`, { 
            hasData: !!data, 
            hasMeasurements: !!data?.measurements,
            measurementCount: data?.measurements?.length || 0,
            dataKeys: data ? Object.keys(data) : []
          });
          
          if (!data) {
            console.log(`❌ ${deviceId}: No data object`);
            return;
          }
          
          // Check for different data formats
          const measurements = data.measurements || data.time_series || [];
          
          if (measurements.length === 0) {
            console.log(`❌ ${deviceId}: No measurements found`);
            return;
          }

          const color = deviceColors[index % deviceColors.length];
          console.log(`Processing ${measurements.length} measurements for ${deviceId}`);
          
          measurements.forEach((measurement) => {
            // Handle both formats: hours or time_hrs
            const timeValue = measurement.hours || measurement.time_hrs || 0;
            const timeKey = `${timeValue}h`;
            
            if (!timeMap.has(timeKey)) {
              timeMap.set(timeKey, {
                time: timeValue,
                timestamp: measurement.timestamp || measurement.Time_hrs,
              });
            }

            const entry = timeMap.get(timeKey);
            
            // Add data for each parameter for this device
            Object.keys(parameterInfo).forEach(param => {
              const value = measurement[param];
              if (value !== undefined && value !== null) {
                entry[`${deviceId}_${param}`] = value;
                entry[`${deviceId}_color`] = color;
              }
            });
          });
        });

        // Convert to array and sort by time
        const combined = Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
        
        console.log('📊 Combined data:', combined);
        console.log('📊 Device IDs:', deviceIds);
        setCombinedData(combined);

      } catch (err) {
        console.error('❌ Error loading combined data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCombinedData();
  }, [deviceIds]);

  const toggleParameter = (param) => {
    setSelectedParameters(prev => {
      if (prev.includes(param)) {
        if (prev.length === 1) return prev; // Don't allow deselecting last parameter
        return prev.filter(p => p !== param);
      } else {
        return prev.length < 6 ? [...prev, param] : prev; // Limit to 6 parameters
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading combined data...</p>
        </div>
      </div>
    );
  }

  if (combinedData.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>No data available for selected devices</p>
        <p className="text-sm mt-2">Tests may still be running or no measurements recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Parameter Selection */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(parameterInfo).map(param => (
          <Button
            key={param}
            variant={selectedParameters.includes(param) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleParameter(param)}
            className="text-xs"
          >
            {parameterInfo[param].label}
          </Button>
        ))}
      </div>

      {/* Device Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg">
        {deviceIds.map((deviceId, index) => {
          const sample = history.find(h => h.deviceId === deviceId);
          const color = deviceColors[index % deviceColors.length];
          return (
            <div key={deviceId} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <div>
                <span className="font-mono text-sm font-semibold">{deviceId}</span>
                {sample && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({sample.hours}h {sample.minutes}m)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Combined Chart for each parameter */}
      {selectedParameters.map(param => (
        <div key={param} className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {parameterInfo[param].label} Comparison
            <span className="text-sm text-muted-foreground font-normal">
              ({parameterInfo[param].unit})
            </span>
          </h3>
          
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Time (hours)', position: 'insideBottom', offset: -5 }}
                tickFormatter={(value) => `${value}h`}
              />
              <YAxis 
                label={{ value: parameterInfo[param].unit, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  const deviceId = name.split('_')[0];
                  return [
                    typeof value === 'number' ? value.toFixed(3) : value,
                    deviceId
                  ];
                }}
                labelFormatter={(value) => `Time: ${value}h`}
              />
              <Legend 
                formatter={(value) => {
                  // Extract device ID from the key (e.g., "B25-80-S001-A1_PCE" -> "B25-80-S001-A1")
                  const deviceId = value.replace(`_${param}`, '');
                  
                  // Add T80 info to legend
                  const deviceData = devicesData.find(d => d.deviceId === deviceId);
                  const t80Info = deviceData?.data?.t80_info;
                  
                  if (t80Info?.has_t80) {
                    return `${deviceId} (T80: ${t80Info.t80_hours}h)`;
                  } else {
                    return `${deviceId} (T80: Not Reached)`;
                  }
                }}
              />
              
              {/* Create a line for each device */}
              {deviceIds.map((deviceId, index) => {
                const dataKey = `${deviceId}_${param}`;
                const color = deviceColors[index % deviceColors.length];
                
                // Check if this device has data for this parameter
                const hasData = combinedData.some(d => d[dataKey] !== undefined);
                
                if (!hasData) return null;
                
                // Get T80 info for this device
                const deviceData = devicesData.find(d => d.deviceId === deviceId);
                const t80Info = deviceData?.data?.t80_info;
                
                return (
                  <Line
                    key={dataKey}
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      
                      // Check if this is the T80 point for this device
                      const isT80Point = t80Info?.has_t80 && 
                                        payload?.time === t80Info.t80_hours;
                      
                      if (isT80Point) {
                        // T80 point: white dot with white outline
                        return (
                          <g>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth={2}
                            />
                            <circle
                              cx={cx}
                              cy={cy}
                              r={3}
                              fill="#ffffff"
                            />
                          </g>
                        );
                      } else {
                        // Normal dot
                        return <circle cx={cx} cy={cy} r={3} fill={color} />;
                      }
                    }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                    name={deviceId}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
};

export default CombinedPerformanceChart;
