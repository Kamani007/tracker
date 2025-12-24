"use client"
import { Label } from "./ui/label"
import { Input } from "./ui/input"

export default function ProcessingOptions({ options, setOptions }) {
  const updateOption = (key, value) => {
    setOptions({ ...options, [key]: value })
  }

  return (
    <div className="space-y-8">
      {/* Sheets Selection */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Sheets</Label>
        <div className="space-y-3 bg-card/50 p-4 rounded-lg border border-border">
          {["top-k", "select-all"].map((mode) => (
            <label key={mode} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <input
                type="radio"
                name="sheetsMode"
                value={mode}
                checked={options.sheetsMode === mode}
                onChange={(e) => updateOption("sheetsMode", e.target.value)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-medium capitalize">{mode === "top-k" ? "Top-K" : "Select All"}</span>
            </label>
          ))}
        </div>
        {options.sheetsMode === "top-k" && (
          <div className="mt-3">
            <Label htmlFor="sheetsTopK" className="text-sm font-medium">
              K Value (default: 6)
            </Label>
            <Input
              id="sheetsTopK"
              type="number"
              min="1"
              value={options.sheetsTopK}
              onChange={(e) => updateOption("sheetsTopK", Number.parseInt(e.target.value) || 6)}
              className="mt-2 bg-card border-border"
            />
          </div>
        )}
      </div>

      {/* Devices Per Sheet */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Devices per Sheet</Label>
        <div className="space-y-3 bg-card/50 p-4 rounded-lg border border-border">
          {["top-k", "select-all"].map((mode) => (
            <label key={mode} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <input
                type="radio"
                name="devicesMode"
                value={mode}
                checked={options.devicesMode === mode}
                onChange={(e) => updateOption("devicesMode", e.target.value)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-medium capitalize">{mode === "top-k" ? "Top-K" : "Select All"}</span>
            </label>
          ))}
        </div>
        {options.devicesMode === "top-k" && (
          <div className="mt-3">
            <Label htmlFor="devicesTopK" className="text-sm font-medium">
              K Value (default: 6)
            </Label>
            <Input
              id="devicesTopK"
              type="number"
              min="1"
              value={options.devicesTopK}
              onChange={(e) => updateOption("devicesTopK", Number.parseInt(e.target.value) || 6)}
              className="mt-2 bg-card border-border"
            />
          </div>
        )}
      </div>

      {/* Pixels Per Device */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Pixels per Device (exact)</Label>
        <div className="space-y-3 bg-card/50 p-4 rounded-lg border border-border">
          {[3, 4].map((pixels) => (
            <label key={pixels} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <input
                type="radio"
                name="pixelsPerDevice"
                value={pixels}
                checked={options.pixelsPerDevice === pixels}
                onChange={(e) => updateOption("pixelsPerDevice", Number.parseInt(e.target.value))}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-medium">{pixels} pixels</span>
            </label>
          ))}
        </div>
      </div>

      {/* Method */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Method</Label>
        <div className="space-y-3 bg-card/50 p-4 rounded-lg border border-border">
          {[
            { value: "minimize-sd", label: "Minimize SD" },
            { value: "maximize-mean-pce", label: "Maximize mean PCE" },
          ].map((method) => (
            <label
              key={method.value}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <input
                type="radio"
                name="method"
                value={method.value}
                checked={options.method === method.value}
                onChange={(e) => updateOption("method", e.target.value)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-medium">{method.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Basis Direction */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Basis (direction)</Label>
        <div className="space-y-3 bg-card/50 p-4 rounded-lg border border-border">
          {[
            { value: "forward", label: "Forward" },
            { value: "reverse", label: "Reverse" },
            { value: "average-fr", label: "Average F/R" },
          ].map((basis) => (
            <label
              key={basis.value}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <input
                type="radio"
                name="basis"
                value={basis.value}
                checked={options.basis === basis.value}
                onChange={(e) => updateOption("basis", e.target.value)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-medium">{basis.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Optional: Restrict to Specific Sheet IDs */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer mb-3 hover:opacity-80 transition-opacity">
          <input
            type="checkbox"
            checked={options.useAllSheets}
            onChange={(e) => updateOption("useAllSheets", e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm font-medium">Use all sheets (default)</span>
        </label>
        {!options.useAllSheets && (
          <div>
            <Label htmlFor="sheetIds" className="text-sm font-medium">
              Sheet IDs (comma-separated)
            </Label>
            <Input
              id="sheetIds"
              type="text"
              placeholder="e.g., 1,2,3"
              value={options.sheetIds}
              onChange={(e) => updateOption("sheetIds", e.target.value)}
              className="mt-2 bg-card border-border"
            />
          </div>
        )}
      </div>
    </div>
  )
}
