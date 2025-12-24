"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { CheckCircle, AlertCircle, Download, Eye, FileText } from "lucide-react"
import { useState } from "react"
import { analysisAPI } from "../lib/api"

export default function ResultsDisplay({ results }) {
  const [showLogs, setShowLogs] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isDownloadingQuick, setIsDownloadingQuick] = useState(false)
  const [isDownloadingEntire, setIsDownloadingEntire] = useState(false)
  const isSuccess = results.status === "success"

  // Debug logging
  console.log('📊 ResultsDisplay - results object:', results)
  console.log('🔍 hasDownloadData:', results.hasDownloadData)
  console.log('✅ isSuccess:', isSuccess)

  const handleDownloadQuick = async () => {
    if (!results.hasDownloadData) {
      alert('No analysis data available for download. Please run analysis first.')
      return
    }

    setIsDownloadingQuick(true)
    try {
      await analysisAPI.downloadQuickData()
      console.log('✅ Quick Data download completed successfully')
    } catch (error) {
      console.error('❌ Quick Data download failed:', error)
      alert(`Download failed: ${error.message}`)
    } finally {
      setIsDownloadingQuick(false)
    }
  }

  const handleDownloadEntire = async () => {
    if (!results.hasDownloadData) {
      alert('No analysis data available for download. Please run analysis first.')
      return
    }

    setIsDownloadingEntire(true)
    try {
      await analysisAPI.downloadEntireData()
      console.log('✅ Entire Data download completed successfully')
    } catch (error) {
      console.error('❌ Entire Data download failed:', error)
      alert(`Download failed: ${error.message}`)
    } finally {
      setIsDownloadingEntire(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Results Card */}
      <Card className={`border-2 ${isSuccess ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            {isSuccess ? (
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{results.message}</h3>
              {isSuccess && results.fileName && (
                <p className="text-sm text-muted-foreground mb-4">
                  <span className="font-medium">File:</span> {results.fileName}
                </p>
              )}
              
              {isSuccess && results.summary && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-primary/10 rounded p-3">
                    <p className="text-xs text-muted-foreground">Sheets</p>
                    <p className="text-lg font-bold text-primary">{results.summary.sheetsProcessed}</p>
                  </div>
                  <div className="bg-primary/10 rounded p-3">
                    <p className="text-xs text-muted-foreground">Devices</p>
                    <p className="text-lg font-bold text-primary">{results.summary.devicesAnalyzed}</p>
                  </div>
                  <div className="bg-primary/10 rounded p-3">
                    <p className="text-xs text-muted-foreground">Pixels</p>
                    <p className="text-lg font-bold text-primary">{results.summary.totalPixels}</p>
                  </div>
                  {results.summary.entireDataRows !== undefined && (
                    <div className="bg-primary/10 rounded p-3">
                      <p className="text-xs text-muted-foreground">Detail Rows</p>
                      <p className="text-lg font-bold text-primary">{results.summary.entireDataRows}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {isSuccess && (
                  <>
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={handleDownloadQuick}
                      disabled={isDownloadingQuick || !results.hasDownloadData}
                    >
                      <Download className="w-4 h-4" />
                      {!results.hasDownloadData ? 'No Quick Data' : 
                       isDownloadingQuick ? 'Downloading...' : 'Download Quick Data'}
                    </Button>
                    
                    {results.summary && results.summary.entireDataRows > 0 && (
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={handleDownloadEntire}
                        disabled={isDownloadingEntire || !results.hasDownloadData}
                      >
                        <Download className="w-4 h-4" />
                        {!results.hasDownloadData ? 'No Entire Data' : 
                         isDownloadingEntire ? 'Downloading...' : 'Download Entire Data'}
                      </Button>
                    )}
                  </>
                )}
                
                {results.results && results.results.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowResults(!showResults)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {showResults ? 'Hide' : 'View'} Analysis Data
                  </Button>
                )}
                
                {results.logs && results.logs.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowLogs(!showLogs)}
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {showLogs ? 'Hide' : 'View'} Processing Logs
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Analysis Results Table */}
      {showResults && results.results && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Rank</th>
                    <th className="text-left p-2">Batch ID</th>
                    <th className="text-left p-2">Sheet ID</th>
                    <th className="text-left p-2">Method</th>
                    <th className="text-left p-2">Selected Devices</th>
                    <th className="text-left p-2">Total Pixels</th>
                    <th className="text-left p-2">Mean PCE</th>
                    <th className="text-left p-2">SD PCE</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <Badge variant={idx < 3 ? "default" : "secondary"}>
                          {row.Rank}
                        </Badge>
                      </td>
                      <td className="p-2">{row["Batch ID"]}</td>
                      <td className="p-2">{row["Sheet ID"]}</td>
                      <td className="p-2">{row.Method}</td>
                      <td className="p-2 max-w-32 truncate" title={row["Selected devices"]}>
                        {row["Selected devices"]}
                      </td>
                      <td className="p-2">{row["Total pixels used"]}</td>
                      <td className="p-2">{typeof row["Combined mean PCE"] === 'number' ? row["Combined mean PCE"].toFixed(3) : 'N/A'}</td>
                      <td className="p-2">{typeof row["Combined SD PCE"] === 'number' ? row["Combined SD PCE"].toFixed(3) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Logs */}
      {showLogs && results.logs && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/20 rounded p-3 max-h-64 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {results.logs.join('\n')}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
