"use client"

import { useState, useCallback, memo } from "react"
import { Slider } from "@/components/ui/slider"
import { Trash2 } from "lucide-react"
import NameInputAutocomplete from "@/components/ui/name-input-autocomplete"

// Isolated slider component - only this re-renders when dragging
const SubtaskProgressSlider = memo(({ subtaskId, initialProgress, onCommit }) => {
  const [localValue, setLocalValue] = useState(initialProgress)

  return (
    <div className="flex items-center gap-3 min-w-[250px]">
      <Slider
        value={[localValue]}
        onValueChange={(value) => setLocalValue(value[0])}
        onValueCommit={(value) => {
          setLocalValue(value[0])
          onCommit(subtaskId, value[0])
        }}
        min={0}
        max={100}
        step={10}
        className="w-40"
      />
      <span className="text-xs font-semibold text-blue-500 min-w-[45px] text-right">
        {Math.round(localValue)}%
      </span>
    </div>
  )
})

SubtaskProgressSlider.displayName = "SubtaskProgressSlider"

function SubtaskList({ subtasks, onUpdateProgress, onUpdateRaci, onUpdateDeadline, onUpdateTitle, onDelete, compact = false }) {
  const [hoveredId, setHoveredId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editedTitle, setEditedTitle] = useState("")

  const averageProgress =
    subtasks.length > 0 ? Math.round(subtasks.reduce((sum, s) => sum + (s.progress || 0), 0) / subtasks.length) : 0

  const getDeadlineStatus = (deadline) => {
    if (!deadline) return null
    const daysUntil = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return { text: "Overdue", color: "text-red-500" }
    if (daysUntil === 0) return { text: "Today", color: "text-amber-500" }
    if (daysUntil <= 3) return { text: `${daysUntil}d left`, color: "text-amber-500" }
    if (daysUntil <= 7) return { text: `${daysUntil}d left`, color: "text-blue-500" }
    return { text: `${daysUntil}d left`, color: "text-muted-foreground" }
  }

  const handleTitleEdit = (subtaskId, newTitle) => {
    if (onUpdateTitle) {
      onUpdateTitle(subtaskId, newTitle)
    }
    setEditingId(null)
    setEditedTitle("")
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full transition-all duration-200" style={{ width: `${averageProgress}%` }} />
        </div>
        <span className="text-muted-foreground font-medium">{averageProgress}%</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {subtasks.map((subtask) => (
        <div
          key={subtask.id}
          className="p-4 rounded-lg border border-border hover:border-blue-500/50 transition-colors bg-card"
          onMouseEnter={() => setHoveredId(subtask.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Subtask title with inline edit */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 flex items-center gap-3">
              {editingId === subtask.id ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={() => {
                    if (editedTitle.trim()) {
                      handleTitleEdit(subtask.id, editedTitle)
                    } else {
                      setEditingId(null)
                      setEditedTitle("")
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editedTitle.trim()) {
                        handleTitleEdit(subtask.id, editedTitle)
                      }
                    } else if (e.key === 'Escape') {
                      setEditingId(null)
                      setEditedTitle("")
                    }
                  }}
                  autoFocus
                  className="flex-1 px-2 py-1 text-sm border-2 border-blue-500 rounded bg-background text-foreground focus:outline-none"
                />
              ) : (
                <p
                  className="text-sm font-medium text-foreground cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => {
                    setEditingId(subtask.id)
                    setEditedTitle(subtask.title)
                  }}
                  title="Click to edit"
                >
                  {subtask.title}
                </p>
              )}
              
              {/* Deadline */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">📅</span>
                <input
                  type="date"
                  value={subtask.deadline || ""}
                  onChange={(e) => onUpdateDeadline(subtask.id, e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="px-2 py-1 text-xs border rounded bg-background text-foreground hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Timeline status */}
              {subtask.deadline && getDeadlineStatus(subtask.deadline) && (
                <span className={`text-xs font-semibold ${getDeadlineStatus(subtask.deadline).color}`}>
                  ⏱️ {getDeadlineStatus(subtask.deadline).text}
                </span>
              )}
            </div>

            {/* Progress Slider */}
            <SubtaskProgressSlider
              subtaskId={subtask.id}
              initialProgress={subtask.progress || 0}
              onCommit={onUpdateProgress}
            />
            
            {/* Delete button */}
            {onDelete && (
              <button
                onClick={() => onDelete(subtask.id)}
                className="p-2 hover:bg-muted rounded transition-all"
                style={{ opacity: hoveredId === subtask.id ? 1 : 0 }}
                title="Delete subtask"
                type="button"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-muted">
            <div className="text-xs">
              <p className="text-muted-foreground font-semibold mb-1">Responsible</p>
              <NameInputAutocomplete
                value={subtask.responsible || ""}
                onChange={(e) => onUpdateRaci(subtask.id, "responsible", e.target.value)}
                placeholder="Type name..."
                className="w-full px-2 py-1 text-xs border rounded bg-background text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs">
              <p className="text-muted-foreground font-semibold mb-1">Accountable</p>
              <NameInputAutocomplete
                value={subtask.accountable || ""}
                onChange={(e) => onUpdateRaci(subtask.id, "accountable", e.target.value)}
                placeholder="Type name..."
                className="w-full px-2 py-1 text-xs border rounded bg-background text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs">
              <p className="text-muted-foreground font-semibold mb-1">Consulted</p>
              <NameInputAutocomplete
                value={subtask.consulted || ""}
                onChange={(e) => onUpdateRaci(subtask.id, "consulted", e.target.value)}
                placeholder="Type name..."
                className="w-full px-2 py-1 text-xs border rounded bg-background text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs">
              <p className="text-muted-foreground font-semibold mb-1">Informed</p>
              <NameInputAutocomplete
                value={subtask.informed || ""}
                onChange={(e) => onUpdateRaci(subtask.id, "informed", e.target.value)}
                placeholder="Type name..."
                className="w-full px-2 py-1 text-xs border rounded bg-background text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default memo(SubtaskList)
