"use client"

import { memo, useState } from "react"
import { Card } from "@/components/ui/card"
import { ChevronDown, Edit2, Check, X, Trash2 } from "lucide-react"
import NameInputAutocomplete from "@/components/ui/name-input-autocomplete"

function WorkPackageCard({ workPackage, progress, isExpanded, onToggle, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState({
    name: workPackage.name,
    deliverable: workPackage.deliverable,
    partnership: workPackage.partnership,
    deadline: workPackage.deadline,
    priority: workPackage.priority,
    status: workPackage.status,
  })
  const priorityColors = {
    1: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    3: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  }

  const priorityLabels = {
    1: "High",
    2: "Medium",
    3: "Low",
  }

  const statusColors = {
    planning: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "in-progress": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  }

  const getDeadlineStatus = (deadline) => {
    const daysUntil = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return "Overdue"
    if (daysUntil === 0) return "Today"
    if (daysUntil <= 7) return `${daysUntil} days left`
    return new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const formatDeadline = (deadline) => {
    return new Date(deadline).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
  }

  const handleSave = () => {
    onUpdate(workPackage.id, editedData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedData({
      name: workPackage.name,
      deliverable: workPackage.deliverable,
      partnership: workPackage.partnership,
      deadline: workPackage.deadline,
      priority: workPackage.priority,
      status: workPackage.status,
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Card className="p-6 border-2 border-blue-500">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Edit Work Package</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                title="Cancel"
              >
                <X className="h-4 w-4 text-red-500" />
              </button>
              <button
                onClick={handleSave}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                title="Save"
              >
                <Check className="h-4 w-4 text-green-500" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Name</label>
            <input
              type="text"
              value={editedData.name}
              onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded bg-background text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Deliverable</label>
            <textarea
              value={editedData.deliverable}
              onChange={(e) => setEditedData({ ...editedData, deliverable: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded bg-background text-foreground min-h-[60px]"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Partnership</label>
              <NameInputAutocomplete
                value={editedData.partnership}
                onChange={(e) => setEditedData({ ...editedData, partnership: e.target.value })}
                placeholder="Type name..."
                className="w-full px-3 py-2 text-sm border rounded bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Deadline</label>
              <input
                type="date"
                value={editedData.deadline}
                onChange={(e) => setEditedData({ ...editedData, deadline: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded bg-background text-foreground"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Priority</label>
              <select
                value={editedData.priority}
                onChange={(e) => setEditedData({ ...editedData, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm border rounded bg-background text-foreground"
                style={{ colorScheme: 'dark' }}
              >
                <option value="1" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P1 - High</option>
                <option value="2" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P2 - Medium</option>
                <option value="3" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P3 - Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</label>
              <select
                value={editedData.status}
                onChange={(e) => setEditedData({ ...editedData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded bg-background text-foreground"
                style={{ colorScheme: 'dark' }}
              >
                <option value="planning" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Planning</option>
                <option value="in-progress" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>In Progress</option>
                <option value="completed" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Completed</option>
              </select>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow group relative">
      <div className="absolute top-4 right-12 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
          className="p-2 hover:bg-muted rounded-md transition-all"
          title="Edit work package"
          type="button"
        >
          <Edit2 className="h-4 w-4 text-blue-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm('Are you sure you want to delete this work package? This will also delete all tasks and subtasks.')) {
              onDelete()
            }
          }}
          className="p-2 hover:bg-muted rounded-md transition-all"
          title="Delete work package"
          type="button"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      </div>
      
      <button
        onClick={onToggle}
        className="w-full text-left flex items-start justify-between gap-4 hover:opacity-80 transition-opacity"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-bold text-foreground">{workPackage.name}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityColors[workPackage.priority]}`}>
              P{workPackage.priority}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[workPackage.status]}`}>
              {workPackage.status.replace("-", " ").toUpperCase()}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                📋 Deliverable
              </p>
              <div className="text-sm font-medium text-foreground max-h-40 overflow-y-auto pr-2 border-2 border-primary/20 rounded-lg p-4 bg-gradient-to-br from-muted/30 to-muted/10 shadow-sm hover:shadow-md transition-shadow">
                {workPackage.deliverable || "No deliverable specified"}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">Partnership</p>
                <p className="text-sm font-medium text-foreground">{workPackage.partnership || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">Deadline</p>
                <p className="text-sm font-medium text-foreground">{formatDeadline(workPackage.deadline)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">Timeline</p>
                <p className="text-sm font-medium text-accent">{getDeadlineStatus(workPackage.deadline)}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-accent h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-bold text-foreground min-w-fit">{progress}%</span>
          </div>
        </div>

        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 mt-1 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>
    </Card>
  )
}

export default memo(WorkPackageCard)
