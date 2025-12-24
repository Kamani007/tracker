"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

export default function TeamSelector({ availableMembers, selectedMembers, onSelectionChange, maxMembers = 10 }) {
  const [isOpen, setIsOpen] = useState(false)

  const handleAddMember = (member) => {
    if (selectedMembers.length < maxMembers && !selectedMembers.find((m) => m.id === member.id)) {
      onSelectionChange([...selectedMembers, member])
    }
  }

  const handleRemoveMember = (memberId) => {
    onSelectionChange(selectedMembers.filter((m) => m.id !== memberId))
  }

  const unselectedMembers = availableMembers.filter((m) => !selectedMembers.find((sm) => sm.id === m.id))

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block">Team Members</label>

        {/* Selected Members */}
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No team members selected</p>
          ) : (
            selectedMembers.map((member) => (
              <Badge key={member.id} variant="secondary" className="gap-2 pl-3 py-2">
                <span>{member.name}</span>
                <button onClick={() => handleRemoveMember(member.id)} className="hover:opacity-70 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))
          )}
        </div>

        {/* Dropdown Toggle */}
        <Button onClick={() => setIsOpen(!isOpen)} variant="outline" className="w-full">
          {isOpen ? "Hide members" : `Add members (${selectedMembers.length}/${maxMembers})`}
        </Button>

        {/* Member List */}
        {isOpen && (
          <Card className="mt-3 p-4 space-y-2 max-h-64 overflow-y-auto">
            {unselectedMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">All available members selected</p>
            ) : (
              unselectedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                  onClick={() => handleAddMember(member)}
                >
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {member.role}
                  </Badge>
                </div>
              ))
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
