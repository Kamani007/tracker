"use client"

import { useRef } from "react"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"

export default function ExcelUploader({ onFileSelect }) {
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (isValidFile(file)) {
        onFileSelect(file)
      }
    }
  }

  const handleFileChange = (e) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      const file = files[0]
      if (isValidFile(file)) {
        onFileSelect(file)
      }
    }
  }

  const isValidFile = (file) => {
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileName = file.name.toLowerCase()
    return validExtensions.some(ext => fileName.endsWith(ext)) || 
           file.type.includes('spreadsheet') || 
           file.type.includes('csv')
  }

  return (
    <div className="space-y-6">
      {/* Requirements Section */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            File Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Supported File Formats */}
          <div>
            <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Supported File Formats
            </h5>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                Excel (.xlsx)
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                Excel (.xls)
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                CSV (.csv)
              </Badge>
            </div>
          </div>
          
          {/* Required Columns */}
          <div>
            <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Required Columns
            </h5>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-blue-800 mb-2">Essential Columns:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Scan Direction
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Pixel ID
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    PCE (%)
                  </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Sheet ID
                  </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Batch ID
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-blue-800 mb-2">Additional Parameter Columns:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    FF
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Max Power
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    HI
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    I_sc
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    V_oc
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    R_series
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    R_shunt
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold mb-1">Drag and drop your file here</p>
        <p className="text-sm text-muted-foreground">or click to browse</p>
        <p className="text-xs text-muted-foreground mt-2">Supports Excel (.xlsx, .xls) and CSV (.csv) files</p>
      </div>
    </div>
  )
}
