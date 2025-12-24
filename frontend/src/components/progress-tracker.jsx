"use client"

import { Card } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Clock } from "lucide-react"

export default function ProgressTracker({ workPackage }) {
  const calculateTaskProgress = (task) => {
    if (task.subtasks.length === 0) return task.progress || 0
    const completedCount = task.subtasks.filter((st) => st.completed).length
    return Math.round((completedCount / task.subtasks.length) * 100)
  }

  const getPackageMetrics = (pkg) => {
    const taskCount = pkg.tasks.length
    const completedTasks = pkg.tasks.filter((t) => calculateTaskProgress(t) === 100).length
    const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0

    let status
    if (progress === 100) status = "completed"
    else if (progress >= 75) status = "nearly-done"
    else if (progress > 0) status = "in-progress"
    else status = "planning"

    const completedSubtasks = pkg.tasks.reduce((sum, t) => sum + t.subtasks.filter((s) => s.completed).length, 0)
    const totalSubtasks = pkg.tasks.reduce((sum, t) => sum + t.subtasks.length, 0)

    return {
      progress,
      status,
      taskCount,
      completedTasks,
      completedSubtasks,
      totalSubtasks,
    }
  }

  const getTimeRemaining = (deadline) => {
    const now = new Date()
    const dueDate = new Date(deadline)
    const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    let status, displayText
    if (daysRemaining < 0) {
      status = "overdue"
      displayText = `Overdue by ${Math.abs(daysRemaining)} days`
    } else if (daysRemaining === 0) {
      status = "due-today"
      displayText = "Due today"
    } else if (daysRemaining <= 7) {
      status = "due-soon"
      displayText = `Due in ${daysRemaining} days`
    } else {
      status = "on-track"
      displayText = `Due in ${daysRemaining} days`
    }

    return { status, displayText, daysRemaining }
  }

  const metrics = getPackageMetrics(workPackage)
  const timeRemaining = getTimeRemaining(workPackage.deadline)

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 dark:text-green-400"
      case "nearly-done":
        return "text-blue-600 dark:text-blue-400"
      case "in-progress":
        return "text-amber-600 dark:text-amber-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  const getProgressColor = (progress) => {
    if (progress >= 100) return "bg-green-500"
    if (progress >= 75) return "bg-blue-500"
    if (progress >= 50) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Overall Progress</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {metrics.completedTasks} of {metrics.taskCount} tasks completed
              </p>
            </div>
            <span className={`text-3xl font-bold ${getStatusColor(metrics.status)}`}>{metrics.progress}%</span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
              <div
                className={`${getProgressColor(metrics.progress)} h-full transition-all duration-500 ease-out`}
                style={{ width: `${metrics.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="pt-2">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                metrics.status === "completed"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : metrics.status === "nearly-done"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    : metrics.status === "in-progress"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
              }`}
            >
              {metrics.status === "completed" ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {metrics.status.replace(/-/g, " ").toUpperCase()}
            </span>
          </div>
        </div>
      </Card>

      {/* Subtasks Progress */}
      <Card className="p-6">
        <h4 className="text-sm font-semibold text-foreground mb-4">Subtask Completion</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Completed Subtasks</span>
            <span className="text-lg font-bold text-foreground">
              {metrics.completedSubtasks}/{metrics.totalSubtasks}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-300"
              style={{
                width: metrics.totalSubtasks ? `${(metrics.completedSubtasks / metrics.totalSubtasks) * 100}%` : 0,
              }}
            />
          </div>
        </div>
      </Card>

      {/* Timeline Status */}
      <Card
        className={`p-6 border-l-4 ${
          timeRemaining.status === "overdue"
            ? "border-l-red-500 bg-red-50 dark:bg-red-900/10"
            : timeRemaining.status === "due-today"
              ? "border-l-amber-500 bg-amber-50 dark:bg-amber-900/10"
              : timeRemaining.status === "due-soon"
                ? "border-l-blue-500 bg-blue-50 dark:bg-blue-900/10"
                : "border-l-green-500 bg-green-50 dark:bg-green-900/10"
        }`}
      >
        <div className="flex items-start gap-4">
          {timeRemaining.status === "overdue" ? (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
          ) : (
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
          )}
          <div>
            <h4 className="font-semibold text-foreground mb-1">Deadline Status</h4>
            <p className="text-sm text-muted-foreground">{timeRemaining.displayText}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Due:{" "}
              {new Date(workPackage.deadline).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </Card>

      {/* Task-level Progress */}
      <Card className="p-6">
        <h4 className="text-sm font-semibold text-foreground mb-4">Task Progress</h4>
        <div className="space-y-3">
          {workPackage.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No tasks added yet</p>
          ) : (
            workPackage.tasks.map((task) => {
              const taskProgress = calculateTaskProgress(task)
              return (
                <div key={task.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground line-clamp-1 flex-1">{task.title}</span>
                    <span className="font-semibold text-accent ml-2">{taskProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`${getProgressColor(taskProgress)} h-full transition-all duration-300`}
                      style={{ width: `${taskProgress}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
