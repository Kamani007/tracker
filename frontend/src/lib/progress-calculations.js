/**
 * Calculate the progress percentage of a single task based on its subtasks
 * @param {Object} task - The task object
 * @param {Array} task.subtasks - Array of subtasks
 * @param {number} task.progress - Task progress value
 * @returns {number} Progress percentage 0-100
 */
export function calculateTaskProgress(task) {
  if (task.subtasks.length === 0) {
    return task.progress || 0
  }

  // Calculate average progress of all subtasks (handles partial completion)
  const totalProgress = task.subtasks.reduce((sum, st) => sum + (st.progress || 0), 0)
  return Math.round(totalProgress / task.subtasks.length)
}

/**
 * Calculate the average progress of a work package based on its tasks
 * @param {Array} tasks - Array of task objects
 * @returns {number} Average progress percentage
 */
export function calculatePackageProgress(tasks) {
  if (tasks.length === 0) return 0

  const totalProgress = tasks.reduce((sum, task) => sum + calculateTaskProgress(task), 0)
  return Math.round(totalProgress / tasks.length)
}

/**
 * Calculate status based on progress percentage
 * @param {number} progress - Progress percentage 0-100
 * @returns {string} Status: "not-started", "in-progress", "nearly-done", or "completed"
 */
export function getProgressStatus(progress) {
  if (progress === 0) return "not-started"
  if (progress < 75) return "in-progress"
  if (progress < 100) return "nearly-done"
  return "completed"
}

/**
 * Get detailed progress metrics for a work package
 * @param {Object} workPackage - The work package object
 * @returns {Object} Metrics object with progress, status, subtask counts, and task counts
 */
export function getPackageMetrics(workPackage) {
  const progress = calculatePackageProgress(workPackage.tasks)
  const status = getProgressStatus(progress)
  const totalSubtasks = workPackage.tasks.reduce((sum, task) => sum + task.subtasks.length, 0)
  const completedSubtasks = workPackage.tasks.reduce(
    (sum, task) => sum + task.subtasks.filter((st) => (st.progress || 0) === 100).length,
    0,
  )

  return {
    progress,
    status,
    totalSubtasks,
    completedSubtasks,
    taskCount: workPackage.tasks.length,
    completedTasks: workPackage.tasks.filter((t) => calculateTaskProgress(t) === 100).length,
  }
}

/**
 * Estimate time remaining based on progress and deadline
 * @param {string} deadline - Deadline date string
 * @returns {Object} Object with daysRemaining, status, and displayText
 */
export function getTimeRemaining(deadline) {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  let status
  let displayText

  if (daysRemaining < 0) {
    status = "overdue"
    displayText = `Overdue by ${Math.abs(daysRemaining)} days`
  } else if (daysRemaining === 0) {
    status = "due-today"
    displayText = "Due today"
  } else if (daysRemaining <= 7) {
    status = "due-soon"
    displayText = `${daysRemaining} days remaining`
  } else {
    status = "on-track"
    displayText = deadlineDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return { daysRemaining, status, displayText }
}
