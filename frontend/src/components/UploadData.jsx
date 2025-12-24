import { useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Upload, File, X, CheckCircle2 } from "lucide-react"
import Navigation from "./Navigation"

export default function UploadDataPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      setSelectedFile(files[0])
      setUploadStatus(null)
    }
  }, [])

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files && files[0]) {
      setSelectedFile(files[0])
      setUploadStatus(null)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setUploadStatus(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploadStatus("uploading")
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('http://localhost:7071/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setUploadStatus("success")
        console.log("File uploaded successfully:", result.filename)
      } else {
        setUploadStatus("error")
        setErrorMessage(result.message || "Upload failed")
        console.error("Upload failed:", result.message)
      }
    } catch (error) {
      setUploadStatus("error")
      setErrorMessage("Network error occurred")
      console.error("Upload error:", error)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="min-h-screen bg-background dark relative">
      {/* Navigation */}
      <Navigation />

      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Upload Your Data File</CardTitle>
            <CardDescription>Upload CSV, Excel, JSON, or text files for analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground mb-1">
                    {isDragging ? "Drop your file here" : "Drag and drop your file here"}
                  </p>
                  <p className="text-sm text-muted-foreground">or</p>
                </div>
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer bg-transparent" asChild>
                    <span>Browse Files</span>
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".csv,.xlsx,.xls,.json,.txt"
                  />
                </label>
                <p className="text-xs text-muted-foreground">Supported formats: CSV, Excel (.xlsx, .xls), JSON, TXT</p>
              </div>
            </div>

            {/* Selected File Display */}
            {selectedFile && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded">
                        <File className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      disabled={uploadStatus === "uploading"}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {uploadStatus === "success" && (
                    <div className="mt-3 flex items-center space-x-2 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Upload successful!</span>
                    </div>
                  )}

                  {uploadStatus === "error" && errorMessage && (
                    <div className="mt-3 flex items-center space-x-2 text-red-500">
                      <X className="h-4 w-4" />
                      <span className="text-sm font-medium">{errorMessage}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upload Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadStatus === "uploading"}
                className="min-w-32"
              >
                {uploadStatus === "uploading"
                  ? "Uploading..."
                  : uploadStatus === "success"
                    ? "Uploaded"
                    : uploadStatus === "error"
                      ? "Try Again"
                      : "Upload File"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
