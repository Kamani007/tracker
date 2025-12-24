import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { stabilitySamplesAPI } from "../lib/api";
import CombinedPerformanceChart from "./CombinedPerformanceChart";
import Navigation from "./Navigation";

const StabilityHistory = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { testType, temperature } = location.state || {};
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSamples, setSelectedSamples] = useState([]);

  useEffect(() => {
    loadHistory();
  }, [testType, temperature]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await stabilitySamplesAPI.getHistory(testType, temperature);
      setHistory(data);
    } catch (err) {
      console.error("Error loading history:", err);
      alert(`Failed to load history: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSampleSelection = (deviceId) => {
    setSelectedSamples(prev => 
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const selectAll = () => {
    setSelectedSamples(history.map(h => h.deviceId));
  };

  const clearSelection = () => {
    setSelectedSamples([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Stability History Analysis</h1>
              <p className="text-muted-foreground mt-1">
                {testType} - {temperature || "Standard"} | {history.length} samples
              </p>
            </div>
            
            <div className="flex gap-2">
              {selectedSamples.length === 0 ? (
                <Button onClick={selectAll} variant="outline">
                  Select All
                </Button>
              ) : (
                <>
                  <Button onClick={clearSelection} variant="outline">
                    Clear ({selectedSamples.length})
                  </Button>
                  <Button variant="default">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Compare Selected
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground text-lg">No history available</p>
              <p className="text-muted-foreground text-sm mt-2">
                Samples will appear here once removed from active tracking
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Sample List */}
            <Card>
              <CardHeader>
                <CardTitle>Historical Samples</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedSamples.length === history.length}
                            onChange={() => selectedSamples.length === history.length ? clearSelection() : selectAll()}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="border border-border p-3 text-left font-semibold">Device ID</th>
                        <th className="border border-border p-3 text-left font-semibold">Batch Name</th>
                        <th className="border border-border p-3 text-left font-semibold">Motivation</th>
                        <th className="border border-border p-3 text-left font-semibold">In Date</th>
                        <th className="border border-border p-3 text-left font-semibold">Duration</th>
                        <th className="border border-border p-3 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item, index) => (
                        <tr 
                          key={index} 
                          className={`hover:bg-muted/50 transition-colors ${selectedSamples.includes(item.deviceId) ? 'bg-primary/10' : ''}`}
                        >
                          <td className="border border-border p-3">
                            <input
                              type="checkbox"
                              checked={selectedSamples.includes(item.deviceId)}
                              onChange={() => toggleSampleSelection(item.deviceId)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="border border-border p-3 font-mono font-semibold text-primary">
                            {item.deviceId}
                          </td>
                          <td className="border border-border p-3 text-sm font-semibold">{item.batchName || '-'}</td>
                          <td className="border border-border p-3 text-sm text-muted-foreground">{item.motivation || '-'}</td>
                          <td className="border border-border p-3">{item.inDate} {item.inTime}</td>
                          <td className="border border-border p-3 font-mono">
                            <span className="bg-muted px-2 py-1 rounded">
                              {item.hours}h {item.minutes}m {item.seconds}s
                            </span>
                          </td>
                          <td className="border border-border p-3">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-600 border border-green-500">
                              COMPLETED
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Combined Comparison Chart - All selected samples in ONE graph */}
            {selectedSamples.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Combined Analysis - {selectedSamples.length} Sample{selectedSamples.length > 1 ? 's' : ''}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    All selected samples displayed in a single graph for easy comparison
                  </p>
                </CardHeader>
                <CardContent>
                  <CombinedPerformanceChart 
                    deviceIds={selectedSamples} 
                    history={history}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StabilityHistory;
