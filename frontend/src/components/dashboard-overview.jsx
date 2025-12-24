"use client"

import { memo, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { CheckCircle, AlertCircle, Clock, TrendingUp } from "lucide-react"

function DashboardOverview({ workPackages }) {
  const calculateTaskProgress = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) return task.progress || 0
    // Calculate average progress from all subtasks
    const avgProgress = task.subtasks.reduce((sum, st) => sum + (st.progress || 0), 0) / task.subtasks.length
    return Math.round(avgProgress)
  }

  const getPackageMetrics = (pkg) => {
    if (!pkg.tasks || pkg.tasks.length === 0) return { progress: 0, taskCount: 0, completedTasks: 0 }
    
    const taskCount = pkg.tasks.length
    // Calculate average progress from all tasks
    const totalProgress = pkg.tasks.reduce((sum, task) => sum + calculateTaskProgress(task), 0)
    const progress = Math.round(totalProgress / taskCount)
    const completedTasks = pkg.tasks.filter((t) => calculateTaskProgress(t) === 100).length
    
    return { progress, taskCount, completedTasks }
  }

  // Calculate aggregate metrics
  const metrics = workPackages.map((wp) => ({
    name: wp.name,
    progress: getPackageMetrics(wp).progress,
    priority: wp.priority,
  }))

  const totalPackages = workPackages.length
  const completedPackages = workPackages.filter((wp) => getPackageMetrics(wp).progress === 100).length
  const inProgressPackages = workPackages.filter((wp) => {
    const progress = getPackageMetrics(wp).progress
    return progress > 0 && progress < 100
  }).length
  const notStartedPackages = workPackages.filter((wp) => getPackageMetrics(wp).progress === 0).length

  const statusData = [
    { name: "Completed", value: completedPackages, fill: "#22c55e" },
    { name: "In Progress", value: inProgressPackages, fill: "#f59e0b" },
    { name: "Not Started", value: notStartedPackages, fill: "#6b7280" },
  ]

  const overallProgress =
    totalPackages > 0
      ? Math.round(workPackages.reduce((sum, wp) => sum + getPackageMetrics(wp).progress, 0) / totalPackages)
      : 0

  const overallMetrics = [
    { icon: TrendingUp, label: "Overall Progress", value: `${overallProgress}%`, color: "text-blue-600" },
    { icon: CheckCircle, label: "Completed", value: completedPackages, color: "text-green-600" },
    { icon: Clock, label: "In Progress", value: inProgressPackages, color: "text-amber-600" },
    { icon: AlertCircle, label: "Not Started", value: notStartedPackages, color: "text-gray-600" },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overallMetrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <Card key={index} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{metric.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{metric.value}</p>
                </div>
                <Icon className={`w-8 h-8 ${metric.color} opacity-20`} />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Progress by Package Chart */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold text-foreground mb-6">Progress by Package</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: `1px solid hsl(var(--border))`,
                borderRadius: "var(--radius)",
                color: "hsl(var(--foreground))",
              }}
              cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
            />
            <Bar dataKey="progress" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Work Packages Table */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold text-foreground mb-6">All Work Packages</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">Package</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Priority</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Progress</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Tasks</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {workPackages.map((wp) => {
                const pkgMetrics = getPackageMetrics(wp)
                const priorityColors = {
                  1: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                  2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                  3: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                }
                const statusColors = {
                  planning: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                  "in-progress": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
                  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                }

                return (
                  <tr key={wp.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-foreground font-medium">{wp.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityColors[wp.priority]}`}>
                        P{wp.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all duration-300"
                            style={{ width: `${pkgMetrics.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground min-w-fit">{pkgMetrics.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {pkgMetrics.completedTasks}/{pkgMetrics.taskCount}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {new Date(wp.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default memo(DashboardOverview)
