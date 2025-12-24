import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Bar, Cell, Label, Scatter } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { chartAPI, fileDownloadAPI } from '../lib/api';

const ParameterChart = () => {
  const [selectedParameter, setSelectedParameter] = useState('PCE'); // Back to single parameter selection
  const [chartData, setChartData] = useState([]);
  const [parameters, setParameters] = useState([
    "PCE", "FF", "Max Power", "HI", "I_sc", "V_oc", "R_series", "R_shunt"
  ]); // Initialize with all 8 parameters
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Available parameters with their display names and units
  const parameterInfo = {
    'PCE': { label: 'PCE', unit: '%', color: '#3b82f6' },
    'FF': { label: 'FF', unit: '%', color: '#10b981' },
    'Max Power': { label: 'Max Power', unit: 'mW/cm²', color: '#f59e0b' },
    'HI': { label: 'HI', unit: '%', color: '#ef4444' },
    'I_sc': { label: 'I_sc', unit: 'mA/cm²', color: '#8b5cf6' },
    'V_oc': { label: 'V_oc', unit: 'V', color: '#06b6d4' },
    'R_series': { label: 'R_series', unit: 'Ω·cm²', color: '#f97316' },
    'R_shunt': { label: 'R_shunt', unit: 'Ω·cm²', color: '#84cc16' }
  };

  // Load available parameters on component mount (and also load from API)
  useEffect(() => {
    const loadParameters = async () => {
      try {
        const response = await chartAPI.getParameters();
        if (response.success && response.parameters) {
          setParameters(response.parameters);
          console.log('✅ Loaded parameters from API:', response.parameters);
        } else {
          console.log('⚠️ Using fallback parameters');
          // Keep the hardcoded fallback parameters
        }
      } catch (error) {
        console.error('Error loading parameters:', error);
        console.log('⚠️ Using fallback parameters due to error');
        // Keep the hardcoded fallback parameters
      }
    };
    loadParameters();
  }, []);

  // Load chart data when parameter changes
  useEffect(() => {
    const loadChartData = async () => {
      if (!selectedParameter) return;
      
      console.log('📊 Loading chart data for parameter:', selectedParameter);
      setLoading(true);
      setError(null);
      
      try {
        const response = await chartAPI.getData(selectedParameter);
        console.log('📊 Chart data response:', response);
        
        if (response.success) {
          // Data is already in the correct format for box plots
          setChartData(response.data);
          console.log('✅ Chart data loaded successfully:', response.data);
        } else {
          setError(response.error || 'Failed to load chart data');
          console.log('❌ Chart data failed:', response.error);
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
        setError('Failed to load chart data');
        // Fallback to mock data to keep UI working
        setChartData([
          { 
            batch: 'No Data', 
            min: 0, q1: 0, median: 0, mean: 0, q3: 0, max: 0, 
            std: 0, count: 0 
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [selectedParameter]);

  const currentParam = parameterInfo[selectedParameter] || parameterInfo['PCE'];

  // Custom Box Plot Shape
  const BoxPlotShape = (props) => {
    console.log('BoxPlot props:', props);
    const { x, y, width, height, payload, index } = props;
    
    if (!payload || typeof payload.min === 'undefined') {
      console.log('No payload or min data');
      return null;
    }

    const data = payload;
    const boxWidth = Math.min(width * 0.8, 50);
    const centerX = x + width / 2;
    
    // For a Y-axis with domain [8.7, auto], we need to calculate positions
    // Height represents the chart height, y is the top position
    // We'll use the fact that Recharts passes these in chart coordinates
    
    const chartHeight = 400 - 60 - 5; // Total height minus margins
    const domainMin = 8.7;
    const domainMax = 14; // Fixed maximum
    const domainRange = domainMax - domainMin;
    
    const getYPosition = (value) => {
      const ratio = (value - domainMin) / domainRange;
      return 60 + chartHeight * (1 - ratio); // Flip because SVG y increases downward
    };
    
    const maxY = getYPosition(data.max);
    const q3Y = getYPosition(data.q3);
    const medianY = getYPosition(data.median);
    const q1Y = getYPosition(data.q1);
    const minY = getYPosition(data.min);

    console.log(`Box ${index}:`, { min: minY, q1: q1Y, median: medianY, q3: q3Y, max: maxY });

    return (
      <g>
        {/* Whisker lines */}
        <line 
          x1={centerX} 
          y1={minY} 
          x2={centerX} 
          y2={q1Y} 
          stroke={currentParam.color} 
          strokeWidth={2}
        />
        <line 
          x1={centerX} 
          y1={q3Y} 
          x2={centerX} 
          y2={maxY} 
          stroke={currentParam.color} 
          strokeWidth={2}
        />
        
        {/* Min/Max caps */}
        <line 
          x1={centerX - boxWidth/4} 
          y1={minY} 
          x2={centerX + boxWidth/4} 
          y2={minY} 
          stroke={currentParam.color} 
          strokeWidth={2}
        />
        <line 
          x1={centerX - boxWidth/4} 
          y1={maxY} 
          x2={centerX + boxWidth/4} 
          y2={maxY} 
          stroke={currentParam.color} 
          strokeWidth={2}
        />
        
        {/* Box (Q1 to Q3) */}
        <rect
          x={centerX - boxWidth / 2}
          y={q3Y}
          width={boxWidth}
          height={Math.abs(q1Y - q3Y)}
          fill={currentParam.color}
          fillOpacity={0.3}
          stroke={currentParam.color}
          strokeWidth={2}
        />
        
        {/* Median line */}
        <line 
          x1={centerX - boxWidth/2} 
          y1={medianY} 
          x2={centerX + boxWidth/2} 
          y2={medianY} 
          stroke={currentParam.color} 
          strokeWidth={3}
        />
        
        {/* Median label */}
        <text
          x={centerX}
          y={q3Y - 12}
          textAnchor="middle"
          fill={currentParam.color}
          fontSize={16}
          fontWeight="bold"
        >
          {data.median ? data.median.toFixed(2) : ''}
        </text>
      </g>
    );
  };

  // Custom tooltip to show box plot statistics
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-blue-500 rounded-lg p-3 text-white shadow-lg">
          <p className="font-semibold">{`Batch: ${data.batch}`}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-300">{`Max: ${data.max} ${currentParam.unit}`}</p>
            <p className="text-green-300">{`Q3: ${data.q3} ${currentParam.unit}`}</p>
            <p className="text-yellow-300">{`Median: ${data.median} ${currentParam.unit}`}</p>
            <p className="text-white">{`Mean: ${data.mean} ${currentParam.unit}`}</p>
            <p className="text-green-300">{`Q1: ${data.q1} ${currentParam.unit}`}</p>
            <p className="text-blue-300">{`Min: ${data.min} ${currentParam.unit}`}</p>
            <p className="text-gray-300">{`Std Dev: ±${data.std} ${currentParam.unit}`}</p>
            <p className="text-gray-400">{`Sample Count: ${data.count}`}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleDownloadFile = async () => {
    setIsDownloading(true);
    try {
      await fileDownloadAPI.downloadFile('BaseLine.xlsx');
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download BaseLine.xlsx: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold text-balance">
              {selectedParameter ? `${parameterInfo[selectedParameter]?.label || selectedParameter} Analysis` : 'Parameter Analysis'}
            </CardTitle>
            <div className="text-sm text-gray-500 mb-4">
              Box plot distribution with median efficiency labels
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
        
        {/* Parameter Selection Buttons with Horizontal Scroll - matching DeviceYieldChart style */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
          <div className="flex space-x-2 min-w-max pb-2">
            {parameters.length > 0 ? parameters.map((param) => (
              <Button
                key={param}
                onClick={() => {
                  console.log('🔄 Switching to parameter:', param);
                  setSelectedParameter(param);
                }}
                variant={selectedParameter === param ? 'default' : 'outline'}
                size="sm"
                className={`whitespace-nowrap transition-all duration-200 ${
                  selectedParameter === param
                    ? 'shadow-lg transform scale-105'
                    : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: selectedParameter === param ? parameterInfo[param]?.color : 'transparent',
                  borderColor: parameterInfo[param]?.color,
                  color: selectedParameter === param ? 'white' : parameterInfo[param]?.color
                }}
              >
                {parameterInfo[param]?.label || param}
              </Button>
            )) : (
              <div className="text-gray-500 text-sm">Loading parameters...</div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="text-red-500 text-sm mb-4 p-2 bg-red-100 dark:bg-red-900/20 rounded">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-gray-500">Loading chart data...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart
              data={chartData}
              margin={{ top: 60, right: 30, left: 20, bottom: 5 }}
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
                domain={[8.7, 14]}
                label={{ value: `${currentParam.label} (${currentParam.unit})`, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Bar with custom box plot shape */}
              <Bar 
                dataKey="median"
                shape={<BoxPlotShape />}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        
        {/* Parameter Info */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          Box plots showing distribution with median efficiency labels | Selected: {selectedParameter}
        </div>
      </CardContent>
    </Card>
  );
};

export default ParameterChart;