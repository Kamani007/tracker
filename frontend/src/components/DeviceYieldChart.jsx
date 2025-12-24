import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { chartAPI } from '../lib/api';

const DeviceYieldChart = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedParameter, setSelectedParameter] = useState('Total');

  useEffect(() => {
    const loadDeviceYieldData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await chartAPI.getDeviceYield();
        if (response.success) {
          setData(response.data);
        } else {
          setError('Failed to load device yield data');
        }
      } catch (err) {
        console.error('Error loading device yield data:', err);
        setError('Failed to load device yield data');
      } finally {
        setLoading(false);
      }
    };

    loadDeviceYieldData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading device yield data...</div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-red-500">{error || 'Failed to load device yield data'}</div>
        </CardContent>
      </Card>
    );
  }

  // Parameters available
  const parameters = ['Total', 'FF', 'J_sc', 'Max Power', 'PCE', 'R_series', 'R_shunt', 'V_oc'];
  
  // Parameter colors
  const parameterColors = {
    'Total': '#3b82f6',
    'FF': '#f59e0b',
    'J_sc': '#10b981',
    'Max Power': '#8b5cf6',
    'PCE': '#ec4899',
    'R_series': '#ef4444',
    'R_shunt': '#06b6d4',
    'V_oc': '#84cc16'
  };

  // Get current yield data based on selected parameter
  const getCurrentYieldData = () => {
    if (selectedParameter === 'Total') {
      return data.yield_percentages || [];
    }
    console.log('Selected parameter:', selectedParameter);
    console.log('Parameter yields:', data.parameter_yields);
    console.log('Data for param:', data.parameter_yields?.[selectedParameter]);
    return data.parameter_yields?.[selectedParameter] || [];
  };

  // Transform data for chart
  const yieldData = getCurrentYieldData();
  const chartData = data.batches.map((batch, index) => ({
    batch,
    yieldPercentage: yieldData[index] || 0,
    totalPixels: data.total_pixels?.[index] || 0,
    failedPixels: data.failed_pixels?.[index] || 0
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const yieldData = payload.find(p => p.dataKey === 'yieldPercentage');
      const pixelData = payload.find(p => p.dataKey === 'totalPixels');
      
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{`Batch: ${label}`}</p>
          {yieldData && (
            <div className="text-sm mt-1" style={{ color: yieldData.color }}>
              {selectedParameter} Yield: {yieldData.value.toFixed(2)}%
            </div>
          )}
          {pixelData && (
            <div className="text-sm mt-1" style={{ color: pixelData.color }}>
              Total Pixels: {pixelData.value}
            </div>
          )}
          {payload[0]?.payload?.failedPixels !== undefined && (
            <div className="text-sm mt-1 text-red-400">
              Failed: {payload[0].payload.failedPixels} pixels
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Device Yield Analysis</CardTitle>
        <div className="text-sm text-gray-500">
          Yield percentage (#yielded pixels / total pixels per batch)
        </div>
        
        {/* Parameter Selection Buttons */}
        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Yield Parameter:</div>
          <div className="flex flex-wrap gap-2">
            {parameters.map((param) => (
              <Button
                key={param}
                variant={selectedParameter === param ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedParameter(param)}
                className="text-xs"
                style={{
                  backgroundColor: selectedParameter === param ? parameterColors[param] : 'transparent',
                  borderColor: parameterColors[param],
                  color: selectedParameter === param ? 'white' : parameterColors[param]
                }}
              >
                {param}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Summary Card */}
        {data.overall_yield !== undefined && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">Overall Device Yield</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {data.overall_yield.toFixed(2)}%
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 60, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="batch" 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            {/* Primary Y-axis: Yield Percentage (45-100%) */}
            <YAxis 
              yAxisId="left"
              stroke="#3b82f6"
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              domain={[45, 100]}
              label={{ value: 'Yield (%)', angle: -90, position: 'insideLeft', style: { fill: '#3b82f6' } }}
            />
            {/* Secondary Y-axis: Total Pixels */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#f59e0b"
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              label={{ value: 'Total Pixels', angle: 90, position: 'insideRight', style: { fill: '#f59e0b' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ paddingBottom: '10px' }}
            />
            
            {/* Yield Percentage Line (Primary axis) */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="yieldPercentage"
              name={`${selectedParameter} Yield (%)`}
              stroke={parameterColors[selectedParameter]}
              strokeWidth={3}
              dot={{ fill: parameterColors[selectedParameter], strokeWidth: 2, r: 6, stroke: '#ffffff' }}
              activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 2 }}
              label={{
                position: 'top',
                fill: parameterColors[selectedParameter],
                fontSize: 16,
                fontWeight: 'bold',
                formatter: (value) => value.toFixed(2)
              }}
            />
            
            {/* Total Pixels Line (Secondary axis) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalPixels"
              name="Total Pixels"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        <div className="mt-4 text-xs text-gray-500 text-center">
          Primary axis: Yield percentage (45-100%) | Secondary axis: Total pixels per batch
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceYieldChart;
