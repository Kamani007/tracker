"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, X } from "lucide-react"

export default function TaskEditor({ task, onSave, onCancel }) {
  const [editedTask, setEditedTask] = useState(task)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      const newSubtask = {
        id: `st${Date.now()}`,
        title: newSubtaskTitle,
        completed: false,
      }
      setEditedTask({
        ...editedTask,
        subtasks: [...editedTask.subtasks, newSubtask],
      })
      setNewSubtaskTitle("")
    }
  }

  const handleRemoveSubtask = (subtaskId) => {
    setEditedTask({
      ...editedTask,
      subtasks: editedTask.subtasks.filter((st) => st.id !== subtaskId),
    })
  }

  const handleToggleSubtask = (subtaskId) => {
    const updatedSubtasks = editedTask.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st,
    )
    const completedCount = updatedSubtasks.filter((s) => s.completed).length
    const newProgress = editedTask.subtasks.length > 0 ? Math.round((completedCount / updatedSubtasks.length) * 100) : 0

    setEditedTask({
      ...editedTask,
      subtasks: updatedSubtasks,
      progress: newProgress,
    })
  }

  const handleSave = () => {
    onSave(editedTask)
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Task Title</label>
          <Input
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            placeholder="Enter task title"
            className="w-full"
          />
        </div>

        {/* Priority Field */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">Priority *</label>
          <select
            value={editedTask.priority || 3}
            onChange={(e) => setEditedTask({ ...editedTask, priority: parseInt(e.target.value) })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ colorScheme: 'dark' }}
          >
            <option value="1" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P1 - Critical</option>
            <option value="2" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P2 - High</option>
            <option value="3" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P3 - Medium</option>
            <option value="4" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P4 - Low</option>
            <option value="5" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P5 - Very Low</option>
          </select>
        </div>

        {/* RACI Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Responsible</label>
            <Input
              value={editedTask.responsible}
              onChange={(e) => setEditedTask({ ...editedTask, responsible: e.target.value })}
              placeholder="e.g., Luigi, Manish"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated for multiple people</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Accountable</label>
            <Input
              value={editedTask.accountable}
              onChange={(e) => setEditedTask({ ...editedTask, accountable: e.target.value })}
              placeholder="e.g., Luigi, Manish"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated for multiple people</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Consulted</label>
            <Input
              value={editedTask.consulted}
              onChange={(e) => setEditedTask({ ...editedTask, consulted: e.target.value })}
              placeholder="e.g., Luigi, Manish"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated for multiple people</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Informed</label>
            <Input
              value={editedTask.informed}
              onChange={(e) => setEditedTask({ ...editedTask, informed: e.target.value })}
              placeholder="e.g., Luigi, Manish"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated for multiple people</p>
          </div>
        </div>

        {/* Manual Progress Control (only when no subtasks) */}
        {(!editedTask.subtasks || editedTask.subtasks.length === 0) && (
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border">
            <label className="text-sm font-semibold text-foreground">
              Task Progress: {editedTask.progress || 0}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={editedTask.progress || 0}
              onChange={(e) => setEditedTask({ ...editedTask, progress: parseInt(e.target.value) })}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${editedTask.progress || 0}%, #374151 ${editedTask.progress || 0}%, #374151 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Note: Progress will auto-calculate when you add subtasks
            </p>
          </div>
        )}

        {/* Subtasks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">Subtasks</label>
            <span className="text-xs text-muted-foreground">
              {editedTask.subtasks.filter((s) => s.completed).length}/{editedTask.subtasks.length}
            </span>
          </div>

          <div className="space-y-2">
            {editedTask.subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                <input
                  type="checkbox"
                  checked={subtask.completed}
                  onChange={() => handleToggleSubtask(subtask.id)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className={`flex-1 ${subtask.completed ? "line-through text-muted-foreground" : ""}`}>
                  {subtask.title}
                </span>
                <button
                  onClick={() => handleRemoveSubtask(subtask.id)}
                  className="p-1 hover:bg-destructive/10 rounded text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddSubtask()}
              placeholder="Add new subtask..."
            />
            <Button onClick={handleAddSubtask} variant="secondary" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end border-t pt-4">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </Card>
  )
}
