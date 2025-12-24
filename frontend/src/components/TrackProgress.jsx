"use client"

import { useState, useEffect } from "react"
import Navigation from "./Navigation"
import DashboardOverview from "./dashboard-overview"
import WorkPackageDashboard from "./work-package-dashboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, UserCircle2, CheckCircle2, Users, Bell, Calendar } from "lucide-react"
import { trackProgressAPI } from "@/lib/api"
import NameInputAutocomplete from "@/components/ui/name-input-autocomplete"
import { getNameFromEmail, TEAM_MEMBERS } from "@/lib/constants"

// MyTasksFilters Component - Filters tasks by logged-in user's RACI role
function MyTasksFilters({ workPackages, onTaskClick }) {
  const [activeFilter, setActiveFilter] = useState(null)
  const [userEmail, setUserEmail] = useState(null)
  const [userName, setUserName] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null) // For managers to select other users
  const [filteredTasks, setFilteredTasks] = useState([])

  useEffect(() => {
    // Get user email from localStorage
    const email = localStorage.getItem('userEmail')
    setUserEmail(email)
    const name = getNameFromEmail(email)
    setUserName(name)
    setSelectedUser(name) // Default to logged-in user
  }, [])

  const checkIfUserInField = (fieldValue, userName) => {
    if (!fieldValue || !userName) return false
    
    // Handle multiple separators: comma, slash, semicolon, pipe, and the word "and"
    // First replace " and " with a comma, then split by other separators
    const normalized = fieldValue.replace(/\s+and\s+/gi, ',')
    const separators = /[,/;|]/
    const names = normalized.split(separators).map(n => n.trim())
    
    // Case-insensitive matching
    return names.some(n => n.toLowerCase() === userName.toLowerCase())
  }

  const filterTasksByRaci = (raciField) => {
    if (!selectedUser) {
      alert('Please select a user.')
      return
    }

    const tasks = []
    
    workPackages.forEach(wp => {
      (wp.tasks || []).forEach(task => {
        let isMatch = false
        
        // Check task level RACI (using selectedUser instead of userName)
        if (checkIfUserInField(task[raciField], selectedUser)) {
          isMatch = true
        }

        if (isMatch) {
          tasks.push({
            ...task,
            name: task.title || task.name, // Ensure we have a name field
            workPackageName: wp.name,
            workPackageId: wp.id,
            matchedAt: 'task'
          })
        }

        // Check subtasks
        (task.subtasks || []).forEach(subtask => {
          if (checkIfUserInField(subtask[raciField], selectedUser)) {
            tasks.push({
              ...subtask,
              name: subtask.title || subtask.name, // Ensure we have a name field
              taskName: task.title || task.name,
              workPackageName: wp.name,
              workPackageId: wp.id,
              isSubtask: true,
              matchedAt: 'subtask'
            })
          }
        })
      })
    })

    // Sort tasks by deadline (earliest first, tasks without deadline at end)
    tasks.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline) - new Date(b.deadline)
    })

    setFilteredTasks(tasks)
    setActiveFilter(raciField)
  }

  const clearFilter = () => {
    setFilteredTasks([])
    setActiveFilter(null)
  }

  if (!userName) {
    return null
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-blue-500" />
            Tasks by Team Member
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Filter tasks and subtasks by RACI role
          </p>
        </div>
        {activeFilter && (
          <Button variant="outline" size="sm" onClick={clearFilter}>
            Clear Filter
          </Button>
        )}
      </div>

      {/* User Selection Dropdown */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground">View tasks for:</label>
        <select
          value={selectedUser || ''}
          onChange={(e) => {
            setSelectedUser(e.target.value)
            setActiveFilter(null) // Reset filter when changing user
            setFilteredTasks([])
          }}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          style={{ colorScheme: 'dark', minWidth: '200px' }}
        >
          <option value="">Select a team member...</option>
          {userName && (
            <option value={userName} style={{ backgroundColor: '#1f2937', color: '#ffffff', fontWeight: 'bold' }}>
              👤 {userName} (Me)
            </option>
          )}
          <option disabled style={{ backgroundColor: '#1f2937', color: '#6b7280' }}>
            ──────────────
          </option>
          {TEAM_MEMBERS.filter(member => member !== userName).map(member => (
            <option key={member} value={member} style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>
              {member}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Buttons */}
      <div className="grid grid-cols-4 gap-3">
        <Button
          variant={activeFilter === 'responsible' ? 'default' : 'outline'}
          className={activeFilter === 'responsible' ? 'bg-blue-500 hover:bg-blue-600' : ''}
          onClick={() => filterTasksByRaci('responsible')}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Responsible
        </Button>
        <Button
          variant={activeFilter === 'accountable' ? 'default' : 'outline'}
          className={activeFilter === 'accountable' ? 'bg-green-500 hover:bg-green-600' : ''}
          onClick={() => filterTasksByRaci('accountable')}
        >
          <UserCircle2 className="h-4 w-4 mr-2" />
          Accountable
        </Button>
        <Button
          variant={activeFilter === 'consulted' ? 'default' : 'outline'}
          className={activeFilter === 'consulted' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
          onClick={() => filterTasksByRaci('consulted')}
        >
          <Users className="h-4 w-4 mr-2" />
          Consulted
        </Button>
        <Button
          variant={activeFilter === 'informed' ? 'default' : 'outline'}
          className={activeFilter === 'informed' ? 'bg-purple-500 hover:bg-purple-600' : ''}
          onClick={() => filterTasksByRaci('informed')}
        >
          <Bell className="h-4 w-4 mr-2" />
          Informed
        </Button>
      </div>

      {/* Filtered Results */}
      {activeFilter && (
        <div className="mt-4 space-y-2">
          {filteredTasks.length > 0 ? (
            <>
              <h4 className="text-sm font-semibold text-foreground">
                {filteredTasks.length} {filteredTasks.length === 1 ? 'item' : 'items'} found for {selectedUser}
              </h4>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredTasks.map((item, index) => (
              <div 
                key={index} 
                className="bg-muted/50 rounded-lg p-3 border border-border hover:bg-muted hover:border-primary/50 cursor-pointer transition-all"
                onClick={() => onTaskClick(item.workPackageId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.isSubtask 
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                      }`}>
                        {item.isSubtask ? 'Subtask' : 'Task'}
                      </span>
                      {item.priority && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.priority === 1 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                          item.priority === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
                          item.priority === 3 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                          item.priority === 4 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                          'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                        }`}>
                          P{item.priority}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    {item.isSubtask && (
                      <p className="text-sm text-muted-foreground">Task: {item.taskName}</p>
                    )}
                    <p className="text-sm text-muted-foreground">Work Package: {item.workPackageName}</p>
                    {item.deadline && (() => {
                      const deadline = new Date(item.deadline)
                      const today = new Date()
                      const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
                      const isOverdue = daysUntil < 0
                      const isUrgent = daysUntil >= 0 && daysUntil <= 7
                      
                      return (
                        <p className={`text-xs mt-1 flex items-center gap-1 font-semibold ${
                          isOverdue ? 'text-red-600 dark:text-red-400' :
                          isUrgent ? 'text-orange-600 dark:text-orange-400' :
                          'text-muted-foreground'
                        }`}>
                          <Calendar className="h-3 w-3" />
                          {isOverdue ? '🚨 OVERDUE: ' : isUrgent ? '⚠️ Soon: ' : 'Deadline: '}
                          {deadline.toLocaleDateString()}
                          {isOverdue && ` (${Math.abs(daysUntil)} days ago)`}
                          {isUrgent && !isOverdue && ` (in ${daysUntil} days)`}
                        </p>
                      )
                    })()}
                    {item[activeFilter] && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}: {item[activeFilter]}
                      </p>
                    )}
                  </div>
                  {!item.isSubtask && item.progress !== undefined && (
                    <div className="ml-4 text-right">
                      <p className="text-sm font-semibold text-foreground">{Math.round(item.progress)}%</p>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {item.isSubtask && (
                    <div className="ml-4">
                      <span className={`text-sm ${item.completed ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {item.completed ? '✓ Done' : 'Pending'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed border-border">
              <div className="text-6xl mb-3">📭</div>
              <p className="text-lg font-medium text-foreground mb-1">No tasks found</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">{selectedUser}</span> is not assigned as <span className="font-semibold">{activeFilter}</span> for any tasks yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TrackProgress() {
  const [workPackages, setWorkPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showMyTasks, setShowMyTasks] = useState(false)
  const [highlightedPackageId, setHighlightedPackageId] = useState(null)

  const [isAddingPackage, setIsAddingPackage] = useState(false)
  const [newPackage, setNewPackage] = useState({
    name: "",
    status: "planning",
    deliverable: "",
    partnership: "",
    deadline: "",
  })

  // Load work packages from backend on mount
  useEffect(() => {
    loadWorkPackages()
  }, [])

  const loadWorkPackages = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await trackProgressAPI.getAllWorkPackages()
      setWorkPackages(data || [])
      console.log("✅ Loaded work packages:", data)
    } catch (err) {
      console.error("❌ Error loading work packages:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskClick = (workPackageId) => {
    // Scroll to the work package
    const element = document.getElementById(`work-package-${workPackageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Highlight the work package briefly
      setHighlightedPackageId(workPackageId)
      setTimeout(() => setHighlightedPackageId(null), 3000)
    }
    // Close the My Tasks filter view
    setShowMyTasks(false)
  }

  const handleAddPackage = async () => {
    if (!newPackage.name || !newPackage.deliverable || !newPackage.deadline) {
      alert("Please fill in Name, Deliverable, and Deadline fields")
      return
    }

    try {
      const packageData = {
        name: newPackage.name,
        status: newPackage.status,
        deliverable: newPackage.deliverable,
        partnership: newPackage.partnership,
        deadline: newPackage.deadline,
      }

      const createdPackage = await trackProgressAPI.createWorkPackage(packageData)
      console.log("✅ Created work package:", createdPackage)
      
      // Reload all work packages to get fresh data
      await loadWorkPackages()
      
      setNewPackage({
        name: "",
        status: "planning",
        deliverable: "",
        partnership: "",
        deadline: "",
      })
      setIsAddingPackage(false)
    } catch (err) {
      console.error("❌ Error creating work package:", err)
      alert(`Failed to create work package: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-background dark">
      <Navigation />
      
      <main className="container mx-auto p-6 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Track Progress</h1>
            <p className="text-muted-foreground">
              Monitor progress across all work packages and track key metrics
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant={showMyTasks ? "default" : "outline"}
              className={showMyTasks ? "bg-purple-500 hover:bg-purple-600" : ""}
              onClick={() => setShowMyTasks(!showMyTasks)}
            >
              <UserCircle2 className="h-4 w-4 mr-2" />
              {showMyTasks ? "Hide My Tasks" : "My Tasks"}
            </Button>
            
            <Dialog open={isAddingPackage} onOpenChange={setIsAddingPackage}>
              <DialogTrigger asChild>
                <Button className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Work Package
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add New Work Package</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Name *</label>
                  <Input
                    placeholder="e.g., Perovskite Coating Optimization"
                    value={newPackage.name}
                    onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                    className="bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Status *</label>
                  <select
                    value={newPackage.status}
                    onChange={(e) => setNewPackage({ ...newPackage, status: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="planning" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Planning</option>
                    <option value="in-progress" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>In Progress</option>
                    <option value="completed" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Completed</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Deliverable *</label>
                  <textarea
                    placeholder="e.g., PCE Report - 18.6%"
                    value={newPackage.deliverable}
                    onChange={(e) => setNewPackage({ ...newPackage, deliverable: e.target.value })}
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={5}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Partnership</label>
                    <NameInputAutocomplete
                      value={newPackage.partnership}
                      onChange={(e) => setNewPackage({ ...newPackage, partnership: e.target.value })}
                      placeholder="Type name... (e.g., Luigi)"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Deadline *</label>
                    <Input
                      type="date"
                      value={newPackage.deadline}
                      onChange={(e) => setNewPackage({ ...newPackage, deadline: e.target.value })}
                      className="bg-background text-foreground"
                      style={{ colorScheme: 'dark' }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingPackage(false)
                      setNewPackage({
                        name: "",
                        status: "planning",
                        deliverable: "",
                        partnership: "",
                        deadline: "",
                      })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleAddPackage} className="bg-blue-500 hover:bg-blue-600">
                    Add Package
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* RACI Filters - My Tasks */}
        {!loading && !error && showMyTasks && (
          <MyTasksFilters workPackages={workPackages} onTaskClick={handleTaskClick} />
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading work packages...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6">
            <p className="font-semibold">Error loading data</p>
            <p className="text-sm">{error}</p>
            <Button type="button" onClick={loadWorkPackages} className="mt-2" size="sm" variant="outline">
              Retry
            </Button>
          </div>
        )}

        {/* Dashboard Overview */}
        {!loading && !error && (
          <>
            <DashboardOverview workPackages={workPackages} />

            {/* All Tasks Table - Scrollable */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">All Tasks (Sorted by Priority)</h2>
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-muted z-10">
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Priority</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Task</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Work Package</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Responsible</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {workPackages
                        .flatMap(wp => 
                          (wp.tasks || []).map(task => ({
                            ...task,
                            workPackageName: wp.name,
                            workPackageId: wp.id
                          }))
                        )
                        .sort((a, b) => (a.priority || 3) - (b.priority || 3))
                        .map((task, index) => (
                          <tr key={`${task.workPackageId}-${task.id}`} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                task.priority === 1 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                task.priority === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                task.priority === 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                task.priority === 4 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                task.priority === 5 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              }`}>
                                P{task.priority || 3}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-foreground">{task.title}</div>
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {task.subtasks.length} subtask{task.subtasks.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-muted-foreground">{task.workPackageName}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-foreground">{task.responsible}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden min-w-[80px]">
                                  <div 
                                    className="bg-blue-500 h-full transition-all duration-300" 
                                    style={{ width: `${task.progress}%` }} 
                                  />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground min-w-[35px]">
                                  {task.progress}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {workPackages.flatMap(wp => wp.tasks || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No tasks yet. Add a work package and create tasks to get started.
                    </div>
                  )}
                </div>
                <div className="bg-muted/30 px-4 py-2 border-t border-border text-xs text-muted-foreground">
                  Total Tasks: {workPackages.flatMap(wp => wp.tasks || []).length} | 
                  Showing all tasks sorted by priority (P1 to P5)
                </div>
              </div>
            </div>

            {/* Work Package Details */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">Work Packages</h2>
              <WorkPackageDashboard 
                workPackages={workPackages} 
                setWorkPackages={setWorkPackages}
                onUpdate={loadWorkPackages}
                highlightedPackageId={highlightedPackageId}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
