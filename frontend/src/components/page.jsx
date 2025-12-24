"use client"

import { useState } from "react"
import DashboardOverview from "@/components/dashboard-overview"

export default function DashboardPage() {
  const [workPackages] = useState([
    {
      id: "wp1",
      name: "Perovskite Coating Optimization",
      priority: 1,
      status: "in-progress",
      deliverable: "PCE Report - 18.6% (Isc: 23 mA; Voc: 1.06V; FF: 75%)",
      partnership: "Luigi",
      deadline: "2025-03-15",
      tasks: [
        {
          id: "t1",
          title: "PVSK 5905 Process optimization (Device fabrication and reproducibility)",
          responsible: "Reddy",
          accountable: "Luiza/Luigi",
          consulted: "Towhid",
          informed: "Irina",
          progress: 45,
          subtasks: [
            { id: "st1", title: "3 cd + 2 cd validation", completed: true },
            { id: "st2", title: "Initial testing", completed: true },
          ],
        },
        {
          id: "t2",
          title: "KBF4, KCl*Biphenyl Concentration optimization",
          responsible: "Charlotte",
          accountable: "Luiza/Luigi",
          consulted: "Towhid",
          informed: "Irina",
          progress: 20,
          subtasks: [{ id: "st3", title: "Chemical analysis", completed: false }],
        },
      ],
    },
    {
      id: "wp2",
      name: "Charge Transfer",
      priority: 2,
      status: "in-progress",
      deliverable: "PCE - 16.05% (Isc: 22 mA; Voc: 1.04 V; FF: 70%)",
      partnership: "Luigi",
      deadline: "2025-04-30",
      tasks: [
        {
          id: "t3",
          title: "HTL conductivity",
          responsible: "Salma",
          accountable: "Luiza/Luigi",
          consulted: "Luigi",
          informed: "Irina",
          progress: 60,
          subtasks: [
            { id: "st4", title: "PSHT Molecular weight analysis", completed: true },
            { id: "st5", title: "Band alignment testing", completed: false },
          ],
        },
      ],
    },
  ])

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Project Dashboard</h1>
          <p className="text-muted-foreground">Monitor progress across all work packages and track key metrics</p>
        </div>

        <DashboardOverview workPackages={workPackages} />
      </div>
    </main>
  )
}
