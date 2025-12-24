"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function RACIMatrixComponent({ matrix, showLabels = true, compact = false }) {
  const roles = [
    {
      key: "responsible",
      label: "Responsible",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    },
    {
      key: "accountable",
      label: "Accountable",
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    },
    {
      key: "consulted",
      label: "Consulted",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    },
    {
      key: "informed",
      label: "Informed",
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    },
  ]

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {roles.map(({ key, label, color }) => {
          const value = matrix[key]
          if (!value) return null
          return (
            <div key={key} className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {label.charAt(0)}: {value}
              </Badge>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {roles.map(({ key, label, color }) => (
        <Card key={key} className={`p-3 ${color} border-0`}>
          {showLabels && <p className="text-xs font-semibold opacity-75 mb-1">{label}</p>}
          <p className="text-sm font-bold">{matrix[key] || "-"}</p>
        </Card>
      ))}
    </div>
  )
}
