import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, RefreshCw, Trash2, History, X, ArrowLeft } from "lucide-react";
import { stabilitySamplesAPI, stabilityAPI } from "../lib/api";
import DevicePerformanceChart from "./DevicePerformanceChart";
import Navigation from "./Navigation";

// Batch Add Modal Component
const BatchAddModal = ({ open, onOpenChange, onSubmit, testType, temperature }) => {
  const currentYear = new Date().getFullYear() % 100;
  const [step, setStep] = useState(1);
  const [batchYear, setBatchYear] = useState(String(currentYear));
  const [batchNumber, setBatchNumber] = useState("");
  const [batchConfigs, setBatchConfigs] = useState([]); // [{ year, number, sheets: { sheetNum: [samples] } }]
  const [currentBatch, setCurrentBatch] = useState(null); // Currently configuring batch
  const [currentEditingSheet, setCurrentEditingSheet] = useState(null);
  const [currentSheetSamples, setCurrentSheetSamples] = useState([]);
  const [targetHours, setTargetHours] = useState(1000); // Default target hours

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  
  const sampleRows = ['A', 'B', 'C', 'D'];
  const sampleCols = [1, 2, 3, 4, 5];
  
  const selectAllSamplesForSheet = () => {
    const all = [];
    sampleRows.forEach(row => {
      sampleCols.forEach(col => {
        all.push(`${row}${col}`);
      });
    });
    setCurrentSheetSamples(all);
  };

  const resetModal = () => {
    setStep(1);
    setBatchNumber("");
    setBatchConfigs([]);
    setCurrentBatch(null);
    setCurrentEditingSheet(null);
    setCurrentSheetSamples([]);
    setTargetHours(1000);
  };

  const handleAddBatch = () => {
    if (batchNumber && !batchConfigs.some(b => b.year === batchYear && b.number === batchNumber)) {
      const newBatch = { year: batchYear, number: batchNumber, sheets: {} };
      setBatchConfigs([...batchConfigs, newBatch]);
      setBatchNumber("");
    }
  };

  const handleRemoveBatch = (batchToRemove) => {
    setBatchConfigs(batchConfigs.filter(b => !(b.year === batchToRemove.year && b.number === batchToRemove.number)));
    if (currentBatch && currentBatch.year === batchToRemove.year && currentBatch.number === batchToRemove.number) {
      setCurrentBatch(null);
    }
  };

  const handleConfigureBatch = (batch) => {
    setCurrentBatch(batch);
    setStep(2);
  };

  const handleEditSheet = (sheetNum) => {
    setCurrentEditingSheet(sheetNum);
    const currentSheets = currentBatch?.sheets || {};
    setCurrentSheetSamples(currentSheets[sheetNum] || []);
  };

  const handleSaveSheetSamples = () => {
    if (currentSheetSamples.length > 0 && currentBatch) {
      setBatchConfigs(prev => prev.map(b => {
        if (b.year === currentBatch.year && b.number === currentBatch.number) {
          return {
            ...b,
            sheets: {
              ...b.sheets,
              [currentEditingSheet]: currentSheetSamples
            }
          };
        }
        return b;
      }));
      // Update currentBatch reference
      setCurrentBatch(prev => ({
        ...prev,
        sheets: {
          ...prev.sheets,
          [currentEditingSheet]: currentSheetSamples
        }
      }));
    }
    setCurrentEditingSheet(null);
    setCurrentSheetSamples([]);
  };

  const handleRemoveSheet = (sheetNum) => {
    if (currentBatch) {
      setBatchConfigs(prev => prev.map(b => {
        if (b.year === currentBatch.year && b.number === currentBatch.number) {
          const newSheets = { ...b.sheets };
          delete newSheets[sheetNum];
          return { ...b, sheets: newSheets };
        }
        return b;
      }));
      // Update currentBatch reference
      setCurrentBatch(prev => {
        const newSheets = { ...prev.sheets };
        delete newSheets[sheetNum];
        return { ...prev, sheets: newSheets };
      });
    }
  };

  const handleSampleToggle = (sampleId) => {
    setCurrentSheetSamples(prev =>
      prev.includes(sampleId)
        ? prev.filter(s => s !== sampleId)
        : [...prev, sampleId]
    );
  };

  const handleSubmit = () => {
    // Generate device IDs in format: B25-80-S009-A3
    const deviceIds = [];
    batchConfigs.forEach(batch => {
      Object.entries(batch.sheets).forEach(([sheet, samples]) => {
        samples.forEach(sample => {
          const deviceId = `B${batch.year}-${batch.number}-S${String(sheet).padStart(3, '0')}-${sample}`;
          deviceIds.push(deviceId);
        });
      });
    });

    onSubmit(deviceIds, testType, temperature, targetHours);
    resetModal();
    onOpenChange(false);
  };

  const getTotalDevices = () => {
    return batchConfigs.reduce((total, batch) => {
      const batchTotal = Object.values(batch.sheets).reduce((sum, samples) => sum + samples.length, 0);
      return total + batchTotal;
    }, 0);
  };

  const getBatchDeviceCount = (batch) => {
    return Object.values(batch.sheets).reduce((sum, samples) => sum + samples.length, 0);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetModal();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-foreground">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-2xl font-bold text-foreground">
            Add Samples - {testType} {temperature}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {currentEditingSheet 
              ? `Configuring samples for Sheet S${String(currentEditingSheet).padStart(3, '0')}`
              : 'Add batches, then configure sheets with different samples'
            }
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Step Indicator */}
          {!currentEditingSheet && (
            <div className="flex items-center justify-center space-x-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${step >= 1 ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground'}`}>1</div>
              <div className={`w-32 h-2 rounded transition-all ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${step >= 2 ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted text-muted-foreground'}`}>2</div>
            </div>
          )}

          {/* Step 1: Batch Selection */}
          {step === 1 && (
            <div className="space-y-6 bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1 h-6 bg-primary rounded"></div>
                <h3 className="font-bold text-lg">Step 1: Select Batches</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Batch Year</label>
                  <select 
                    value={batchYear} 
                    onChange={(e) => setBatchYear(e.target.value)}
                    className="w-full p-3 bg-card text-foreground border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-ring transition-all [&>option]:bg-card [&>option]:text-foreground"
                    style={{
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888888' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      paddingRight: '2.5rem',
                      colorScheme: 'dark'
                    }}
                  >
                    {years.map(year => (
                      <option key={year} value={year}>20{year}</option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-2">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-semibold">Batch Number (1-999)</label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="999"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddBatch()}
                      placeholder="Enter batch number (e.g., 80)"
                      className="p-3"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleAddBatch}
                      disabled={!batchNumber}
                      className="bg-green-600 hover:bg-green-700 px-6"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Target Hours</label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={targetHours}
                    onChange={(e) => setTargetHours(parseInt(e.target.value) || 0)}
                    placeholder="Enter target hours (e.g., 1000)"
                    className="p-3"
                  />
                  <p className="text-xs text-muted-foreground">All samples will be tracked for this duration</p>
                </div>

                {batchConfigs.length > 0 && (
                  <div className="bg-muted border-2 border-border rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground mb-2">Batches ({batchConfigs.length}):</p>
                    <div className="space-y-2">
                      {batchConfigs.map((batch, idx) => {
                        const deviceCount = getBatchDeviceCount(batch);
                        const sheetCount = Object.keys(batch.sheets).length;
                        return (
                          <div key={idx} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                            <div className="flex-1">
                              <span className="font-mono font-bold text-lg text-primary">
                                B{batch.year}-{batch.number}
                              </span>
                              <span className="text-sm text-muted-foreground ml-3">
                                {sheetCount} sheet{sheetCount !== 1 ? 's' : ''}, {deviceCount} device{deviceCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConfigureBatch(batch)}
                                className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                              >
                                Configure
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveBatch(batch)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground bg-background p-3 rounded border border-border">
                <strong>Total:</strong> {batchConfigs.length} batch{batchConfigs.length !== 1 ? 'es' : ''} = <strong className="text-primary">{getTotalDevices()} devices</strong>
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={getTotalDevices() === 0}
                className="w-full bg-primary hover:bg-primary/90 py-3 text-lg font-semibold"
              >
                Add All {getTotalDevices()} Devices
              </Button>
            </div>
          )}

          {/* Step 2: Configure Sheets & Samples */}
          {step === 2 && !currentEditingSheet && currentBatch && (
            <div className="space-y-6 bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-1 h-6 bg-primary rounded"></div>
                  <h3 className="font-bold text-lg">Configure Batch B{currentBatch.year}-{currentBatch.number}</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentBatch(null);
                    setStep(1);
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Batches
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Add sheets and configure samples for this batch (S001-S999)</p>

              <div className="flex space-x-2">
                <Input 
                  type="number" 
                  min="1" 
                  max="999"
                  placeholder="Enter sheet number (e.g., 1 for S001)"
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const num = parseInt(e.target.value);
                      if (num >= 1 && num <= 999) {
                        handleEditSheet(num);
                        e.target.value = '';
                      }
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    const input = document.querySelector('input[type="number"]');
                    const num = parseInt(input.value);
                    if (num >= 1 && num <= 999) {
                      handleEditSheet(num);
                      input.value = '';
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-5 h-5 mr-1" /> Add Sheet
                </Button>
              </div>

              {Object.keys(currentBatch.sheets).length > 0 && (
                <div className="space-y-2 bg-muted border-2 border-border rounded-lg p-4">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">
                    Configured Sheets ({Object.keys(currentBatch.sheets).length}):
                  </p>
                  <div className="space-y-2">
                    {Object.entries(currentBatch.sheets).map(([sheet, samples]) => (
                      <div key={sheet} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <span className="font-mono font-bold text-lg text-primary">
                            S{String(sheet).padStart(3, '0')}
                          </span>
                          <span className="text-sm text-muted-foreground ml-3">
                            {samples.length} sample{samples.length !== 1 ? 's' : ''}: {samples.slice(0, 5).join(', ')}
                            {samples.length > 5 && ` +${samples.length - 5} more`}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSheet(parseInt(sheet))}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveSheet(parseInt(sheet))}
                            className="text-red-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground bg-background p-3 rounded border border-border">
                <strong>This Batch:</strong> {Object.keys(currentBatch.sheets).length} sheet{Object.keys(currentBatch.sheets).length !== 1 ? 's' : ''} = <strong className="text-primary">{getBatchDeviceCount(currentBatch)} devices</strong>
              </div>

              <Button 
                onClick={() => {
                  setCurrentBatch(null);
                  setStep(1);
                }}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Done - Back to Batch List
              </Button>
            </div>
          )}

          {/* Sample Selection for Individual Sheet */}
          {step === 2 && currentEditingSheet && (
            <div className="space-y-6 bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-1 h-6 bg-primary rounded"></div>
                  <h3 className="font-bold text-lg">
                    Select Samples for Sheet S{String(currentEditingSheet).padStart(3, '0')}
                  </h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllSamplesForSheet}
                >
                  Select All
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Click samples to select/deselect (A1-D5 grid, 20 samples per sheet)</p>

              <div className="space-y-3 bg-background p-4 rounded-lg border border-border">
                {sampleRows.map(row => (
                  <div key={row} className="flex items-center space-x-3">
                    <span className="w-10 font-mono font-bold text-lg">{row}</span>
                    {sampleCols.map(col => {
                      const sampleId = `${row}${col}`;
                      const isSelected = currentSheetSamples.includes(sampleId);
                      return (
                        <Button
                          key={sampleId}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSampleToggle(sampleId)}
                          className={`w-14 h-14 font-mono font-bold text-sm transition-all ${
                            isSelected 
                              ? 'bg-green-600 hover:bg-green-700 border-green-700 text-white shadow-lg' 
                              : ''
                          }`}
                        >
                          {sampleId}
                        </Button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground bg-muted p-3 rounded border border-border">
                {currentSheetSamples.length} sample{currentSheetSamples.length !== 1 ? 's' : ''} selected: {currentSheetSamples.join(', ') || 'None'}
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCurrentEditingSheet(null);
                    setCurrentSheetSamples([]);
                  }} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveSheetSamples} 
                  disabled={currentSheetSamples.length === 0}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Save Sheet
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// History Modal Component
const HistoryModal = ({ open, onOpenChange, testType, temperature, history, onDeviceClick }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                History - {testType} {temperature}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                All completed samples for this temperature section
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No history available</p>
              <p className="text-muted-foreground text-sm mt-2">Samples will appear here once removed from active tracking</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-background rounded-lg border border-border">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="border border-border p-3 text-left font-semibold">Device ID</th>
                    <th className="border border-border p-3 text-left font-semibold">In Date</th>
                    <th className="border border-border p-3 text-left font-semibold">In Time</th>
                    <th className="border border-border p-3 text-left font-semibold">Duration</th>
                    <th className="border border-border p-3 text-left font-semibold">Status</th>
                    <th className="border border-border p-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, index) => (
                    <tr key={index} className="hover:bg-muted/50 transition-colors">
                      <td className="border border-border p-3 font-mono font-semibold text-primary">{item.deviceId}</td>
                      <td className="border border-border p-3">{item.inDate}</td>
                      <td className="border border-border p-3 font-mono">{item.inTime}</td>
                      <td className="border border-border p-3 font-mono">
                        <span className="bg-muted px-2 py-1 rounded">
                          {item.hours}h {item.minutes}m {item.seconds}s
                        </span>
                      </td>
                      <td className="border border-border p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'completed' ? 'bg-green-500/20 text-green-600 border border-green-500' : 'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="border border-border p-3 text-center">
                        <Button 
                          size="sm" 
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => onDeviceClick(item)}
                        >
                          📊 View Chart
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {history.length > 0 && (
            <div className="flex items-center justify-between bg-muted p-4 rounded-lg border border-border">
              <p className="text-sm font-semibold">
                Total Records: <span className="text-primary text-lg">{history.length}</span>
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Device Detail Popup Component
const DeviceDetailPopup = ({ open, onOpenChange, device, onRemove }) => {
  const [removing, setRemoving] = useState(false);

  // Extract batch ID from device ID (e.g., B25-40-S004 -> B25-40)
  const getBatchId = (deviceId) => {
    if (!deviceId) return null;
    const parts = deviceId.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`; // B25-40
    }
    return null;
  };

  const handleRemove = async () => {
    if (!device?.deviceId) return;
    
    if (!confirm(`Are you sure you want to remove sample ${device.deviceId}?`)) {
      return;
    }

    setRemoving(true);
    try {
      await onRemove(device.deviceId);
      onOpenChange(false); // Close the popup after removal
    } catch (error) {
      console.error('Error removing sample:', error);
      alert('Failed to remove sample. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>Device Details - {device?.deviceId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Device Info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sample Information</CardTitle>
              {device?.status === 'active' && (
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {removing ? 'Removing...' : 'Remove Sample'}
                </button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Device ID</p>
                    <p className="font-mono font-semibold">{device?.deviceId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Batch ID</p>
                    <p className="font-mono font-semibold text-primary">{getBatchId(device?.deviceId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Test Type</p>
                    <p className="font-semibold">{device?.testType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Temperature</p>
                    <p className="font-semibold">{device?.temperature}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">In Date</p>
                    <p>{device?.inDate} {device?.inTime}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p>{device?.hours}h {device?.minutes}m {device?.seconds}s</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`font-semibold ${device?.status === 'active' ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {device?.status}
                    </p>
                  </div>
                  {device?.targetHours && (
                    <div>
                      <p className="text-sm text-muted-foreground">Target Hours</p>
                      <p className="font-semibold">{device.targetHours}h</p>
                    </div>
                  )}
                </div>
                
                {/* Display batch info if available */}
                {(device?.batchName || device?.motivation) && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-semibold text-muted-foreground mb-2">📦 Batch Information</p>
                    <div className="bg-primary/10 border-2 border-primary/30 p-4 rounded-lg">
                      <p className="text-base font-bold text-primary mb-2">
                        {device.batchName || getBatchId(device?.deviceId)}
                      </p>
                      {device.motivation && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Motivation:</p>
                          <p className="text-sm text-foreground">{device.motivation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Chart */}
          {device?.deviceId && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Data</CardTitle>
              </CardHeader>
              <CardContent>
                <DevicePerformanceChart deviceId={device.deviceId} />
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Grid Display Component (Visual Only - Position Meaningless)
const SampleGrid = ({ testType, temperature, gridData, onAddClick, onHistoryClick, onRemoveAllClick, onDeviceClick, onRemoveSelected }) => {
  const { capacity, count, samples } = gridData;
  const percentage = Math.round((count / capacity) * 100);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSamples, setSelectedSamples] = useState(new Set());

  // Determine grid dimensions based on capacity
  const cols = capacity === 24 ? 4 : capacity === 36 ? 6 : 15;
  const rows = Math.ceil(capacity / cols);

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedSamples(new Set());
  };

  // Toggle sample selection
  const toggleSampleSelection = (deviceId) => {
    const newSelected = new Set(selectedSamples);
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId);
    } else {
      newSelected.add(deviceId);
    }
    setSelectedSamples(newSelected);
  };

  // Select all samples
  const selectAll = () => {
    const allDeviceIds = samples.map(s => s.deviceId);
    setSelectedSamples(new Set(allDeviceIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedSamples(new Set());
  };

  // Remove selected samples
  const removeSelected = async () => {
    if (selectedSamples.size === 0) return;
    await onRemoveSelected(Array.from(selectedSamples));
    setSelectedSamples(new Set());
    setSelectionMode(false);
  };

  // Calculate remaining hours for a sample
  const getRemainingHours = (sample) => {
    if (!sample.targetHours) return null;
    
    const now = new Date();
    const inDateTime = new Date(`${sample.inDate} ${sample.inTime}`);
    const elapsedMs = now - inDateTime;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const remaining = sample.targetHours - elapsedHours;
    
    return Math.round(remaining);
  };

  return (
    <Card className="bg-card">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {temperature || "Standard"}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onHistoryClick}>
                <History className="w-4 h-4 mr-1" />
                History
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={onAddClick}>
                <Plus className="w-4 h-4 mr-1" />
                Add Batch
              </Button>
              {count > 0 && !selectionMode && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={toggleSelectionMode}
                >
                  Select Multiple
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Progress value={percentage} className="h-2 w-48" />
              <p className="text-sm text-muted-foreground mt-1">
                {count} / {capacity} samples ({percentage}%)
              </p>
            </div>
            {selectionMode && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={clearSelection}>
                  Clear
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={removeSelected}
                  disabled={selectedSamples.size === 0}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove ({selectedSamples.size})
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={toggleSelectionMode}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {samples && samples.length > 0 ? (
          <div className="space-y-3">
            <div 
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
              {Array.from({ length: capacity }, (_, index) => {
                const sample = samples[index];
                const hasT80 = sample?.has_t80 || false;
                const isEmpty = !sample;
                const isSelected = sample && selectedSamples.has(sample.deviceId);

                return (
                  <div
                    key={index}
                    className={`
                      relative w-14 h-14 border-2 rounded cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg flex items-center justify-center
                      ${isEmpty ? 'bg-muted hover:bg-muted/80 border-border' : 
                        hasT80 ? 'bg-blue-500 hover:bg-blue-600 border-blue-400 text-white font-bold' : 
                        'bg-green-500 hover:bg-green-600 border-green-400 text-white font-bold'}
                      ${isSelected ? 'ring-4 ring-yellow-400' : ''}
                    `}
                    title={isEmpty ? 'Empty slot' : (hasT80 ? `${sample.deviceId} (T80 Reached)` : sample.deviceId)}
                    onClick={() => {
                      if (isEmpty) return;
                      if (selectionMode) {
                        toggleSampleSelection(sample.deviceId);
                      } else {
                        onDeviceClick && onDeviceClick(sample);
                      }
                    }}
                  >
                    {!isEmpty && (
                      <>
                        {selectionMode && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSampleSelection(sample.deviceId)}
                            className="absolute top-0.5 left-0.5 w-4 h-4 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <span className="text-xs truncate px-1">{hasT80 ? 'T80' : '✓'}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
              <div className="bg-muted p-3 rounded-lg border border-border max-h-40 overflow-y-auto">
              <p className="text-sm font-semibold text-muted-foreground mb-2">
                Active Samples ({samples.length})
                {selectionMode && selectedSamples.size > 0 && (
                  <span className="ml-2 text-yellow-600">({selectedSamples.size} selected)</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {samples.map((sample, idx) => {
                  const isSelected = selectedSamples.has(sample.deviceId);
                  const remainingHours = getRemainingHours(sample);
                  const isExpired = remainingHours !== null && remainingHours <= 0;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <span 
                        className={`
                          px-2 py-1 rounded text-xs font-mono font-semibold cursor-pointer transition
                          ${isSelected ? 'bg-yellow-500 text-black ring-2 ring-yellow-400' : 
                            isExpired ? 'bg-orange-600 text-white hover:bg-orange-700' : 
                            'bg-green-600 text-white hover:bg-green-700'}
                        `}
                        onClick={() => {
                          if (selectionMode) {
                            toggleSampleSelection(sample.deviceId);
                          } else {
                            onDeviceClick && onDeviceClick(sample);
                          }
                        }}
                        title={selectionMode ? (isSelected ? 'Click to deselect' : 'Click to select') : 'Click to view details and chart'}
                      >
                        {sample.deviceId}
                      </span>
                      {remainingHours !== null && (
                        <span className={`text-xs font-semibold ${isExpired ? 'text-orange-600' : 'text-green-600'}`}>
                          {isExpired ? `+${Math.abs(remainingHours)}h` : `${remainingHours}h left`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No active samples</p>
            <p className="text-xs mt-1">Click "Add Batch" to add samples</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main Stability Dashboard Component
const StabilityDashboard = () => {
  const navigate = useNavigate();
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [batchAddModal, setBatchAddModal] = useState({ open: false, testType: null, temperature: null });
  const [historyModal, setHistoryModal] = useState({ open: false, testType: null, temperature: null, history: [] });
  const [deviceModal, setDeviceModal] = useState({ open: false, device: null });
  const [removeAllDialog, setRemoveAllDialog] = useState({ open: false, testType: null, temperature: null });

  // Load grid data
  const loadGridData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("📊 Fetching grid data...");
      const data = await stabilitySamplesAPI.getGridData();
      console.log("✅ Grid data received:", data);
      
      if (!data || Object.keys(data).length === 0) {
        console.warn("⚠️ Empty grid data, initializing with default structure");
        // Initialize with empty structure
        setGridData({
          "LS w/Temp": {
            "37C": { rows: 6, cols: 4, capacity: 24, count: 0, samples: [] },
            "65C": { rows: 6, cols: 4, capacity: 24, count: 0, samples: [] },
            "85C": { rows: 6, cols: 4, capacity: 24, count: 0, samples: [] }
          },
          "Damp Heat": {
            "": { rows: 6, cols: 6, capacity: 36, count: 0, samples: [] }
          },
          "Outdoor Testing": {
            "": { rows: 20, cols: 15, capacity: 300, count: 0, samples: [] }
          }
        });
      } else {
        setGridData(data);
      }
    } catch (err) {
      console.error("❌ Error loading grid data:", err);
      setError(err.message || "Failed to load grid data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGridData();
    
    // Check for expired samples every minute
    const checkExpiredSamples = async () => {
      try {
        const allSamples = await stabilitySamplesAPI.getActiveSamples({});
        const now = new Date();
        const expiredDeviceIds = [];
        
        allSamples.forEach(sample => {
          if (sample.targetHours) {
            const inDateTime = new Date(`${sample.inDate} ${sample.inTime}`);
            const elapsedMs = now - inDateTime;
            const elapsedHours = elapsedMs / (1000 * 60 * 60);
            
            if (elapsedHours >= sample.targetHours) {
              expiredDeviceIds.push(sample.deviceId);
            }
          }
        });
        
        if (expiredDeviceIds.length > 0) {
          console.log(`⏰ Auto-removing ${expiredDeviceIds.length} expired samples:`, expiredDeviceIds);
          await stabilitySamplesAPI.removeSamples(expiredDeviceIds, "System - Auto Expired");
          await loadGridData();
        }
      } catch (err) {
        console.error("Error checking expired samples:", err);
      }
    };
    
    // Check immediately on mount
    checkExpiredSamples();
    
    // Then check every 60 seconds
    const interval = setInterval(checkExpiredSamples, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle batch add
  const handleBatchAdd = async (deviceIds, testType, temperature, targetHours) => {
    try {
      console.log("🚀 Adding samples:", { deviceIds, testType, temperature, targetHours });
      
      // Fetch batch info once for all samples
      const { batchAPI } = await import('../lib/api');
      const batchData = await batchAPI.getCurrentLocation();
      
      // The API returns batches directly in batchData, not in batchData.batches
      const batches = Array.isArray(batchData) ? batchData : (batchData.batches || []);
      
      console.log('📦 Found', batches.length, 'batches');
      
      const samples = deviceIds.map(deviceId => {
        // Extract batch number (e.g., B25-40 from B25-40-S001-A1)
        const parts = deviceId.split('-');
        const batchNumber = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : null;
        
        // Find batch info by matching batch_number (Label field from API)
        const batch = batchNumber ? batches.find(b => b.batch_number === batchNumber) : null;
        
        console.log(`🔍 Device: ${deviceId} → Batch: ${batchNumber} → Found:`, batch ? `✅ ${batch.batch_name}` : '❌ NOT FOUND');
        
        return {
          testType,
          temperature: temperature || "",
          deviceId,
          inDate: new Date().toLocaleDateString('en-US'),
          inTime: new Date().toLocaleTimeString('en-US', { hour12: false }),
          hours: 0,
          minutes: 0,
          seconds: 0,
          targetHours: targetHours || 1000,
          batchName: batch?.batch_name || '',
          motivation: batch?.motivation || '',
          status: "active"
        };
      });

      console.log("📦 Samples to add:", samples);
      const result = await stabilitySamplesAPI.batchAddSamples(samples);
      console.log("✅ Add result:", result);
      
      await loadGridData();
      alert(`Successfully added ${deviceIds.length} samples with ${targetHours}h target!`);
    } catch (err) {
      console.error("❌ Error adding samples:", err);
      alert(`Failed to add samples: ${err.message}`);
    }
  };

  // Handle show history - Navigate to separate page
  const handleShowHistory = (testType, temperature) => {
    navigate('/stability-history', { 
      state: { testType, temperature } 
    });
  };

  // Handle remove all
  const handleRemoveAll = async () => {
    try {
      const { testType, temperature } = removeAllDialog;
      await stabilitySamplesAPI.removeAllSamples(testType, temperature);
      await loadGridData();
      setRemoveAllDialog({ open: false, testType: null, temperature: null });
    } catch (err) {
      console.error("Error removing samples:", err);
      alert(`Failed to remove samples: ${err.message}`);
    }
  };

  // Handle device click from history
  const handleDeviceClick = (device) => {
    setDeviceModal({ open: true, device });
  };

  // Handle remove specific sample
  const handleRemoveSample = async (deviceId) => {
    try {
      console.log("🗑️ Removing sample:", deviceId);
      await stabilitySamplesAPI.removeSamples([deviceId]);
      console.log("✅ Sample removed successfully");
      await loadGridData();
      alert(`Successfully removed sample ${deviceId}`);
    } catch (err) {
      console.error("❌ Error removing sample:", err);
      throw err; // Re-throw so DeviceDetailPopup can handle it
    }
  };

  // Handle remove multiple selected samples
  const handleRemoveSelected = async (deviceIds) => {
    if (deviceIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to remove ${deviceIds.length} samples?`)) {
      return;
    }

    try {
      console.log("🗑️ Removing samples:", deviceIds);
      await stabilitySamplesAPI.removeSamples(deviceIds);
      console.log("✅ Samples removed successfully");
      await loadGridData();
      alert(`Successfully removed ${deviceIds.length} samples!`);
    } catch (err) {
      console.error("❌ Error removing samples:", err);
      alert(`Failed to remove samples: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background dark">
        <Navigation />
        <div className="container mx-auto p-6">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Error: {error}</p>
              <Button onClick={loadGridData} className="mt-4 bg-primary hover:bg-primary/90">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Grid Sections */}
        <div className="space-y-6">
          {gridData && Object.entries(gridData).map(([testType, temperatures]) => (
            <Card key={testType}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl">{testType}</CardTitle>
                <Button onClick={async () => {
                  try {
                    setLoading(true);
                    await stabilityAPI.forceRefresh();
                    await loadGridData();
                    alert('✅ Data refreshed successfully! Latest measurements loaded from Azure.');
                  } catch (err) {
                    console.error('Failed to refresh data:', err);
                    alert('❌ Failed to refresh data. Please try again.');
                  } finally {
                    setLoading(false);
                  }
                }} size="sm" className="bg-primary hover:bg-primary/90">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Object.entries(temperatures).map(([temperature, data]) => (
                    <SampleGrid
                      key={`${testType}-${temperature}`}
                      testType={testType}
                      temperature={temperature}
                      gridData={data}
                      onAddClick={() => setBatchAddModal({ open: true, testType, temperature })}
                      onHistoryClick={() => handleShowHistory(testType, temperature)}
                      onRemoveAllClick={() => setRemoveAllDialog({ open: true, testType, temperature })}
                      onDeviceClick={handleDeviceClick}
                      onRemoveSelected={handleRemoveSelected}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modals */}
      <BatchAddModal
        open={batchAddModal.open}
        onOpenChange={(open) => setBatchAddModal({ ...batchAddModal, open })}
        onSubmit={handleBatchAdd}
        testType={batchAddModal.testType}
        temperature={batchAddModal.temperature}
      />

      <HistoryModal
        open={historyModal.open}
        onOpenChange={(open) => setHistoryModal({ ...historyModal, open })}
        testType={historyModal.testType}
        temperature={historyModal.temperature}
        history={historyModal.history}
        onDeviceClick={handleDeviceClick}
      />

      <DeviceDetailPopup
        open={deviceModal.open}
        onOpenChange={(open) => setDeviceModal({ ...deviceModal, open })}
        device={deviceModal.device}
        onRemove={handleRemoveSample}
      />

      <AlertDialog 
        open={removeAllDialog.open} 
        onOpenChange={(open) => setRemoveAllDialog({ ...removeAllDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove All Samples</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove all samples from {removeAllDialog.testType} {removeAllDialog.temperature}?
              This will move them to history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAll}>
              Remove All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StabilityDashboard;
