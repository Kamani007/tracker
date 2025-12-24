"use client"

import { useState, memo } from "react"
import WorkPackageCard from "./work-package-card"
import SubtaskList from "./subtask-list"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Edit2, Check, X } from "lucide-react"
import { trackProgressAPI } from "@/lib/api"
import NameInputAutocomplete from "@/components/ui/name-input-autocomplete"

function WorkPackageDashboard({ workPackages, setWorkPackages, onUpdate, highlightedPackageId }) {
  const [expandedPackage, setExpandedPackage] = useState(null)
  const [addingTaskTo, setAddingTaskTo] = useState(null)
  const [newTask, setNewTask] = useState({
    title: "",
    responsible: "",
    accountable: "",
    consulted: "",
    informed: "",
    priority: 3,
  })

  const updateWorkPackage = async (id, updates) => {
    try {
      // Update local state IMMEDIATELY for instant UI feedback
      setWorkPackages(prevPackages => 
        prevPackages.map(wp => wp.id === id ? { ...wp, ...updates } : wp)
      )
      
      // Update backend in the background
      await trackProgressAPI.updateWorkPackage(id, updates)
      console.log("✅ Updated work package:", id)
    } catch (err) {
      console.error("❌ Error updating work package:", err)
      alert(`Failed to update work package: ${err.message}`)
      // Reload from backend on error
      if (onUpdate) {
        await onUpdate()
      }
    }
  }

  const handleAddTask = (workPackageId) => {
    if (!newTask.title) {
      alert("Task title is required")
      return
    }

    const wp = workPackages.find((w) => w.id === workPackageId)
    const newTaskObj = {
      id: `t${Date.now()}`,
      title: newTask.title,
      responsible: newTask.responsible || "TBD",
      accountable: newTask.accountable || "TBD",
      consulted: newTask.consulted || "TBD",
      informed: newTask.informed || "TBD",
      priority: newTask.priority || 3,
      progress: 0,
      subtasks: [],
    }

    updateWorkPackage(workPackageId, { tasks: [...wp.tasks, newTaskObj] })
    setNewTask({ title: "", responsible: "", accountable: "", consulted: "", informed: "", priority: 3 })
    setAddingTaskTo(null)
  }

  const handleDeleteWorkPackage = async (wpId) => {
    try {
      await trackProgressAPI.deleteWorkPackage(wpId)
      setWorkPackages(prevPackages => prevPackages.filter(wp => wp.id !== wpId))
    } catch (err) {
      console.error("❌ Error deleting work package:", err)
      alert(`Failed to delete work package: ${err.message}`)
    }
  }

  const handleDeleteTask = (workPackageId, taskId) => {
    if (confirm('Are you sure you want to delete this task? This will also delete all subtasks.')) {
      const wp = workPackages.find((w) => w.id === workPackageId)
      const updatedTasks = wp.tasks.filter((t) => t.id !== taskId)
      updateWorkPackage(workPackageId, { tasks: updatedTasks })
    }
  }

  const calculatePackageProgress = (tasks) => {
    if (tasks.length === 0) return 0
    const avgProgress = tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length
    return Math.round(avgProgress)
  }

  return (
    <div className="space-y-4">
      {workPackages.map((wp) => (
        <div 
          key={wp.id} 
          id={`work-package-${wp.id}`}
          className={`space-y-4 transition-all rounded-lg ${
            highlightedPackageId === wp.id ? 'ring-4 ring-purple-500 p-2' : ''
          }`}
        >
          <WorkPackageCard
            workPackage={wp}
            progress={calculatePackageProgress(wp.tasks)}
            isExpanded={expandedPackage === wp.id}
            onToggle={() => setExpandedPackage(expandedPackage === wp.id ? null : wp.id)}
            onUpdate={updateWorkPackage}
            onDelete={() => handleDeleteWorkPackage(wp.id)}
          />

          {expandedPackage === wp.id && (
            <div className="ml-4 space-y-3">
              {wp.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  workPackageId={wp.id}
                  onUpdate={(updates) => {
                    const updatedTasks = wp.tasks.map((t) => (t.id === task.id ? { ...t, ...updates } : t))
                    updateWorkPackage(wp.id, { tasks: updatedTasks })
                  }}
                  onDelete={() => handleDeleteTask(wp.id, task.id)}
                />
              ))}

              {/* Add Task Button/Form */}
              {addingTaskTo === wp.id ? (
                <Card className="p-4 bg-card border-2 border-blue-500">
                  <h4 className="font-semibold text-foreground mb-3">Add New Task</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Task Title *</label>
                      <Input
                        placeholder="e.g., PVSK 5905 Process optimization"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className="bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Priority *</label>
                      <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="1" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P1 - Critical</option>
                        <option value="2" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P2 - High</option>
                        <option value="3" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P3 - Medium</option>
                        <option value="4" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P4 - Low</option>
                        <option value="5" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>P5 - Very Low</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Responsible</label>
                        <NameInputAutocomplete
                          value={newTask.responsible}
                          onChange={(e) => setNewTask({ ...newTask, responsible: e.target.value })}
                          placeholder="e.g., Luigi, Manish"
                          className="w-full px-2 py-1 text-xs border rounded bg-background text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-xs text-muted-foreground mt-0.5">Comma-separated</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Accountable</label>
                        <NameInputAutocomplete
                          value={newTask.accountable}
                          onChange={(e) => setNewTask({ ...newTask, accountable: e.target.value })}
                          placeholder="e.g., Luigi, Manish"
                          className="w-full px-2 py-1 text-xs border rounded bg-background text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-xs text-muted-foreground mt-0.5">Comma-separated</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Consulted</label>
                        <NameInputAutocomplete
                          value={newTask.consulted}
                          onChange={(e) => setNewTask({ ...newTask, consulted: e.target.value })}
                          placeholder="e.g., Luigi, Manish"
                          className="w-full px-2 py-1 text-xs border rounded bg-background text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-xs text-muted-foreground mt-0.5">Comma-separated</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Informed</label>
                        <NameInputAutocomplete
                          value={newTask.informed}
                          onChange={(e) => setNewTask({ ...newTask, informed: e.target.value })}
                          placeholder="e.g., Luigi, Manish"
                          className="w-full px-2 py-1 text-xs border rounded bg-background text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-xs text-muted-foreground mt-0.5">Comma-separated</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAddingTaskTo(null)
                          setNewTask({ title: "", responsible: "", accountable: "", consulted: "", informed: "" })
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="button" size="sm" onClick={() => handleAddTask(wp.id)} className="bg-blue-500 hover:bg-blue-600">
                        Add Task
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingTaskTo(wp.id)}
                  className="w-full border-dashed border-2 hover:border-blue-500 hover:bg-blue-500/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const TaskCard = memo(function TaskCard({ task, workPackageId, onUpdate, onDelete }) {
  const [showDetails, setShowDetails] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [editingTask, setEditingTask] = useState(false)
  const [newSubtask, setNewSubtask] = useState({ title: "", deadline: "" })
  const [editedTask, setEditedTask] = useState({
    title: task.title,
    responsible: task.responsible || "",
    accountable: task.accountable || "",
    consulted: task.consulted || "",
    informed: task.informed || "",
    priority: task.priority || 3,
    deadline: task.deadline || "",
  })

  const calculateTaskProgress = (subtasks) => {
    if (!subtasks || subtasks.length === 0) return 0
    const avgProgress = subtasks.reduce((sum, st) => sum + (st.progress || 0), 0) / subtasks.length
    return Math.round(avgProgress)
  }

  const handleUpdateSubtaskProgress = (subtaskId, newProgress) => {
    const updatedSubtasks = task.subtasks.map((st) => (st.id === subtaskId ? { ...st, progress: newProgress } : st))
    const newTaskProgress = calculateTaskProgress(updatedSubtasks)
    onUpdate({
      subtasks: updatedSubtasks,
      progress: newTaskProgress,
    })
  }

  const handleUpdateSubtaskRaci = (subtaskId, field, value) => {
    const updatedSubtasks = task.subtasks.map((st) => (st.id === subtaskId ? { ...st, [field]: value } : st))
    onUpdate({ subtasks: updatedSubtasks })
  }

  const handleUpdateSubtaskDeadline = (subtaskId, deadline) => {
    const updatedSubtasks = task.subtasks.map((st) => (st.id === subtaskId ? { ...st, deadline } : st))
    onUpdate({ subtasks: updatedSubtasks })
  }

  const handleUpdateSubtaskTitle = (subtaskId, title) => {
    const updatedSubtasks = task.subtasks.map((st) => (st.id === subtaskId ? { ...st, title } : st))
    onUpdate({ subtasks: updatedSubtasks })
  }

  const handleDeleteSubtask = async (subtaskId) => {
    if (confirm('Are you sure you want to delete this subtask?')) {
      const updatedSubtasks = task.subtasks.filter((st) => st.id !== subtaskId)
      onUpdate({ subtasks: updatedSubtasks })
    }
  }

  const handleAddSubtask = () => {
    if (!newSubtask.title) {
      alert("Subtask title is required")
      return
    }

    const newSubtaskObj = {
      id: `st${Date.now()}`,
      title: newSubtask.title,
      completed: false,
      progress: 0,
      responsible: "",
      accountable: "",
      consulted: "",
      informed: "",
      deadline: newSubtask.deadline || "",
    }

    const updatedSubtasks = [...(task.subtasks || []), newSubtaskObj]
    onUpdate({ subtasks: updatedSubtasks })
    setNewSubtask({ title: "", deadline: "" })
    setAddingSubtask(false)
    setShowDetails(true)
  }

  const handleSaveTaskEdit = () => {
    if (!editedTask.title.trim()) {
      alert("Task title is required")
      return
    }
    onUpdate({
      title: editedTask.title,
      responsible: editedTask.responsible,
      accountable: editedTask.accountable,
      consulted: editedTask.consulted,
      informed: editedTask.informed,
      priority: editedTask.priority,
      deadline: editedTask.deadline,
    })
    setEditingTask(false)
  }

  const handleCancelTaskEdit = () => {
    setEditedTask({
      title: task.title,
      responsible: task.responsible || "",
      accountable: task.accountable || "",
      consulted: task.consulted || "",
      informed: task.informed || "",
      priority: task.priority || 3,
      deadline: task.deadline || "",
    })
    setEditingTask(false)
  }

  return (
    <Card className="p-5 border-l-4 border-l-blue-500 bg-card group relative">
      {!editingTask && (
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => setEditingTask(true)}
            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-muted rounded-md transition-all"
            title="Edit task"
            type="button"
          >
            <Edit2 className="h-4 w-4 text-blue-500" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-muted rounded-md transition-all"
            title="Delete task"
            type="button"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        </div>
      )}
      
      <div className="space-y-4">
        {!editingTask ? (
          <>
            {/* View Mode */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-foreground">{task.title}</h4>
                  {/* Priority Badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    task.priority === 1 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                    task.priority === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                    task.priority === 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    task.priority === 4 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                    task.priority === 5 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  }`}>
                    P{task.priority || 3}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${task.progress}%` }} />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground min-w-fit">{task.progress}%</span>
                </div>
              </div>
            </div>

            {/* RACI Matrix */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="bg-muted/50 p-2 rounded">
                <p className="text-muted-foreground text-xs font-semibold">Responsible</p>
                <p className="text-foreground font-medium">{task.responsible || "TBD"}</p>
              </div>
              <div className="bg-muted/50 p-2 rounded">
                <p className="text-muted-foreground text-xs font-semibold">Accountable</p>
                <p className="text-foreground font-medium">{task.accountable || "TBD"}</p>
              </div>
              <div className="bg-muted/50 p-2 rounded">
                <p className="text-muted-foreground text-xs font-semibold">Consulted</p>
                <p className="text-foreground font-medium">{task.consulted || "TBD"}</p>
              </div>
              <div className="bg-muted/50 p-2 rounded">
                <p className="text-muted-foreground text-xs font-semibold">Informed</p>
                <p className="text-foreground font-medium">{task.informed || "TBD"}</p>
              </div>
            </div>

            {/* Deadline */}
            {task.deadline && (
              <div className="bg-blue-500/10 border border-blue-500/30 p-2 rounded-lg">
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="text-sm font-semibold text-foreground">
                  📅 {new Date(task.deadline).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Edit Mode */}
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-semibold text-foreground">Edit Task</h5>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTaskEdit}
                    className="p-1.5 hover:bg-green-500/20 rounded-md transition-all"
                    title="Save changes"
                    type="button"
                  >
                    <Check className="h-4 w-4 text-green-500" />
                  </button>
                  <button
                    onClick={handleCancelTaskEdit}
                    className="p-1.5 hover:bg-red-500/20 rounded-md transition-all"
                    title="Cancel"
                    type="button"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
              
              {/* Task Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Task Name</label>
                <Input
                  value={editedTask.title}
                  onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                  className="bg-background"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                <select
                  value={editedTask.priority}
                  onChange={(e) => setEditedTask({ ...editedTask, priority: parseInt(e.target.value) })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value={1}>P1 - Critical</option>
                  <option value={2}>P2 - High</option>
                  <option value={3}>P3 - Medium</option>
                  <option value={4}>P4 - Low</option>
                  <option value={5}>P5 - Very Low</option>
                </select>
              </div>

              {/* RACI Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Responsible</label>
                  <NameInputAutocomplete
                    value={editedTask.responsible}
                    onChange={(e) => setEditedTask({ ...editedTask, responsible: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Accountable</label>
                  <NameInputAutocomplete
                    value={editedTask.accountable}
                    onChange={(e) => setEditedTask({ ...editedTask, accountable: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Consulted</label>
                  <NameInputAutocomplete
                    value={editedTask.consulted}
                    onChange={(e) => setEditedTask({ ...editedTask, consulted: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Informed</label>
                  <NameInputAutocomplete
                    value={editedTask.informed}
                    onChange={(e) => setEditedTask({ ...editedTask, informed: e.target.value })}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Deadline</label>
                <Input
                  type="date"
                  value={editedTask.deadline}
                  onChange={(e) => setEditedTask({ ...editedTask, deadline: e.target.value })}
                  className="bg-background"
                />
              </div>
            </div>
          </>
        )}

        {/* Manual Progress Slider (only shown when no subtasks) */}
        {(!task.subtasks || task.subtasks.length === 0) && (
          <div className="bg-muted/30 p-4 rounded-lg border border-border">
            <label className="text-sm font-semibold text-foreground mb-2 block">
              Task Progress: {task.progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={task.progress || 0}
              onChange={(e) => onUpdate({ progress: parseInt(e.target.value) })}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${task.progress}%, #374151 ${task.progress}%, #374151 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Subtasks Section */}
        <div>
          {task.subtasks && task.subtasks.length > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-primary hover:underline font-medium mb-3"
            >
              {showDetails ? "▼" : "▶"} Subtasks ({task.subtasks.length})
            </button>
          )}

          {showDetails && task.subtasks && task.subtasks.length > 0 && (
            <SubtaskList
              subtasks={task.subtasks}
              onUpdateProgress={handleUpdateSubtaskProgress}
              onUpdateRaci={handleUpdateSubtaskRaci}
              onUpdateDeadline={handleUpdateSubtaskDeadline}
              onUpdateTitle={handleUpdateSubtaskTitle}
              onDelete={handleDeleteSubtask}
            />
          )}

          {/* Add Subtask Button/Form */}
          {addingSubtask ? (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-end gap-3 mb-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-foreground mb-1 block">Subtask Title *</label>
                  <Input
                    placeholder="e.g., Initial testing"
                    value={newSubtask.title}
                    onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                    className="bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Deadline 📅</label>
                  <input
                    type="date"
                    value={newSubtask.deadline}
                    onChange={(e) => setNewSubtask({ ...newSubtask, deadline: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddingSubtask(false)
                    setNewSubtask({ title: "", deadline: "" })
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleAddSubtask} className="bg-blue-500 hover:bg-blue-600">
                  Add Subtask
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAddingSubtask(true)}
              className="mt-2 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Subtask
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
})

export default memo(WorkPackageDashboard)
