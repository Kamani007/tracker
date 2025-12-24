"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"

export default function TeamManagement({ members, onMembersChange }) {
  const [newMember, setNewMember] = useState({ name: "", email: "", role: "" })
  const [isAdding, setIsAdding] = useState(false)

  const handleAddMember = () => {
    if (newMember.name && newMember.email) {
      const member = {
        id: `member-${Date.now()}`,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role || "Team Member",
      }
      onMembersChange([...members, member])
      setNewMember({ name: "", email: "", role: "" })
      setIsAdding(false)
    }
  }

  const handleRemoveMember = (memberId) => {
    onMembersChange(members.filter((m) => m.id !== memberId))
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Team Members</h3>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          size="sm"
          variant={isAdding ? "outline" : "default"}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? "Cancel" : "Add Member"}
        </Button>
      </div>

      {/* Add Member Form */}
      {isAdding && (
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Name"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
            />
            <Input
              placeholder="Email"
              type="email"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
            />
            <Input
              placeholder="Role"
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
            />
          </div>
          <Button onClick={handleAddMember} className="w-full">
            Add Member
          </Button>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No team members added yet</p>
        ) : (
          members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium text-foreground">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full">
                  {member.role}
                </span>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-2 hover:bg-destructive/10 rounded text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
