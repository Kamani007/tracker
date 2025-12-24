"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, X, Save, ChevronDown, ChevronRight } from "lucide-react"
import { baselineBatchesAPI } from "@/lib/api"

export default function BaselineBatches() {
  const [batches, setBatches] = useState([])
  const [newBatch, setNewBatch] = useState("")
  const [newSheet, setNewSheet] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tempEntries, setTempEntries] = useState([])
  const [isAddingMode, setIsAddingMode] = useState(false)
  const [isEntriesExpanded, setIsEntriesExpanded] = useState(false)
  const [validationError, setValidationError] = useState("")

  // Validate batch format: B25-66, B26-10, etc. (B + year(25/26/27...) + - + number)
  const validateBatchFormat = (batch) => {
    const batchRegex = /^B\d{2}-\d+$/
    return batchRegex.test(batch.trim())
  }

  // Validate sheet format: S001, S010, S1, etc. (S + number)
  const validateSheetFormat = (sheet) => {
    const sheetRegex = /^S\d+$/
    return sheetRegex.test(sheet.trim())
  }

  // Check if batch-sheet combination already exists
  const isDuplicate = (batch, sheet) => {
    const allEntries = [...batches, ...tempEntries]
    return allEntries.some(
      (entry) => 
        entry.batch.toLowerCase() === batch.trim().toLowerCase() && 
        entry.sheet.toLowerCase() === sheet.trim().toLowerCase()
    )
  }

  // Check if both inputs have values and are in correct format and not duplicate
  const canAdd = (() => {
    const batch = newBatch.trim()
    const sheet = newSheet.trim()
    
    if (!batch || !sheet) {
      return false
    }
    
    if (!validateBatchFormat(batch)) {
      return false
    }
    
    if (!validateSheetFormat(sheet)) {
      return false
    }
    
    if (isDuplicate(batch, sheet)) {
      return false
    }
    
    return true
  })()

  // Update validation error message based on inputs
  useEffect(() => {
    const batch = newBatch.trim()
    const sheet = newSheet.trim()
    
    if (!batch && !sheet) {
      setValidationError("")
      return
    }
    
    if (batch && sheet && isDuplicate(batch, sheet)) {
      setValidationError("This batch-sheet combination already exists")
      return
    }
    
    setValidationError("")
  }, [newBatch, newSheet, batches, tempEntries])

  // Load baseline batches on component mount
  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    try {
      setLoading(true)
      const response = await baselineBatchesAPI.getAll()
      const data = response.data || response
      setBatches(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      console.error("Failed to load baseline batches:", err)
      setError("Failed to load baseline batches")
      setBatches([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    if (!newBatch.trim() || !newSheet.trim()) {
      setError("Both batch and sheet are required")
      return
    }

    // Add to temporary entries (not saved to DB yet)
    const entry = {
      id: `temp-${Date.now()}`,
      batch: newBatch.trim(),
      sheet: newSheet.trim(),
      isTemp: true,
    }
    
    setTempEntries([...tempEntries, entry])
    setNewBatch("")
    setNewSheet("")
    setError(null)
    setIsAddingMode(true) // Enable adding mode so user can add more
  }

  const handleCancelAdd = () => {
    setNewBatch("")
    setNewSheet("")
    setIsAddingMode(false)
    setError(null)
  }

  const handleSave = async () => {
    if (tempEntries.length === 0 && !canAdd) {
      setError("No entries to save")
      return
    }

    try {
      // If there's a current entry being typed, add it first
      if (canAdd && newBatch.trim() && newSheet.trim()) {
        tempEntries.push({
          id: `temp-${Date.now()}`,
          batch: newBatch.trim(),
          sheet: newSheet.trim(),
          isTemp: true,
        })
      }

      // Save all temporary entries to the database
      for (const entry of tempEntries) {
        await baselineBatchesAPI.create({
          batch: entry.batch,
          sheet: entry.sheet,
        })
      }

      // Clear temporary entries and reload from database
      setTempEntries([])
      setNewBatch("")
      setNewSheet("")
      setIsAddingMode(false)
      await loadBatches()
      setError(null)
    } catch (err) {
      console.error("Failed to save baseline batches:", err)
      setError("Failed to save baseline batches")
    }
  }

  const handleRemoveTemp = (id) => {
    setTempEntries(tempEntries.filter((entry) => entry.id !== id))
    // If no more temp entries, exit adding mode
    if (tempEntries.length === 1) {
      setIsAddingMode(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this baseline batch?")) {
      return
    }

    try {
      await baselineBatchesAPI.delete(id)
      await loadBatches()
      setError(null)
    } catch (err) {
      console.error("Failed to delete baseline batch:", err)
      setError("Failed to delete baseline batch")
    }
  }

  const allEntries = [...batches, ...tempEntries]

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Baseline Batches & Sheets</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Display existing and temporary entries */}
      {allEntries.length > 0 && (
        <div className="mb-4 space-y-2">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:bg-muted/20 rounded p-1 -ml-1 w-fit"
            onClick={() => setIsEntriesExpanded(!isEntriesExpanded)}
          >
            {isEntriesExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <h4 className="text-sm font-medium text-muted-foreground">Current Entries ({allEntries.length})</h4>
          </div>
          {isEntriesExpanded && (
            <div className="flex flex-wrap gap-2">
              {allEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                    entry.isTemp
                      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      <span className="font-bold">{entry.batch}</span>
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-sm font-medium text-foreground">
                      <span className="font-bold">{entry.sheet}</span>
                    </span>
                    {entry.isTemp && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 italic ml-1">
                        (unsaved)
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => (entry.isTemp ? handleRemoveTemp(entry.id) : handleDelete(entry.id))}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input section */}
      <div className="space-y-4">
        {isAddingMode && (
          <div className="flex justify-end">
            <Button
              onClick={handleCancelAdd}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Batch
            </label>
            <Input
              placeholder="B25-66"
              value={newBatch}
              onChange={(e) => setNewBatch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && canAdd && handleAdd()}
              className={`bg-background ${
                newBatch.trim() && !validateBatchFormat(newBatch) 
                  ? "border-red-500 focus:ring-red-500" 
                  : ""
              }`}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Sheet
            </label>
            <Input
              placeholder="S001"
              value={newSheet}
              onChange={(e) => setNewSheet(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && canAdd && handleAdd()}
              className={`bg-background ${
                newSheet.trim() && !validateSheetFormat(newSheet) 
                  ? "border-red-500 focus:ring-red-500" 
                  : ""
              }`}
            />
          </div>
        </div>

        {/* Validation error message */}
        {validationError && (
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-md text-sm border border-amber-200 dark:border-amber-800">
            {validationError}
          </div>
        )}

        <div className="flex gap-2">
          {!isAddingMode ? (
            <Button
              onClick={handleAdd}
              disabled={!canAdd}
              variant="outline"
              className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          ) : (
            <Button
              onClick={handleAdd}
              disabled={!canAdd}
              variant="outline"
              className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={tempEntries.length === 0 && !canAdd}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            Save All ({tempEntries.length + (canAdd && !isAddingMode ? 1 : 0)})
          </Button>
        </div>
      </div>

      {loading && allEntries.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
      )}
    </Card>
  )
}
