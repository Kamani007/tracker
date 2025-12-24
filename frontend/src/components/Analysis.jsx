import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import ExcelUploader from './excel-uploader';
import ProcessingOptions from './processing-options';
import ResultsDisplay from './results-display';
import { analysisAPI } from '../lib/api';
import Navigation from './Navigation';

const Analysis = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processingOptions, setProcessingOptions] = useState({
    sheetsMode: "top-k",
    sheetsTopK: 6,
    devicesMode: "top-k", 
    devicesTopK: 6,
    pixelsPerDevice: 3,
    method: "minimize-sd",
    basis: "forward",
    useAllSheets: true,
    sheetIds: ""
  });
  const [results, setResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setResults(null); // Reset results when new file is selected
  };

  const handleProcessData = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    try {
      console.log('🔄 Processing file:', selectedFile.name);
      console.log('⚙️ Processing options:', processingOptions);
      
      const result = await analysisAPI.processFile(selectedFile, processingOptions);
      
      console.log('✅ Analysis result:', result);
      setResults(result);
      
    } catch (error) {
      console.error('❌ Analysis error:', error);
      setResults({
        status: "error",
        message: error.message || "Processing failed. Please check your file and try again.",
        logs: [error.message]
      });
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div className="container mx-auto p-6 space-y-6 relative">
      {/* Navigation */}
      <Navigation />
      
      <div className="flex items-center gap-4 mb-6">
        <Link to="/">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        {selectedFile && (
          <div className="text-sm text-muted-foreground">
            Selected: {selectedFile.name}
          </div>
        )}
      </div>
      
      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - File Upload & Processing Options */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Excel File</CardTitle>
              <CardDescription>Select an Excel file (.xlsx, .xls) for analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ExcelUploader onFileSelect={handleFileSelect} />
              {selectedFile && (
                <div className="mt-4 p-3 bg-primary/5 rounded-lg border">
                  <p className="text-sm font-medium">Selected File:</p>
                  <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {selectedFile && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Options</CardTitle>
                <CardDescription>Configure analysis parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <ProcessingOptions 
                  options={processingOptions} 
                  setOptions={setProcessingOptions} 
                />
                <div className="mt-6">
                  <Button 
                    onClick={handleProcessData}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? "Processing..." : "Start Analysis"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Right Column - Results */}
        <div className="space-y-6">
          {results && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>Processing results and summary</CardDescription>
              </CardHeader>
              <CardContent>
                <ResultsDisplay results={results} />
              </CardContent>
            </Card>
          )}
          
          {!results && !selectedFile && (
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>Follow these steps to analyze your data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <span>Upload your Excel file using the uploader</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <span>Configure processing options</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <span>Click "Start Analysis" to process your data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">4</div>
                    <span>View results and download processed data</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analysis;